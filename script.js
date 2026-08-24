"use strict";

/* =========================================================
   स्वरAJ MUSIC PLAYER
   Frontend only
   Backend logic is NOT changed
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const API_URL = "/api/songs";


/* =========================================================
   DOM
========================================================= */

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const menuButton = document.getElementById("menuButton");
const closeMenu = document.getElementById("closeMenu");

const categoryList = document.getElementById("categoryList");
const categoryCards = document.getElementById("categoryCards");

const songsGrid = document.getElementById("songsGrid");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const emptyState = document.getElementById("emptyState");

const errorMessage = document.getElementById("errorMessage");

const songCount = document.getElementById("songCount");
const activeCategoryTitle =
  document.getElementById("activeCategoryTitle");

const searchInput =
  document.getElementById("searchInput");

const clearSearch =
  document.getElementById("clearSearch");

const refreshBtn =
  document.getElementById("refreshBtn");

const retryBtn =
  document.getElementById("retryBtn");

const heroPlay =
  document.getElementById("heroPlay");

const heroShuffle =
  document.getElementById("heroShuffle");

const audioPlayer =
  document.getElementById("audioPlayer");

const playerTitle =
  document.getElementById("playerTitle");

const playerArtist =
  document.getElementById("playerArtist");

const playerCover =
  document.getElementById("playerCover");

const playBtn =
  document.getElementById("playBtn");

const previousBtn =
  document.getElementById("previousBtn");

const nextBtn =
  document.getElementById("nextBtn");

const shuffleBtn =
  document.getElementById("shuffleBtn");

const repeatBtn =
  document.getElementById("repeatBtn");

const likeBtn =
  document.getElementById("likeBtn");

const volumeBtn =
  document.getElementById("volumeBtn");

const volumeSlider =
  document.getElementById("volumeSlider");

const progressBar =
  document.getElementById("progressBar");

const progressFill =
  document.getElementById("progressFill");

const progressThumb =
  document.getElementById("progressThumb");

const currentTime =
  document.getElementById("currentTime");

const duration =
  document.getElementById("duration");

const serverStatus =
  document.getElementById("serverStatus");


/* =========================================================
   STATE
========================================================= */

let allSongs = [];

let filteredSongs = [];

let activeCategory = "all";

let currentIndex = -1;

let isShuffle = false;

let isRepeat = false;

let likedSongs =
  JSON.parse(
    localStorage.getItem("swarajLikedSongs") || "[]"
  );


/* =========================================================
   MENU
========================================================= */

function openMenu() {

  sidebar.classList.add("open");

  sidebarOverlay.classList.add("show");

  document.body.style.overflow = "hidden";
}


function closeMenuPanel() {

  sidebar.classList.remove("open");

  sidebarOverlay.classList.remove("show");

  document.body.style.overflow = "";
}


menuButton.addEventListener("click", openMenu);

closeMenu.addEventListener("click", closeMenuPanel);

sidebarOverlay.addEventListener(
  "click",
  closeMenuPanel
);


/* =========================================================
   UTILITY
========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const mins =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${mins}:${secs}`;
}


function showOnly(element) {

  [
    loadingState,
    errorState,
    emptyState
  ].forEach(el => {

    el.classList.add("hidden");

  });

  if (element) {
    element.classList.remove("hidden");
  }
}


/* =========================================================
   API
========================================================= */

async function loadSongs() {

  showOnly(loadingState);

  serverStatus.textContent =
    "Loading music...";

  try {

    console.log(
      "स्वरAJ: Loading songs from:",
      API_URL
    );

    const response =
      await fetch(
        API_URL,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept": "application/json"
          }
        }
      );


    console.log(
      "स्वरAJ: API status:",
      response.status
    );


    if (!response.ok) {

      throw new Error(
        `Song API returned HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    console.log(
      "स्वरAJ API response:",
      data
    );


    /*
      IMPORTANT

      Backend response:

      {
        success: true,
        count: 2,
        songs: [...]
      }

      Therefore use data.songs
    */

    if (
      !data ||
      !Array.isArray(data.songs)
    ) {

      throw new Error(
        "Invalid API response. Expected { songs: [] }"
      );

    }


    allSongs =
      data.songs.map(
        normalizeSong
      );


    console.log(
      `स्वरAJ: ${allSongs.length} songs loaded`
    );


    serverStatus.textContent =
      `${allSongs.length} songs available`;


    buildCategories();

    applyFilters();


  } catch (error) {

    console.error(
      "स्वरAJ Song API Error:",
      error
    );


    allSongs = [];

    filteredSongs = [];

    serverStatus.textContent =
      "Connection error";

    errorMessage.textContent =
      error.message ||
      "Unable to load songs.";

    showOnly(errorState);

    songCount.textContent = "0";

    songsGrid.innerHTML = "";

  }

}


/* =========================================================
   NORMALIZE SONG
========================================================= */

function normalizeSong(song, index) {

  const normalized = {

    id:
      song.id ||
      `song-${index + 1}`,

    title:
      song.title ||
      "Unknown Song",

    artist:
      song.artist ||
      "स्वरAJ",

    album:
      song.album ||
      song.category ||
      "Music",

    category:
      song.category ||
      song.album ||
      "Other",

    cover:
      song.cover ||
      "/images/default-cover.svg",

    url:
      song.url ||
      "",

    file:
      song.file ||
      ""

  };


  /*
    If API returns a relative URL,
    browser automatically resolves it
    against the current Render domain.
  */

  if (
    normalized.url &&
    !normalized.url.startsWith("http") &&
    !normalized.url.startsWith("/")
  ) {

    normalized.url =
      "/" +
      normalized.url;

  }


  return normalized;

}


/* =========================================================
   CATEGORIES
========================================================= */

function buildCategories() {

  const categories =
    [
      ...new Set(
        allSongs
          .map(song => song.category)
          .filter(Boolean)
      )
    ];


  categoryList.innerHTML = `

    <button
      class="category-btn active"
      data-category="all"
    >
      <i class="fa-solid fa-layer-group"></i>
      <span>All Songs</span>
    </button>

  `;


  categoryCards.innerHTML = `

    <button
      class="category-card active"
      data-category="all"
    >

      <div class="category-card-icon">
        <i class="fa-solid fa-music"></i>
      </div>

      <div>
        <strong>All Songs</strong>
        <small>${allSongs.length} tracks</small>
      </div>

    </button>

  `;


  categories.forEach(
    (category, index) => {

      const icon =
        getCategoryIcon(
          category,
          index
        );


      const sideButton =
        document.createElement("button");

      sideButton.className =
        "category-btn";

      sideButton.dataset.category =
        category;

      sideButton.innerHTML = `

        <i class="${icon}"></i>

        <span>
          ${escapeHTML(category)}
        </span>

      `;


      categoryList.appendChild(
        sideButton
      );


      const card =
        document.createElement("button");

      card.className =
        "category-card";

      card.dataset.category =
        category;

      const count =
        allSongs.filter(
          song =>
            song.category === category
        ).length;


      card.innerHTML = `

        <div class="category-card-icon">
          <i class="${icon}"></i>
        </div>

        <div>
          <strong>
            ${escapeHTML(category)}
          </strong>

          <small>
            ${count} tracks
          </small>
        </div>

      `;


      categoryCards.appendChild(card);

    }
  );


  document
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const category =
            button.dataset.category;

          selectCategory(category);

        }
      );

    });

}


function getCategoryIcon(
  category,
  index
) {

  const name =
    String(category)
      .toLowerCase();


  if (
    name.includes("bhakti") ||
    name.includes("devotional") ||
    name.includes("ganesh") ||
    name.includes("ganpati")
  ) {

    return "fa-solid fa-om";

  }


  if (
    name.includes("love") ||
    name.includes("romantic")
  ) {

    return "fa-solid fa-heart";

  }


  if (
    name.includes("energetic") ||
    name.includes("party")
  ) {

    return "fa-solid fa-bolt";

  }


  if (
    name.includes("emotional")
  ) {

    return "fa-solid fa-cloud-rain";

  }


  if (
    name.includes("lofi")
  ) {

    return "fa-solid fa-headphones";

  }


  if (
    name.includes("ambient")
  ) {

    return "fa-solid fa-moon";

  }


  if (
    name.includes("marathi")
  ) {

    return "fa-solid fa-language";

  }


  const icons = [

    "fa-solid fa-compact-disc",

    "fa-solid fa-music",

    "fa-solid fa-wave-square",

    "fa-solid fa-radio",

    "fa-solid fa-star"

  ];


  return icons[
    index % icons.length
  ];

}


/* =========================================================
   SELECT CATEGORY
========================================================= */

function selectCategory(category) {

  activeCategory =
    category;

  document
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.category === category
      );

    });


  activeCategoryTitle.textContent =
    category === "all"
      ? "All Songs"
      : category;


  applyFilters();

  closeMenuPanel();

}


/* =========================================================
   SEARCH + FILTER
========================================================= */

function applyFilters() {

  const query =
    searchInput.value
      .trim()
      .toLowerCase();


  filteredSongs =
    allSongs.filter(song => {

      const categoryMatch =
        activeCategory === "all" ||
        song.category === activeCategory;


      const searchMatch =
        !query ||
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
          .includes(query);


      return (
        categoryMatch &&
        searchMatch
      );

    });


  renderSongs();

}


/* =========================================================
   RENDER SONGS
========================================================= */

function renderSongs() {

  songCount.textContent =
    filteredSongs.length;


  if (allSongs.length === 0) {

    songsGrid.innerHTML = "";

    showOnly(emptyState);

    return;

  }


  if (filteredSongs.length === 0) {

    songsGrid.innerHTML = "";

    showOnly(emptyState);

    return;

  }


  showOnly(null);


  songsGrid.innerHTML =
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
      ".song-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        event => {

          if (
            event.target.closest(
              ".card-play"
            )
          ) {

            return;

          }


          const id =
            card.dataset.id;

          playSongById(id);

        }
      );

    });


  document
    .querySelectorAll(
      ".card-play"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          playSongById(
            button.dataset.id
          );

        }
      );

    });

}


/* =========================================================
   SONG CARD
========================================================= */

function createSongCard(
  song,
  index
) {

  const liked =
    likedSongs.includes(
      song.id
    );


  return `

    <article
      class="song-card"
      data-id="${escapeHTML(song.id)}"
    >

      <div class="cover-wrap">

        ${
          song.cover
            ? `
              <img
                src="${escapeHTML(song.cover)}"
                alt="${escapeHTML(song.title)} cover"
                loading="lazy"
                onerror="this.style.display='none';this.nextElementSibling.style.display='grid';"
              >
            `
            : ""
        }

        <div
          class="cover-fallback"
          style="${
            song.cover
              ? "display:none"
              : "display:grid"
          }"
        >
          स्वर
        </div>


        <button
          class="card-play"
          data-id="${escapeHTML(song.id)}"
          aria-label="Play ${escapeHTML(song.title)}"
        >
          <i class="fa-solid fa-play"></i>
        </button>

      </div>


      <div class="song-info">

        <div class="song-title">
          ${escapeHTML(song.title)}
        </div>

        <div class="song-artist">
          ${escapeHTML(song.artist)}
        </div>

      </div>

    </article>

  `;

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSongById(id) {

  const index =
    filteredSongs.findIndex(
      song =>
        String(song.id) ===
        String(id)
    );


  if (index === -1) {

    console.warn(
      "Song not found:",
      id
    );

    return;

  }


  currentIndex =
    index;


  const song =
    filteredSongs[currentIndex];


  if (!song.url) {

    console.error(
      "Song has no URL:",
      song
    );

    return;

  }


  audioPlayer.src =
    song.url;


  audioPlayer.load();


  playerTitle.textContent =
    song.title;

  playerArtist.textContent =
    song.artist;


  playerCover.innerHTML = `

    ${
      song.cover
        ? `
          <img
            src="${escapeHTML(song.cover)}"
            alt=""
            style="
              width:100%;
              height:100%;
              object-fit:cover;
              border-radius:inherit;
            "
            onerror="this.remove()"
          >
        `
        : "स्व"
    }

  `;


  audioPlayer
    .play()
    .then(() => {

      updatePlayButton();

    })
    .catch(error => {

      console.warn(
        "Playback requires user interaction:",
        error
      );

      updatePlayButton();

    });

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

  if (!audioPlayer.src) {

    if (filteredSongs.length > 0) {

      playSongById(
        filteredSongs[0].id
      );

    }

    return;

  }


  if (audioPlayer.paused) {

    audioPlayer
      .play()
      .catch(console.error);

  } else {

    audioPlayer.pause();

  }

}


playBtn.addEventListener(
  "click",
  togglePlay
);


heroPlay.addEventListener(
  "click",
  togglePlay
);


/* =========================================================
   PLAY BUTTON
========================================================= */

function updatePlayButton() {

  const icon =
    playBtn.querySelector("i");


  if (
    audioPlayer.paused
  ) {

    icon.className =
      "fa-solid fa-play";

  } else {

    icon.className =
      "fa-solid fa-pause";

  }

}


/* =========================================================
   NEXT
========================================================= */

function nextSong() {

  if (
    filteredSongs.length === 0
  ) {

    return;

  }


  if (isShuffle) {

    let next;

    do {

      next =
        Math.floor(
          Math.random() *
          filteredSongs.length
        );

    } while (
      filteredSongs.length > 1 &&
      next === currentIndex
    );


    currentIndex =
      next;

  } else {

    currentIndex =
      currentIndex + 1;

    if (
      currentIndex >=
      filteredSongs.length
    ) {

      currentIndex = 0;

    }

  }


  playSongById(
    filteredSongs[currentIndex].id
  );

}


nextBtn.addEventListener(
  "click",
  nextSong
);


/* =========================================================
   PREVIOUS
========================================================= */

function previousSong() {

  if (
    filteredSongs.length === 0
  ) {

    return;

  }


  if (
    audioPlayer.currentTime > 3
  ) {

    audioPlayer.currentTime = 0;

    return;

  }


  currentIndex--;

  if (currentIndex < 0) {

    currentIndex =
      filteredSongs.length - 1;

  }


  playSongById(
    filteredSongs[currentIndex].id
  );

}


previousBtn.addEventListener(
  "click",
  previousSong
);


/* =========================================================
   AUTO NEXT
========================================================= */

audioPlayer.addEventListener(
  "ended",
  () => {

    if (isRepeat) {

      audioPlayer.currentTime = 0;

      audioPlayer.play();

      return;

    }

    nextSong();

  }
);


/* =========================================================
   SHUFFLE
========================================================= */

function toggleShuffle() {

  isShuffle =
    !isShuffle;

  shuffleBtn.classList.toggle(
    "active",
    isShuffle
  );

}


shuffleBtn.addEventListener(
  "click",
  toggleShuffle
);


heroShuffle.addEventListener(
  "click",
  () => {

    isShuffle = true;

    shuffleBtn.classList.add(
      "active"
    );

    nextSong();

  }
);


/* =========================================================
   REPEAT
========================================================= */

repeatBtn.addEventListener(
  "click",
  () => {

    isRepeat =
      !isRepeat;

    repeatBtn.classList.toggle(
      "active",
      isRepeat
    );

  }
);


/* =========================================================
   AUDIO EVENTS
========================================================= */

audioPlayer.addEventListener(
  "play",
  updatePlayButton
);


audioPlayer.addEventListener(
  "pause",
  updatePlayButton
);


audioPlayer.addEventListener(
  "loadedmetadata",
  () => {

    duration.textContent =
      formatTime(
        audioPlayer.duration
      );

  }
);


audioPlayer.addEventListener(
  "timeupdate",
  () => {

    const current =
      audioPlayer.currentTime || 0;

    const total =
      audioPlayer.duration || 0;


    currentTime.textContent =
      formatTime(current);


    const percent =
      total
        ? (current / total) * 100
        : 0;


    progressFill.style.width =
      `${percent}%`;

    progressThumb.style.left =
      `${percent}%`;

  }
);


/* =========================================================
   PROGRESS BAR
========================================================= */

progressBar.addEventListener(
  "click",
  event => {

    if (
      !audioPlayer.duration
    ) {

      return;

    }


    const rect =
      progressBar.getBoundingClientRect();


    const percent =
      Math.max(
        0,
        Math.min(
          1,
          (event.clientX - rect.left) /
          rect.width
        )
      );


    audioPlayer.currentTime =
      audioPlayer.duration *
      percent;

  }
);


/* =========================================================
   VOLUME
========================================================= */

audioPlayer.volume =
  Number(volumeSlider.value);


volumeSlider.addEventListener(
  "input",
  () => {

    audioPlayer.volume =
      Number(
        volumeSlider.value
      );

    updateVolumeIcon();

  }
);


volumeBtn.addEventListener(
  "click",
  () => {

    if (
      audioPlayer.volume > 0
    ) {

      audioPlayer.dataset.previousVolume =
        audioPlayer.volume;

      audioPlayer.volume = 0;

      volumeSlider.value = 0;

    } else {

      const previous =
        Number(
          audioPlayer.dataset.previousVolume ||
          1
        );

      audioPlayer.volume =
        previous;

      volumeSlider.value =
        previous;

    }

    updateVolumeIcon();

  }
);


function updateVolumeIcon() {

  const icon =
    volumeBtn.querySelector("i");


  if (
    audioPlayer.volume === 0
  ) {

    icon.className =
      "fa-solid fa-volume-xmark";

  } else if (
    audioPlayer.volume < .5
  ) {

    icon.className =
      "fa-solid fa-volume-low";

  } else {

    icon.className =
      "fa-solid fa-volume-high";

  }

}


/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
  "input",
  () => {

    clearSearch.style.display =
      searchInput.value
        ? "block"
        : "none";

    applyFilters();

  }
);


clearSearch.addEventListener(
  "click",
  () => {

    searchInput.value = "";

    clearSearch.style.display =
      "none";

    applyFilters();

    searchInput.focus();

  }
);


/* =========================================================
   LIKE
========================================================= */

likeBtn.addEventListener(
  "click",
  () => {

    if (
      currentIndex < 0 ||
      !filteredSongs[currentIndex]
    ) {

      return;

    }


    const id =
      filteredSongs[currentIndex].id;


    if (
      likedSongs.includes(id)
    ) {

      likedSongs =
        likedSongs.filter(
          item => item !== id
        );

    } else {

      likedSongs.push(id);

    }


    localStorage.setItem(
      "swarajLikedSongs",
      JSON.stringify(likedSongs)
    );


    updateLikeButton();

  }
);


function updateLikeButton() {

  if (
    currentIndex < 0 ||
    !filteredSongs[currentIndex]
  ) {

    return;

  }


  const id =
    filteredSongs[currentIndex].id;


  const icon =
    likeBtn.querySelector("i");


  if (
    likedSongs.includes(id)
  ) {

    icon.className =
      "fa-solid fa-heart";

    likeBtn.style.color =
      "#ec4899";

  } else {

    icon.className =
      "fa-regular fa-heart";

    likeBtn.style.color =
      "";

  }

}


/* =========================================================
   REFRESH
========================================================= */

refreshBtn.addEventListener(
  "click",
  loadSongs
);


retryBtn.addEventListener(
  "click",
  loadSongs
);


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

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

      togglePlay();

    }


    if (
      event.code === "ArrowRight"
    ) {

      nextSong();

    }


    if (
      event.code === "ArrowLeft"
    ) {

      previousSong();

    }

  }
);


/* =========================================================
   NAVIGATION
========================================================= */

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
          section === "search"
        ) {

          searchInput.focus();

        }


        if (
          section === "library"
        ) {

          selectCategory("all");

        }


        closeMenuPanel();

      }
    );

  });


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadSongs();

  }
);


/*
   Also call immediately because
   this script is loaded at the end
   of index.html.
*/

loadSongs();