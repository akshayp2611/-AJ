const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = __dirname;
const SONGS_DIR = path.join(ROOT, "songs");
const IMAGES_DIR = path.join(ROOT, "images");

app.use(express.json());
app.use(express.static(ROOT));

function cleanName(name) {
  return name
    .replace(/\.(mp3|m4a|wav|ogg|aac|flac)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function categoryFrom(filePath) {
  const relative = path.relative(SONGS_DIR, filePath);
  const parts = relative.split(path.sep);
  if (parts.length > 1) {
    const folder = parts[0].trim();
    if (folder) return folder;
  }

  const name = path.basename(filePath, path.extname(filePath));
  const lower = name.toLowerCase();

  if (/(ganesh|ganpati|aarti|bhajan|devotional|bappa|shree)/.test(lower)) return "Bhakti";
  if (/(love|romantic|ishq|pyaar|prem|adhura)/.test(lower)) return "Love";
  if (/(sad|emotional|alone|broken|dil)/.test(lower)) return "Emotional";
  if (/(party|dance|energy|energetic|dj|beat)/.test(lower)) return "Energetic";
  return "All Songs";
}

function imageForSong(filePath, title) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const candidates = [
    path.join(dir, `${base}.jpg`),
    path.join(dir, `${base}.jpeg`),
    path.join(dir, `${base}.png`),
    path.join(IMAGES_DIR, `${base}.jpg`),
    path.join(IMAGES_DIR, `${base}.jpeg`),
    path.join(IMAGES_DIR, `${base}.png`)
  ];

  const found = candidates.find(fs.existsSync);
  if (found) {
    const relative = path.relative(ROOT, found).split(path.sep).join("/");
    return "/" + relative;
  }

  return "/images/default-cover.svg";
}

function scanSongs() {
  if (!fs.existsSync(SONGS_DIR)) fs.mkdirSync(SONGS_DIR, { recursive: true });

  const audioExt = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"]);
  const result = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }

      if (!audioExt.has(path.extname(entry.name).toLowerCase())) continue;

      const relative = path.relative(SONGS_DIR, full).split(path.sep).join("/");
      const title = cleanName(entry.name);
      const category = categoryFrom(full);

      result.push({
        id: slug(relative),
        title,
        artist: "स्वरAJ",
        album: category,
        category,
        url: "/songs/" + relative.split("/").map(encodeURIComponent).join("/"),
        cover: imageForSong(full, title),
        filename: entry.name,
        path: relative
      });
    }
  }

  walk(SONGS_DIR);
  result.sort((a, b) => a.title.localeCompare(b.title));
  return result;
}

app.get("/api/health", (req, res) => {
  const songs = scanSongs();
  res.json({
    ok: true,
    status: "healthy",
    songs: songs.length,
    songsDirectory: SONGS_DIR,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/songs", (req, res) => {
  try {
    const songs = scanSongs();
    const q = String(req.query.q || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim().toLowerCase();

    let filtered = songs;

    if (q) {
      filtered = filtered.filter(s =>
        `${s.title} ${s.artist} ${s.album} ${s.category}`.toLowerCase().includes(q)
      );
    }

    if (category && category !== "all" && category !== "all songs") {
      filtered = filtered.filter(s => s.category.toLowerCase() === category);
    }

    res.json(filtered);
  } catch (error) {
    console.error("Song scan failed:", error);
    res.status(500).json({ error: "Unable to scan songs", details: error.message });
  }
});

app.get("/api/categories", (req, res) => {
  try {
    const songs = scanSongs();
    const counts = {};

    for (const song of songs) {
      counts[song.category] = (counts[song.category] || 0) + 1;
    }

    const preferred = ["All Songs", "Love", "Bhakti", "Energetic", "Emotional"];
    const categories = [
      {
        name: "All Songs",
        count: songs.length,
        icon: "♫"
      },
      ...preferred.slice(1)
        .filter(name => counts[name])
        .map(name => ({
          name,
          count: counts[name],
          icon: { Love: "♡", Bhakti: "ॐ", Energetic: "ϟ", Emotional: "☹" }[name]
        }))
    ];

    for (const name of Object.keys(counts)) {
      if (!categories.some(c => c.name.toLowerCase() === name.toLowerCase()) && name !== "All Songs") {
        categories.push({ name, count: counts[name], icon: "♫" });
      }
    }

    res.json(categories);
  } catch (error) {
    console.error("Category scan failed:", error);
    res.status(500).json({ error: "Unable to load categories", details: error.message });
  }
});

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found" });
  }
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`स्वरAJ running on port ${PORT}`);
  console.log(`Songs directory: ${SONGS_DIR}`);
});
