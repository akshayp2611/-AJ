/* =========================================================
   स्वरAJ MUSIC PLAYER
   Existing API logic preserved:
   GET /api/songs
========================================================= */

(() => {

  "use strict";

  /* =======================================================
     CONFIG
  ======================================================= */

  const API_URL = "/api/songs";

  /* =======================================================
     STATE
  ======================================================= */

  let allSongs = [];
  let visibleSongs = [];

  let currentIndex = -1;

  let currentCategory = "All Songs";

  let isShuffle = false;
  let isRepeat = false;

  let likedSongs =
    JSON.parse(localStorage.getItem("swaraj-liked") || "[]");

  let recentSongs =
    JSON.parse(localStorage.getItem("swaraj-recent") || "[]");

  /* =======================================================
     DOM
  ======================================================= */

  const audio =
    document.getElementById("audio");

  const songsContainer =
    document.getElementById("songs");

  const categoriesContainer =
    document.getElementById("categories");

  const songTitle =
    document.getElementById("songsTitle");

  const songCount =
    document.getElementById("songCount");

  const emptyState =
    document.getElementById("emptyState");

  const searchInput =
    document.getElementById("searchInput");

  const apiStatus =
    document.getElementById("apiStatus");

  const statusIndicator =
    document.getElementById("statusIndicator");

  const playerTitle =
    document.getElementById("playerTitle");

  const playerArtist =
    document.getElementById("playerArtist");

  const playerCover =
    document.getElementById("playerCover");

  const playerLike =
    document.getElementById("playerLike");

  const playButton =
    document.getElementById("playButton");

  const progress =
    document.getElementById("progress");

  const currentTime =
    document.getElementById("currentTime");

  const duration =
    document.getElementById("duration");

  const volume =
    document.getElementById("volume");

  /* =======================================================
     HELPERS
  ======================================================= */

  function escapeHTML(value) {

    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

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

  function normalizeUrl(url) {

    if (!url) return "";

    if (
      url.startsWith("http://") ||
      url.startsWith("https://")
    ) {
      return url;
    }

    if (url.startsWith("/")) {
      return url;
    }

    return "/" + url;

  }

  function getSongId(song, index) {

    return song.id ||
      song.file ||
      song.url ||
      `song-${index}`;

  }

  function saveLikes() {

    localStorage.setItem(
      "swaraj-liked",
      JSON.stringify(likedSongs)
    );

  }

  function saveRecent() {

    localStorage.setItem(
      "swaraj-recent",
      JSON.stringify(recentSongs)
    );

  }

  /* =======================================================
     API STATUS
  ======================================================= */

  function setStatus(message, type = "") {

    if (apiStatus) {
      apiStatus.textContent = message;
    }

    if (statusIndicator) {

      statusIndicator.classList.remove(
        "online",
        "error"
      );

      if (type) {
        statusIndicator.classList.add(type);
      }

    }

  }

  /* =======================================================
     LOAD SONGS
  ======================================================= */

  async function loadSongs() {

    setStatus(
      "Connecting to music library..."
    );

    try {

      const response =
        await fetch(
          API_URL,
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

      /*
       * Supports:
       * {success:true,songs:[...]}
       * and plain [...]
       */

      const songs =
        Array.isArray(data)
          ? data
          : Array.isArray(data.songs)
            ? data.songs
            : [];

      allSongs =
        songs.map(
          (song, index) => ({
            ...song,

            id:
              getSongId(song, index),

            title:
              song.title ||
              song.name ||
              "Unknown Song",

            artist:
              song.artist ||
              "स्वरAJ",

            album:
              song.album ||
              song.category ||
              "स्वरAJ",

            category:
              song.category ||
              song.album ||
              "Other",

            url:
              normalizeUrl(
                song.url ||
                song.file
              ),

            cover:
              normalizeUrl(
                song.cover ||
                "/images/default-cover.svg"
              )
          })
        );

      setStatus(
        `${allSongs.length} song${allSongs.length === 1 ? "" : "s"} available`,
        "online"
      );

      buildCategories();

      renderSongs();

    } catch (error) {

      console.error(
        "Song API error:",
        error
      );

      allSongs = [];

      setStatus(
        "Song API could not be loaded",
        "error"
      );

      categoriesContainer.innerHTML = `
        <div class="loading-card">
          Unable to load categories.
        </div>
      `;

      songsContainer.innerHTML = `
        <div class="loading-card">
          Song API could not be loaded.
          <br><br>
          <button
            class="small-button"
            onclick="location.reload()"
          >
            Retry
          </button>
        </div>
      `;

    }

  }

  /* =======================================================
     CATEGORIES
  ======================================================= */

  function getCategoryIcon(category) {

    const name =
      String(category).toLowerCase();

    if (
      name.includes("bhakti") ||
      name.includes("devotional") ||
      name.includes("ganesh") ||
      name.includes("spiritual")
    ) return "ॐ";

    if (
      name.includes("love") ||
      name.includes("romantic")
    ) return "♥";

    if (
      name.includes("marathi")
    ) return "म";

    if (
      name.includes("energetic") ||
      name.includes("party")
    ) return "⚡";

    if (
      name.includes("lofi") ||
      name.includes("lo-fi")
    ) return "☾";

    if (
      name.includes("ambient")
    ) return "◌";

    if (
      name.includes("cyber")
    ) return "⌁";

    if (
      name.includes("emotional")
    ) return "♡";

    if (
      name.includes("synth")
    ) return "✦";

    return "♪";

  }

  function buildCategories() {

    const categoryMap =
      new Map();

    allSongs.forEach(song => {

      const category =
        song.category ||
        "Other";

      if (!categoryMap.has(category)) {
        categoryMap.set(category, 0);
      }

      categoryMap.set(
        category,
        categoryMap.get(category) + 1
      );

    });

    const categories = [
      {
        name: "All Songs",
        count: allSongs.length,
        icon: "♫"
      },
      ...Array.from(
        categoryMap,
        ([name, count]) => ({
          name,
          count,
          icon: getCategoryIcon(name)
        })
      )
    ];

    categoriesContainer.innerHTML =
      categories
        .map(
          category => `
            <button
              class="category-card ${
                currentCategory === category.name
                  ? "active"
                  : ""
              }"
              data-category="${escapeHTML(category.name)}"
            >

              <div class="category-icon">
                ${escapeHTML(category.icon)}
              </div>

              <h3>
                ${escapeHTML(category.name)}
              </h3>

              <p>
                ${category.count}
                song${category.count === 1 ? "" : "s"}
              </p>

            </button>
          `
        )
        .join("");

    categoriesContainer
      .querySelectorAll(".category-card")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            currentCategory =
              button.dataset.category;

            searchInput.value = "";

            buildCategories();

            renderSongs();

            document
              .getElementById("songsSection")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });

          }
        );

      });

  }

  /* =======================================================
     FILTER SONGS
  ======================================================= */

  function filterSongs() {

    const query =
      searchInput.value
        .trim()
        .toLowerCase();

    visibleSongs =
      allSongs.filter(song => {

        const categoryMatch =
          currentCategory === "All Songs" ||
          song.category === currentCategory;

        if (!categoryMatch) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          song.title,
          song.artist,
          song.album,
          song.category
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      });

  }

  /* =======================================================
     RENDER SONGS
  ======================================================= */

  function renderSongs() {

    filterSongs();

    if (
      currentCategory === "All Songs"
    ) {

      songTitle.textContent =
        searchInput.value.trim()
          ? "Search Results"
          : "All Songs";

    } else {

      songTitle.textContent =
        currentCategory;

    }

    songCount.textContent =
      `${visibleSongs.length} song${
        visibleSongs.length === 1
          ? ""
          : "s"
      }`;

    if (!visibleSongs.length) {

      songsContainer.innerHTML = "";

      emptyState.classList.remove(
        "hidden"
      );

      return;

    }

    emptyState.classList.add(
      "hidden"
    );

    songsContainer.innerHTML =
      visibleSongs
        .map(
          (song, index) =>
            createSongCard(
              song,
              index
            )
        )
        .join("");

    attachSongEvents();

    highlightCurrentSong();

  }

  function createSongCard(song, index) {

    const id =
      String(song.id);

    const liked =
      likedSongs.includes(id);

    return `
      <article
        class="song-card"
        data-id="${escapeHTML(id)}"
      >

        <button
          class="song-like ${
            liked ? "liked" : ""
          }"
          data-like="${escapeHTML(id)}"
          aria-label="Like ${escapeHTML(song.title)}"
        >
          ${liked ? "♥" : "♡"}
        </button>

        <div class="song-art">

          <img
            src="${escapeHTML(song.cover)}"
            alt="${escapeHTML(song.title)} cover"
            loading="lazy"
            onerror="this.style.display='none'"
          />

          <button
            class="song-play"
            data-play="${escapeHTML(id)}"
            aria-label="Play ${escapeHTML(song.title)}"
          >
            ▶
          </button>

        </div>

        <div class="song-info">

          <h3>
            ${escapeHTML(song.title)}
          </h3>

          <p>
            ${escapeHTML(song.artist)}
          </p>

        </div>

      </article>
    `;

  }

  /* =======================================================
     SONG EVENTS
  ======================================================= */

  function attachSongEvents() {

    songsContainer
      .querySelectorAll("[data-play]")
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            const id =
              button.dataset.play;

            playSongById(id);

          }
        );

      });

    songsContainer
      .querySelectorAll(".song-card")
      .forEach(card => {

        card.addEventListener(
          "click",
          event => {

            if (
              event.target.closest(
                ".song-like"
              ) ||
              event.target.closest(
                ".song-play"
              )
            ) {
              return;
            }

            playSongById(
              card.dataset.id
            );

          }
        );

      });

    songsContainer
      .querySelectorAll("[data-like]")
      .forEach(button => {

        button.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            toggleLike(
              button.dataset.like
            );

          }
        );

      });

  }

  /* =======================================================
     PLAY SONG
  ======================================================= */

  function playSongById(id) {

    const index =
      allSongs.findIndex(
        song =>
          String(song.id) ===
          String(id)
      );

    if (index === -1) {
      return;
    }

    currentIndex = index;

    const song =
      allSongs[currentIndex];

    if (!song.url) {

      setStatus(
        "This song has no audio URL",
        "error"
      );

      return;

    }

    audio.src =
      song.url;

    audio.load();

    playerTitle.textContent =
      song.title;

    playerArtist.textContent =
      song.artist;

    updatePlayerCover(song);

    updatePlayerLike();

    addRecent(song);

    audio.play()
      .then(() => {

        updatePlayButton();

        setStatus(
          `Playing: ${song.title}`,
          "online"
        );

      })
      .catch(error => {

        console.error(
          "Playback error:",
          error
        );

        setStatus(
          "Unable to play this song",
          "error"
        );

      });

    highlightCurrentSong();

  }

  /* =======================================================
     PLAYER COVER
  ======================================================= */

  function updatePlayerCover(song) {

    if (!song.cover) {

      playerCover.innerHTML =
        "♪";

      return;

    }

    playerCover.innerHTML = `
      <img
        src="${escapeHTML(song.cover)}"
        alt=""
        onerror="this.remove()"
      />
    `;

  }

  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  function togglePlay() {

    if (currentIndex === -1) {

      if (allSongs.length) {

        playSongById(
          allSongs[0].id
        );

      }

      return;

    }

    if (audio.paused) {

      audio.play()
        .catch(console.error);

    } else {

      audio.pause();

    }

  }

  function updatePlayButton() {

    if (!playButton) return;

    playButton.textContent =
      audio.paused
        ? "▶"
        : "Ⅱ";

  }

  /* =======================================================
     NEXT / PREVIOUS
  ======================================================= */

  function nextSong() {

    if (!allSongs.length) {
      return;
    }

    let nextIndex;

    if (isShuffle) {

      nextIndex =
        Math.floor(
          Math.random() *
          allSongs.length
        );

    } else {

      nextIndex =
        (currentIndex + 1) %
        allSongs.length;

    }

    playSongById(
      allSongs[nextIndex].id
    );

  }

  function previousSong() {

    if (!allSongs.length) {
      return;
    }

    if (
      audio.currentTime > 3
    ) {

      audio.currentTime = 0;

      return;

    }

    const previousIndex =
      currentIndex <= 0
        ? allSongs.length - 1
        : currentIndex - 1;

    playSongById(
      allSongs[previousIndex].id
    );

  }

  /* =======================================================
     LIKE
  ======================================================= */

  function toggleLike(id) {

    id = String(id);

    const index =
      likedSongs.indexOf(id);

    if (index === -1) {

      likedSongs.push(id);

    } else {

      likedSongs.splice(
        index,
        1
      );

    }

    saveLikes();

    renderSongs();

    updatePlayerLike();

  }

  function updatePlayerLike() {

    if (
      !playerLike ||
      currentIndex === -1
    ) {
      return;
    }

    const id =
      String(
        allSongs[currentIndex].id
      );

    const liked =
      likedSongs.includes(id);

    playerLike.textContent =
      liked ? "♥" : "♡";

    playerLike.classList.toggle(
      "liked",
      liked
    );

  }

  /* =======================================================
     RECENT
  ======================================================= */

  function addRecent(song) {

    const id =
      String(song.id);

    recentSongs =
      recentSongs.filter(
        item =>
          String(item) !== id
      );

    recentSongs.unshift(id);

    recentSongs =
      recentSongs.slice(0, 30);

    saveRecent();

  }

  /* =======================================================
     CURRENT CARD
  ======================================================= */

  function highlightCurrentSong() {

    document
      .querySelectorAll(".song-card")
      .forEach(card => {

        const playing =
          currentIndex !== -1 &&
          String(
            card.dataset.id
          ) ===
          String(
            allSongs[currentIndex]?.id
          );

        card.classList.toggle(
          "playing",
          playing
        );

      });

  }

  /* =======================================================
     AUDIO EVENTS
  ======================================================= */

  audio.addEventListener(
    "play",
    () => {

      updatePlayButton();
      highlightCurrentSong();

    }
  );

  audio.addEventListener(
    "pause",
    () => {

      updatePlayButton();

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

  audio.addEventListener(
    "ended",
    () => {

      if (isRepeat) {

        audio.currentTime = 0;

        audio.play()
          .catch(console.error);

      } else {

        nextSong();

      }

    }
  );

  audio.addEventListener(
    "error",
    () => {

      console.error(
        "Audio error:",
        audio.error
      );

      setStatus(
        "Unable to load audio file",
        "error"
      );

    }
  );

  /* =======================================================
     CONTROLS
  ======================================================= */

  playButton?.addEventListener(
    "click",
    togglePlay
  );

  document
    .getElementById("nextButton")
    ?.addEventListener(
      "click",
      nextSong
    );

  document
    .getElementById("previousButton")
    ?.addEventListener(
      "click",
      previousSong
    );

  document
    .getElementById("shuffleButton")
    ?.addEventListener(
      "click",
      event => {

        isShuffle =
          !isShuffle;

        event.currentTarget.style.color =
          isShuffle
            ? "#a66aff"
            : "";

      }
    );

  document
    .getElementById("repeatButton")
    ?.addEventListener(
      "click",
      event => {

        isRepeat =
          !isRepeat;

        event.currentTarget.style.color =
          isRepeat
            ? "#a66aff"
            : "";

      }
    );

  /* =======================================================
     PROGRESS
  ======================================================= */

  progress?.addEventListener(
    "input",
    () => {

      if (!audio.duration) {
        return;
      }

      audio.currentTime =
        (
          Number(progress.value) /
          100
        ) *
        audio.duration;

    }
  );

  /* =======================================================
     VOLUME
  ======================================================= */

  volume?.addEventListener(
    "input",
    () => {

      audio.volume =
        Number(volume.value);

    }
  );

  audio.volume = .8;

  document
    .getElementById("muteButton")
    ?.addEventListener(
      "click",
      event => {

        audio.muted =
          !audio.muted;

        event.currentTarget.textContent =
          audio.muted
            ? "🔇"
            : "🔊";

      }
    );

  /* =======================================================
     PLAYER LIKE
  ======================================================= */

  playerLike?.addEventListener(
    "click",
    () => {

      if (currentIndex === -1) {
        return;
      }

      toggleLike(
        allSongs[currentIndex].id
      );

    }
  );

  /* =======================================================
     SEARCH
  ======================================================= */

  searchInput?.addEventListener(
    "input",
    renderSongs
  );

  document
    .getElementById("clearSearch")
    ?.addEventListener(
      "click",
      () => {

        searchInput.value = "";

        renderSongs();

        searchInput.focus();

      }
    );

  document
    .getElementById("searchButton")
    ?.addEventListener(
      "click",
      () => {

        searchInput.focus();

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refreshLibrary() {

    const buttons =
      document.querySelectorAll(
        "#refreshButton,#statusRefresh"
      );

    buttons.forEach(
      button => {
        button.disabled = true;
      }
    );

    await loadSongs();

    buttons.forEach(
      button => {
        button.disabled = false;
      }
    );

  }

  document
    .getElementById("refreshButton")
    ?.addEventListener(
      "click",
      refreshLibrary
    );

  document
    .getElementById("statusRefresh")
    ?.addEventListener(
      "click",
      refreshLibrary
    );

  /* =======================================================
     START LISTENING
  ======================================================= */

  document
    .getElementById("startButton")
    ?.addEventListener(
      "click",
      () => {

        if (!allSongs.length) {
          return;
        }

        playSongById(
          allSongs[0].id
        );

      }
    );

  document
    .getElementById("exploreButton")
    ?.addEventListener(
      "click",
      () => {

        document
          .getElementById("categoriesSection")
          ?.scrollIntoView({
            behavior: "smooth"
          });

      }
    );

  /* =======================================================
     LIQUID BUTTON MOUSE EFFECT
  ======================================================= */

  document
    .querySelectorAll(".liquid-button")
    .forEach(button => {

      button.addEventListener(
        "pointermove",
        event => {

          const rect =
            button.getBoundingClientRect();

          button.style.setProperty(
            "--x",
            `${event.clientX - rect.left}px`
          );

          button.style.setProperty(
            "--y",
            `${event.clientY - rect.top}px`
          );

        }
      );

    });

  /* =======================================================
     MOBILE MENU
  ======================================================= */

  document
    .getElementById("menuButton")
    ?.addEventListener(
      "click",
      () => {

        const nav =
          document.getElementById(
            "mobileNav"
          );

        nav?.classList.toggle(
          "open"
        );

      }
    );

  /* =======================================================
     NAVIGATION
  ======================================================= */

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
                item.dataset.page === page
              );

            });

          if (
            page === "home"
          ) {

            currentCategory =
              "All Songs";

          }

          if (
            page === "library"
          ) {

            currentCategory =
              "All Songs";

          }

          if (
            page === "liked"
          ) {

            const liked =
              allSongs.filter(
                song =>
                  likedSongs.includes(
                    String(song.id)
                  )
              );

            visibleSongs = liked;

            renderSpecificSongs(
              liked,
              "Liked Songs"
            );

            return;

          }

          if (
            page === "recent"
          ) {

            const recent =
              recentSongs
                .map(id =>
                  allSongs.find(
                    song =>
                      String(song.id) ===
                      String(id)
                  )
                )
                .filter(Boolean);

            renderSpecificSongs(
              recent,
              "Recently Played"
            );

            return;

          }

          buildCategories();
          renderSongs();

        }
      );

    });

  function renderSpecificSongs(
    songs,
    title
  ) {

    songTitle.textContent =
      title;

    songCount.textContent =
      `${songs.length} song${
        songs.length === 1
          ? ""
          : "s"
      }`;

    if (!songs.length) {

      songsContainer.innerHTML = `
        <div class="loading-card">
          No songs here yet.
        </div>
      `;

      return;

    }

    songsContainer.innerHTML =
      songs
        .map(
          (song, index) =>
            createSongCard(
              song,
              index
            )
        )
        .join("");

    attachSongEvents();
    highlightCurrentSong();

  }

  /* =======================================================
     KEYBOARD SHORTCUTS
  ======================================================= */

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

  /* =======================================================
     INITIALIZE
  ======================================================= */

  loadSongs();

})();