const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const SONGS_DIR = path.join(ROOT, "songs");

app.use(express.json());

app.use(express.static(PUBLIC_DIR));

// --------------------------------------------------
// SERVE MUSIC FILES
// --------------------------------------------------

app.use(
  "/songs",
  express.static(SONGS_DIR, {
    setHeaders: (res) => {
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );
    }
  })
);

// --------------------------------------------------
// SCAN AUDIO FILES
// --------------------------------------------------

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

      const nextCategory =
        category || item.name;

      getAudioFiles(
        fullPath,
        nextCategory,
        results
      );

      continue;
    }

    const ext =
      path.extname(item.name)
        .toLowerCase();

    // Supported audio formats
    if (
      [
        ".mp3",
        ".wav",
        ".ogg",
        ".m4a",
        ".aac",
        ".flac"
      ].includes(ext)
    ) {

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
          results.length + 1,

        title:
          path.basename(
            item.name,
            ext
          ),

        category:
          category || "Music",

        url:
          `/songs/${urlPath}`,

        file:
          relativePath.replace(
            /\\/g,
            "/"
          )
      });
    }
  }

  return results;
}

// --------------------------------------------------
// GET ALL SONGS
// --------------------------------------------------

function getSongs() {

  return getAudioFiles(
    SONGS_DIR
  );

}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      status: "ok",

      songsDirectory:
        SONGS_DIR,

      songsDirectoryExists:
        fs.existsSync(
          SONGS_DIR
        ),

      songCount:
        getSongs().length

    });

  }
);

// --------------------------------------------------
// ALL SONGS
// --------------------------------------------------

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

// --------------------------------------------------
// CATEGORIES
// --------------------------------------------------

app.get(
  "/api/categories",
  (req, res) => {

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

  }
);

// --------------------------------------------------
// SEARCH
// --------------------------------------------------

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

    // Empty search
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
        song =>

          song.title
            .toLowerCase()
            .includes(query)

          ||

          song.category
            .toLowerCase()
            .includes(query)
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

// --------------------------------------------------
// API 404
// --------------------------------------------------

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

// --------------------------------------------------
// FRONTEND
// --------------------------------------------------

app.get(
  "*",
  (req, res) => {

    const indexFile =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      fs.existsSync(
        indexFile
      )
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

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Swaraj Music running on port ${PORT}`
    );

    console.log(
      `Songs directory: ${SONGS_DIR}`
    );

    console.log(
      `Songs found: ${getSongs().length}`
    );

  }
);