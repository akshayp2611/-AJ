const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const SONGS_DIR = path.join(ROOT, "songs");
const IMAGES_DIR = path.join(ROOT, "images");

// ==================================================
// CREATE DIRECTORIES IF MISSING
// ==================================================

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

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(express.json());

// Serve frontend files from project root
app.use(
  express.static(ROOT, {
    index: false
  })
);

// Serve images
app.use(
  "/images",
  express.static(IMAGES_DIR)
);

// Serve songs
app.use(
  "/songs",
  express.static(SONGS_DIR, {
    acceptRanges: true,

    setHeaders: (res) => {
      res.setHeader(
        "Accept-Ranges",
        "bytes"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );
    }
  })
);

// ==================================================
// AUDIO FILE SCANNER
// ==================================================

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac"
];

function scanSongs(
  directory,
  category = null,
  results = []
) {
  if (!fs.existsSync(directory)) {
    return results;
  }

  let items;

  try {
    items = fs.readdirSync(
      directory,
      {
        withFileTypes: true
      }
    );
  } catch (error) {
    console.error(
      "Directory scan error:",
      error
    );

    return results;
  }

  for (const item of items) {
    const fullPath =
      path.join(
        directory,
        item.name
      );

    // ----------------------------------------------
    // DIRECTORY
    // ----------------------------------------------

    if (item.isDirectory()) {
      scanSongs(
        fullPath,
        category || item.name,
        results
      );

      continue;
    }

    // ----------------------------------------------
    // FILE
    // ----------------------------------------------

    const extension =
      path.extname(
        item.name
      ).toLowerCase();

    if (
      !AUDIO_EXTENSIONS.includes(
        extension
      )
    ) {
      continue;
    }

    const relativePath =
      path.relative(
        SONGS_DIR,
        fullPath
      );

    const encodedPath =
      relativePath
        .split(path.sep)
        .map(
          encodeURIComponent
        )
        .join("/");

    const title =
      path.basename(
        item.name,
        extension
      );

    const songCategory =
      category || "Music";

    results.push({
      id:
        `song-${results.length + 1}`,

      title,

      artist:
        "स्वरAJ",

      album:
        songCategory,

      category:
        songCategory,

      cover:
        "/images/default-cover.svg",

      url:
        `/songs/${encodedPath}`,

      file:
        relativePath.replace(
          /\\/g,
          "/"
        )
    });
  }

  return results;
}

// ==================================================
// GET SONGS
// ==================================================

function getSongs() {
  return scanSongs(
    SONGS_DIR
  );
}

// ==================================================
// HEALTH API
// ==================================================

app.get(
  "/api/health",
  (req, res) => {

    const songs =
      getSongs();

    res.json({
      status: "ok",

      songsDirectoryExists:
        fs.existsSync(
          SONGS_DIR
        ),

      songCount:
        songs.length,

      songsDirectory:
        SONGS_DIR
    });
  }
);

// ==================================================
// SONG API
// ==================================================

app.get(
  "/api/songs",
  (req, res) => {

    try {

      const songs =
        getSongs();

      res.json({
        success: true,

        count:
          songs.length,

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

        songs: [],

        error:
          error.message
      });
    }
  }
);

// ==================================================
// CATEGORY API
// ==================================================

app.get(
  "/api/categories",
  (req, res) => {

    try {

      const songs =
        getSongs();

      const categories =
        [
          ...new Set(
            songs.map(
              song =>
                song.category
            )
          )
        ];

      res.json({
        success: true,

        categories
      });

    } catch (error) {

      res.status(500).json({
        success: false,

        categories: [],

        error:
          error.message
      });
    }
  }
);

// ==================================================
// SEARCH API
// ==================================================

app.get(
  "/api/search",
  (req, res) => {

    const query =
      String(
        req.query.q || ""
      )
        .toLowerCase()
        .trim();

    const songs =
      getSongs();

    if (!query) {

      return res.json({
        success: true,

        count:
          songs.length,

        songs
      });
    }

    const results =
      songs.filter(
        song => {

          const searchable =
            [
              song.title,
              song.artist,
              song.album,
              song.category
            ]
              .join(" ")
              .toLowerCase();

          return searchable.includes(
            query
          );
        }
      );

    res.json({
      success: true,

      count:
        results.length,

      songs:
        results
    });
  }
);

// ==================================================
// API 404
// ==================================================

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      success: false,

      error:
        "API endpoint not found"
    });
  }
);

// ==================================================
// HOME PAGE
// ==================================================

app.get(
  "/",
  (req, res) => {

    const indexFile =
      path.join(
        ROOT,
        "index.html"
      );

    if (
      fs.existsSync(
        indexFile
      )
    ) {

      return res.sendFile(
        indexFile
      );
    }

    res
      .status(404)
      .send(
        "index.html not found"
      );
  }
);

// ==================================================
// EXPRESS 5 FRONTEND FALLBACK
// ==================================================

app.use(
  (req, res, next) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {
      return next();
    }

    const indexFile =
      path.join(
        ROOT,
        "index.html"
      );

    if (
      fs.existsSync(
        indexFile
      )
    ) {

      return res.sendFile(
        indexFile
      );
    }

    next();
  }
);

// ==================================================
// FINAL 404
// ==================================================

app.use(
  (req, res) => {

    res.status(404).json({
      success: false,

      error:
        "Not found",

      path:
        req.originalUrl
    });
  }
);

// ==================================================
// SERVER START
// ==================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    const songs =
      getSongs();

    console.log(
      "=========================================="
    );

    console.log(
      "        स्वरAJ MUSIC SERVER"
    );

    console.log(
      "=========================================="
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

    if (songs.length > 0) {

      songs.forEach(
        (song, index) => {

          console.log(
            `${index + 1}. [${song.category}] ${song.title}`
          );

          console.log(
            `   ${song.url}`
          );
        }
      );

    } else {

      console.log(
        "No audio files found."
      );
    }

    console.log(
      "=========================================="
    );
  }
);