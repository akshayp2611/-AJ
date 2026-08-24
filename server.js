const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const SONGS_DIR = path.join(ROOT, "songs");

app.use(express.json());

// ==================================================
// FRONTEND STATIC FILES
// ==================================================

app.use(express.static(ROOT, {
  index: false
}));

// ==================================================
// SONG FILES
// ==================================================

app.use(
  "/songs",
  express.static(SONGS_DIR, {
    acceptRanges: true,

    setHeaders: (res) => {
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );
    }
  })
);

// ==================================================
// AUDIO SCANNER
// ==================================================

function getAudioFiles(
  dir,
  category = null,
  results = []
) {
  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir, {
    withFileTypes: true
  });

  for (const item of items) {
    const fullPath =
      path.join(dir, item.name);

    // Folder = category
    if (item.isDirectory()) {

      getAudioFiles(
        fullPath,
        category || item.name,
        results
      );

      continue;
    }

    const ext =
      path.extname(item.name)
        .toLowerCase();

    const supportedFormats = [
      ".mp3",
      ".wav",
      ".ogg",
      ".m4a",
      ".aac",
      ".flac"
    ];

    if (!supportedFormats.includes(ext)) {
      continue;
    }

    const relativePath =
      path.relative(
        SONGS_DIR,
        fullPath
      );

    const urlPath =
      relativePath
        .split(path.sep)
        .map(encodeURIComponent)
        .join("/");

    results.push({

      id:
        `song-${results.length + 1}`,

      title:
        path.basename(
          item.name,
          ext
        ),

      artist:
        "स्वरAJ",

      album:
        category || "Music",

      category:
        category || "Music",

      cover:
        "/images/default-cover.svg",

      url:
        `/songs/${urlPath}`,

      file:
        relativePath.replace(
          /\\/g,
          "/"
        )
    });
  }

  return results;
}

function getSongs() {
  return getAudioFiles(
    SONGS_DIR
  );
}

// ==================================================
// HEALTH CHECK
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
// ALL SONGS
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
        "Song scan error:",
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
// CATEGORIES
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

      console.error(
        "Category error:",
        error
      );

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
// SEARCH
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
      songs.filter(song => {

        const text =
          [
            song.title,
            song.artist,
            song.album,
            song.category
          ]
            .join(" ")
            .toLowerCase();

        return text.includes(query);
      });

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
// FRONTEND
// ==================================================

// Explicit homepage route
app.get(
  "/",
  (req, res) => {

    const indexFile =
      path.join(
        ROOT,
        "index.html"
      );

    if (
      fs.existsSync(indexFile)
    ) {

      res.sendFile(
        indexFile
      );

    } else {

      res
        .status(404)
        .send(
          "index.html not found"
        );
    }
  }
);

// ==================================================
// FRONTEND FALLBACK
// ==================================================

// Express 5 compatible fallback.
// No app.get("*") is used.

app.use(
  (req, res, next) => {

    // Don't interfere with APIs
    if (
      req.path.startsWith("/api/")
    ) {
      return next();
    }

    const indexFile =
      path.join(
        ROOT,
        "index.html"
      );

    if (
      fs.existsSync(indexFile)
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
// START SERVER
// ==================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    const songs =
      getSongs();

    console.log(
      "================================="
    );

    console.log(
      "स्वरAJ Music Server"
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

    songs.forEach(song => {

      console.log(
        `[${song.category}] ${song.title}`
      );

      console.log(
        `URL: ${song.url}`
      );

    });

    console.log(
      "================================="
    );
  }
);