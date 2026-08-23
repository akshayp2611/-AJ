"use strict";

/* =====================================================
   स्वरAJ MUSIC PLAYER
===================================================== */

const audio = document.getElementById("audio");

const songsGrid = document.getElementById("songsGrid");
const libraryGrid = document.getElementById("libraryGrid");
const likedGrid = document.getElementById("likedGrid");
const searchResults = document.getElementById("searchResults");

const searchInput = document.getElementById("searchInput");
const largeSearchInput = document.getElementById("largeSearchInput");

const playButton = document.getElementById("playButton");
const previousButton = document.getElementById("previousButton");
const nextButton = document.getElementById("nextButton");

const shuffleButton = document.getElementById("shuffleButton");
const repeatButton = document.getElementById("repeatButton");

const progress = document.getElementById("progress");
const volume = document.getElementById("volume");

const currentTime = document.getElementById("currentTime");
const duration = document.getElementById("duration");

const playerTitle = document.getElementById("playerTitle");
const playerArtist = document.getElementById("playerArtist");
const playerCover = document.getElementById("playerCover");

const likeButton = document.getElementById("likeButton");

const libraryCount = document.getElementById("libraryCount");
const connectionText = document.getElementById("connectionText");

const toast = document.getElementById("toast");

let songs = [];
let currentIndex = -1;

let isShuffle = false;
let isRepeat = false;

let likedSongs = JSON.parse(
  localStorage.getItem("swarajLikedSongs") || "[]"
);


/* =====================================================
   API
===================================================== */

async function loadSongs() {

  showLoading(songsGrid);

  try {

    const response = await fetch("/api/songs", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Song API HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.songs)) {
      throw new Error("Invalid song API response");
    }

    songs = data.songs;

    connectionText.textContent = "ONLINE";

    libraryCount.textContent =
      `${songs.length} song${songs.length === 1 ? "" : "s"}`;

    renderSongs(songsGrid, songs);

    renderLibrary(songs);

    renderLiked();

  } catch (error) {

    console.error("Song API error:", error);

    connectionText.textContent = "OFFLINE";

    songsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <h2>Song API could not be loaded</h2>

        <p>
          Please check /api/songs on your Render server.
        </p>
      </div>
    `;

    libraryGrid.innerHTML = songsGrid.innerHTML;
  }
}


/* =====================================================
   SONG RENDER
===================================================== */

function renderSongs(container, list) {

  if (!container) return;

  if (!list.length) {

    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          <i class="fa-solid fa-music"></i>
        </div>

        <h2>No songs found</h2>

        <p>
          Add music to your collection.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML = list
    .map((song) => {

      const originalIndex =
        songs.findIndex(
          item => item.id === song.id
        );

      return `
        <article
          class="song-card"
          data-song-id="${escapeHtml(song.id)}"
        >

          <img
            class="song-cover"
            src="${escapeAttribute(song.cover || "/images/default-cover.svg")}"
            alt="${escapeAttribute(song.title)}"
            onerror="this.src='/images/default-cover.svg'"
          >

          <button
            class="song-play"
            onclick="playSongByIndex(${originalIndex})"
            aria-label="Play ${escapeAttribute(song.title)}"
          >
            <i class="fa-solid fa-play"></i>
          </button>

          <div class="song-info">

            <div class="song-title">
              ${escapeHtml(song.title || "Unknown Song")}
            </div>

            <div class="song-artist">
              ${escapeHtml(song.artist || "स्वरAJ")}
            </div>

          </div>

        </article>
      `;

    })
    .join("");
}


/* =====================================================
   LIBRARY
===================================================== */

function renderLibrary(list) {

  renderSongs(libraryGrid, list);

  if (libraryCount) {

    libraryCount.textContent =
      `${list.length} song${list.length === 1 ? "" : "s"}`;

  }
}


/* =====================================================
   LIKED
===================================================== */

function renderLiked() {

  const liked = songs.filter(song =>
    likedSongs.includes(song.id)
  );

  if (!liked.length) {

    likedGrid.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          <i class="fa-regular fa-heart"></i>
        </div>

        <h2>No liked songs</h2>

        <p>
          Your liked songs will appear here.
        </p>

      </div>
    `;

    return;
  }

  renderSongs(likedGrid, liked);
}


/* =====================================================
   PLAY SONG
===================================================== */

function playSongByIndex(index) {

  if (
    index < 0 ||
    index >= songs.length
  ) {
    return;
  }

  const song = songs[index];

  currentIndex = index;

  audio.src = song.url;

  audio.load();

  audio.play()
    .then(() => {

      updatePlayer(song);

    })
    .catch(error => {

      console.error("Audio playback error:", error);

      updatePlayer(song);

      showToast(
        "Tap play again to start the song."
      );

    });

  updatePlayer(song);
}


/* =====================================================
   PLAYER
===================================================== */

function updatePlayer(song) {

  playerTitle.textContent =
    song.title || "Unknown Song";

  playerArtist.textContent =
    song.artist || "स्वरAJ";

  playerCover.src =
    song.cover || "/images/default-cover.svg";

  playerCover.onerror = () => {
    playerCover.src =
      "/images/default-cover.svg";
  };

  updatePlayIcon();

  updateLikeButton();
}


function updatePlayIcon() {

  if (!playButton) return;

  playButton.innerHTML =
    audio.paused
      ? `<i class="fa-solid fa-play"></i>`
      : `<i class="fa-solid fa-pause"></i>`;
}


/* =====================================================
   PLAY / PAUSE
===================================================== */

playButton.addEventListener(
  "click",
  () => {

    if (!songs.length) {
      showToast("No songs available.");
      return;
    }

    if (currentIndex === -1) {

      playSongByIndex(0);

      return;
    }

    if (audio.paused) {

      audio.play()
        .catch(error =>
          console.error(error)
        );

    } else {

      audio.pause();

    }
  }
);


/* =====================================================
   NEXT
===================================================== */

nextButton.addEventListener(
  "click",
  nextSong
);

function nextSong() {

  if (!songs.length) return;

  if (isShuffle) {

    currentIndex =
      Math.floor(
        Math.random() * songs.length
      );

  } else {

    currentIndex =
      (currentIndex + 1) %
      songs.length;

  }

  playSongByIndex(currentIndex);
}


/* =====================================================
   PREVIOUS
===================================================== */

previousButton.addEventListener(
  "click",
  () => {

    if (!songs.length) return;

    if (audio.currentTime > 3) {

      audio.currentTime = 0;

      return;
    }

    currentIndex =
      currentIndex <= 0
        ? songs.length - 1
        : currentIndex - 1;

    playSongByIndex(currentIndex);
  }
);


/* =====================================================
   SHUFFLE
===================================================== */

shuffleButton.addEventListener(
  "click",
  () => {

    isShuffle = !isShuffle;

    shuffleButton.classList.toggle(
      "active",
      isShuffle
    );

    showToast(
      isShuffle
        ? "Shuffle ON"
        : "Shuffle OFF"
    );
  }
);


/* =====================================================
   REPEAT
===================================================== */

repeatButton.addEventListener(
  "click",
  () => {

    isRepeat = !isRepeat;

    repeatButton.classList.toggle(
      "active",
      isRepeat
    );

    showToast(
      isRepeat
        ? "Repeat ON"
        : "Repeat OFF"
    );
  }
);


/* =====================================================
   AUDIO EVENTS
===================================================== */

audio.addEventListener(
  "play",
  updatePlayIcon
);

audio.addEventListener(
  "pause",
  updatePlayIcon
);


audio.addEventListener(
  "timeupdate",
  () => {

    if (!audio.duration) return;

    const percent =
      (audio.currentTime /
        audio.duration) * 100;

    progress.value = percent;

    currentTime.textContent =
      formatTime(audio.currentTime);
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
  "ended",
  () => {

    if (isRepeat) {

      audio.currentTime = 0;

      audio.play();

      return;
    }

    nextSong();
  }
);


/* =====================================================
   PROGRESS
===================================================== */

progress.addEventListener(
  "input",
  () => {

    if (!audio.duration) return;

    audio.currentTime =
      (progress.value / 100) *
      audio.duration;
  }
);


/* =====================================================
   VOLUME
===================================================== */

volume.addEventListener(
  "input",
  () => {

    audio.volume =
      Number(volume.value);

  }
);

audio.volume = 1;


/* =====================================================
   LIKE
===================================================== */

likeButton.addEventListener(
  "click",
  () => {

    if (currentIndex === -1) return;

    const song =
      songs[currentIndex];

    const position =
      likedSongs.indexOf(song.id);

    if (position === -1) {

      likedSongs.push(song.id);

      showToast("Added to liked songs.");

    } else {

      likedSongs.splice(position, 1);

      showToast("Removed from liked songs.");

    }

    localStorage.setItem(
      "swarajLikedSongs",
      JSON.stringify(likedSongs)
    );

    updateLikeButton();

    renderLiked();
  }
);


function updateLikeButton() {

  if (currentIndex === -1) {

    likeButton.innerHTML =
      `<i class="fa-regular fa-heart"></i>`;

    return;
  }

  const liked =
    likedSongs.includes(
      songs[currentIndex].id
    );

  likeButton.innerHTML =
    liked
      ? `<i class="fa-solid fa-heart"></i>`
      : `<i class="fa-regular fa-heart"></i>`;
}


/* =====================================================
   SEARCH
===================================================== */

function performSearch(query) {

  const q =
    query.trim().toLowerCase();

  if (!q) {

    searchResults.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>

        <h2>Find your music</h2>

        <p>
          Search for a song, artist or album.
        </p>

      </div>
    `;

    return;
  }

  const result =
    songs.filter(song => {

      const text = [
        song.title,
        song.artist,
        song.album,
        song.category
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);

    });

  renderSongs(
    searchResults,
    result
  );
}


searchInput.addEventListener(
  "input",
  () => {

    performSearch(
      searchInput.value
    );

  }
);


largeSearchInput.addEventListener(
  "input",
  () => {

    searchInput.value =
      largeSearchInput.value;

    performSearch(
      largeSearchInput.value
    );

  }
);


document
  .getElementById("clearSearch")
  .addEventListener(
    "click",
    () => {

      searchInput.value = "";

      largeSearchInput.value = "";

      performSearch("");

    }
  );


/* =====================================================
   NAVIGATION
===================================================== */

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

        showPage(page);

      }
    );

  });


function showPage(page) {

  document
    .querySelectorAll(".page")
    .forEach(section => {

      section.classList.remove(
        "active"
      );

    });

  const target =
    document.getElementById(
      page + "Page"
    );

  if (target) {

    target.classList.add(
      "active"
    );

  }


  document
    .querySelectorAll(
      ".nav-item, .mobile-nav-item"
    )
    .forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.page === page
      );

    });
}


/* =====================================================
   CATEGORY FILTER
===================================================== */

document
  .querySelectorAll(".filter")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".filter")
          .forEach(item =>
            item.classList.remove("active")
          );

        button.classList.add("active");

        const filter =
          button.dataset.filter;

        const result =
          filter === "All"
            ? songs
            : songs.filter(
                song =>
                  String(
                    song.category || ""
                  ).toLowerCase() ===
                  filter.toLowerCase()
              );

        renderSongs(
          libraryGrid,
          result
        );

      }
    );

  });


/* =====================================================
   QUICK CATEGORY
===================================================== */

document
  .querySelectorAll(
    ".quick-card"
  )
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const category =
          card.dataset.category;

        showPage("library");

        const filter =
          document.querySelector(
            `.filter[data-filter="${category}"]`
          );

        if (filter) {

          filter.click();

        } else {

          renderSongs(
            libraryGrid,
            songs
          );

        }

      }
    );

  });


/* =====================================================
   HERO BUTTONS
===================================================== */

document
  .getElementById("heroPlay")
  .addEventListener(
    "click",
    () => {

      if (!songs.length) {

        showToast(
          "No songs available."
        );

        return;
      }

      playSongByIndex(
        currentIndex >= 0
          ? currentIndex
          : 0
      );

    }
  );


document
  .getElementById("heroShuffle")
  .addEventListener(
    "click",
    () => {

      if (!songs.length) {

        showToast(
          "No songs available."
        );

        return;
      }

      isShuffle = true;

      const random =
        Math.floor(
          Math.random() *
          songs.length
        );

      playSongByIndex(random);

    }
  );


/* =====================================================
   MOBILE MENU
===================================================== */

document
  .getElementById("mobileMenu")
  .addEventListener(
    "click",
    () => {

      showToast(
        "Use the bottom navigation."
      );

    }
  );


/* =====================================================
   HELPERS
===================================================== */

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
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


function showLoading(container) {

  if (!container) return;

  container.innerHTML = `
    <div class="loading">

      <div class="loader"></div>

      <span>
        Loading songs...
      </span>

    </div>
  `;
}


function showToast(message) {

  if (!toast) return;

  toast.querySelector("p").textContent =
    message;

  toast.classList.add("show");

  clearTimeout(
    window.swarajToastTimer
  );

  window.swarajToastTimer =
    setTimeout(
      () => {
        toast.classList.remove(
          "show"
        );
      },
      2200
    );
}


function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


/* =====================================================
   START
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadSongs();

  }
);