const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const audio = $("#audio");

const state = {
  songs: [],
  filtered: [],
  current: -1,
  favorites: JSON.parse(
    localStorage.getItem("swaraj-favorites") || "[]"
  ),
  shuffle: false,
  repeat: false
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  await loadSongs();
  await loadCategories();
}

async function api(url) {
  const res = await fetch(url, {
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function loadSongs() {

  const grid = $("#songGrid");

  grid.innerHTML =
    '<div class="loading">Loading songs…</div>';

  try {

    const data = await api("/api/songs");

    const songs = Array.isArray(data)
      ? data
      : (data.songs || data.data || []);

    state.songs = songs.map(normalizeSong);

    state.filtered = [...state.songs];

    $("#songCount").textContent =
      state.songs.length;

    renderSongs();

  } catch (err) {

    console.error(err);

    grid.innerHTML = `
      <div class="empty">
        Unable to load songs.
        <br>
        <small>
          Check /api/health and your Render logs.
        </small>
      </div>
    `;

    toast("Song API could not be loaded");
  }
}

function normalizeSong(song) {

  return {

    id: String(
      song.id ??
      song.path ??
      song.url ??
      song.title
    ),

    title:
      song.title ||
      song.name ||
      "Untitled Song",

    artist:
      song.artist ||
      song.singer ||
      "स्वरAJ",

    album:
      song.album ||
      song.category ||
      "Music",

    category:
      song.category ||
      song.genre ||
      "All Songs",

    url:
      song.url ||
      song.src ||
      song.file ||
      "",

    cover:
      song.cover ||
      song.image ||
      song.artwork ||
      "/images/default-cover.svg"
  };
}

async function loadCategories() {

  try {

    const data =
      await api("/api/categories");

    const categories =
      Array.isArray(data)
        ? data
        : (data.categories || data.data || []);

    renderCategories(categories);

  } catch (err) {

    console.warn(
      "Categories unavailable",
      err
    );

    const fallback = [

      {
        name: "All Songs",
        count: state.songs.length,
        icon: "♫"
      },

      {
        name: "Love",
        count: countCategory("Love"),
        icon: "♡"
      },

      {
        name: "Bhakti",
        count: countCategory("Bhakti"),
        icon: "ॐ"
      },

      {
        name: "Energetic",
        count: countCategory("Energetic"),
        icon: "ϟ"
      },

      {
        name: "Emotional",
        count: countCategory("Emotional"),
        icon: "☹"
      }

    ];

    renderCategories(fallback);
  }
}

function countCategory(name) {

  return state.songs.filter(
    s =>
      s.category.toLowerCase() ===
      name.toLowerCase()
  ).length;
}

function renderCategories(categories) {

  const wrap = $("#categories");
  const side = $("#sideCategories");

  wrap.innerHTML = "";
  side.innerHTML = "";

  categories.forEach((c, index) => {

    const name =
      c.name ||
      c.category ||
      "All Songs";

    const count =
      Number(
        c.count ??
        countCategory(name)
      );

    const icon =
      c.icon ||
      "♫";

    const card =
      document.createElement("button");

    card.className =
      "category" +
      (index === 0 ? " active" : "");

    card.dataset.category =
      name;

    card.innerHTML = `
      <div class="cat-icon">
        ${escapeHtml(icon)}
      </div>

      <h3>
        ${escapeHtml(name)}
      </h3>

      <span>
        ${count}
        ${count === 1 ? "song" : "songs"}
      </span>
    `;

    card.onclick =
      () => selectCategory(name);

    wrap.appendChild(card);

    if (name !== "All Songs") {

      const btn =
        document.createElement("button");

      btn.className =
        "nav-item";

      btn.innerHTML = `
        ♫
        <span>
          ${escapeHtml(name)}
        </span>
      `;

      btn.onclick =
        () => selectCategory(name);

      side.appendChild(btn);
    }

  });
}

function renderSongs() {

  const grid =
    $("#songGrid");

  grid.innerHTML = "";

  if (!state.filtered.length) {

    grid.innerHTML = `
      <div class="empty">
        No songs found.
        <br>
        <small>
          Add MP3 files inside the
          songs/ folder and redeploy.
        </small>
      </div>
    `;

    return;
  }

  state.filtered.forEach(song => {

    const card =
      document.createElement("article");

    card.className =
      "song-card";

    const fav =
      state.favorites.includes(song.id);

    card.innerHTML = `

      <div class="cover song-cover">

        <span>♫</span>

        <button
          class="play-overlay"
          aria-label="Play"
        >
          ▶
        </button>

        <button
          class="fav-btn ${fav ? "active" : ""}"
          aria-label="Favorite"
        >
          ${fav ? "♥" : "♡"}
        </button>

      </div>

      <div class="song-info">

        <strong
          title="${escapeAttr(song.title)}"
        >
          ${escapeHtml(song.title)}
        </strong>

        <span>
          ${escapeHtml(song.artist)}
          ·
          ${escapeHtml(song.category)}
        </span>

      </div>
    `;

    card
      .querySelector(".play-overlay")
      .onclick = e => {

        e.stopPropagation();

        playSongById(song.id);
      };

    card
      .querySelector(".fav-btn")
      .onclick = e => {

        e.stopPropagation();

        toggleFavorite(song.id);
      };

    card.onclick =
      () => playSongById(song.id);

    grid.appendChild(card);
  });
}

function selectCategory(category) {

  $$(".category").forEach(c => {

    c.classList.toggle(
      "active",
      c.dataset.category.toLowerCase() ===
      category.toLowerCase()
    );

  });

  state.filtered =
    category.toLowerCase() ===
    "all songs"

      ? [...state.songs]

      : state.songs.filter(
          s =>
            s.category.toLowerCase() ===
            category.toLowerCase()
        );

  $("#songsHeading").textContent =
    category;

  $("#songsSubheading").textContent =
    `${state.filtered.length} songs`;

  renderSongs();

  window.scrollTo({
    top:
      document.querySelector(".section")
        .offsetTop - 20,
    behavior: "smooth"
  });
}

function searchSongs(query) {

  const q =
    query.trim().toLowerCase();

  state.filtered =
    !q

      ? [...state.songs]

      : state.songs.filter(s =>
          `${s.title} ${s.artist} ${s.album} ${s.category}`
            .toLowerCase()
            .includes(q)
        );

  $("#songsHeading").textContent =
    q
      ? `Search: ${query}`
      : "Recently Added";

  $("#songsSubheading").textContent =
    `${state.filtered.length} songs`;

  renderSongs();
}

function playSongById(id) {

  const index =
    state.songs.findIndex(
      s => s.id === id
    );

  if (index < 0) return;

  state.current = index;

  loadCurrent(true);
}

function loadCurrent(
  autoplay = false
) {

  const song =
    state.songs[state.current];

  if (!song) return;

  if (!song.url) {

    toast(
      "This song has no playable file URL"
    );

    return;
  }

  audio.src = song.url;

  audio.load();

  $("#playerTitle").textContent =
    song.title;

  $("#playerArtist").textContent =
    song.artist;

  $("#playerCover").innerHTML =
    "♫";

  $("#playPauseBtn").textContent =
    "❚❚";

  if (autoplay) {

    audio.play().catch(() => {

      $("#playPauseBtn").textContent =
        "▶";

    });

  }
}

function togglePlay() {

  if (state.current < 0) {

    if (!state.songs.length) {

      return toast(
        "No songs available"
      );
    }

    state.current = 0;

    loadCurrent(true);

    return;
  }

  if (audio.paused) {

    audio
      .play()
      .catch(() =>
        toast(
          "Unable to play this audio"
        )
      );

  } else {

    audio.pause();
  }
}

function nextSong() {

  if (!state.songs.length)
    return;

  if (state.shuffle) {

    state.current =
      Math.floor(
        Math.random() *
        state.songs.length
      );

  } else {

    state.current =
      (state.current + 1) %
      state.songs.length;
  }

  loadCurrent(true);
}

function prevSong() {

  if (!state.songs.length)
    return;

  if (audio.currentTime > 3) {

    audio.currentTime = 0;

    return;
  }

  state.current =
    (
      state.current - 1 +
      state.songs.length
    ) %
    state.songs.length;

  loadCurrent(true);
}

function toggleFavorite(id) {

  const i =
    state.favorites.indexOf(id);

  if (i >= 0) {

    state.favorites.splice(i, 1);

  } else {

    state.favorites.push(id);
  }

  localStorage.setItem(
    "swaraj-favorites",
    JSON.stringify(
      state.favorites
    )
  );

  renderSongs();
}

function showFavorites() {

  state.filtered =
    state.songs.filter(
      s =>
        state.favorites.includes(
          s.id
        )
    );

  $("#songsHeading").textContent =
    "Favorites";

  $("#songsSubheading").textContent =
    `${state.filtered.length} saved songs`;

  renderSongs();
}

function bindEvents() {

  $("#menuBtn").onclick = () => {

    $("#sidebar")
      .classList
      .toggle("open");
  };

  $("#searchInput").oninput =
    e => {

      $("#clearSearch").hidden =
        !e.target.value;

      searchSongs(
        e.target.value
      );
    };

  $("#clearSearch").onclick =
    () => {

      $("#searchInput").value =
        "";

      $("#clearSearch").hidden =
        true;

      searchSongs("");
    };

  $("#playPauseBtn").onclick =
    togglePlay;

  $("#nextBtn").onclick =
    nextSong;

  $("#prevBtn").onclick =
    prevSong;

  $("#shuffleBtn").onclick =
    () => {

      state.shuffle =
        !state.shuffle;

      $("#shuffleBtn").style.color =
        state.shuffle
          ? "#ff3d91"
          : "";
    };

  $("#repeatBtn").onclick =
    () => {

      state.repeat =
        !state.repeat;

      $("#repeatBtn").style.color =
        state.repeat
          ? "#ff3d91"
          : "";
    };

  $("#volume").oninput =
    e =>
      audio.volume =
        Number(e.target.value);

  $("#progress").oninput =
    e => {

      if (audio.duration) {

        audio.currentTime =
          (
            Number(e.target.value) /
            100
          ) *
          audio.duration;
      }
    };

  audio.addEventListener(
    "timeupdate",
    () => {

      const pct =
        audio.duration
          ? (
              audio.currentTime /
              audio.duration
            ) * 100
          : 0;

      $("#progress").value =
        pct;

      $("#currentTime").textContent =
        formatTime(
          audio.currentTime
        );
    }
  );

  audio.addEventListener(
    "loadedmetadata",
    () => {

      $("#duration").textContent =
        formatTime(
          audio.duration
        );
    }
  );

  audio.addEventListener(
    "play",
    () =>
      $("#playPauseBtn")
        .textContent = "❚❚"
  );

  audio.addEventListener(
    "pause",
    () =>
      $("#playPauseBtn")
        .textContent = "▶"
  );

  audio.addEventListener(
    "ended",
    () => {

      if (state.repeat) {

        audio.currentTime = 0;

        audio.play();

      } else {

        nextSong();
      }
    }
  );

  $("#playAllBtn").onclick =
    () => {

      if (!state.songs.length) {

        return toast(
          "No songs available"
        );
      }

      state.current = 0;

      loadCurrent(true);
    };

  $("#exploreBtn").onclick =
    $("#heroExplore").onclick =
    () => {

      document
        .querySelector(".section")
        .scrollIntoView({
          behavior: "smooth"
        });
    };

  $("#showAllBtn").onclick =
    $("#viewCategories").onclick =
    () =>
      selectCategory(
        "All Songs"
      );

  $$(".nav-item[data-view]")
    .forEach(btn => {

      btn.onclick = () => {

        $$(".nav-item")
          .forEach(x =>
            x.classList.remove(
              "active"
            )
          );

        btn.classList.add(
          "active"
        );

        if (
          btn.dataset.view ===
          "favorites"
        ) {

          showFavorites();

        } else {

          selectCategory(
            "All Songs"
          );
        }

        $("#sidebar")
          .classList
          .remove("open");
      };

    });
}

function formatTime(seconds) {

  if (!Number.isFinite(seconds))
    return "0:00";

  const m =
    Math.floor(
      seconds / 60
    );

  const s =
    Math.floor(
      seconds % 60
    )
      .toString()
      .padStart(2, "0");

  return `${m}:${s}`;
}

function escapeHtml(value) {

  return String(value)
    .replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[c])
    );
}

function escapeAttr(value) {

  return escapeHtml(value);
}

let toastTimer;

function toast(message) {

  const el =
    $("#toast");

  el.textContent =
    message;

  el.classList.add(
    "show"
  );

  clearTimeout(
    toastTimer
  );

  toastTimer =
    setTimeout(
      () =>
        el.classList.remove(
          "show"
        ),
      2600
    );
}