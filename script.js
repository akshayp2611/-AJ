"use strict";

/*
==========================================================
स्वरAJ MUSIC FRONTEND
==========================================================

Backend endpoint:

    GET /api/songs

Expected:

{
  "success": true,
  "count": 2,
  "songs": [
    {
      "id": "song-1",
      "title": "...",
      "artist": "...",
      "album": "...",
      "category": "...",
      "cover": "...",
      "url": "..."
    }
  ]
}

Categories are generated automatically from the
songs returned by /api/songs.

No /api/categories endpoint is required.
==========================================================
*/


/* ======================================================
   STATE
====================================================== */

const API_URL = "/api/songs";

let songs = [];

let filteredSongs = [];

let currentIndex = -1;

let shuffleMode = false;

let repeatMode = false;

let likedSongs =
  JSON.parse(
    localStorage.getItem(
      "swaraj-liked"
    ) || "[]"
  );

let recentSongs =
  JSON.parse(
    localStorage.getItem(
      "swaraj-recent"
    ) || "[]"
  );


/* ======================================================
   ELEMENTS
====================================================== */

const audio =
  document.getElementById("audio");

const songsContainer =
  document.getElementById("songs");

const categoriesContainer =
  document.getElementById("categories");

const songCount =
  document.getElementById("songCount");

const songsTitle =
  document.getElementById("songsTitle");

const apiStatus =
  document.getElementById("apiStatus");

const statusLight =
  document.getElementById("statusLight");

const emptyState =
  document.getElementById("emptyState");

const playerTitle =
  document.getElementById("playerTitle");

const playerArtist =
  document.getElementById("playerArtist");

const playerCover =
  document.getElementById("playerCover");

const playButton =
  document.getElementById("playButton");

const previousButton =
  document.getElementById("previousButton");

const nextButton =
  document.getElementById("nextButton");

const shuffleButton =
  document.getElementById("shuffleButton");

const repeatButton =
  document.getElementById("repeatButton");

const progress =
  document.getElementById("progress");

const currentTime =
  document.getElementById("currentTime");

const duration =
  document.getElementById("duration");

const volume =
  document.getElementById("volume");

const muteButton =
  document.getElementById("muteButton");

const playerLike =
  document.getElementById("playerLike");

const searchInput =
  document.getElementById("searchInput");

const searchContainer =
  document.getElementById(
    "searchContainer"
  );


/* ======================================================
   HELPERS
====================================================== */

function text(value, fallback = "") {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return String(value);
}


function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function resolveUrl(url) {

  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  return url.startsWith("/")
    ? url
    : "/" + url;
}


function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {
    return "0:00";
  }

  const min =
    Math.floor(
      seconds / 60
    );

  const sec =
    Math.floor(
      seconds % 60
    );

  return (
    min +
    ":" +
    String(sec).padStart(2, "0")
  );
}


/* ======================================================
   STATUS
====================================================== */

function status(message, online = true) {

  apiStatus.textContent =
    message;

  statusLight.style.background =
    online
      ? "#00e69a"
      : "#ff527d";

  statusLight.style.boxShadow =
    online
      ? "0 0 12px #00e69a"
      : "0 0 12px #ff527d";
}


/* ======================================================
   NORMALIZE SONG
====================================================== */

function normalizeSong(song, index) {

  const category =
    text(
      song.category ||
      song.genre ||
      song.album,
      "Other"
    );

  return {

    id:
      text(
        song.id,
        "song-" + (index + 1)
      ),

    title:
      text(
        song.title ||
        song.name,
        "Unknown Song"
      ),

    artist:
      text(
        song.artist ||
        song.singer,
        "स्वरAJ"
      ),

    album:
      text(
        song.album,
        category
      ),

    category,

    cover:
      resolveUrl(
        song.cover ||
        song.image ||
        song.thumbnail ||
        ""
      ),

    url:
      resolveUrl(
        song.url ||
        song.src ||
        song.path ||
        ""
      ),

    file:
      text(song.file)

  };
}


/* ======================================================
   LOAD SONGS
====================================================== */

async function loadSongs() {

  status(
    "Loading music library..."
  );

  try {

    const response =
      await fetch(
        API_URL + "?t=" +
        Date.now(),
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept":
              "application/json"
          }
        }
      );

    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }

    const data =
      await response.json();

    let received = [];

    if (Array.isArray(data)) {

      received = data;

    } else if (
      data &&
      Array.isArray(data.songs)
    ) {

      received = data.songs;

    } else if (
      data &&
      Array.isArray(data.data)
    ) {

      received = data.data;

    }

    songs =
      received.map(
        normalizeSong
      );

    filteredSongs =
      [...songs];

    status(
      songs.length +
      " song" +
      (
        songs.length === 1
          ? ""
          : "s"
      ) +
      " available"
    );

    renderCategories();

    renderSongs();

  } catch (error) {

    console.error(
      "Song API error:",
      error
    );

    songs = [];

    filteredSongs = [];

    status(
      "Song API could not be loaded",
      false
    );

    categoriesContainer.innerHTML = `
      <div class="loading-box">
        Unable to load categories
      </div>
    `;

    songsContainer.innerHTML = `
      <div class="loading-box">
        Song API could not be loaded.
      </div>
    `;

    songCount.textContent =
      "0 songs";
  }

}


/* ======================================================
   CATEGORY ICONS
====================================================== */

const categoryIcons = [
  "♫",
  "✦",
  "♬",
  "◈",
  "★",
  "♪",
  "✧",
  "◉"
];


/* ======================================================
   RENDER CATEGORIES
====================================================== */

function renderCategories() {

  if (!songs.length) {

    categoriesContainer.innerHTML = `
      <div class="loading-box">
        No categories available
      </div>
    `;

    return;
  }

  const categoryMap =
    new Map();

  songs.forEach(song => {

    const category =
      song.category || "Other";

    categoryMap.set(
      category,
      (
        categoryMap.get(category) ||
        0
      ) + 1
    );

  });

  const entries =
    Array.from(
      categoryMap.entries()
    );

  categoriesContainer.innerHTML =
    entries
      .map(
        ([category, count], index) => {

          return `
            <article
              class="category-card"
              data-category="${escapeHtml(category)}"
            >

              <div class="category-icon">
                ${
                  categoryIcons[
                    index %
                    categoryIcons.length
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

            </article>
          `;

        }
      )
      .join("");

  document
    .querySelectorAll(
      ".category-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          filterCategory(
            card.dataset.category
          );

        }
      );

    });

}


/* ======================================================
   RENDER SONGS
====================================================== */

function renderSongs() {

  if (!filteredSongs.length) {

    songsContainer.innerHTML = "";

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
    filteredSongs.length +
    " song" +
    (
      filteredSongs.length === 1
        ? ""
        : "s"
    );

  songsContainer.innerHTML =
    filteredSongs
      .map(
        (song, index) =>
          createSongCard(
            song,
            index
          )
      )
      .join("");

  document
    .querySelectorAll(
      ".song-play"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          playFilteredSong(
            Number(
              button.dataset.index
            )
          );

        }
      );

    });

  document
    .querySelectorAll(
      ".song-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          playFilteredSong(
            Number(
              card.dataset.index
            )
          );

        }
      );

    });

}


/* ======================================================
   SONG CARD
====================================================== */

function createSongCard(
  song,
  index
) {

  const cover =
    song.cover
      ? `
        <img
          src="${escapeHtml(song.cover)}"
          alt=""
          loading="lazy"
          onerror="
            this.style.display='none'
          "
        >
      `
      : "";

  return `
    <article
      class="song-card"
      data-index="${index}"
    >

      <div class="cover">

        ${cover}

        <span>♫</span>

      </div>

      <div class="song-info">

        <h3>
          ${escapeHtml(song.title)}
        </h3>

        <p>
          ${escapeHtml(song.artist)}
        </p>

      </div>

      <button
        class="song-play"
        data-index="${index}"
        aria-label="Play"
      >
        ▶
      </button>

    </article>
  `;
}


/* ======================================================
   FILTER CATEGORY
====================================================== */

function filterCategory(
  category
) {

  filteredSongs =
    songs.filter(
      song =>
        song.category
          .toLowerCase() ===
        category
          .toLowerCase()
    );

  songsTitle.textContent =
    category;

  renderSongs();

  scrollToSongs();

}


/* ======================================================
   SHOW ALL
====================================================== */

function showAllSongs() {

  filteredSongs =
    [...songs];

  songsTitle.textContent =
    "All Songs";

  renderSongs();

}


/* ======================================================
   SEARCH
====================================================== */

function searchSongs(
  query
) {

  query =
    query
      .trim()
      .toLowerCase();

  if (!query) {

    showAllSongs();

    return;
  }

  filteredSongs =
    songs.filter(
      song =>

        song.title
          .toLowerCase()
          .includes(query) ||

        song.artist
          .toLowerCase()
          .includes(query) ||

        song.album
          .toLowerCase()
          .includes(query) ||

        song.category
          .toLowerCase()
          .includes(query)
    );

  songsTitle.textContent =
    "Search Results";

  renderSongs();

}


/* ======================================================
   PLAY FILTERED
====================================================== */

function playFilteredSong(
  index
) {

  const song =
    filteredSongs[index];

  if (!song) {
    return;
  }

  currentIndex =
    songs.findIndex(
      item =>
        item.id === song.id
    );

  playSong(song);

}


/* ======================================================
   PLAY SONG
====================================================== */

async function playSong(
  song
) {

  if (!song.url) {

    status(
      "Song URL unavailable",
      false
    );

    return;
  }

  playerTitle.textContent =
    song.title;

  playerArtist.textContent =
    song.artist;

  if (song.cover) {

    playerCover.innerHTML = `
      <img
        src="${escapeHtml(song.cover)}"
        alt=""
      >
    `;

  } else {

    playerCover.innerHTML =
      "♪";

  }

  updateLikeButton(
    song.id
  );

  const absoluteUrl =
    new URL(
      song.url,
      window.location.href
    ).href;

  if (
    audio.src !== absoluteUrl
  ) {

    audio.src =
      song.url;

  }

  addRecent(song);

  try {

    await audio.play();

    updatePlayButton(
      true
    );

  } catch (error) {

    console.log(
      "Autoplay blocked:",
      error
    );

    updatePlayButton(
      false
    );

    status(
      "Tap Play to start music"
    );

  }

}


/* ======================================================
   PLAY / PAUSE
====================================================== */

playButton.addEventListener(
  "click",
  async () => {

    if (!audio.src) {

      if (!songs.length) {
        return;
      }

      currentIndex = 0;

      await playSong(
        songs[0]
      );

      return;
    }

    if (audio.paused) {

      try {

        await audio.play();

        updatePlayButton(
          true
        );

      } catch (error) {

        console.error(error);

      }

    } else {

      audio.pause();

      updatePlayButton(
        false
      );

    }

  }
);


/* ======================================================
   BUTTON
====================================================== */

function updatePlayButton(
  playing
) {

  playButton.textContent =
    playing
      ? "❚❚"
      : "▶";

}


/* ======================================================
   NEXT
====================================================== */

nextButton.addEventListener(
  "click",
  () => {

    if (!songs.length) {
      return;
    }

    let next;

    if (shuffleMode) {

      next =
        Math.floor(
          Math.random() *
          songs.length
        );

    } else {

      next =
        currentIndex + 1;

      if (
        next >=
        songs.length
      ) {
        next = 0;
      }

    }

    currentIndex =
      next;

    playSong(
      songs[currentIndex]
    );

  }
);


/* ======================================================
   PREVIOUS
====================================================== */

previousButton.addEventListener(
  "click",
  () => {

    if (!songs.length) {
      return;
    }

    if (
      audio.currentTime > 3
    ) {

      audio.currentTime = 0;

      return;
    }

    let previous =
      currentIndex - 1;

    if (previous < 0) {

      previous =
        songs.length - 1;
    }

    currentIndex =
      previous;

    playSong(
      songs[currentIndex]
    );

  }
);


/* ======================================================
   AUDIO EVENTS
====================================================== */

audio.addEventListener(
  "play",
  () => {

    updatePlayButton(true);

  }
);

audio.addEventListener(
  "pause",
  () => {

    updatePlayButton(false);

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

    if (!audio.duration) {
      return;
    }

    progress.value =
      (
        audio.currentTime /
        audio.duration
      ) * 100;

    currentTime.textContent =
      formatTime(
        audio.currentTime
      );

  }
);

audio.addEventListener(
  "ended",
  () => {

    if (repeatMode) {

      audio.currentTime =
        0;

      audio.play();

      return;
    }

    nextButton.click();

  }
);


/* ======================================================
   PROGRESS
====================================================== */

progress.addEventListener(
  "input",
  () => {

    if (!audio.duration) {
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


/* ======================================================
   VOLUME
====================================================== */

audio.volume = .8;

volume.addEventListener(
  "input",
  () => {

    audio.volume =
      Number(
        volume.value
      );

    muteButton.textContent =
      audio.volume === 0
        ? "🔇"
        : "🔊";

  }
);

muteButton.addEventListener(
  "click",
  () => {

    audio.muted =
      !audio.muted;

    muteButton.textContent =
      audio.muted
        ? "🔇"
        : "🔊";

  }
);


/* ======================================================
   SHUFFLE
====================================================== */

shuffleButton.addEventListener(
  "click",
  () => {

    shuffleMode =
      !shuffleMode;

    setActiveButton(
      shuffleButton,
      shuffleMode
    );

  }
);


/* ======================================================
   REPEAT
====================================================== */

repeatButton.addEventListener(
  "click",
  () => {

    repeatMode =
      !repeatMode;

    setActiveButton(
      repeatButton,
      repeatMode
    );

  }
);


function setActiveButton(
  button,
  active
) {

  button.style.background =
    active
      ? "rgba(155,92,255,.35)"
      : "";

  button.style.boxShadow =
    active
      ? "0 0 15px rgba(155,92,255,.25)"
      : "";

}


/* ======================================================
   LIKED
====================================================== */

playerLike.addEventListener(
  "click",
  () => {

    if (
      currentIndex < 0 ||
      !songs[currentIndex]
    ) {
      return;
    }

    toggleLike(
      songs[currentIndex]
    );

  }
);


function toggleLike(
  song
) {

  const position =
    likedSongs.indexOf(
      song.id
    );

  if (position >= 0) {

    likedSongs.splice(
      position,
      1
    );

  } else {

    likedSongs.push(
      song.id
    );

  }

  localStorage.setItem(
    "swaraj-liked",
    JSON.stringify(
      likedSongs
    )
  );

  updateLikeButton(
    song.id
  );

}


function updateLikeButton(
  id
) {

  playerLike.classList.toggle(
    "liked",
    likedSongs.includes(id)
  );

  playerLike.textContent =
    likedSongs.includes(id)
      ? "♥"
      : "♡";

}


/* ======================================================
   RECENT
====================================================== */

function addRecent(
  song
) {

  recentSongs =
    recentSongs.filter(
      id =>
        id !== song.id
    );

  recentSongs.unshift(
    song.id
  );

  recentSongs =
    recentSongs.slice(
      0,
      20
    );

  localStorage.setItem(
    "swaraj-recent",
    JSON.stringify(
      recentSongs
    )
  );

}


/* ======================================================
   NAVIGATION
====================================================== */

document
  .querySelectorAll(
    "[data-page]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const page =
          button.dataset.page;

        document
          .querySelectorAll(
            "[data-page]"
          )
          .forEach(item => {

            item.classList.toggle(
              "active",
              item.dataset.page ===
              page
            );

          });

        if (
          page === "home"
        ) {

          showAllSongs();

        }

        if (
          page === "library"
        ) {

          showAllSongs();

          songsTitle.textContent =
            "Your Library";

        }

        if (
          page === "liked"
        ) {

          filteredSongs =
            songs.filter(
              song =>
                likedSongs.includes(
                  song.id
                )
            );

          songsTitle.textContent =
            "Liked Songs";

          renderSongs();

        }

        if (
          page === "recent"
        ) {

          filteredSongs =
            recentSongs
              .map(
                id =>
                  songs.find(
                    song =>
                      song.id === id
                  )
              )
              .filter(Boolean);

          songsTitle.textContent =
            "Recently Played";

          renderSongs();

        }

      }
    );

  });


/* ======================================================
   SEARCH BUTTON
====================================================== */

document
  .getElementById(
    "searchButton"
  )
  .addEventListener(
    "click",
    () => {

      searchContainer.classList.toggle(
        "open"
      );

      if (
        searchContainer.classList.contains(
          "open"
        )
      ) {

        setTimeout(
          () =>
            searchInput.focus(),
          100
        );

      }

    }
  );


/* ======================================================
   SEARCH
====================================================== */

searchInput.addEventListener(
  "input",
  () => {

    searchSongs(
      searchInput.value
    );

  }
);


/* ======================================================
   CLEAR SEARCH
====================================================== */

document
  .getElementById(
    "clearSearch"
  )
  .addEventListener(
    "click",
    () => {

      searchInput.value = "";

      showAllSongs();

    }
  );


/* ======================================================
   MENU
====================================================== */

document
  .getElementById(
    "menuButton"
  )
  .addEventListener(
    "click",
    () => {

      const nav =
        document.getElementById(
          "mobileNav"
        );

      nav.classList.toggle(
        "open"
      );

    }
  );


/* ======================================================
   START LISTENING
====================================================== */

document
  .getElementById(
    "startButton"
  )
  .addEventListener(
    "click",
    () => {

      if (!songs.length) {
        return;
      }

      currentIndex = 0;

      playSong(
        songs[0]
      );

    }
  );


/* ======================================================
   EXPLORE
====================================================== */

document
  .getElementById(
    "exploreButton"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "categoriesSection"
        )
        .scrollIntoView({
          behavior: "smooth"
        });

    }
  );


/* ======================================================
   REFRESH
====================================================== */

document
  .getElementById(
    "refreshButton"
  )
  .addEventListener(
    "click",
    () => {

      loadSongs();

    }
  );


/* ======================================================
   THEME / VISUAL BUTTON
====================================================== */

document
  .getElementById(
    "themeButton"
  )
  .addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "soft-mode"
      );

    }
  );


/* ======================================================
   SCROLL
====================================================== */

function scrollToSongs() {

  document
    .getElementById(
      "songsSection"
    )
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

}


/* ======================================================
   KEYBOARD
====================================================== */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.target.tagName ===
      "INPUT"
    ) {
      return;
    }

    if (
      event.code === "Space"
    ) {

      event.preventDefault();

      playButton.click();

    }

    if (
      event.code ===
      "ArrowRight"
    ) {

      nextButton.click();

    }

    if (
      event.code ===
      "ArrowLeft"
    ) {

      previousButton.click();

    }

  }
);


/* ======================================================
   START
====================================================== */

loadSongs();