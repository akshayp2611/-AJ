const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const SONGS_DIR = path.join(ROOT, "songs");
const IMAGES_DIR = path.join(ROOT, "images");
const INDEX_FILE = path.join(ROOT, "index.html");

// ============================================================
// CREATE REQUIRED DIRECTORIES
// ============================================================

if (!fs.existsSync(SONGS_DIR)) {
    fs.mkdirSync(SONGS_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// STATIC FILES
// ============================================================

// Frontend files
app.use(express.static(ROOT, {
    index: false,
    maxAge: "1h"
}));

// Songs
app.use(
    "/songs",
    express.static(SONGS_DIR, {
        maxAge: "1h",
        acceptRanges: true
    })
);

// Images
app.use(
    "/images",
    express.static(IMAGES_DIR, {
        maxAge: "1h"
    })
);

// ============================================================
// HELPERS
// ============================================================

const AUDIO_EXTENSIONS = new Set([
    ".mp3",
    ".m4a",
    ".wav",
    ".ogg",
    ".aac",
    ".flac",
    ".webm"
]);

const IMAGE_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif"
]);

function cleanName(name) {
    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function encodePath(filePath) {
    return filePath
        .split(path.sep)
        .map(part => encodeURIComponent(part))
        .join("/");
}

function getImageForCategory(category) {
    const possibleNames = [
        category,
        category.toLowerCase(),
        category.replace(/\s+/g, "-"),
        category.replace(/\s+/g, "_")
    ];

    for (const name of possibleNames) {
        for (const ext of IMAGE_EXTENSIONS) {
            const file = path.join(IMAGES_DIR, name + ext);

            if (fs.existsSync(file)) {
                return `/images/${encodeURIComponent(name + ext)}`;
            }
        }
    }

    // Common fallback images
    const fallbackNames = [
        "default",
        "cover",
        "music",
        "album",
        "ganpati"
    ];

    for (const name of fallbackNames) {
        for (const ext of IMAGE_EXTENSIONS) {
            const file = path.join(IMAGES_DIR, name + ext);

            if (fs.existsSync(file)) {
                return `/images/${encodeURIComponent(name + ext)}`;
            }
        }
    }

    return null;
}

function getAudioFiles(dir, relativeDir = "") {
    let results = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    let entries;

    try {
        entries = fs.readdirSync(dir, {
            withFileTypes: true
        });
    } catch (error) {
        console.error("Unable to read directory:", dir, error);
        return results;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(relativeDir, entry.name);

        if (entry.isDirectory()) {
            results = results.concat(
                getAudioFiles(fullPath, relativePath)
            );
            continue;
        }

        const ext = path.extname(entry.name).toLowerCase();

        if (!AUDIO_EXTENSIONS.has(ext)) {
            continue;
        }

        const relativeFile = relativePath.split(path.sep).join("/");

        const parts = relativeFile.split("/");

        let category = "All Songs";

        if (parts.length > 1) {
            category = parts[0];
        }

        const title = cleanName(entry.name);

        let stats = {};

        try {
            stats = fs.statSync(fullPath);
        } catch (_) {
            stats = {};
        }

        results.push({
            id: Buffer.from(relativeFile).toString("base64url"),

            title,

            artist: "स्वरAJ",

            album: category,

            category,

            filename: entry.name,

            duration: 0,

            size: stats.size || 0,

            url: `/songs/${encodePath(relativeFile)}`,

            image: getImageForCategory(category),

            type: ext.replace(".", ""),

            path: relativeFile
        });
    }

    return results;
}

function scanSongs() {
    const songs = getAudioFiles(SONGS_DIR);

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

function getCategories() {
    const songs = scanSongs();

    const categoryMap = new Map();

    for (const song of songs) {
        const category = song.category || "Other";

        if (!categoryMap.has(category)) {
            categoryMap.set(category, {
                name: category,
                count: 0,
                image: getImageForCategory(category)
            });
        }

        categoryMap.get(category).count++;
    }

    return Array.from(categoryMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
}

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
    const songs = scanSongs();

    res.json({
        status: "ok",
        message: "स्वरAJ Music Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "production",
        songs: songs.length,
        categories: getCategories().length
    });
});

// ============================================================
// SONG API
// ============================================================

app.get("/api/songs", (req, res) => {
    try {
        const songs = scanSongs();

        res.json({
            success: true,
            count: songs.length,
            songs
        });
    } catch (error) {
        console.error("Songs API error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load songs",
            songs: []
        });
    }
});

// ============================================================
// CATEGORY API
// ============================================================

app.get("/api/categories", (req, res) => {
    try {
        const categories = getCategories();

        res.json({
            success: true,
            count: categories.length,
            categories
        });
    } catch (error) {
        console.error("Categories API error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load categories",
            categories: []
        });
    }
});

// ============================================================
// SONGS BY CATEGORY
// ============================================================

app.get("/api/categories/:category/songs", (req, res) => {
    try {
        const requestedCategory = decodeURIComponent(
            req.params.category
        );

        const songs = scanSongs().filter(song =>
            song.category.toLowerCase() ===
            requestedCategory.toLowerCase()
        );

        res.json({
            success: true,
            category: requestedCategory,
            count: songs.length,
            songs
        });
    } catch (error) {
        console.error("Category songs API error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load category songs",
            songs: []
        });
    }
});

// ============================================================
// SEARCH API
// ============================================================

app.get("/api/search", (req, res) => {
    try {
        const query = String(req.query.q || "")
            .trim()
            .toLowerCase();

        if (!query) {
            return res.json({
                success: true,
                count: 0,
                songs: []
            });
        }

        const songs = scanSongs();

        const results = songs.filter(song => {
            const searchableText = [
                song.title,
                song.artist,
                song.album,
                song.category,
                song.filename
            ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(query);
        });

        res.json({
            success: true,
            query,
            count: results.length,
            songs: results
        });
    } catch (error) {
        console.error("Search API error:", error);

        res.status(500).json({
            success: false,
            error: "Search failed",
            songs: []
        });
    }
});

// ============================================================
// LIBRARY API
// ============================================================

app.get("/api/library", (req, res) => {
    try {
        const songs = scanSongs();
        const categories = getCategories();

        res.json({
            success: true,

            library: {
                totalSongs: songs.length,
                totalCategories: categories.length,
                categories,
                songs
            }
        });
    } catch (error) {
        console.error("Library API error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to load music library"
        });
    }
});

// ============================================================
// REFRESH / RESCAN
// ============================================================

app.get("/api/refresh", (req, res) => {
    try {
        const songs = scanSongs();

        res.json({
            success: true,
            message: "Music library rescanned",
            count: songs.length,
            categories: getCategories().length,
            songs
        });
    } catch (error) {
        console.error("Refresh API error:", error);

        res.status(500).json({
            success: false,
            error: "Unable to rescan music"
        });
    }
});

// ============================================================
// DEBUG INFORMATION
// ============================================================

app.get("/api/debug", (req, res) => {
    const songs = scanSongs();
    const categories = getCategories();

    res.json({
        server: "स्वरAJ",
        node: process.version,
        platform: process.platform,
        root: ROOT,
        songsDirectory: SONGS_DIR,
        imagesDirectory: IMAGES_DIR,
        songsDirectoryExists: fs.existsSync(SONGS_DIR),
        imagesDirectoryExists: fs.existsSync(IMAGES_DIR),
        indexExists: fs.existsSync(INDEX_FILE),
        totalSongs: songs.length,
        totalCategories: categories.length,
        categories: categories.map(category => ({
            name: category.name,
            count: category.count
        }))
    });
});

// ============================================================
// FAVICON
// ============================================================

app.get("/favicon.ico", (req, res) => {
    const faviconCandidates = [
        path.join(IMAGES_DIR, "favicon.ico"),
        path.join(ROOT, "favicon.ico")
    ];

    const favicon = faviconCandidates.find(file =>
        fs.existsSync(file)
    );

    if (favicon) {
        return res.sendFile(favicon);
    }

    res.status(204).end();
});

// ============================================================
// FRONTEND
// IMPORTANT:
// Express 5 DOES NOT support app.get("*")
// Use "/{*splat}" instead.
// ============================================================

app.get("/{*splat}", (req, res) => {
    // Never allow API requests to fall through to index.html
    if (req.path.startsWith("/api/")) {
        return res.status(404).json({
            success: false,
            error: "API endpoint not found"
        });
    }

    if (!fs.existsSync(INDEX_FILE)) {
        return res.status(500).send(`
            <h1>स्वरAJ Server Error</h1>
            <p>index.html was not found.</p>
        `);
    }

    res.sendFile(INDEX_FILE);
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        error: "Internal server error"
    });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, "0.0.0.0", () => {
    console.log("==============================================");
    console.log("🎵 स्वरAJ Music Server");
    console.log("==============================================");
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Root: ${ROOT}`);
    console.log(`🎵 Songs: ${SONGS_DIR}`);
    console.log(`🖼️ Images: ${IMAGES_DIR}`);
    console.log(`🎧 Songs found: ${scanSongs().length}`);
    console.log(`📂 Categories: ${getCategories().length}`);
    console.log("==============================================");
});