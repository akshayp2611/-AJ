"use strict";

/* =========================================================
   स्वरAJ 🎵 MUSIC PLAYER
   API / playback logic
========================================================= */

const API_URL = "/api/songs";


/* =========================================================
   DOM
========================================================= */

const sidebar =
  document.getElementById("sidebar");

const sidebarOverlay =
  document.getElementById("sidebarOverlay");

const menuButton =
  document.getElementById("menuButton");

const closeMenu =
  document.getElementById("closeMenu");

const categoryList =
  document.getElementById("categoryList");

const categoryCards =
  document.getElementById("categoryCards");

const songsGrid =
  document.getElementById("songsGrid");

const loadingState =
  document.getElementById("loadingState");

const errorState =
  document.getElementById("errorState");

const emptyState =
  document.getElementById("emptyState");

const errorMessage =
  document.getElementById("errorMessage");

const songCount =
  document.getElementById("songCount");

const activeCategoryTitle =
  document.getElementById(
    "activeCategoryTitle"
  );

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

const viewToggle =
  document.getElementById("viewToggle");


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
    localStorage.getItem(
      "swarajLikedSongs"
    ) || "[]"
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
  ].forEach(item => {

    item.classList.add("hidden");

  });

  if (element) {
    element.classList.remove("hidden");
  }

}


/* =========================================================
   MENU
========================================================= */

function openMenu() {

  sidebar.classList.add("open");

  sidebarOverlay.classList.add("show");

  menuButton.setAttribute(
    "aria-expanded",
    "true"
  );

  document.body.style.overflow =
    "hidden";

}


function closeMenuPanel() {

  sidebar.classList.remove("open");

  sidebarOverlay.classList.remove("show");

  menuButton.setAttribute(
    "aria-expanded",
    "false"
  );

  document.body.style.overflow =
    "";

}


menuButton.addEventListener(
  "click",
  openMenu
);

closeMenu.addEventListener(
  "click",
  closeMenuPanel
);

sidebarOverlay.addEventListener(
  "click",
  closeMenuPanel
);


/* =========================================================
   LOAD SONGS
========================================================= */

async function loadSongs() {

  showOnly(loadingState);

  songsGrid.innerHTML = "";

  serverStatus.textContent =
    "Loading music...";

  try {

    const response =
      await fetch(
        API_URL,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              "application/json"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `Song API returned HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    if (
      !data ||
      !Array.isArray(data.songs)
    ) {

      throw new Error(
        "Invalid API response. Expected songs array."
      );

    }


    allSongs =
      data.songs.map(
        normalizeSong
      );


    serverStatus.textContent =
      `${allSongs.length} songs available`;


    buildCategories();

    applyFilters();


  } catch (error) {

    console.error(
      "स्वरAJ 🎵 API error:",
      error
    );

    allSongs = [];

    filteredSongs = [];

    songCount.textContent = "0";

    serverStatus.textContent =
      "Connection error";

    errorMessage.textContent =
      error.message ||
      "Unable to load songs.";

    songsGrid.innerHTML = "";

    showOnly(errorState);

  }

}


/* =========================================================
   NORMALIZE SONG
========================================================= */

function normalizeSong(
  song,
  index
) {

  let url =
    song.url || "";


  if (
    url &&
    !url.startsWith("/") &&
    !url.startsWith("http")
  ) {

    url = "/" + url;

  }


  return {

    id:
      song.id ||
      `song-${index + 1}`,

    title:
      song.title ||
      "Unknown Song",

    artist:
      song.artist ||
      "स्वरAJ 🎵",

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

    url,

    file:
      song.file ||
      ""

  };

}


/* =========================================================
   CATEGORY ICON
========================================================= */

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
    name.includes("party") ||
    name.includes("workout")
  ) {

    return "fa-solid fa-bolt";

  }


  if (
    name.includes("emotional")
  ) {

    return "fa-solid fa-cloud-rain";

  }


  if (
    name.includes("lofi") ||
    name.includes("chill")
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


  if (
    name.includes("focus")
  ) {

    return "fa-solid fa-bullseye";

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
   BUILD ALL CATEGORIES
========================================================= */

function buildCategories() {

  const detectedCategories =
    allSongs
      .map(song => song.category)
      .filter(Boolean);


  const categories = [
    "Bhakti",
    "Love",
    "Marathi",
    "Energetic",
    "Emotional",
    "Chill",
    "Workout",
    "Focus",
    ...detectedCategories
  ];


  const uniqueCategories =
    [
      ...new Map(
        categories.map(
          item => [
            item.toLowerCase(),
            item
          ]
        )
      ).values()
    ];


  /* SIDEBAR */

  categoryList.innerHTML = "";


  const allButton =
    document.createElement("button");

  allButton.className =
    "category-btn";

  if (
    activeCategory === "all"
  ) {
    allButton.classList.add("active");
  }

  allButton.dataset.category =
    "all";

  allButton.type = "button";

  allButton.innerHTML = `
    <i class="fa-solid fa-layer-group"></i>
    <span>All Songs</span>
  `;

  categoryList.appendChild(
    allButton
  );


  uniqueCategories.forEach(
    (category, index) => {

      const button =
        document.createElement("button");

      button.className =
        "category-btn";

      button.dataset.category =
        category;

      button.type = "button";

      button.innerHTML = `
        <i class="${getCategoryIcon(
          category,
          index
        )}"></i>

        <span>
          ${escapeHTML(category)}
        </span>
      `;

      categoryList.appendChild(
        button
      );

    }
  );


  /* MODERN CATEGORY CARDS */

  categoryCards.innerHTML = "";


  const allCard =
    document.createElement("button");

  allCard.className =
    "category-card";

  if (
    activeCategory === "all"
  ) {
    allCard.classList.add("active");
  }

  allCard.dataset.category =
    "all";

  allCard.type = "button";

  allCard.innerHTML = `
    <div class="category-card-icon">
      <i class="fa-solid fa-music"></i>
    </div>

    <div>
      <strong>All Songs</strong>
      <small>
        ${allSongs.length} tracks
      </small>
    </div>
  `;

  categoryCards.appendChild(
    allCard
  );


  uniqueCategories.forEach(
    (category, index) => {

      const count =
        allSongs.filter(
          song =>
            song.category
              .toLowerCase() ===
            category.toLowerCase()
        ).length;


      const card =
        document.createElement("button");

      card.className =
        "category-card";

      if (
        activeCategory
          .toLowerCase() ===
        category.toLowerCase()
      ) {
        card.classList.add(
          "active"
        );
      }

      card.dataset.category =
        category;

      card.type = "button";

      card.innerHTML = `
        <div class="category-card-icon">
          <i class="${getCategoryIcon(
            category,
            index
          )}"></i>
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

      categoryCards.appendChild(
        card
      );

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

          selectCategory(
            button.dataset.category
          );

        }
      );

    });

}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function selectCategory(
  category
) {

  activeCategory =
    category;


  activeCategoryTitle.textContent =
    category === "all"
      ? "All Songs"
      : category;


  document
    .querySelectorAll(
      "[data-category]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.category
          .toLowerCase() ===
        category.toLowerCase()
      );

    });


  applyFilters();

  closeMenuPanel();

}


/* =========================================================
   FILTER
========================================================= */

function applyFilters() {

  const query =
    searchInput.value
      .trim()
      .toLowerCase();


  filteredSongs =
    allSongs.filter(
      song => {

        const categoryMatch =
          activeCategory === "all" ||
          song.category
            .toLowerCase() ===
          activeCategory.toLowerCase();


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

      }
    );


  renderSongs();

}


/* =========================================================
   RENDER SONGS
========================================================= */

function renderSongs() {

  songCount.textContent =
    filteredSongs.length;


  if (
    allSongs.length === 0 ||
    filteredSongs.length === 0
  ) {

    songsGrid.innerHTML = "";

    showOnly(emptyState);

    return;

  }


  showOnly(null);


  songsGrid.innerHTML =
    filteredSongs
      .map(
        createSongCard
      )
      .join("");


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


  document
    .querySelectorAll(
      ".song-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          playSongById(
            card.dataset.id
          );

        }
      );

    });

}


/* =========================================================
   SONG CARD
========================================================= */

function createSongCard(
  song
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
                alt="${escapeHTML(song.title)}"
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
          🎵
        </div>


        <button
          class="card-play"
          data-id="${escapeHTML(song.id)}"
          aria-label="Play ${escapeHTML(song.title)}"
          type="button"
        >
          <i class="fa-solid fa-play"></i>
        </button>

      </div>


      <div class="song-info">

        <strong>
          ${escapeHTML(song.title)}
        </strong>

        <span>
          ${escapeHTML(song.artist)}
        </span>

        <small class="song-category">
          ${escapeHTML(song.category)}
        </small>

      </div>

    </article>

  `;

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSongById(
  id
) {

  const song =
    allSongs.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!song || !song.url) {

    console.warn(
      "Song URL unavailable:",
      song
    );

    return;

  }


  currentIndex =
    allSongs.findIndex(
      item =>
        String(item.id) ===
        String(song.id)
    );


  playerTitle.textContent =
    song.title;

  playerArtist.textContent =
    song.artist;


  updatePlayerCover(
    song.cover
  );


  audioPlayer.src =
    song.url;


  audioPlayer.load();


  audioPlayer.play()
    .then(() => {

      updatePlayButton(true);

    })
    .catch(error => {

      console.error(
        "Playback error:",
        error
      );

      updatePlayButton(false);

    });


  updateLikeButton();

}


/* =========================================================
   COVER
========================================================= */

function updatePlayerCover(
  cover
) {

  if (!cover) {

    playerCover.innerHTML =
      "<div>स्वर</div>";

    return;

  }


  playerCover.innerHTML = `
    <img
      src="${escapeHTML(cover)}"
      alt=""
      onerror="
        this.style.display='none';
        this.parentElement.innerHTML='<div>स्वर</div>';
      "
    >
  `;

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

  if (!audioPlayer.src) {

    if (filteredSongs.length) {

      playSongById(
        filteredSongs[0].id
      );

    }

    return;

  }


  if (audioPlayer.paused) {

    audioPlayer.play()
      .then(() => {

        updatePlayButton(true);

      })
      .catch(console.error);

  } else {

    audioPlayer.pause();

    updatePlayButton(false);

  }

}


function updatePlayButton(
  playing
) {

  playBtn.innerHTML =
    playing
      ? `<i class="fa-solid fa-pause"></i>`
      : `<i class="fa-solid fa-play"></i>`;

}


/* =========================================================
   NEXT
========================================================= */

function nextSong() {

  if (!allSongs.length) {
    return;
  }


  if (isShuffle) {

    const random =
      Math.floor(
        Math.random() *
        allSongs.length
      );

    currentIndex =
      random;

  } else {

    currentIndex++;

    if (
      currentIndex >=
      allSongs.length
    ) {

      currentIndex = 0;

    }

  }


  playSongById(
    allSongs[currentIndex].id
  );

}


/* =========================================================
   PREVIOUS
========================================================= */

function previousSong() {

  if (!allSongs.length) {
    return;
  }


  currentIndex--;

  if (currentIndex < 0) {

    currentIndex =
      allSongs.length - 1;

  }


  playSongById(
    allSongs[currentIndex].id
  );

}


/* =========================================================
   EVENTS
========================================================= */

playBtn.addEventListener(
  "click",
  togglePlay
);

nextBtn.addEventListener(
  "click",
  nextSong
);

previousBtn.addEventListener(
  "click",
  previousSong
);


shuffleBtn.addEventListener(
  "click",
  () => {

    isShuffle =
      !isShuffle;

    shuffleBtn.classList.toggle(
      "active",
      isShuffle
    );

  }
);


heroShuffle.addEventListener(
  "click",
  () => {

    isShuffle = true;

    const random =
      Math.floor(
        Math.random() *
        allSongs.length
      );

    if (allSongs[random]) {

      playSongById(
        allSongs[random].id
      );

    }

  }
);


heroPlay.addEventListener(
  "click",
  () => {

    if (
      audioPlayer.src &&
      !audioPlayer.paused
    ) {

      audioPlayer.pause();

      updatePlayButton(false);

      return;

    }


    if (
      audioPlayer.src
    ) {

      togglePlay();

      return;

    }


    if (
      filteredSongs.length
    ) {

      playSongById(
        filteredSongs[0].id
      );

    }

  }
);


repeatBtn.addEventListener(
  "click",
  () => {

    isRepeat =
      !isRepeat;

    audioPlayer.loop =
      isRepeat;

    repeatBtn.classList.toggle(
      "active",
      isRepeat
    );

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
      !allSongs[currentIndex]
    ) {

      return;

    }


    const id =
      allSongs[currentIndex].id;


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
      JSON.stringify(
        likedSongs
      )
    );


    updateLikeButton();

  }
);


function updateLikeButton() {

  if (
    currentIndex < 0 ||
    !allSongs[currentIndex]
  ) {

    return;

  }


  const liked =
    likedSongs.includes(
      allSongs[currentIndex].id
    );


  likeBtn.innerHTML =
    liked
      ? `<i class="fa-solid fa-heart"></i>`
      : `<i class="fa-regular fa-heart"></i>`;

}


/* =========================================================
   AUDIO EVENTS
========================================================= */

audioPlayer.addEventListener(
  "play",
  () => {

    updatePlayButton(true);

  }
);


audioPlayer.addEventListener(
  "pause",
  () => {

    updatePlayButton(false);

  }
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

    if (
      !Number.isFinite(
        audioPlayer.duration
      )
    ) {

      return;

    }


    const percent =
      (
        audioPlayer.currentTime /
        audioPlayer.duration
      ) * 100;


    progressFill.style.width =
      `${percent}%`;

    progressThumb.style.left =
      `${percent}%`;

    currentTime.textContent =
      formatTime(
        audioPlayer.currentTime
      );

  }
);


audioPlayer.addEventListener(
  "ended",
  () => {

    if (isRepeat) {
      return;
    }

    nextSong();

  }
);


/* =========================================================
   PROGRESS
========================================================= */

progressBar.addEventListener(
  "click",
  event => {

    if (
      !Number.isFinite(
        audioPlayer.duration
      )
    ) {

      return;

    }


    const rect =
      progressBar.getBoundingClientRect();


    const percent =
      (
        event.clientX -
        rect.left
      ) / rect.width;


    audioPlayer.currentTime =
      Math.max(
        0,
        Math.min(
          1,
          percent
        )
      ) *
      audioPlayer.duration;

  }
);


/* =========================================================
   VOLUME
========================================================= */

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
          .8
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

  const volume =
    audioPlayer.volume;


  if (volume === 0) {

    volumeBtn.innerHTML =
      `<i class="fa-solid fa-volume-xmark"></i>`;

  } else if (volume < .5) {

    volumeBtn.innerHTML =
      `<i class="fa-solid fa-volume-low"></i>`;

  } else {

    volumeBtn.innerHTML =
      `<i class="fa-solid fa-volume-high"></i>`;

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
   NAVIGATION
========================================================= */

document
  .querySelectorAll(
    ".nav-item"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".nav-item"
          )
          .forEach(item =>
            item.classList.remove(
              "active"
            )
          );

        button.classList.add(
          "active"
        );


        const section =
          button.dataset.section;


        if (
          section === "search"
        ) {

          searchInput.focus();

        }


        closeMenuPanel();

      }
    );

  });


/* =========================================================
   VIEW TOGGLE
========================================================= */

viewToggle.addEventListener(
  "click",
  () => {

    songsGrid.classList.toggle(
      "list-view"
    );

    viewToggle.innerHTML =
      songsGrid.classList.contains(
        "list-view"
      )
        ? `<i class="fa-solid fa-list"></i>`
        : `<i class="fa-solid fa-table-cells-large"></i>`;

  }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.code ===
      "Space" &&
      event.target.tagName !==
      "INPUT"
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
   START
========================================================= */

audioPlayer.volume =
  Number(
    volumeSlider.value
  );

loadSongs();