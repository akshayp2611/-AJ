const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const SONGS_DIR = path.join(ROOT, "songs");
const IMAGES_DIR = path.join(ROOT, "images");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

// --------------------------------------------------
// DIRECTORIES
// --------------------------------------------------

if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    express.static(ROOT, {
        extensions: ["html"],
        index: false,
        maxAge: "1h"
    })
);

app.use("/songs", express.static(SONGS_DIR));
app.use("/images", express.static(IMAGES_DIR));

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "online",
        service: "स्वरAJ",
        songsDirectory: SONGS_DIR,
        youtubeConfigured: Boolean(YOUTUBE_API_KEY)
    });
});

// --------------------------------------------------
// SONG SCANNER
// --------------------------------------------------

const AUDIO_EXTENSIONS = [
    ".mp3",
    ".m4a",
    ".wav",
    ".ogg",
    ".aac",
    ".flac",
    ".webm"
];

function cleanName(filename) {
    return filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getCategoryFromRelativePath(relativePath) {
    const parts = relativePath.split(path.sep);

    if (parts.length > 1) {
        return parts[0];
    }

    return "All Songs";
}

function scanSongs(directory, results = []) {
    if (!fs.existsSync(directory)) {
        return results;
    }

    let entries;

    try {
        entries = fs.readdirSync(directory, {
            withFileTypes: true
        });
    } catch (error) {
        console.error("Directory read error:", error);
        return results;
    }

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            scanSongs(fullPath, results);
            continue;
        }

        const extension = path.extname(entry.name).toLowerCase();

        if (!AUDIO_EXTENSIONS.includes(extension)) {
            continue;
        }

        const relativePath = path.relative(
            SONGS_DIR,
            fullPath
        );

        const category =
            getCategoryFromRelativePath(relativePath);

        const urlPath = relativePath
            .split(path.sep)
            .map(encodeURIComponent)
            .join("/");

        results.push({
            id: Buffer
                .from(relativePath)
                .toString("base64url"),

            title: cleanName(entry.name),

            artist: category,

            category,

            filename: entry.name,

            path: relativePath.replace(/\\/g, "/"),

            url: `/songs/${urlPath}`,

            image: "/images/default-cover.svg"
        });
    }

    return results;
}

// --------------------------------------------------
// SONGS API
// --------------------------------------------------

app.get("/api/songs", (req, res) => {
    try {
        const songs = scanSongs(SONGS_DIR);

        songs.sort((a, b) =>
            a.title.localeCompare(
                b.title,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            )
        );

        res.json({
            success: true,
            count: songs.length,
            songs
        });

    } catch (error) {
        console.error("Song scan error:", error);

        res.status(500).json({
            success: false,
            count: 0,
            songs: [],
            error: "Unable to scan songs"
        });
    }
});

// --------------------------------------------------
// CATEGORIES API
// --------------------------------------------------

app.get("/api/categories", (req, res) => {
    try {
        const songs = scanSongs(SONGS_DIR);

        const map = new Map();

        for (const song of songs) {
            const category = song.category || "Other";

            map.set(
                category,
                (map.get(category) || 0) + 1
            );
        }

        const categories =
            Array.from(map.entries())
                .map(([name, count]) => ({
                    name,
                    count
                }))
                .sort((a, b) =>
                    a.name.localeCompare(b.name)
                );

        res.json({
            success: true,
            categories
        });

    } catch (error) {
        console.error("Category error:", error);

        res.status(500).json({
            success: false,
            categories: []
        });
    }
});

// --------------------------------------------------
// YOUTUBE SEARCH
// --------------------------------------------------

app.get("/api/youtube/search", async (req, res) => {
    const query =
        String(req.query.q || "").trim();

    if (!query) {
        return res.status(400).json({
            success: false,
            error: "Search query is required"
        });
    }

    if (!YOUTUBE_API_KEY) {
        return res.status(503).json({
            success: false,
            configured: false,
            error:
                "YouTube API is not configured. Add YOUTUBE_API_KEY to your Render environment variables."
        });
    }

    try {
        const params = new URLSearchParams({
            part: "snippet",
            q: query,
            type: "video",
            maxResults: "12",
            videoEmbeddable: "true",
            key: YOUTUBE_API_KEY
        });

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${params}`
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "YouTube API error:",
                data
            );

            return res.status(response.status).json({
                success: false,
                error:
                    data?.error?.message ||
                    "YouTube API request failed"
            });
        }

        const videos =
            (data.items || [])
                .filter(
                    item =>
                        item.id &&
                        item.id.videoId
                )
                .map(item => ({
                    id: item.id.videoId,

                    title:
                        item.snippet?.title ||
                        "YouTube Video",

                    channel:
                        item.snippet?.channelTitle ||
                        "YouTube",

                    description:
                        item.snippet?.description ||
                        "",

                    thumbnail:
                        item.snippet?.thumbnails?.high?.url ||
                        item.snippet?.thumbnails?.medium?.url ||
                        item.snippet?.thumbnails?.default?.url ||
                        ""
                }));

        res.json({
            success: true,
            count: videos.length,
            videos
        });

    } catch (error) {
        console.error(
            "YouTube search error:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Unable to search YouTube"
        });
    }
});

// --------------------------------------------------
// YOUTUBE CONFIG
// --------------------------------------------------

app.get("/api/youtube/status", (req, res) => {
    res.json({
        success: true,
        configured: Boolean(YOUTUBE_API_KEY)
    });
});

// --------------------------------------------------
// ROOT
// --------------------------------------------------

app.get("/", (req, res) => {
    res.sendFile(
        path.join(ROOT, "index.html")
    );
});

// --------------------------------------------------
// SAFE SPA FALLBACK
// IMPORTANT:
// Do NOT use app.get("*")
// --------------------------------------------------

app.use((req, res, next) => {
    if (
        req.method === "GET" &&
        !req.path.startsWith("/api/") &&
        !req.path.startsWith("/songs/") &&
        !req.path.startsWith("/images/") &&
        !path.extname(req.path)
    ) {
        return res.sendFile(
            path.join(ROOT, "index.html")
        );
    }

    next();
});

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((req, res) => {
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            error: "API endpoint not found"
        });
    }

    res.status(404).send("Not Found");
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((error, req, res, next) => {
    console.error(error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

// --------------------------------------------------
// START
// --------------------------------------------------

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            "========================================"
        );

        console.log(
            "          स्वरAJ Music Server"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Songs: ${SONGS_DIR}`
        );

        console.log(
            `YouTube: ${
                YOUTUBE_API_KEY
                    ? "Configured"
                    : "Not configured"
            }`
        );

        console.log(
            "Server ready"
        );
    }
);