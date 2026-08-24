const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const SONGS_DIR = path.join(ROOT, "songs");
const IMAGES_DIR = path.join(ROOT, "images");

// --------------------------------------------------
// CREATE DIRECTORIES
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

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// STATIC FILES
// --------------------------------------------------

app.use(express.static(ROOT));

app.use(
    "/songs",
    express.static(SONGS_DIR, {
        fallthrough: true,
        setHeaders: (res) => {
            res.setHeader("Accept-Ranges", "bytes");
            res.setHeader("Cache-Control", "public, max-age=3600");
        }
    })
);

app.use("/images", express.static(IMAGES_DIR));

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".m4a",
    ".aac",
    ".wav",
    ".ogg",
    ".oga",
    ".flac",
    ".opus"
]);

function cleanTitle(filename) {
    return filename
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function encodeSongPath(relativePath) {
    return (
        "/songs/" +
        relativePath
            .split(path.sep)
            .map(part => encodeURIComponent(part))
            .join("/")
    );
}

function encodeImagePath(relativePath) {
    return (
        "/images/" +
        relativePath
            .split(path.sep)
            .map(part => encodeURIComponent(part))
            .join("/")
    );
}

// --------------------------------------------------
// SONG SCANNER
// --------------------------------------------------

function scanSongs() {
    const songs = [];

    if (!fs.existsSync(SONGS_DIR)) {
        return songs;
    }

    function walk(currentDir, relativeDir = "") {
        let entries = [];

        try {
            entries = fs.readdirSync(currentDir, {
                withFileTypes: true
            });
        } catch (error) {
            console.error("Unable to read:", currentDir, error.message);
            return;
        }

        entries.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
                numeric: true,
                sensitivity: "base"
            })
        );

        for (const entry of entries) {
            const absolutePath = path.join(currentDir, entry.name);
            const relativePath = path.join(relativeDir, entry.name);

            if (entry.isDirectory()) {
                walk(absolutePath, relativePath);
                continue;
            }

            const extension = path.extname(entry.name).toLowerCase();

            if (!AUDIO_EXTENSIONS.has(extension)) {
                continue;
            }

            const parts = relativePath.split(path.sep);

            let category = parts.length > 1 ? parts[0] : "All Songs";

            if (!category || category === ".") {
                category = "All Songs";
            }

            const title = cleanTitle(entry.name);

            // Look for a cover in the same folder.
            const songFolder = path.dirname(absolutePath);

            const possibleCovers = [
                "cover.jpg",
                "cover.jpeg",
                "cover.png",
                "cover.webp",
                "album.jpg",
                "album.jpeg",
                "album.png",
                "album.webp"
            ];

            let cover = "/images/default-cover.svg";

            for (const coverName of possibleCovers) {
                const coverPath = path.join(songFolder, coverName);

                if (fs.existsSync(coverPath)) {
                    const coverRelative = path.relative(
                        IMAGES_DIR,
                        coverPath
                    );

                    // Only use /images when cover actually lives there.
                    if (!coverRelative.startsWith("..")) {
                        cover = encodeImagePath(coverRelative);
                    }
                    break;
                }
            }

            songs.push({
                id: `song-${songs.length + 1}`,
                title,
                artist: "स्वरAJ",
                album: category,
                category,
                cover,
                url: encodeSongPath(relativePath),
                file: relativePath.split(path.sep).join("/")
            });
        }
    }

    walk(SONGS_DIR);

    return songs;
}

// --------------------------------------------------
// API: HEALTH
// --------------------------------------------------

app.get("/api/health", (req, res) => {
    const songs = scanSongs();

    res.json({
        status: "ok",
        success: true,
        songsDirectoryExists: fs.existsSync(SONGS_DIR),
        songCount: songs.length,
        songsDirectory: SONGS_DIR
    });
});

// --------------------------------------------------
// API: SONGS
// --------------------------------------------------

app.get("/api/songs", (req, res) => {
    try {
        const songs = scanSongs();

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
// API: CATEGORIES
// --------------------------------------------------

app.get("/api/categories", (req, res) => {
    try {
        const songs = scanSongs();

        const categoryMap = new Map();

        songs.forEach(song => {
            const category = song.category || "All Songs";

            if (!categoryMap.has(category)) {
                categoryMap.set(category, {
                    name: category,
                    count: 0,
                    cover: song.cover
                });
            }

            categoryMap.get(category).count++;
        });

        const categories = [
            {
                name: "All Songs",
                count: songs.length,
                cover: "/images/default-cover.svg"
            },
            ...Array.from(categoryMap.values())
        ];

        res.json({
            success: true,
            count: categories.length,
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
// API: YOUTUBE SEARCH
// --------------------------------------------------

app.get("/api/youtube/search", async (req, res) => {
    try {
        const query = String(req.query.q || "").trim();

        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Search query is required"
            });
        }

        const apiKey = process.env.YOUTUBE_API_KEY;

        if (!apiKey) {
            return res.status(503).json({
                success: false,
                error:
                    "YouTube API is not configured. Add YOUTUBE_API_KEY in Render Environment Variables."
            });
        }

        const params = new URLSearchParams({
            part: "snippet",
            type: "video",
            q: query,
            maxResults: "15",
            regionCode: "IN",
            videoEmbeddable: "true",
            videoSyndicated: "true",
            safeSearch: "moderate",
            relevanceLanguage: "en",
            key: apiKey
        });

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("YouTube API error:", data);

            return res.status(response.status).json({
                success: false,
                error:
                    data?.error?.message ||
                    "YouTube API request failed"
            });
        }

        const results = (data.items || [])
            .filter(item => item?.id?.videoId)
            .map(item => ({
                id: item.id.videoId,
                title:
                    item.snippet?.title ||
                    "YouTube Music",
                artist:
                    item.snippet?.channelTitle ||
                    "YouTube",
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
                    "",
                publishedAt:
                    item.snippet?.publishedAt ||
                    "",
                url:
                    `https://www.youtube.com/watch?v=${item.id.videoId}`,
                embedUrl:
                    `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&rel=0`
            }));

        res.json({
            success: true,
            count: results.length,
            results
        });
    } catch (error) {
        console.error("YouTube search exception:", error);

        res.status(500).json({
            success: false,
            error: "YouTube search failed"
        });
    }
});

// --------------------------------------------------
// API: YOUTUBE VIDEO
// --------------------------------------------------

app.get("/api/youtube/video/:id", (req, res) => {
    const id = String(req.params.id || "").trim();

    if (!/^[a-zA-Z0-9_-]{6,20}$/.test(id)) {
        return res.status(400).json({
            success: false,
            error: "Invalid YouTube video ID"
        });
    }

    res.json({
        success: true,
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        embedUrl:
            `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`
    });
});

// --------------------------------------------------
// FIREBASE CONFIG
// --------------------------------------------------
// Optional.
// Set these Render environment variables if you want
// Firebase-ready client configuration.

app.get("/api/config", (req, res) => {
    res.json({
        success: true,

        firebase: {
            apiKey: process.env.FIREBASE_API_KEY || "",
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
            projectId: process.env.FIREBASE_PROJECT_ID || "",
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId:
                process.env.FIREBASE_MESSAGING_SENDER_ID || "",
            appId: process.env.FIREBASE_APP_ID || ""
        },

        features: {
            youtube: Boolean(process.env.YOUTUBE_API_KEY),
            firebase: Boolean(
                process.env.FIREBASE_API_KEY &&
                process.env.FIREBASE_PROJECT_ID &&
                process.env.FIREBASE_APP_ID
            ),
            jiohotstar: true
        }
    });
});

// --------------------------------------------------
// JIOHOTSTAR INFO
// --------------------------------------------------

app.get("/api/jiohotstar", (req, res) => {
    res.json({
        success: true,
        name: "JioHotstar",
        url: "https://www.hotstar.com/in",
        message:
            "JioHotstar is available through its official website. Playback availability and embedding are controlled by the service."
    });
});

// --------------------------------------------------
// SPA FALLBACK
// --------------------------------------------------

app.get("*", (req, res, next) => {
    if (
        req.path.startsWith("/api/") ||
        req.path.startsWith("/songs/") ||
        req.path.startsWith("/images/")
    ) {
        return next();
    }

    const indexPath = path.join(ROOT, "index.html");

    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }

    res.status(404).send("index.html not found");
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
    const songs = scanSongs();

    console.log("=================================");
    console.log("स्वरAJ Music Server");
    console.log(`Port: ${PORT}`);
    console.log(`Songs directory: ${SONGS_DIR}`);
    console.log(`Songs found: ${songs.length}`);

    songs.forEach(song => {
        console.log(`[${song.category}] ${song.title}`);
        console.log(`URL: ${song.url}`);
    });

    console.log("---------------------------------");
    console.log(
        `YouTube API: ${
            process.env.YOUTUBE_API_KEY
                ? "CONFIGURED"
                : "NOT CONFIGURED"
        }`
    );

    console.log(
        `Firebase: ${
            process.env.FIREBASE_API_KEY &&
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_APP_ID
                ? "CONFIGURED"
                : "READY / NOT CONFIGURED"
        }`
    );

    console.log("=================================");
});