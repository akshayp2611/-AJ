const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const ROOT_DIR = __dirname;
const SONGS_DIR = path.join(ROOT_DIR, "songs");
const IMAGES_DIR = path.join(ROOT_DIR, "images");

const YOUTUBE_API_KEY =
  process.env.YOUTUBE_API_KEY || "";

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

app.use(
  express.json({
    limit: "10mb"
  })
);

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
   HELPERS
========================================================= */

function cleanName(name) {
  return String(name)
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function encodePath(parts) {
  return parts
    .map((part) =>
      encodeURIComponent(part)
    )
    .join("/");
}

function getYouTubeVideoId(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  if (
    /^[A-Za-z0-9_-]{11}$/.test(text)
  ) {
    return text;
  }

  try {
    const url = new URL(text);

    const hostname =
      url.hostname.toLowerCase();

    if (
      hostname === "youtu.be" ||
      hostname.endsWith(".youtu.be")
    ) {
      return (
        url.pathname
          .split("/")
          .filter(Boolean)[0] || null
      );
    }

    if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtube-nocookie.com" ||
      hostname === "www.youtube-nocookie.com"
    ) {
      const videoId =
        url.searchParams.get("v");

      if (videoId) {
        return videoId;
      }

      const parts =
        url.pathname
          .split("/")
          .filter(Boolean);

      const index =
        parts.findIndex((part) =>
          [
            "embed",
            "shorts",
            "live"
          ].includes(part)
        );

      if (
        index >= 0 &&
        parts[index + 1]
      ) {
        return parts[index + 1];
      }
    }
  } catch (_) {}

  return null;
}

/* =========================================================
   SCAN LOCAL SONGS
========================================================= */

function scanSongs() {
  const songs = [];

  if (!fs.existsSync(SONGS_DIR)) {
    return songs;
  }

  function scanDirectory(directory) {
    let entries;

    try {
      entries = fs.readdirSync(
        directory,
        {
          withFileTypes: true
        }
      );
    } catch (error) {
      console.error(
        "Directory read error:",
        directory,
        error.message
      );

      return;
    }

    for (const entry of entries) {
      const fullPath =
        path.join(
          directory,
          entry.name
        );

      if (entry.isDirectory()) {
        scanDirectory(fullPath);
        continue;
      }

      const extension =
        path.extname(
          entry.name
        ).toLowerCase();

      if (
        !AUDIO_EXTENSIONS.has(
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

      const parts =
        relativePath.split(
          path.sep
        );

      const category =
        parts.length > 1
          ? cleanName(parts[0])
          : "All Songs";

      let stats = null;

      try {
        stats =
          fs.statSync(fullPath);
      } catch (_) {}

      const id =
        Buffer
          .from(relativePath)
          .toString("base64url");

      songs.push({
        id,

        title:
          cleanName(entry.name),

        filename:
          entry.name,

        artist:
          "SwarAJ",

        category,

        extension:
          extension.replace(".", ""),

        size:
          stats
            ? stats.size
            : 0,

        source_type:
          "mp3",

        type:
          "mp3",

        url:
          "/songs/" +
          encodePath(parts),

        audio_url:
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
  } catch (_) {}

  return null;
}

/* =========================================================
   YOUTUBE SEARCH API
========================================================= */

app.get(
  "/api/youtube/search",
  async (req, res) => {
    try {
      const query =
        String(
          req.query.q || ""
        ).trim();

      if (!query) {
        return res.status(400).json({
          success: false,
          error:
            "Search query is required.",
          results: []
        });
      }

      if (!YOUTUBE_API_KEY) {
        return res.status(503).json({
          success: false,
          error:
            "YOUTUBE_API_KEY is not configured on the server.",
          results: []
        });
      }

      const requestedLimit =
        Number(req.query.limit);

      const maxResults =
        Number.isInteger(
          requestedLimit
        )
          ? Math.min(
              Math.max(
                requestedLimit,
                1
              ),
              25
            )
          : 10;

      const url =
        new URL(
          "https://www.googleapis.com/youtube/v3/search"
        );

      url.searchParams.set(
        "part",
        "snippet"
      );

      url.searchParams.set(
        "q",
        query
      );

      url.searchParams.set(
        "type",
        "video"
      );

      url.searchParams.set(
        "maxResults",
        String(maxResults)
      );

      url.searchParams.set(
        "regionCode",
        "IN"
      );

      url.searchParams.set(
        "videoEmbeddable",
        "true"
      );

      url.searchParams.set(
        "key",
        YOUTUBE_API_KEY
      );

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "YouTube API error:",
          data
        );

        return res.status(
          response.status
        ).json({
          success: false,
          error:
            data?.error?.message ||
            "YouTube API request failed.",
          results: []
        });
      }

      const results =
        Array.isArray(data.items)
          ? data.items
              .filter(
                (item) =>
                  item?.id?.videoId
              )
              .map((item) => {
                const videoId =
                  item.id.videoId;

                const snippet =
                  item.snippet || {};

                return {
                  id:
                    `youtube-${videoId}`,

                  videoId,

                  title:
                    snippet.title ||
                    "YouTube Video",

                  artist:
                    snippet.channelTitle ||
                    "YouTube",

                  category:
                    "YouTube",

                  description:
                    snippet.description ||
                    "",

                  publishedAt:
                    snippet.publishedAt ||
                    null,

                  cover:
                    snippet?.thumbnails?.high?.url ||
                    snippet?.thumbnails?.medium?.url ||
                    snippet?.thumbnails?.default?.url ||
                    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

                  thumbnail:
                    snippet?.thumbnails?.high?.url ||
                    snippet?.thumbnails?.medium?.url ||
                    snippet?.thumbnails?.default?.url ||
                    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

                  youtubeUrl:
                    `https://www.youtube.com/watch?v=${videoId}`,

                  youtube_url:
                    `https://www.youtube.com/watch?v=${videoId}`,

                  source_type:
                    "youtube",

                  type:
                    "youtube"
                };
              })
          : [];

      res.json({
        success: true,
        query,
        count: results.length,
        results
      });

    } catch (error) {
      console.error(
        "YouTube search error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Unable to search YouTube.",
        results: []
      });
    }
  }
);

/* =========================================================
   YOUTUBE VIDEO DETAILS
========================================================= */

app.get(
  "/api/youtube/video/:id",
  async (req, res) => {
    try {
      const videoId =
        getYouTubeVideoId(
          req.params.id
        );

      if (!videoId) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid YouTube video ID."
        });
      }

      res.json({
        success: true,

        video: {
          id:
            `youtube-${videoId}`,

          videoId,

          title:
            "YouTube Video",

          artist:
            "YouTube",

          category:
            "YouTube",

          source_type:
            "youtube",

          type:
            "youtube",

          youtubeUrl:
            `https://www.youtube.com/watch?v=${videoId}`,

          youtube_url:
            `https://www.youtube.com/watch?v=${videoId}`,

          cover:
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        }
      });

    } catch (error) {
      console.error(
        "YouTube video error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Unable to load YouTube video."
      });
    }
  }
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (req, res) => {
    const songs =
      scanSongs();

    res.json({
      status: "ok",

      service:
        "स्वरAJ Music",

      nodeVersion:
        process.version,

      environment:
        process.env.NODE_ENV ||
        "production",

      youtubeApi:
        Boolean(
          YOUTUBE_API_KEY
        ),

      songsDirectoryExists:
        fs.existsSync(
          SONGS_DIR
        ),

      imagesDirectoryExists:
        fs.existsSync(
          IMAGES_DIR
        ),

      songCount:
        songs.length,

      timestamp:
        new Date().toISOString()
    });
  }
);

/* =========================================================
   SONG API
========================================================= */

app.get(
  "/api/songs",
  (req, res) => {
    try {
      const songs =
        scanSongs();

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
  }
);

/* =========================================================
   CATEGORY API
========================================================= */

app.get(
  "/api/categories",
  (req, res) => {
    try {
      const songs =
        scanSongs();

      const categoryMap =
        new Map();

      for (const song of songs) {
        if (
          !categoryMap.has(
            song.category
          )
        ) {
          categoryMap.set(
            song.category,
            {
              name:
                song.category,

              count: 0,

              cover:
                song.cover
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
        count:
          categories.length,
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
  }
);

/* =========================================================
   SEARCH LOCAL SONGS
========================================================= */

app.get(
  "/api/search",
  (req, res) => {
    const query =
      String(
        req.query.q || ""
      )
        .trim()
        .toLowerCase();

    if (!query) {
      return res.json({
        success: true,
        count: 0,
        songs: []
      });
    }

    const songs =
      scanSongs();

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
          .includes(query) ||

        song.artist
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
   LOCAL SONG FILES
========================================================= */

app.use(
  "/songs",
  express.static(
    SONGS_DIR,
    {
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
    }
  )
);

/* =========================================================
   IMAGES
========================================================= */

app.use(
  "/images",
  express.static(
    IMAGES_DIR,
    {
      maxAge: "7d"
    }
  )
);

/* =========================================================
   FRONTEND
========================================================= */

app.use(
  express.static(
    ROOT_DIR,
    {
      index:
        "index.html"
    }
  )
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get(
  "/{*splat}",
  (req, res) => {
    if (
      req.path.startsWith(
        "/api/"
      ) ||
      req.path.startsWith(
        "/songs/"
      ) ||
      req.path.startsWith(
        "/images/"
      )
    ) {
      return res.status(404).json({
        success: false,
        error:
          "Not found"
      });
    }

    const indexFile =
      path.join(
        ROOT_DIR,
        "index.html"
      );

    if (
      !fs.existsSync(
        indexFile
      )
    ) {
      return res.status(404).send(
        "index.html not found"
      );
    }

    res.sendFile(
      indexFile
    );
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled server error:",
      error
    );

    if (
      res.headersSent
    ) {
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
      `YouTube API configured: ${Boolean(
        YOUTUBE_API_KEY
      )}`
    );

    console.log(
      "========================================"
    );

    if (!songs.length) {
      console.log(
        "WARNING: No audio files found."
      );
    } else {
      const categories = {};

      for (const song of songs) {
        categories[
          song.category
        ] =
          (
            categories[
              song.category
            ] || 0
          ) + 1;
      }

      console.log(
        "Music categories:"
      );

      for (
        const [
          category,
          count
        ]
        of Object.entries(
          categories
        )
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