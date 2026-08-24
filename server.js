const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const SONGS_DIR = path.join(ROOT_DIR, "songs");
const IMAGES_DIR = path.join(ROOT_DIR, "images");

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
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

app.disable("x-powered-by");

app.use(express.json());

/* =========================================================
   DIRECTORIES
========================================================= */

if (!fs.existsSync(SONGS_DIR)) {
  fs.mkdirSync(SONGS_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/* =========================================================
   HELPERS
========================================================= */

function cleanName(name) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodePath(parts) {
  return parts
    .map((part) => encodeURIComponent(part))
    .join("/");
}

/* =========================================================
   SCAN SONGS RECURSIVELY
========================================================= */

function scanSongs() {
  const songs = [];

  if (!fs.existsSync(SONGS_DIR)) {
    return songs;
  }

  function scanDirectory(directory) {
    let entries;

    try {
      entries = fs.readdirSync(directory, {
        withFileTypes: true
      });
    } catch (error) {
      console.error(
        "Directory read error:",
        directory,
        error.message
      );

      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(
        directory,
        entry.name
      );

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
        continue;
      }

      const extension =
        path.extname(entry.name).toLowerCase();

      if (!AUDIO_EXTENSIONS.has(extension)) {
        continue;
      }

      const relativePath =
        path.relative(
          SONGS_DIR,
          fullPath
        );

      const parts =
        relativePath.split(path.sep);

      const category =
        parts.length > 1
          ? cleanName(parts[0])
          : "All Songs";

      let stats = null;

      try {
        stats = fs.statSync(fullPath);
      } catch {}

      songs.push({
        id: Buffer
          .from(relativePath)
          .toString("base64url"),

        title: cleanName(entry.name),

        filename: entry.name,

        category,

        extension:
          extension.replace(".", ""),

        size: stats
          ? stats.size
          : 0,

        url:
          "/songs/" +
          encodePath(parts),

        cover:
          "/api/cover/" +
          encodeURIComponent(category)
      });
    }
  }

  scanDirectory(SONGS_DIR);

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
   COVER FINDER
========================================================= */

function findCover(category) {
  const possibleNames = [
    category,
    category.toLowerCase(),
    category.replace(/\s+/g, "-"),
    category.replace(/\s+/g, "_"),
    "default",
    "ganpati"
  ];

  for (const name of possibleNames) {
    for (const extension of IMAGE_EXTENSIONS) {
      const filePath =
        path.join(
          IMAGES_DIR,
          name + extension
        );

      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  }

  try {
    const files =
      fs.readdirSync(IMAGES_DIR);

    const image =
      files.find((file) =>
        IMAGE_EXTENSIONS.has(
          path.extname(file)
            .toLowerCase()
        )
      );

    if (image) {
      return path.join(
        IMAGES_DIR,
        image
      );
    }
  } catch {}

  return null;
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", (req, res) => {
  const songs = scanSongs();

  res.json({
    status: "ok",
    service: "स्वरAJ Music",
    nodeVersion: process.version,
    environment:
      process.env.NODE_ENV ||
      "production",

    songsDirectoryExists:
      fs.existsSync(SONGS_DIR),

    imagesDirectoryExists:
      fs.existsSync(IMAGES_DIR),

    songCount:
      songs.length,

    timestamp:
      new Date().toISOString()
  });
});

/* =========================================================
   SONG API
========================================================= */

app.get("/api/songs", (req, res) => {
  try {
    const songs = scanSongs();

    res.json({
      success: true,
      count: songs.length,
      songs
    });
  } catch (error) {
    console.error(
      "Song API error:",
      error
    );

    res.status(500).json({
      success: false,
      count: 0,
      songs: [],
      error:
        "Unable to scan music library"
    });
  }
});

/* =========================================================
   CATEGORY API
========================================================= */

app.get("/api/categories", (req, res) => {
  try {
    const songs = scanSongs();

    const categoryMap = new Map();

    for (const song of songs) {
      if (!categoryMap.has(song.category)) {
        categoryMap.set(
          song.category,
          {
            name: song.category,
            count: 0,
            cover: song.cover
          }
        );
      }

      categoryMap.get(
        song.category
      ).count++;
    }

    const categories =
      Array.from(
        categoryMap.values()
      ).sort((a, b) =>
        a.name.localeCompare(
          b.name
        )
      );

    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error(
      "Category API error:",
      error
    );

    res.status(500).json({
      success: false,
      count: 0,
      categories: []
    });
  }
});

/* =========================================================
   SEARCH API
========================================================= */

app.get("/api/search", (req, res) => {
  const query =
    String(req.query.q || "")
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

  const results =
    songs.filter((song) =>
      song.title
        .toLowerCase()
        .includes(query) ||

      song.category
        .toLowerCase()
        .includes(query) ||

      song.filename
        .toLowerCase()
        .includes(query)
    );

  res.json({
    success: true,
    count: results.length,
    songs: results
  });
});

/* =========================================================
   COVER API
========================================================= */

app.get(
  "/api/cover/:category",
  (req, res) => {
    const category =
      decodeURIComponent(
        req.params.category || ""
      );

    const cover =
      findCover(category);

    if (!cover) {
      return res.status(404).send(
        "Cover not found"
      );
    }

    res.sendFile(cover);
  }
);

/* =========================================================
   SONG FILES
========================================================= */

app.use(
  "/songs",
  express.static(SONGS_DIR, {
    fallthrough: false,

    setHeaders: (res) => {
      res.setHeader(
        "Cache-Control",
        "public, max-age=31536000"
      );

      res.setHeader(
        "Accept-Ranges",
        "bytes"
      );
    }
  })
);

/* =========================================================
   IMAGES
========================================================= */

app.use(
  "/images",
  express.static(IMAGES_DIR, {
    maxAge: "7d"
  })
);

/* =========================================================
   FRONTEND STATIC FILES
========================================================= */

app.use(
  express.static(ROOT_DIR, {
    index: "index.html"
  })
);

/* =========================================================
   FRONTEND FALLBACK
   IMPORTANT:
   Express 5 requires named wildcard syntax.
========================================================= */

app.get(
  "/{*splat}",
  (req, res) => {

    if (
      req.path.startsWith("/api/") ||
      req.path.startsWith("/songs/") ||
      req.path.startsWith("/images/")
    ) {
      return res.status(404).json({
        success: false,
        error: "Not found"
      });
    }

    const indexFile =
      path.join(
        ROOT_DIR,
        "index.html"
      );

    if (!fs.existsSync(indexFile)) {
      return res.status(404).send(
        "index.html not found"
      );
    }

    res.sendFile(indexFile);
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      success: false,
      error:
        "Internal server error"
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    const songs =
      scanSongs();

    console.log("");
    console.log(
      "========================================"
    );

    console.log(
      "        स्वरAJ PREMIUM MUSIC"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Node: ${process.version}`
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Songs directory: ${SONGS_DIR}`
    );

    console.log(
      `Songs found: ${songs.length}`
    );

    console.log(
      `Songs directory exists: ${
        fs.existsSync(SONGS_DIR)
      }`
    );

    console.log(
      "========================================"
    );

    if (songs.length === 0) {
      console.log(
        "WARNING: No audio files found."
      );
    } else {

      const categories = {};

      for (const song of songs) {
        categories[song.category] =
          (categories[song.category] || 0) + 1;
      }

      console.log(
        "Music categories:"
      );

      for (
        const [category, count]
        of Object.entries(categories)
      ) {
        console.log(
          `  ${category}: ${count}`
        );
      }
    }

    console.log(
      "========================================"
    );
    console.log("");
  }
);