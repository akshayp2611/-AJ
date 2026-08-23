"use strict";

/* =========================================================
   SwarAJ 3D MUSIC FRONTEND
   Works with:
   /api/songs
   /api/health
   /songs/...
   /images/...
========================================================= */

const API_BASE = window.location.origin;

const API_SONGS = `${API_BASE}/api/songs`;
const API_HEALTH = `${API_BASE}/api/health`;


/* =========================================================
   STATE
========================================================= */

const state = {
  songs: [],
  currentIndex: -1,
  liked: JSON.parse(localStorage.getItem("swaraj-liked") || "[]"),
  history: JSON.parse(localStorage.getItem("swaraj-history") || "[]"),
  shuffle: false,
  repeat: false
};


/* =========================================================
   DOM
========================================================= */

const audio = document.getElementById("audio");

const songsGrid = document.getElementById("songsGrid");
const searchResults = document.getElementById("searchResults");
const libraryGrid = document.getElementById("libraryGrid");
const likedGrid = document.getElementById("likedGrid");
const categoryGrid = document.getElementById("categoryGrid");

const searchInput = document.getElementById("searchInput");
const largeSearchInput = document.getElementById("largeSearchInput");

const playerCover = document.getElementById("playerCover");
const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");

const playerLike = document.getElementById("likeButton");

const playButton = document.getElementById("playButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");
const shuffleButton = document.getElementById("shuffleButton");
const repeatButton = document.getElementById("repeatButton");

const progress = document.getElementById("progress");
const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");

const volume = document.getElementById("volume");

const heroCover = document.getElementById("heroCover");
const heroDisc = document.getElementById("heroDisc");
const heroSongCount = document.getElementById("heroSongCount");

const toast = document.getElementById("toast");

const connectionText = document.getElementById("connectionText");


/* =========================================================
   HELPERS
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function absoluteUrl(url) {
  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }

  if (!url.startsWith("/")) {
    url = "/" + url;
  }

  return API_BASE + url;
}


function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}


function showToast(message) {
  if (!toast) return;

  const text = toast.querySelector("p");

  if (text) {
    text.textContent = message;
  }

  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


/* =========================================================
   NORMALIZE SONG
========================================================= */

function normalizeSong(song, index) {

  if (!song || typeof song !== "object") {
    return null;
  }

  const title =
    song.title ||
    song.name ||
    song.songName ||
    "Unknown Song";

  const artist =
    song.artist ||
    song.singer ||
    song.author ||
    "स्वरAJ";

  const album =
    song.album ||
    song.category ||
    "SwarAJ";

  const category =
    song.category ||
    song.genre ||
    song.mood ||
    "All Songs";

  const cover =
    song.cover ||
    song.image ||
    song.thumbnail ||
    "/images/default-cover.svg";

  let url =
    song.url ||
    song.src ||
    song.path ||
    song.file ||
    "";

  /*
    IMPORTANT:

    Your API currently returns:

    url:
    /songs/Bhakti/Ganpati%20Aagman%20Demo.mp3

    Therefore we use the API URL directly.
  */

  url = absoluteUrl(url);

  return {
    ...song,
    id: song.id || `song-${index + 1}`,
    title,
    artist,
    album,
    category,
    cover: absoluteUrl(cover),
    url,
    index
  };
}


/* =========================================================
   LOAD SONGS
========================================================= */

async function loadSongs() {

  setLoading(songsGrid);

  try {

    const response = await fetch(
      `${API_SONGS}?t=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        `Songs API returned ${response.status}`
      );
    }

    const data = await response.json();

    /*
      Supports both:

      {
        songs: [...]
      }

      and:

      [...]
    */

    let rawSongs = [];

    if (Array.isArray(data)) {
      rawSongs = data;
    } else if (Array.isArray(data.songs)) {
      rawSongs = data.songs;
    } else if (Array.isArray(data.data)) {
      rawSongs = data.data;
    }

    state.songs = rawSongs
      .map((song, index) => normalizeSong(song, index))
      .filter(song => song && song.url);

    heroSongCount.textContent = state.songs.length;

    if (state.songs.length === 0) {

      renderEmpty(
        songsGrid,
        "No songs found",
        "Add MP3 files to your songs folder."
      );

      connectionText.textContent = "API connected • 0 songs";

      return;
    }

    connectionText.textContent =
      `Online • ${state.songs.length} songs`;

    renderSongs(state.songs, songsGrid);

    renderLibrary();

    updateHero();

    /*
      If there is no current song,
      prepare the first song artwork.
    */

    if (state.currentIndex === -1) {
      setPlayerPreview(state.songs[0]);
    }

    showToast(
      `${state.songs.length} songs loaded`
    );

  } catch (error) {

    console.error("Song API error:", error);

    connectionText.textContent = "API error";

    renderEmpty(
      songsGrid,
      "Song API could not be loaded",
      "Check your Render API and refresh the page."
    );

    showToast("Song API could not be loaded");
  }
}


/* =========================================================
   HEALTH CHECK
========================================================= */

async function checkHealth() {

  try {

    const response = await fetch(
      `${API_HEALTH}?t=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (response.ok) {
      return true;
    }

  } catch (error) {
    console.warn("Health API unavailable");
  }

  return false;
}


/* =========================================================
   LOADING
========================================================= */

function setLoading(container) {

  if (!container) return;

  container.innerHTML = `
    <div class="loading-card">
      <div class="loader"></div>
      <span>Loading your music...</span>
    </div>
  `;
}


/* =========================================================
   EMPTY
========================================================= */

function renderEmpty(
  container,
  title,
  description
) {

  if (!container) return;

  container.innerHTML = `
    <div class="empty-card">
      <div style="font-size:35px;">🎵</div>
      <strong>${escapeHTML(title)}</strong>
      <span>${escapeHTML(description)}</span>
    </div>
  `;
}


/* =========================================================
   RENDER SONGS
========================================================= */

function renderSongs(
  songs,
  container
) {

  if (!container) return;

  if (!songs || songs.length === 0) {

    renderEmpty(
      container,
      "No songs available",
      "Try another category or search."
    );

    return;
  }

  container.innerHTML = songs
    .map((song, position) =>
      createSongCard(song, position)
    )
    .join("");
}


/* =========================================================
   SONG CARD
========================================================= */

function createSongCard(song, position) {

  const liked =
    state.liked.includes(song.id);

  return `
    <article
      class="song-card"
      data-song-id="${escapeHTML(song.id)}"
    >

      <div class="song-cover">

        <img
          src="${escapeHTML(song.cover)}"
          alt="${escapeHTML(song.title)}"
          loading="lazy"
          onerror="this.src='/images/default-cover.svg'"
        />

        <button
          class="song-play"
          data-action="play"
          data-song-id="${escapeHTML(song.id)}"
          aria-label="Play ${escapeHTML(song.title)}"
        >
          ▶
        </button>

      </div>

      <button
        class="song-heart ${liked ? "liked" : ""}"
        data-action="like"
        data-song-id="${escapeHTML(song.id)}"
      >
        ${liked ? "♥" : "♡"}
      </button>

      <div class="song-meta">

        <strong title="${escapeHTML(song.title)}">
          ${escapeHTML(song.title)}
        </strong>

        <span title="${escapeHTML(song.artist)}">
          ${escapeHTML(song.artist)}
        </span>

      </div>

    </article>
  `;
}


/* =========================================================
   EVENT DELEGATION FOR SONG CARDS
========================================================= */

document.addEventListener("click", event => {

  const actionElement =
    event.target.closest("[data-action]");

  if (!actionElement) return;

  const action =
    actionElement.dataset.action;

  const songId =
    actionElement.dataset.songId;

  if (action === "play") {
    playSongById(songId);
  }

  if (action === "like") {
    toggleLike(songId);
  }

});


/* =========================================================
   PLAY SONG
========================================================= */

function playSongById(id) {

  const index =
    state.songs.findIndex(
      song => String(song.id) === String(id)
    );

  if (index === -1) {

    showToast("Song not found");

    return;
  }

  playSong(index);
}


async function playSong(index) {

  if (
    !state.songs.length ||
    index < 0 ||
    index >= state.songs.length
  ) {
    return;
  }

  const song =
    state.songs[index];

  state.currentIndex = index;

  /*
    Set player information.
  */

  playerTitle.textContent =
    song.title;

  playerArtist.textContent =
    song.artist;

  playerCover.src =
    song.cover;

  heroCover.src =
    song.cover;

  playerLike.classList.toggle(
    "liked",
    state.liked.includes(song.id)
  );

  playerLike.textContent =
    state.liked.includes(song.id)
      ? "♥"
      : "♡";

  /*
    Use exact API song URL.
  */

  audio.src = song.url;

  audio.load();

  try {

    await audio.play();

    playButton.textContent = "Ⅱ";

    heroDisc.classList.add("playing");

  } catch (error) {

    console.error(
      "Audio playback failed:",
      error
    );

    showToast(
      "Tap Play to start the song"
    );

    playButton.textContent = "▶";

    heroDisc.classList.remove(
      "playing"
    );
  }

  addHistory(song);

  updateHero();
}


/* =========================================================
   PREVIEW WITHOUT PLAYING
========================================================= */

function setPlayerPreview(song) {

  if (!song) return;

  playerTitle.textContent =
    song.title;

  playerArtist.textContent =
    song.artist;

  playerCover.src =
    song.cover;

  heroCover.src =
    song.cover;
}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

  if (state.currentIndex === -1) {

    if (state.songs.length) {
      playSong(0);
    }

    return;
  }

  if (audio.paused) {

    audio.play()
      .then(() => {

        playButton.textContent = "Ⅱ";

        heroDisc.classList.add(
          "playing"
        );

      })
      .catch(() => {
        showToast(
          "Unable to play this song"
        );
      });

  } else {

    audio.pause();

    playButton.textContent = "▶";

    heroDisc.classList.remove(
      "playing"
    );
  }
}


playButton.addEventListener(
  "click",
  togglePlay
);


/* =========================================================
   NEXT
========================================================= */

function nextSong() {

  if (!state.songs.length) return;

  let nextIndex;

  if (state.shuffle) {

    nextIndex =
      Math.floor(
        Math.random() *
        state.songs.length
      );

    if (
      state.songs.length > 1 &&
      nextIndex === state.currentIndex
    ) {
      nextIndex =
        (nextIndex + 1) %
        state.songs.length;
    }

  } else {

    nextIndex =
      (state.currentIndex + 1) %
      state.songs.length;
  }

  playSong(nextIndex);
}


/* =========================================================
   PREVIOUS
========================================================= */

function previousSong() {

  if (!state.songs.length) return;

  if (audio.currentTime > 3) {

    audio.currentTime = 0;

    return;
  }

  const previousIndex =
    state.currentIndex <= 0
      ? state.songs.length - 1
      : state.currentIndex - 1;

  playSong(previousIndex);
}


nextButton.addEventListener(
  "click",
  nextSong
);

previousButton.addEventListener(
  "click",
  previousSong
);


/* =========================================================
   AUDIO EVENTS
========================================================= */

audio.addEventListener(
  "play",
  () => {

    playButton.textContent = "Ⅱ";

    heroDisc.classList.add(
      "playing"
    );
  }
);


audio.addEventListener(
  "pause",
  () => {

    playButton.textContent = "▶";

    heroDisc.classList.remove(
      "playing"
    );
  }
);


audio.addEventListener(
  "ended",
  () => {

    if (state.repeat) {

      audio.currentTime = 0;

      audio.play();

      return;
    }

    nextSong();
  }
);


audio.addEventListener(
  "loadedmetadata",
  () => {

    duration.textContent =
      formatTime(audio.duration);
  }
);


audio.addEventListener(
  "timeupdate",
  () => {

    if (!audio.duration) return;

    const percent =
      (audio.currentTime /
        audio.duration) *
      100;

    progress.value =
      percent;

    currentTime.textContent =
      formatTime(
        audio.currentTime
      );
  }
);


/* =========================================================
   PROGRESS
========================================================= */

progress.addEventListener(
  "input",
  () => {

    if (!audio.duration) return;

    audio.currentTime =
      (progress.value / 100) *
      audio.duration;
  }
);


/* =========================================================
   VOLUME
========================================================= */

audio.volume =
  Number(volume.value);

volume.addEventListener(
  "input",
  () => {

    audio.volume =
      Number(volume.value);
  }
);


/* =========================================================
   SHUFFLE
========================================================= */

shuffleButton.addEventListener(
  "click",
  () => {

    state.shuffle =
      !state.shuffle;

    shuffleButton.style.color =
      state.shuffle
        ? "#9b5cff"
        : "";

    showToast(
      state.shuffle
        ? "Shuffle enabled"
        : "Shuffle disabled"
    );
  }
);


/* =========================================================
   REPEAT
========================================================= */

repeatButton.addEventListener(
  "click",
  () => {

    state.repeat =
      !state.repeat;

    repeatButton.style.color =
      state.repeat
        ? "#9b5cff"
        : "";

    showToast(
      state.repeat
        ? "Repeat enabled"
        : "Repeat disabled"
    );
  }
);


/* =========================================================
   LIKE
========================================================= */

function toggleLike(id) {

  const index =
    state.liked.indexOf(id);

  if (index === -1) {

    state.liked.push(id);

    showToast("Added to Liked Songs");

  } else {

    state.liked.splice(index, 1);

    showToast("Removed from Liked Songs");
  }

  localStorage.setItem(
    "swaraj-liked",
    JSON.stringify(state.liked)
  );

  updateLikeButtons();

  renderLibrary();

  if (
    state.currentIndex !== -1 &&
    state.songs[state.currentIndex]?.id === id
  ) {

    const liked =
      state.liked.includes(id);

    playerLike.classList.toggle(
      "liked",
      liked
    );

    playerLike.textContent =
      liked ? "♥" : "♡";
  }
}


function updateLikeButtons() {

  document
    .querySelectorAll(".song-heart")
    .forEach(button => {

      const id =
        button.dataset.songId;

      const liked =
        state.liked.includes(id);

      button.classList.toggle(
        "liked",
        liked
      );

      button.textContent =
        liked ? "♥" : "♡";
    });
}


playerLike.addEventListener(
  "click",
  () => {

    if (state.currentIndex === -1) {
      return;
    }

    const song =
      state.songs[state.currentIndex];

    if (song) {
      toggleLike(song.id);
    }
  }
);


/* =========================================================
   HISTORY
========================================================= */

function addHistory(song) {

  state.history =
    state.history.filter(
      id => id !== song.id
    );

  state.history.unshift(
    song.id
  );

  state.history =
    state.history.slice(0, 20);

  localStorage.setItem(
    "swaraj-history",
    JSON.stringify(state.history)
  );
}


/* =========================================================
   LIBRARY
========================================================= */

function renderLibrary() {

  if (!libraryGrid) return;

  renderSongs(
    state.songs,
    libraryGrid
  );
}


/* =========================================================
   LIKED
========================================================= */

function renderLiked() {

  const likedSongs =
    state.songs.filter(
      song =>
        state.liked.includes(song.id)
    );

  document.getElementById(
    "likedCount"
  ).textContent =
    `${likedSongs.length} song${
      likedSongs.length === 1
        ? ""
        : "s"
    }`;

  renderSongs(
    likedSongs,
    likedGrid
  );
}


/* =========================================================
   CATEGORY
========================================================= */

function showCategory(category) {

  const songs =
    state.songs.filter(song =>
      String(song.category)
        .toLowerCase() ===
      String(category)
        .toLowerCase()
    );

  document.getElementById(
    "categoryTitle"
  ).textContent = category;

  const descriptions = {
    Bhakti: "Devotional music for peaceful moments.",
    Love: "Songs that speak the language of love.",
    Energetic: "Turn up the energy and enjoy.",
    Emotional: "Music for every feeling."
  };

  document.getElementById(
    "categoryDescription"
  ).textContent =
    descriptions[category] ||
    "Explore music for your mood.";

  renderSongs(
    songs,
    categoryGrid
  );

  navigateTo("category");
}


/* =========================================================
   SEARCH
========================================================= */

function searchSongs(query) {

  const term =
    query.trim().toLowerCase();

  if (!term) {

    renderEmpty(
      searchResults,
      "Search for music",
      "Try a song, artist, album or category."
    );

    return;
  }

  const results =
    state.songs.filter(song => {

      const text = [
        song.title,
        song.artist,
        song.album,
        song.category
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(term);
    });

  renderSongs(
    results,
    searchResults
  );
}


searchInput.addEventListener(
  "input",
  event => {

    const query =
      event.target.value;

    largeSearchInput.value =
      query;

    if (query.trim()) {
      navigateTo("search");
      searchSongs(query);
    }
  }
);


largeSearchInput.addEventListener(
  "input",
  event => {

    const query =
      event.target.value;

    searchInput.value =
      query;

    searchSongs(query);
  }
);


/* =========================================================
   NAVIGATION
========================================================= */

function navigateTo(section) {

  document
    .querySelectorAll(".page-section")
    .forEach(page => {

      page.classList.remove(
        "active"
      );
    });

  const target =
    document.getElementById(
      `${section}Section`
    );

  if (target) {
    target.classList.add("active");
  }

  document
    .querySelectorAll(
      ".nav-item, .mobile-nav-item"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.section === section
      );
    });

  if (section === "liked") {
    renderLiked();
  }

  if (section === "library") {
    renderLibrary();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


document.addEventListener(
  "click",
  event => {

    const navigation =
      event.target.closest(
        "[data-section]"
      );

    if (!navigation) return;

    navigateTo(
      navigation.dataset.section
    );
  }
);


/* =========================================================
   CATEGORY BUTTONS
========================================================= */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-category]"
      );

    if (!button) return;

    showCategory(
      button.dataset.category
    );
  }
);


/* =========================================================
   HERO PLAY
========================================================= */

document
  .getElementById("heroPlay")
  .addEventListener(
    "click",
    () => {

      if (!state.songs.length) {

        showToast(
          "No songs available"
        );

        return;
      }

      if (state.currentIndex === -1) {
        playSong(0);
      } else {
        togglePlay();
      }
    }
  );


/* =========================================================
   HERO SHUFFLE
========================================================= */

document
  .getElementById("heroShuffle")
  .addEventListener(
    "click",
    () => {

      if (!state.songs.length) {
        showToast(
          "No songs available"
        );
        return;
      }

      state.shuffle = true;

      shuffleButton.style.color =
        "#9b5cff";

      let index =
        Math.floor(
          Math.random() *
          state.songs.length
        );

      playSong(index);
    }
  );


/* =========================================================
   SHOW ALL
========================================================= */

document
  .getElementById("showAllBtn")
  .addEventListener(
    "click",
    () => {

      renderSongs(
        state.songs,
        songsGrid
      );

      navigateTo("home");
    }
  );


/* =========================================================
   REFRESH
========================================================= */

document
  .getElementById("refreshBtn")
  .addEventListener(
    "click",
    async () => {

      showToast(
        "Refreshing music..."
      );

      await loadSongs();
    }
  );


/* =========================================================
   MOBILE MENU
========================================================= */

document
  .getElementById("mobileMenu")
  .addEventListener(
    "click",
    () => {

      document
        .querySelector(".sidebar")
        .classList.toggle("open");
    }
  );


/* =========================================================
   CLOSE MOBILE SIDEBAR
========================================================= */

document.addEventListener(
  "click",
  event => {

    if (
      !event.target.closest(".sidebar") &&
      !event.target.closest("#mobileMenu")
    ) {

      document
        .querySelector(".sidebar")
        ?.classList.remove("open");
    }
  }
);


/* =========================================================
   3D MOUSE PARALLAX
========================================================= */

const hero =
  document.querySelector(".hero");

const scene =
  document.querySelector(".scene");

if (hero && scene) {

  hero.addEventListener(
    "mousemove",
    event => {

      if (
        window.innerWidth < 900
      ) {
        return;
      }

      const rect =
        hero.getBoundingClientRect();

      const x =
        (event.clientX - rect.left) /
        rect.width -
        0.5;

      const y =
        (event.clientY - rect.top) /
        rect.height -
        0.5;

      scene.style.transform =
        `
        rotateX(${y * -10}deg)
        rotateY(${x * 12}deg)
        translateZ(10px)
        `;
    }
  );

  hero.addEventListener(
    "mouseleave",
    () => {

      scene.style.transform = "";
    }
  );
}


/* =========================================================
   PARTICLES
========================================================= */

function createParticles() {

  const container =
    document.getElementById(
      "particles"
    );

  if (!container) return;

  const count =
    window.innerWidth < 600
      ? 12
      : 24;

  for (
    let i = 0;
    i < count;
    i++
  ) {

    const particle =
      document.createElement("span");

    particle.style.position =
      "absolute";

    particle.style.width =
      `${Math.random() * 3 + 1}px`;

    particle.style.height =
      particle.style.width;

    particle.style.borderRadius =
      "50%";

    particle.style.background =
      "rgba(255,255,255,.35)";

    particle.style.left =
      `${Math.random() * 100}%`;

    particle.style.top =
      `${Math.random() * 100}%`;

    particle.style.boxShadow =
      "0 0 10px rgba(155,92,255,.5)";

    particle.style.animation =
      `particleFloat ${
        Math.random() * 8 + 6
      }s ease-in-out infinite`;

    particle.style.animationDelay =
      `-${Math.random() * 8}s`;

    container.appendChild(
      particle
    );
  }
}


/* =========================================================
   PARTICLE ANIMATION
========================================================= */

const particleStyle =
  document.createElement("style");

particleStyle.textContent = `
@keyframes particleFloat {
  0%,100% {
    transform: translate3d(0,0,0);
    opacity: .15;
  }

  50% {
    transform:
      translate3d(
        ${Math.random() * 50 - 25}px,
        -40px,
        0
      );
    opacity: .6;
  }
}
`;

document.head.appendChild(
  particleStyle
);


/* =========================================================
   UPDATE HERO
========================================================= */

function updateHero() {

  if (!state.songs.length) {
    return;
  }

  const song =
    state.currentIndex >= 0
      ? state.songs[state.currentIndex]
      : state.songs[0];

  if (!song) return;

  heroCover.src =
    song.cover;

  heroSongCount.textContent =
    state.songs.length;
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    /*
      Do not interfere with typing.
    */

    const tag =
      document.activeElement?.tagName;

    if (
      tag === "INPUT" ||
      tag === "TEXTAREA"
    ) {
      return;
    }

    /*
      Space = Play/Pause
    */

    if (event.code === "Space") {

      event.preventDefault();

      togglePlay();
    }

    /*
      Arrow Right = Next
    */

    if (
      event.code === "ArrowRight"
    ) {
      nextSong();
    }

    /*
      Arrow Left = Previous
    */

    if (
      event.code === "ArrowLeft"
    ) {
      previousSong();
    }
  }
);


/* =========================================================
   AUDIO ERROR
========================================================= */

audio.addEventListener(
  "error",
  () => {

    console.error(
      "Audio failed:",
      audio.src
    );

    showToast(
      "Unable to play this audio file"
    );

    playButton.textContent =
      "▶";

    heroDisc.classList.remove(
      "playing"
    );
  }
);


/* =========================================================
   INITIALIZE
========================================================= */

async function initialize() {

  createParticles();

  /*
    Load songs directly.

    This is intentionally NOT dependent
    on /api/health.

    Therefore, even if /api/health
    is unavailable, songs can still load.
  */

  await loadSongs();

  checkHealth();
}


initialize();