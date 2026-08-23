const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const SONGS_DIR = path.join(ROOT, "songs");

app.use(express.json());

const AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac"
];

// --------------------------------------------------
// Scan songs recursively
// --------------------------------------------------

function scanSongs(directory, category = null, songs = []) {
  if (!fs.existsSync(directory)) {
    return songs;
  }

  let entries;

  try {
    entries = fs.readdirSync(directory, {
      withFileTypes: true
    });
  } catch (error) {
    console.error(
      "Unable to read directory:",
      directory,
      error
    );

    return songs;
  }

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    );

    // Folder
    if (entry.isDirectory()) {
      const currentCategory =
        category || entry.name;

      scanSongs(
        fullPath,
        currentCategory,
        songs
      );

      continue;
    }

    // File
    const extension =
      path.extname(entry.name).toLowerCase();

    if (
      !AUDIO_EXTENSIONS.includes(extension)
    ) {
      continue;
    }

    // Ignore empty files
    let stats;

    try {
      stats = fs.statSync(fullPath);
    } catch {
      continue;
    }

    if (!stats.isFile() || stats.size === 0) {
      console.log(
        "Skipping empty file:",
        fullPath
      );

      continue;
    }

    const relativePath =
      path.relative(
        SONGS_DIR,
        fullPath
      );

    /*
     * Encode each path component separately.
     *
     * Example:
     * Bhakti/Ganpati Aagman Demo.mp3
     *
     * becomes:
     * Bhakti/Ganpati%20Aagman%20Demo.mp3
     */

    const encodedPath =
      relativePath
        .split(path.sep)
        .map(part =>
          encodeURIComponent(part)
        )
        .join("/");

    const title =
      path.basename(
        entry.name,
        extension
      );

    songs.push({
      id: `song-${songs.length + 1}`,

      title: title,

      artist: "स्वरAJ",

      album:
        category || "Music",

      category:
        category || "Music",

      cover:
        "/images/default-cover.svg",

      url:
        `/songs/${encodedPath}`,

      file:
        relativePath
          .split(path.sep)
          .join("/")
    });
  }

  return songs;
}

// --------------------------------------------------
// Get songs
// --------------------------------------------------

function getSongs() {
  return scanSongs(
    SONGS_DIR
  );
}

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get(
  "/api/health",
  (req, res) => {
    try {
      const songs =
        getSongs();

      res.status(200).json({
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
    } catch (error) {
      console.error(
        "Health error:",
        error
      );

      res.status(500).json({
        status: "error",
        songCount: 0,
        error:
          error.message
      });
    }
  }
);

// --------------------------------------------------
// SONG API
// --------------------------------------------------

app.get(
  "/api/songs",
  (req, res) => {
    try {
      const songs =
        getSongs();

      console.log(
        `Song API: ${songs.length} songs found`
      );

      res.status(200).json({
        success: true,
        count: songs.length,
        songs: songs
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
    try {
      const songs =
        getSongs();

      const map =
        new Map();

      songs.forEach(song => {
        const category =
          song.category;

        map.set(
          category,
          (map.get(category) || 0) + 1
        );
      });

      const categories =
        Array.from(
          map.entries()
        ).map(
          ([name, count]) => ({
            name,
            count
          })
        );

      res.status(200).json({
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

// --------------------------------------------------
// SEARCH
// --------------------------------------------------

app.get(
  "/api/search",
  (req, res) => {
    try {
      const query =
        String(
          req.query.q || ""
        )
          .trim()
          .toLowerCase();

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
        songs.filter(song =>
          [
            song.title,
            song.artist,
            song.album,
            song.category,
            song.file
          ].some(value =>
            String(value)
              .toLowerCase()
              .includes(query)
          )
        );

      res.json({
        success: true,
        count:
          results.length,
        songs:
          results
      });
    } catch (error) {
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
// STATIC FILES
// --------------------------------------------------

app.use(
  express.static(
    ROOT,
    {
      index: false
    }
  )
);

// --------------------------------------------------
// AUDIO FILES
// --------------------------------------------------

app.get(
  "/songs/*splat",
  (req, res) => {
    try {
      let requested =
        req.params.splat;

      if (
        Array.isArray(
          requested
        )
      ) {
        requested =
          requested.join("/");
      }

      requested =
        String(
          requested || ""
        );

      const decoded =
        requested
          .split("/")
          .map(part => {
            try {
              return decodeURIComponent(
                part
              );
            } catch {
              return part;
            }
          })
          .join("/");

      const filePath =
        path.resolve(
          SONGS_DIR,
          decoded
        );

      const songsRoot =
        path.resolve(
          SONGS_DIR
        );

      // Security
      if (
        !filePath.startsWith(
          songsRoot +
            path.sep
        )
      ) {
        return res
          .status(403)
          .send(
            "Forbidden"
          );
      }

      if (
        !fs.existsSync(
          filePath
        )
      ) {
        console.log(
          "Song not found:",
          filePath
        );

        return res
          .status(404)
          .send(
            "Song not found"
          );
      }

      const stats =
        fs.statSync(
          filePath
        );

      if (!stats.isFile()) {
        return res
          .status(404)
          .send(
            "Song not found"
          );
      }

      res.setHeader(
        "Accept-Ranges",
        "bytes"
      );

      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );

      res.sendFile(
        filePath
      );
    } catch (error) {
      console.error(
        "Audio error:",
        error
      );

      res
        .status(500)
        .send(
          "Unable to play song"
        );
    }
  }
);

// --------------------------------------------------
// FRONTEND
// --------------------------------------------------

app.get(
  /.*/,
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

// --------------------------------------------------
// START
// --------------------------------------------------

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
      "SwarAJ Music Server"
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