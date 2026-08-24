"use strict";

// ==================================================
// ELEMENTS
// ==================================================

const audio =
  document.getElementById("audio");

const songsGrid =
  document.getElementById("songsGrid");

const categoriesGrid =
  document.getElementById(
    "categoriesGrid"
  );

const sidebarCategories =
  document.getElementById(
    "sidebarCategories"
  );

const songsHeading =
  document.getElementById(
    "songsHeading"
  );

const songCount =
  document.getElementById(
    "songCount"
  );

const emptyState =
  document.getElementById(
    "emptyState"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const clearSearch =
  document.getElementById(
    "clearSearch"
  );

const refreshButton =
  document.getElementById(
    "refreshButton"
  );

const menuButton =
  document.getElementById(
    "menuButton"
  );

const closeMenu =
  document.getElementById(
    "closeMenu"
  );

const sidebar =
  document.getElementById(
    "sidebar"
  );

const sidebarOverlay =
  document.getElementById(
    "sidebarOverlay"
  );

const playButton =
  document.getElementById(
    "playButton"
  );

const previousButton =
  document.getElementById(
    "previousButton"
  );

const nextButton =
  document.getElementById(
    "nextButton"
  );

const shuffleButton =
  document.getElementById(
    "shuffleButton"
  );

const repeatButton =
  document.getElementById(
    "repeatButton"
  );

const progress =
  document.getElementById(
    "progress"
  );

const currentTime =
  document.getElementById(
    "currentTime"
  );

const duration =
  document.getElementById(
    "duration"
  );

const volume =
  document.getElementById(
    "volume"
  );

const playerTitle =
  document.getElementById(
    "playerTitle"
  );

const playerArtist =
  document.getElementById(
    "playerArtist"
  );

const playerCover =
  document.getElementById(
    "playerCover"
  );

const likeButton =
  document.getElementById(
    "likeButton"
  );

const heroPlay =
  document.getElementById(
    "heroPlay"
  );

const showAllCategories =
  document.getElementById(
    "showAllCategories"
  );

// ==================================================
// STATE
// ==================================================

let songs = [];

let filteredSongs = [];

let currentIndex = -1;

let activeCategory =
  "All Songs";

let isShuffle = false;

let isRepeat = false;

let favorites =
  JSON.parse(
    localStorage.getItem(
      "swarajFavorites"
    ) || "[]"
  );

// ==================================================
// INITIALIZE
// ==================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    volume.value = 0.8;

    audio.volume = 0.8;

    loadSongs();

    setupMenu();

    setupSearch();

    setupPlayer();

    setupNavigation();

  }
);

// ==================================================
// LOAD SONGS
// ==================================================

async function loadSongs() {

  showLoading();

  try {

    const response =
      await fetch(
        "/api/songs",
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !data ||
      !Array.isArray(
        data.songs
      )
    ) {
      throw new Error(
        "Invalid songs response"
      );
    }

    songs =
      data.songs;

    filteredSongs =
      [...songs];

    renderCategories();

    renderSongs();

  } catch (error) {

    console.error(
      "Unable to load songs:",
      error
    );

    songs = [];

    filteredSongs = [];

    songsGrid.innerHTML = `
      <div class="loading">
        Unable to load songs.
        <br>
        <small>${escapeHtml(
          error.message
        )}</small>
      </div>
    `;

    songCount.textContent =
      "0 songs";
  }
}

// ==================================================
// CATEGORIES
// ==================================================

function getCategories() {

  const unique =
    [
      ...new Set(
        songs
          .map(
            song =>
              song.category
          )
          .filter(Boolean)
      )
    ];

  return unique;
}

function renderCategories() {

  const categories =
    getCategories();

  // Sidebar
  sidebarCategories.innerHTML = `
    <button
      class="category-button ${
        activeCategory === "All Songs"
          ? "active"
          : ""
      }"
      data-category="All Songs"
    >
      <span>◉</span>
      All Songs
    </button>
  `;

  categories.forEach(
    category => {

      sidebarCategories.innerHTML += `
        <button
          class="category-button ${
            activeCategory === category
              ? "active"
              : ""
          }"
          data-category="${escapeAttr(
            category
          )}"
        >
          <span>♪</span>
          ${escapeHtml(category)}
        </button>
      `;
    }
  );

  // Main categories
  categoriesGrid.innerHTML = "";

  if (!categories.length) {

    categoriesGrid.innerHTML = `
      <div class="loading">
        No categories found.
      </div>
    `;

    return;
  }

  categories.forEach(
    (category, index) => {

      const count =
        songs.filter(
          song =>
            song.category ===
            category
        ).length;

      const icons = [
        "♫",
        "◉",
        "✦",
        "♪",
        "♬",
        "◈"
      ];

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "category-card";

      card.dataset.category =
        category;

      card.innerHTML = `
        <div class="category-icon">
          ${
            icons[
              index %
              icons.length
            ]
          }
        </div>

        <h3>
          ${escapeHtml(category)}
        </h3>

        <p>
          ${count}
          ${
            count === 1
              ? "song"
              : "songs"
          }
        </p>
      `;

      card.addEventListener(
        "click",
        () => {
          selectCategory(
            category
          );
        }
      );

      categoriesGrid.appendChild(
        card
      );
    }
  );

  // Sidebar events
  sidebarCategories
    .querySelectorAll(
      ".category-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectCategory(
            button.dataset.category
          );

          closeSidebar();
        }
      );
    });
}

// ==================================================
// CATEGORY FILTER
// ==================================================

function selectCategory(
  category
) {

  activeCategory =
    category;

  if (
    category === "All Songs"
  ) {

    filteredSongs =
      [...songs];

  } else {

    filteredSongs =
      songs.filter(
        song =>
          song.category ===
          category
      );
  }

  songsHeading.textContent =
    category;

  renderCategories();

  renderSongs();
}

// ==================================================
// RENDER SONGS
// ==================================================

function renderSongs() {

  songsGrid.innerHTML = "";

  if (
    !filteredSongs.length
  ) {

    emptyState.classList.remove(
      "hidden"
    );

    songCount.textContent =
      "0 songs";

    return;
  }

  emptyState.classList.add(
    "hidden"
  );

  songCount.textContent =
    `${filteredSongs.length} ${
      filteredSongs.length === 1
        ? "song"
        : "songs"
    }`;

  filteredSongs.forEach(
    (song, index) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "song-card";

      if (
        currentIndex !== -1 &&
        songs[currentIndex] &&
        songs[currentIndex].id ===
          song.id
      ) {
        card.classList.add(
          "playing"
        );
      }

      card.innerHTML = `
        <div class="song-cover">

          ${
            song.cover
              ? `
                <img
                  src="${escapeAttr(
                    song.cover
                  )}"
                  alt="${escapeAttr(
                    song.title
                  )}"
                  loading="lazy"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >
              `
              : ""
          }

          <div
            class="song-cover-placeholder"
            style="${
              song.cover
                ? "display:none"
                : ""
            }"
          >
            ♪
          </div>

          <button
            class="song-play"
            aria-label="Play ${escapeAttr(
              song.title
            )}"
          >
            ▶
          </button>

        </div>

        <div class="song-info">

          <h3>
            ${escapeHtml(
              song.title
            )}
          </h3>

          <p>
            ${escapeHtml(
              song.artist ||
                "स्वरAJ"
            )}
          </p>

        </div>
      `;

      card.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".song-play"
            )
          ) {
            playSongFromFilteredIndex(
              index
            );

            return;
          }

          playSongFromFilteredIndex(
            index
          );
        }
      );

      songsGrid.appendChild(
        card
      );
    }
  );
}

// ==================================================
// PLAY SONG
// ==================================================

function playSongFromFilteredIndex(
  index
) {

  const song =
    filteredSongs[index];

  if (!song) {
    return;
  }

  const globalIndex =
    songs.findIndex(
      item =>
        item.id ===
        song.id
    );

  if (
    globalIndex === -1
  ) {
    return;
  }

  playSong(globalIndex);
}

function playSong(
  index,
  autoPlay = true
) {

  if (
    index < 0 ||
    index >= songs.length
  ) {
    return;
  }

  currentIndex =
    index;

  const song =
    songs[currentIndex];

  if (!song || !song.url) {
    return;
  }

  audio.src =
    song.url;

  playerTitle.textContent =
    song.title ||
    "Unknown Song";

  playerArtist.textContent =
    song.artist ||
    "स्वरAJ";

  if (song.cover) {

    playerCover.innerHTML = `
      <img
        src="${escapeAttr(
          song.cover
        )}"
        alt=""
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:13px;
        "
        onerror="this.remove()"
      >
    `;
  } else {

    playerCover.textContent =
      "♪";
  }

  updateLikeButton();

  if (autoPlay) {

    const playPromise =
      audio.play();

    if (
      playPromise &&
      typeof playPromise.catch ===
        "function"
    ) {

      playPromise.catch(
        error => {

          console.warn(
            "Playback requires user interaction:",
            error
          );
        }
      );
    }
  }

  renderSongs();
}

// ==================================================
// PLAY / PAUSE
// ==================================================

function togglePlay() {

  if (
    currentIndex === -1
  ) {

    if (songs.length) {
      playSong(0);
    }

    return;
  }

  if (audio.paused) {

    audio.play().catch(
      console.error
    );

  } else {

    audio.pause();
  }
}

audio.addEventListener(
  "play",
  () => {

    playButton.textContent =
      "❚❚";

    renderSongs();
  }
);

audio.addEventListener(
  "pause",
  () => {

    playButton.textContent =
      "▶";

    renderSongs();
  }
);

// ==================================================
// NEXT
// ==================================================

function nextSong() {

  if (!songs.length) {
    return;
  }

  let nextIndex;

  if (isShuffle) {

    if (songs.length === 1) {
      nextIndex = 0;
    } else {

      do {

        nextIndex =
          Math.floor(
            Math.random() *
              songs.length
          );

      } while (
        nextIndex ===
        currentIndex
      );
    }

  } else {

    nextIndex =
      currentIndex + 1;

    if (
      nextIndex >=
      songs.length
    ) {
      nextIndex = 0;
    }
  }

  playSong(nextIndex);
}

// ==================================================
// PREVIOUS
// ==================================================

function previousSong() {

  if (!songs.length) {
    return;
  }

  if (
    audio.currentTime > 3
  ) {

    audio.currentTime =
      0;

    return;
  }

  let previousIndex =
    currentIndex - 1;

  if (
    previousIndex < 0
  ) {
    previousIndex =
      songs.length - 1;
  }

  playSong(
    previousIndex
  );
}

// ==================================================
// AUDIO EVENTS
// ==================================================

audio.addEventListener(
  "ended",
  () => {

    if (isRepeat) {

      audio.currentTime =
        0;

      audio.play().catch(
        console.error
      );

      return;
    }

    nextSong();
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
  () => {

    if (
      !Number.isFinite(
        audio.duration
      ) ||
      audio.duration <= 0
    ) {
      return;
    }

    const percentage =
      (
        audio.currentTime /
        audio.duration
      ) * 100;

    progress.value =
      percentage;

    currentTime.textContent =
      formatTime(
        audio.currentTime
      );
  }
);

// ==================================================
// PROGRESS
// ==================================================

progress.addEventListener(
  "input",
  () => {

    if (
      !Number.isFinite(
        audio.duration
      )
    ) {
      return;
    }

    audio.currentTime =
      (
        Number(
          progress.value
        ) / 100
      ) *
      audio.duration;
  }
);

// ==================================================
// VOLUME
// ==================================================

volume.addEventListener(
  "input",
  () => {

    audio.volume =
      Number(
        volume.value
      );
  }
);

// ==================================================
// SHUFFLE
// ==================================================

shuffleButton.addEventListener(
  "click",
  () => {

    isShuffle =
      !isShuffle;

    shuffleButton.classList.toggle(
      "active",
      isShuffle
    );
  }
);

// ==================================================
// REPEAT
// ==================================================

repeatButton.addEventListener(
  "click",
  () => {

    isRepeat =
      !isRepeat;

    repeatButton.classList.toggle(
      "active",
      isRepeat
    );
  }
);

// ==================================================
// LIKE
// ==================================================

likeButton.addEventListener(
  "click",
  () => {

    if (
      currentIndex === -1
    ) {
      return;
    }

    const song =
      songs[currentIndex];

    if (!song) {
      return;
    }

    const id =
      String(song.id);

    if (
      favorites.includes(id)
    ) {

      favorites =
        favorites.filter(
          item =>
            item !== id
        );

    } else {

      favorites.push(id);
    }

    localStorage.setItem(
      "swarajFavorites",
      JSON.stringify(
        favorites
      )
    );

    updateLikeButton();
  }
);

function updateLikeButton() {

  if (
    currentIndex === -1
  ) {

    likeButton.textContent =
      "♡";

    likeButton.classList.remove(
      "liked"
    );

    return;
  }

  const id =
    String(
      songs[currentIndex].id
    );

  const liked =
    favorites.includes(id);

  likeButton.textContent =
    liked
      ? "♥"
      : "♡";

  likeButton.classList.toggle(
    "liked",
    liked
  );
}

// ==================================================
// SEARCH
// ==================================================

function setupSearch() {

  searchInput.addEventListener(
    "input",
    () => {

      const query =
        searchInput.value
          .toLowerCase()
          .trim();

      clearSearch.classList.toggle(
        "hidden",
        !query
      );

      if (!query) {

        selectCategory(
          activeCategory
        );

        return;
      }

      filteredSongs =
        songs.filter(
          song => {

            const text =
              [
                song.title,
                song.artist,
                song.album,
                song.category
              ]
                .join(" ")
                .toLowerCase();

            return text.includes(
              query
            );
          }
        );

      activeCategory =
        "Search";

      songsHeading.textContent =
        `Search: ${query}`;

      renderSongs();
    }
  );

  clearSearch.addEventListener(
    "click",
    () => {

      searchInput.value =
        "";

      clearSearch.classList.add(
        "hidden"
      );

      selectCategory(
        "All Songs"
      );
    }
  );
}

// ==================================================
// MENU
// ==================================================

function setupMenu() {

  menuButton.addEventListener(
    "click",
    openSidebar
  );

  closeMenu.addEventListener(
    "click",
    closeSidebar
  );

  sidebarOverlay.addEventListener(
    "click",
    closeSidebar
  );
}

function openSidebar() {

  sidebar.classList.add(
    "open"
  );

  sidebarOverlay.classList.add(
    "show"
  );

  document.body.style.overflow =
    "hidden";
}

function closeSidebar() {

  sidebar.classList.remove(
    "open"
  );

  sidebarOverlay.classList.remove(
    "show"
  );

  document.body.style.overflow =
    "";
}

// ==================================================
// NAVIGATION
// ==================================================

function setupNavigation() {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".nav-item"
            )
            .forEach(
              nav =>
                nav.classList.remove(
                  "active"
                )
            );

          item.classList.add(
            "active"
          );

          const section =
            item.dataset.section;

          if (
            section ===
            "home"
          ) {

            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });

          } else if (
            section ===
            "search"
          ) {

            searchInput.focus();

          } else if (
            section ===
            "library"
          ) {

            document
              .querySelector(
                ".songs-grid"
              )
              ?.scrollIntoView({
                behavior:
                  "smooth"
              });
          }

          if (
            window.innerWidth <=
            900
          ) {
            closeSidebar();
          }
        }
      );
    });
}

// ==================================================
// REFRESH
// ==================================================

refreshButton.addEventListener(
  "click",
  async () => {

    refreshButton.style.transform =
      "rotate(360deg)";

    setTimeout(
      () => {
        refreshButton.style.transform =
          "";
      },
      500
    );

    await loadSongs();
  }
);

// ==================================================
// HERO PLAY
// ==================================================

heroPlay.addEventListener(
  "click",
  () => {

    if (!songs.length) {
      return;
    }

    if (
      currentIndex === -1
    ) {

      playSong(0);

    } else {

      togglePlay();
    }
  }
);

// ==================================================
// PLAYER BUTTONS
// ==================================================

playButton.addEventListener(
  "click",
  togglePlay
);

nextButton.addEventListener(
  "click",
  nextSong
);

previousButton.addEventListener(
  "click",
  previousSong
);

// ==================================================
// SHOW ALL
// ==================================================

showAllCategories.addEventListener(
  "click",
  () => {

    selectCategory(
      "All Songs"
    );

    window.scrollTo({
      top: 350,
      behavior: "smooth"
    });
  }
);

// ==================================================
// KEYBOARD
// ==================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.target.matches(
        "input, textarea"
      )
    ) {
      return;
    }

    if (
      event.code ===
      "Space"
    ) {

      event.preventDefault();

      togglePlay();
    }

    if (
      event.code ===
      "ArrowRight"
    ) {
      nextSong();
    }

    if (
      event.code ===
      "ArrowLeft"
    ) {
      previousSong();
    }
  }
);

// ==================================================
// HELPERS
// ==================================================

function formatTime(
  seconds
) {

  if (
    !Number.isFinite(
      seconds
    )
  ) {
    return "0:00";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remaining =
    Math.floor(
      seconds % 60
    );

  return `${minutes}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
}

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function escapeAttr(
  value
) {
  return escapeHtml(value);
}

function showLoading() {

  songsGrid.innerHTML = `
    <div class="loading">
      Loading songs...
    </div>
  `;

  emptyState.classList.add(
    "hidden"
  );
}