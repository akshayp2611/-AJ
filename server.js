const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 10000;
const ROOT = __dirname;

const SONGS_DIR = path.join(ROOT, "songs");
const IMAGES_DIR = path.join(ROOT, "images");

const YOUTUBE_API_KEY =
    process.env.YOUTUBE_API_KEY ||
    process.env.YOUTUBE_KEY ||
    "";

const YOUTUBE_API_URL =
    "https://www.googleapis.com/youtube/v3/search";

/* =========================================================
   DIRECTORIES
========================================================= */

if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR, {
        recursive: true
    });
}

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, {
        recursive: true
    });
}

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json({
    limit: "2mb"
}));

app.use(express.urlencoded({
    extended: true
}));

/* =========================================================
   STATIC FILES
========================================================= */

app.use(express.static(ROOT, {
    extensions: ["html"],
    index: "index.html"
}));

/* =========================================================
   HELPERS
========================================================= */

function normalizeText(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function getFileName(file) {
    return path.basename(file);
}

function getTitle(file) {
    return normalizeText(
        path.basename(file, path.extname(file))
    );
}

function getCategory(relativePath) {
    const parts = relativePath
        .split(path.sep)
        .filter(Boolean);

    if (parts.length > 1) {
        return parts[0];
    }

    return "All Songs";
}

function getImageForCategory(category) {
    const safeCategory = String(category)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

    const possibleFiles = [
        `${safeCategory}.jpg`,
        `${safeCategory}.jpeg`,
        `${safeCategory}.png`,
        `${safeCategory}.webp`
    ];

    for (const file of possibleFiles) {
        const fullPath = path.join(
            IMAGES_DIR,
            file
        );

        if (fs.existsSync(fullPath)) {
            return `/images/${encodeURIComponent(file)}`;
        }
    }

    const defaults = [
        "ganpati.jpg",
        "default.jpg",
        "cover.jpg",
        "music.jpg"
    ];

    for (const file of defaults) {
        const fullPath = path.join(
            IMAGES_DIR,
            file
        );

        if (fs.existsSync(fullPath)) {
            return `/images/${encodeURIComponent(file)}`;
        }
    }

    return "";
}

/* =========================================================
   SONG SCANNER
========================================================= */

function scanSongs() {
    const songs = [];

    if (!fs.existsSync(SONGS_DIR)) {
        return songs;
    }

    function walk(currentDir) {
        let entries = [];

        try {
            entries = fs.readdirSync(
                currentDir,
                {
                    withFileTypes: true
                }
            );
        } catch (error) {
            console.error(
                "Unable to read:",
                currentDir,
                error.message
            );

            return;
        }

        for (const entry of entries) {
            const fullPath = path.join(
                currentDir,
                entry.name
            );

            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const extension =
                path.extname(entry.name)
                    .toLowerCase();

            const allowed = [
                ".mp3",
                ".wav",
                ".m4a",
                ".ogg",
                ".aac",
                ".flac"
            ];

            if (!allowed.includes(extension)) {
                continue;
            }

            const relativePath =
                path.relative(
                    SONGS_DIR,
                    fullPath
                );

            const category =
                getCategory(relativePath);

            const urlPath =
                relativePath
                    .split(path.sep)
                    .map(encodeURIComponent)
                    .join("/");

            songs.push({
                id: Buffer.from(
                    relativePath
                ).toString("base64url"),

                title: getTitle(entry.name),

                category,

                artist: "स्वरAJ",

                url: `/songs/${urlPath}`,

                image:
                    getImageForCategory(category),

                filename:
                    getFileName(entry.name),

                extension
            });
        }
    }

    walk(SONGS_DIR);

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

    return songs;
}

/* =========================================================
   SONG API
========================================================= */

app.get("/api/songs", (req, res) => {
    try {
        const songs = scanSongs();

        const categories = [
            ...new Set(
                songs
                    .map(song => song.category)
                    .filter(Boolean)
            )
        ].sort();

        res.json({
            success: true,
            count: songs.length,
            categories,
            songs
        });

    } catch (error) {
        console.error(
            "Songs API error:",
            error
        );

        res.status(500).json({
            success: false,
            count: 0,
            categories: [],
            songs: [],
            error:
                "Unable to scan music library."
        });
    }
});

/* =========================================================
   CATEGORY API
========================================================= */

app.get("/api/categories", (req, res) => {
    try {
        const songs = scanSongs();

        const categoryMap = {};

        for (const song of songs) {
            if (!categoryMap[song.category]) {
                categoryMap[song.category] = {
                    name: song.category,
                    count: 0,
                    image: song.image
                };
            }

            categoryMap[song.category].count++;
        }

        res.json({
            success: true,
            categories:
                Object.values(categoryMap)
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            categories: [],
            error:
                "Unable to load categories."
        });
    }
});

/* =========================================================
   YOUTUBE CONFIG STATUS
========================================================= */

app.get("/api/youtube/status", (req, res) => {
    res.json({
        success: true,

        configured:
            Boolean(
                YOUTUBE_API_KEY &&
                YOUTUBE_API_KEY.trim()
            ),

        provider: "YouTube Data API v3"
    });
});

/* =========================================================
   YOUTUBE SEARCH
========================================================= */

app.get("/api/youtube/search", async (req, res) => {
    const query =
        normalizeText(req.query.q);

    if (!query) {
        return res.status(400).json({
            success: false,
            videos: [],
            error:
                "Please enter a YouTube search query."
        });
    }

    if (!YOUTUBE_API_KEY) {
        return res.status(503).json({
            success: false,
            configured: false,
            videos: [],
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

            videoSyndicated: "true",

            regionCode: "IN",

            key: YOUTUBE_API_KEY
        });

        const response = await fetch(
            `${YOUTUBE_API_URL}?${params.toString()}`
        );

        const data =
            await response.json();

        if (!response.ok) {
            console.error(
                "YouTube API error:",
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            const reason =
                data?.error?.errors?.[0]?.reason;

            let message =
                "YouTube search failed.";

            if (
                reason ===
                "quotaExceeded"
            ) {
                message =
                    "YouTube API quota has been exceeded.";
            }

            if (
                reason ===
                "keyInvalid"
            ) {
                message =
                    "The YouTube API key is invalid.";
            }

            if (
                reason ===
                "accessNotConfigured"
            ) {
                message =
                    "YouTube Data API v3 is not enabled for this Google Cloud project.";
            }

            return res.status(
                response.status
            ).json({
                success: false,
                configured: true,
                videos: [],
                error: message
            });
        }

        const videos =
            Array.isArray(data.items)
                ? data.items
                    .filter(
                        item =>
                            item?.id?.videoId
                    )
                    .map(item => ({
                        id:
                            item.id.videoId,

                        title:
                            item.snippet?.title ||
                            "YouTube Video",

                        description:
                            item.snippet?.description ||
                            "",

                        channel:
                            item.snippet?.channelTitle ||
                            "YouTube",

                        publishedAt:
                            item.snippet?.publishedAt ||
                            "",

                        thumbnail:
                            item.snippet?.thumbnails
                                ?.high?.url ||
                            item.snippet?.thumbnails
                                ?.medium?.url ||
                            item.snippet?.thumbnails
                                ?.default?.url ||
                            "",

                        url:
                            `https://www.youtube.com/watch?v=${item.id.videoId}`
                    }))
                : [];

        res.json({
            success: true,
            configured: true,
            query,
            count: videos.length,
            videos
        });

    } catch (error) {
        console.error(
            "YouTube request failed:",
            error
        );

        res.status(500).json({
            success: false,
            configured: true,
            videos: [],
            error:
                "Unable to connect to YouTube. Please try again."
        });
    }
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
    const songs = scanSongs();

    res.json({
        success: true,

        status: "ok",

        service: "स्वरAJ",

        songs:
            songs.length,

        youtube:
            Boolean(
                YOUTUBE_API_KEY
            ),

        node:
            process.version,

        environment:
            process.env.NODE_ENV ||
            "development"
    });
});

/* =========================================================
   IMAGE FALLBACK
========================================================= */

app.get("/images/:filename", (req, res, next) => {
    const filename =
        path.basename(
            req.params.filename
        );

    const file =
        path.join(
            IMAGES_DIR,
            filename
        );

    if (
        fs.existsSync(file) &&
        fs.statSync(file).isFile()
    ) {
        return res.sendFile(file);
    }

    next();
});

/* =========================================================
   EXPRESS 5 SPA FALLBACK
   IMPORTANT:
   DO NOT USE app.get("*")
========================================================= */

app.use((req, res, next) => {
    if (
        req.method !== "GET" ||
        req.path.startsWith("/api/")
    ) {
        return next();
    }

    const indexFile =
        path.join(
            ROOT,
            "index.html"
        );

    if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
    }

    next();
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
    if (
        req.path.startsWith("/api/")
    ) {
        return res.status(404).json({
            success: false,
            error: "API endpoint not found."
        });
    }

    res.status(404).send(
        "Page not found."
    );
});

/* =========================================================
   START
========================================================= */

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `स्वरAJ server running on port ${PORT}`
    );

    console.log(
        `Songs directory: ${SONGS_DIR}`
    );

    console.log(
        `YouTube API: ${
            YOUTUBE_API_KEY
                ? "CONFIGURED"
                : "NOT CONFIGURED"
        }`
    );
});