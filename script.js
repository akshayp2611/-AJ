"use strict";

/* =========================================================
   स्वरAJ MUSIC PLAYER
   Existing API logic:
   GET /api/songs
   ========================================================= */


/* ================= STATE ================= */

const state = {
  songs: [],
  filteredSongs: [],
  currentIndex: -1,
  activeCategory: "All Songs",

  isPlaying: false,
  isShuffle: false,
  isRepeat: false,

  likedSongs: new Set(
    JSON.parse(
      localStorage.getItem("swaraj-liked") || "[]"
    )
  ),

  youtubeResults: []
};


/* ================= ELEMENTS ================= */

const $ = id => document.getElementById(id);

const audio = $("audioPlayer");

const sidebar = $("sidebar");
const menuButton = $("menuButton");
const closeMenu = $("closeMenu");
const menuOverlay = $("menuOverlay");

const searchInput = $("searchInput");
const clearSearch = $("clearSearch");

const songGrid = $("songGrid");
const librarySongGrid = $("librarySongGrid");

const categoryCards = $("categoryCards");
const allCategories = $("allCategories");
const sideCategories = $("sideCategories");

const emptyState = $("emptyState");

const songCount = $("songCount");

const playerTitle = $("playerTitle");
const playerArtist = $("playerArtist");
const playerCover = $("playerCover");

const playButton = $("playButton");
const previousButton = $("previousButton");
const nextButton = $("nextButton");

const shuffleButton = $("shuffleButton");
const shuffleTop = $("shuffleTop");

const repeatButton = $("repeatButton");

const playerLike = $("playerLike");
const likeTop = $("likeTop");

const currentTime = $("currentTime");
const duration = $("duration");

const volumeSlider = $("volumeSlider");
const volumeIcon = $("volumeIcon");

const progressBar = $("progressBar");
const progressFill = $("progressFill");
const progressThumb = $("progressThumb");

const youtubeSearchInput = $("youtubeSearchInput");
const youtubeSearchButton = $("youtubeSearchButton");
const youtubeResults = $("youtubeResults");
const youtubeFrame = $("youtubeFrame");
const youtubePlayerContainer = $("youtubePlayerContainer");
const youtubeNowPlaying = $("youtubeNowPlaying");
const closeYoutube = $("closeYoutube");


/* ================= CATEGORY ICONS ================= */

const categoryIcons = [
  "♫",
  "◉",
  "✦",
  "◈",
  "♪",
  "♬",
  "◌",
  "☊"
];

function getCategoryIcon(category) {

  let hash = 0;

  for (let i = 0; i < category.length; i++) {
    hash =
      ((hash << 5) - hash) +
      category.charCodeAt(i);

    hash |= 0;
  }

  return categoryIcons[
    Math.abs(hash) % categoryIcons.length
  ];
}


/* ================= INIT ================= */

document.addEventListener(
  "DOMContentLoaded",
  init
);

async function init() {

  setupNavigation();
  setupMenu();
  setupPlayer();
  setupSearch();
  setupButtons();
  setupYouTube();

  audio.volume =
    Number(volumeSlider?.value || 0.8);

  await loadSongs();
}


/* ================= LOAD SONGS ================= */

async function loadSongs() {

  try {

    showLoading();

    const response =
      await fetch(
        "/api/songs",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `Song API HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data ||
      !Array.isArray(data.songs)
    ) {
      throw new Error(
        "Invalid song API response"
      );
    }

    state.songs =
      data.songs.map(
        normalizeSong
      );

    state.filteredSongs =
      [...state.songs];

    renderEverything();

  } catch (error) {

    console.error(
      "Song API could not be loaded:",
      error
    );

    state.songs = [];
    state.filteredSongs = [];

    renderEverything();

    showEmpty(
      "Unable to load songs",
      "Please check /api/songs on your Render server."
    );
  }
}


/* ================= NORMALIZE ================= */

function normalizeSong(song, index) {

  const title =
    song.title ||
    song.name ||
    `Song ${index + 1}`;

  const category =
    song.category ||
    song.album ||
    "Other";

  let url =
    song.url ||
    song.src ||
    song.file ||
    "";

  /*
    Important:
    Do NOT modify already-correct absolute URLs.
  */

  if (
    url &&
    !url.startsWith("/") &&
    !/^https?:\/\//i.test(url)
  ) {

    url =
      "/songs/" +
      url
        .split("/")
        .map(
          encodeURIComponent
        )
        .join("/");
  }

  return {

    id:
      song.id ||
      `song-${index + 1}`,

    title,

    artist:
      song.artist ||
      "स्वरAJ",

    album:
      song.album ||
      category,

    category,

    cover:
      song.cover ||
      "/images/default-cover.svg",

    url,

    file:
      song.file ||
      ""

  };
}


/* ================= RENDER EVERYTHING ================= */

function renderEverything() {

  renderCategories();

  renderSideCategories();

  applyCurrentFilter();

  updateStatistics();

}


/* ================= CATEGORIES ================= */

function getCategories() {

  const categories =
    new Map();

  state.songs.forEach(song => {

    const category =
      song.category ||
      "Other";

    categories.set(
      category,
      (categories.get(category) || 0) + 1
    );

  });

  return Array.from(
    categories.entries()
  );
}


function renderCategories() {

  const categories =
    getCategories();

  categoryCards.innerHTML = "";

  allCategories.innerHTML = "";

  if (!categories.length) {

    categoryCards.innerHTML =
      categoryPlaceholder();

    allCategories.innerHTML =
      categoryPlaceholder();

    return;
  }

  categories.forEach(
    ([category, count], index) => {

      categoryCards.appendChild(
        createCategoryCard(
          category,
          count,
          index
        )
      );

      allCategories.appendChild(
        createCategoryCard(
          category,
          count,
          index
        )
      );

    }
  );
}


function categoryPlaceholder() {

  return `
    <div class="empty-state">
      <div class="empty-icon">◈</div>
      <h3>No categories yet</h3>
      <p>Add music to your songs folder.</p>
    </div>
  `;
}


function createCategoryCard(
  category,
  count,
  index
) {

  const card =
    document.createElement("article");

  card.className =
    "category-card";

  card.dataset.category =
    category;

  card.innerHTML = `

    <div class="category-glow"></div>

    <div class="category-icon">
      ${getCategoryIcon(category)}
    </div>

    <h3>
      ${escapeHTML(category)}
    </h3>

    <p>
      ${count}
      ${count === 1 ? "song" : "songs"}
    </p>

  `;

  card.addEventListener(
    "click",
    () => {

      state.activeCategory =
        category;

      applyCurrentFilter();

      showView("home");

      closeMobileMenu();

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );

  return card;
}


/* ================= SIDE CATEGORIES ================= */

function renderSideCategories() {

  sideCategories.innerHTML = "";

  const all =
    document.createElement("button");

  all.className =
    "side-category";

  if (
    state.activeCategory ===
    "All Songs"
  ) {
    all.classList.add("active");
  }

  all.innerHTML = `
    <span>All Songs</span>
    <span class="category-count">
      ${state.songs.length}
    </span>
  `;

  all.addEventListener(
    "click",
    () => {

      state.activeCategory =
        "All Songs";

      applyCurrentFilter();

      closeMobileMenu();

    }
  );

  sideCategories.appendChild(all);

  getCategories().forEach(
    ([category, count]) => {

      const button =
        document.createElement("button");

      button.className =
        "side-category";

      if (
        state.activeCategory ===
        category
      ) {
        button.classList.add("active");
      }

      button.innerHTML = `
        <span>
          ${escapeHTML(category)}
        </span>

        <span class="category-count">
          ${count}
        </span>
      `;

      button.addEventListener(
        "click",
        () => {

          state.activeCategory =
            category;

          applyCurrentFilter();

          showView("home");

          closeMobileMenu();

        }
      );

      sideCategories.appendChild(
        button
      );

    }
  );
}


/* ================= FILTER ================= */

function applyCurrentFilter() {

  const search =
    searchInput.value
      .trim()
      .toLowerCase();

  state.filteredSongs =
    state.songs.filter(song => {

      const matchesCategory =
        state.activeCategory ===
        "All Songs" ||
        song.category ===
        state.activeCategory;

      const text =
        `${song.title}
        ${song.artist}
        ${song.album}
        ${song.category}`
          .toLowerCase();

      const matchesSearch =
        !search ||
        text.includes(search);

      return (
        matchesCategory &&
        matchesSearch
      );

    });

  renderSongs(
    songGrid,
    state.filteredSongs
  );

  renderSongs(
    librarySongGrid,
    state.filteredSongs
  );

  renderSideCategories();

  songCount.textContent =
    `${state.filteredSongs.length} ${
      state.filteredSongs.length === 1
        ? "song"
        : "songs"
    }`;

  if (
    state.filteredSongs.length === 0
  ) {
    emptyState.classList.remove(
      "hidden"
    );
  } else {
    emptyState.classList.add(
      "hidden"
    );
  }
}


/* ================= SONG CARDS ================= */

function renderSongs(
  container,
  songs
) {

  if (!container) return;

  container.innerHTML = "";

  songs.forEach(
    (song, index) => {

      container.appendChild(
        createSongCard(
          song,
          index
        )
      );

    }
  );
}


function createSongCard(
  song,
  index
) {

  const card =
    document.createElement("article");

  card.className =
    "song-card";

  const liked =
    state.likedSongs.has(
      song.id
    );

  card.innerHTML = `

    <button
      class="like-song ${
        liked ? "liked" : ""
      }"
      aria-label="Like ${escapeAttribute(song.title)}"
      data-like-id="${escapeAttribute(song.id)}"
    >
      ${liked ? "♥" : "♡"}
    </button>

    <div class="cover-wrapper">

      <img
        src="${escapeAttribute(song.cover)}"
        alt="${escapeAttribute(song.title)}"
        loading="lazy"
        onerror="this.style.display='none'"
      >

      <button
        class="song-play"
        aria-label="Play ${escapeAttribute(song.title)}"
        data-play-id="${escapeAttribute(song.id)}"
      >
        ▶
      </button>

    </div>

    <div class="song-details">

      <h3>
        ${escapeHTML(song.title)}
      </h3>

      <p>
        ${escapeHTML(song.artist)}
      </p>

      <div class="song-meta">
        <span>
          ${escapeHTML(song.category)}
        </span>

        <span>
          ♫
        </span>
      </div>

    </div>
  `;

  const play =
    card.querySelector(
      "[data-play-id]"
    );

  play.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      playSongById(
        song.id
      );

    }
  );

  const like =
    card.querySelector(
      "[data-like-id]"
    );

  like.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      toggleLike(
        song.id
      );

    }
  );

  return card;
}


/* ================= PLAY SONG ================= */

function playSongById(id) {

  const index =
    state.songs.findIndex(
      song =>
        String(song.id) ===
        String(id)
    );

  if (index === -1) {
    return;
  }

  state.currentIndex =
    index;

  const song =
    state.songs[index];

  if (!song.url) {

    console.error(
      "Song URL missing:",
      song
    );

    return;
  }

  audio.src =
    song.url;

  audio.load();

  audio.play()
    .then(() => {

      state.isPlaying = true;

      updatePlayerUI();

    })
    .catch(error => {

      console.error(
        "Playback error:",
        error
      );

      state.isPlaying = false;

      updatePlayerUI();

    });

  updatePlayerUI();
}


/* ================= PLAYER ================= */

function setupPlayer() {

  playButton.addEventListener(
    "click",
    togglePlay
  );

  previousButton.addEventListener(
    "click",
    previousSong
  );

  nextButton.addEventListener(
    "click",
    nextSong
  );

  shuffleButton.addEventListener(
    "click",
    toggleShuffle
  );

  shuffleTop.addEventListener(
    "click",
    toggleShuffle
  );

  repeatButton.addEventListener(
    "click",
    toggleRepeat
  );

  playerLike.addEventListener(
    "click",
    () => {

      const song =
        getCurrentSong();

      if (song) {
        toggleLike(song.id);
      }

    }
  );

  likeTop.addEventListener(
    "click",
    () => {

      const liked =
        state.songs.filter(
          song =>
            state.likedSongs.has(
              song.id
            )
        );

      if (!liked.length) {

        showView("library");

        return;
      }

      renderSongs(
        librarySongGrid,
        liked
      );

      showView("library");

    }
  );

  audio.addEventListener(
    "loadedmetadata",
    () => {

      duration.textContent =
        formatTime(
          audio.duration
        );

    }
  );

  audio.addEventListener(
    "timeupdate",
    updateProgress
  );

  audio.addEventListener(
    "play",
    () => {

      state.isPlaying = true;

      updatePlayerUI();

    }
  );

  audio.addEventListener(
    "pause",
    () => {

      state.isPlaying = false;

      updatePlayerUI();

    }
  );

  audio.addEventListener(
    "ended",
    handleEnded
  );

  volumeSlider.addEventListener(
    "input",
    () => {

      audio.volume =
        Number(
          volumeSlider.value
        );

      updateVolumeIcon();

    }
  );

  progressBar.addEventListener(
    "click",
    seekAudio
  );

}


function togglePlay() {

  if (
    state.currentIndex === -1
  ) {

    if (
      state.filteredSongs.length
    ) {

      playSongById(
        state.filteredSongs[0].id
      );

    }

    return;
  }

  if (audio.paused) {

    audio.play()
      .catch(
        console.error
      );

  } else {

    audio.pause();

  }
}


function previousSong() {

  if (!state.songs.length) {
    return;
  }

  if (
    audio.currentTime > 3
  ) {

    audio.currentTime = 0;

    return;
  }

  state.currentIndex--;

  if (
    state.currentIndex < 0
  ) {

    state.currentIndex =
      state.songs.length - 1;

  }

  playSongById(
    state.songs[
      state.currentIndex
    ].id
  );
}


function nextSong() {

  if (!state.songs.length) {
    return;
  }

  let nextIndex;

  if (state.isShuffle) {

    nextIndex =
      Math.floor(
        Math.random() *
        state.songs.length
      );

  } else {

    nextIndex =
      state.currentIndex + 1;

    if (
      nextIndex >=
      state.songs.length
    ) {
      nextIndex = 0;
    }

  }

  state.currentIndex =
    nextIndex;

  playSongById(
    state.songs[nextIndex].id
  );
}


function handleEnded() {

  if (state.isRepeat) {

    audio.currentTime = 0;

    audio.play()
      .catch(
        console.error
      );

    return;
  }

  nextSong();
}


function toggleShuffle() {

  state.isShuffle =
    !state.isShuffle;

  shuffleButton.classList.toggle(
    "active",
    state.isShuffle
  );

  shuffleTop.classList.toggle(
    "active",
    state.isShuffle
  );
}


function toggleRepeat() {

  state.isRepeat =
    !state.isRepeat;

  repeatButton.classList.toggle(
    "active",
    state.isRepeat
  );
}


/* ================= PLAYER UI ================= */

function updatePlayerUI() {

  const song =
    getCurrentSong();

  if (!song) {

    playButton.textContent =
      "▶";

    return;
  }

  playerTitle.textContent =
    song.title;

  playerArtist.textContent =
    song.artist;

  if (song.cover) {

    playerCover.innerHTML = `
      <img
        src="${escapeAttribute(song.cover)}"
        alt=""
        onerror="
          this.style.display='none';
          this.parentElement.innerHTML='♫';
        "
      >
    `;

  } else {

    playerCover.textContent =
      "♫";

  }

  playButton.textContent =
    state.isPlaying
      ? "Ⅱ"
      : "▶";

  playButton.setAttribute(
    "aria-label",
    state.isPlaying
      ? "Pause"
      : "Play"
  );

  const liked =
    state.likedSongs.has(
      song.id
    );

  playerLike.textContent =
    liked ? "♥" : "♡";

  playerLike.classList.toggle(
    "liked",
    liked
  );
}


function getCurrentSong() {

  if (
    state.currentIndex < 0 ||
    state.currentIndex >=
      state.songs.length
  ) {
    return null;
  }

  return state.songs[
    state.currentIndex
  ];
}


/* ================= PROGRESS ================= */

function updateProgress() {

  const current =
    audio.currentTime || 0;

  const total =
    audio.duration || 0;

  currentTime.textContent =
    formatTime(current);

  if (!total) {
    return;
  }

  const percent =
    Math.min(
      100,
      Math.max(
        0,
        (current / total) * 100
      )
    );

  progressFill.style.width =
    `${percent}%`;

  progressThumb.style.left =
    `${percent}%`;
}


function seekAudio(event) {

  const rect =
    progressBar.getBoundingClientRect();

  const percent =
    (event.clientX - rect.left) /
    rect.width;

  if (
    Number.isFinite(audio.duration)
  ) {

    audio.currentTime =
      Math.max(
        0,
        Math.min(
          1,
          percent
        )
      ) * audio.duration;

  }
}


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {
    return "0:00";
  }

  const minutes =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${minutes}:${secs}`;
}


/* ================= VOLUME ================= */

function updateVolumeIcon() {

  const volume =
    Number(
      volumeSlider.value
    );

  if (volume === 0) {

    volumeIcon.textContent =
      "🔇";

  } else if (volume < .5) {

    volumeIcon.textContent =
      "🔉";

  } else {

    volumeIcon.textContent =
      "🔊";

  }
}


/* ================= LIKES ================= */

function toggleLike(id) {

  if (
    state.likedSongs.has(id)
  ) {

    state.likedSongs.delete(id);

  } else {

    state.likedSongs.add(id);

  }

  localStorage.setItem(
    "swaraj-liked",
    JSON.stringify(
      Array.from(
        state.likedSongs
      )
    )
  );

  applyCurrentFilter();

  updatePlayerUI();

  updateStatistics();
}


/* ================= SEARCH ================= */

function setupSearch() {

  searchInput.addEventListener(
    "input",
    () => {

      applyCurrentFilter();

    }
  );

  clearSearch.addEventListener(
    "click",
    () => {

      searchInput.value = "";

      applyCurrentFilter();

      searchInput.focus();

    }
  );

}


/* ================= NAVIGATION ================= */

function setupNavigation() {

  document
    .querySelectorAll(
      "[data-view]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const view =
            button.dataset.view;

          showView(view);

          closeMobileMenu();

        }
      );

    });

}


function showView(view) {

  document
    .querySelectorAll(
      ".page-view"
    )
    .forEach(section => {

      section.classList.remove(
        "active-view"
      );

    });

  const target =
    $(`${view}View`);

  if (target) {

    target.classList.add(
      "active-view"
    );

  }

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.view ===
          view
      );

    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* ================= MOBILE MENU ================= */

function setupMenu() {

  menuButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      openMobileMenu();

    }
  );

  closeMenu.addEventListener(
    "click",
    closeMobileMenu
  );

  menuOverlay.addEventListener(
    "click",
    closeMobileMenu
  );

  /*
    Important:
    Do not attach document-wide click
    logic that automatically opens/closes
    the menu.
  */

}


function openMobileMenu() {

  sidebar.classList.add(
    "menu-open"
  );

  menuOverlay.classList.add(
    "show"
  );

  menuButton.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.style.overflow =
    "hidden";
}


function closeMobileMenu() {

  sidebar.classList.remove(
    "menu-open"
  );

  menuOverlay.classList.remove(
    "show"
  );

  menuButton.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.style.overflow =
    "";
}


/* ================= BUTTONS ================= */

function setupButtons() {

  $("heroPlay").addEventListener(
    "click",
    () => {

      if (
        state.currentIndex === -1 &&
        state.songs.length
      ) {

        playSongById(
          state.songs[0].id
        );

      } else {

        togglePlay();

      }

    }
  );


  $("heroExplore").addEventListener(
    "click",
    () => {

      showView(
        "categories"
      );

    }
  );


  $("refreshSongs").addEventListener(
    "click",
    loadSongs
  );


  $("retrySongs").addEventListener(
    "click",
    loadSongs
  );

}


/* ================= STATISTICS ================= */

function updateStatistics() {

  if (
    $("librarySongCount")
  ) {

    $("librarySongCount")
      .textContent =
      state.songs.length;

  }

  if (
    $("libraryCategoryCount")
  ) {

    $("libraryCategoryCount")
      .textContent =
      getCategories().length;

  }

  if (
    $("likedCount")
  ) {

    $("likedCount")
      .textContent =
      state.likedSongs.size;

  }

}


/* ================= YOUTUBE ================= */

/*
  No YouTube API key is required for this
  basic website integration.

  Search uses YouTube's public search page
  through an iframe/embed-compatible flow.

  For exact YouTube Data API search results,
  a YouTube API key/server endpoint is required.
*/

function setupYouTube() {

  youtubeSearchButton.addEventListener(
    "click",
    searchYouTube
  );

  youtubeSearchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter"
      ) {

        searchYouTube();

      }

    }
  );

  closeYoutube.addEventListener(
    "click",
    () => {

      youtubeFrame.src = "";

      youtubePlayerContainer.classList.add(
        "hidden"
      );

    }
  );

}


async function searchYouTube() {

  const query =
    youtubeSearchInput.value
      .trim();

  if (!query) {
    return;
  }

  /*
    The browser cannot reliably obtain
    YouTube search-result JSON without
    the YouTube Data API.

    We therefore open the official
    YouTube search URL in a new tab as
    a fallback instead of pretending
    that API data exists.
  */

  const youtubeURL =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query);

  window.open(
    youtubeURL,
    "_blank",
    "noopener,noreferrer"
  );

}


/*
  If you already have a YouTube video ID,
  this function can play it directly inside
  the स्वरAJ player.
*/

function playYouTubeVideo(
  videoId,
  title = "YouTube Music"
) {

  if (!videoId) {
    return;
  }

  youtubeNowPlaying.textContent =
    title;

  youtubeFrame.src =
    `https://www.youtube.com/embed/${encodeURIComponent(
      videoId
    )}?autoplay=1&rel=0`;

  youtubePlayerContainer.classList.remove(
    "hidden"
  );

  showView("youtube");

}


/* ================= LOADING ================= */

function showLoading() {

  songGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">♫</div>
      <h3>Loading music...</h3>
      <p>Scanning your स्वरAJ library.</p>
    </div>
  `;

}


/* ================= EMPTY ================= */

function showEmpty(
  title,
  message
) {

  emptyState.classList.remove(
    "hidden"
  );

  emptyState.querySelector(
    "h3"
  ).textContent = title;

  emptyState.querySelector(
    "p"
  ).textContent = message;

}


/* ================= SECURITY HELPERS ================= */

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

  return escapeHTML(value);

}