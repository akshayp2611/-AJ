/* =========================================================
   स्वरAJ MUSIC
   Frontend controller

   Backend API:
   GET /api/songs

   Existing backend logic is preserved.
========================================================= */

(() => {

  "use strict";


  /* =======================================================
     ELEMENTS
  ======================================================= */

  const $ = (id) => document.getElementById(id);

  const audio = $("audio");

  const sidebar = $("sidebar");
  const menuButton = $("menuButton");
  const closeMenu = $("closeMenu");
  const menuBackdrop = $("menuBackdrop");

  const categoriesContainer = $("categories");
  const sidebarCategories = $("sidebarCategories");

  const songsContainer = $("songs");
  const emptyState = $("emptyState");

  const songsTitle = $("songsTitle");
  const songCount = $("songCount");

  const searchInput = $("searchInput");
  const clearSearch = $("clearSearch");
  const searchButton = $("searchButton");

  const refreshButton = $("refreshButton");
  const statusRefresh = $("statusRefresh");

  const apiStatus = $("apiStatus");
  const statusDot = $("statusDot");

  const playerTitle = $("playerTitle");
  const playerArtist = $("playerArtist");
  const playerCover = $("playerCover");

  const playButton = $("playButton");
  const previousButton = $("previousButton");
  const nextButton = $("nextButton");

  const shuffleButton = $("shuffleButton");
  const repeatButton = $("repeatButton");

  const playerLike = $("playerLike");

  const currentTime = $("currentTime");
  const duration = $("duration");
  const progress = $("progress");

  const volume = $("volume");
  const muteButton = $("muteButton");

  const startListening = $("startListening");
  const exploreButton = $("exploreButton");

  const pageTitle = $("pageTitle");


  /* =======================================================
     STATE
  ======================================================= */

  let songs = [];
  let filteredSongs = [];

  let currentIndex = -1;

  let currentCategory = "All Songs";

  let isShuffle = false;
  let isRepeat = false;

  let likedSongs = JSON.parse(
    localStorage.getItem("swarajLikedSongs") || "[]"
  );

  let recentSongs = JSON.parse(
    localStorage.getItem("swarajRecentSongs") || "[]"
  );


  /* =======================================================
     API
  ======================================================= */

  const API_URL = "/api/songs";


  async function loadSongs() {

    setStatus(
      "Connecting to music library...",
      "loading"
    );

    try {

      const response = await fetch(
        API_URL,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Accept": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data = await response.json();

      /*
        Supports:

        {
          success: true,
          songs: [...]
        }

        and directly:

        [...]
      */

      if (Array.isArray(data)) {

        songs = data;

      } else if (
        data &&
        Array.isArray(data.songs)
      ) {

        songs = data.songs;

      } else {

        songs = [];

      }


      /*
        Normalize backend song objects.
      */

      songs = songs.map(
        (song, index) => normalizeSong(song, index)
      );


      filteredSongs = [...songs];

      setStatus(
        songs.length
          ? `${songs.length} songs available`
          : "Music library is empty",
        songs.length ? "ok" : "error"
      );


      renderCategories();
      renderSidebarCategories();

      applyCurrentView();

    } catch (error) {

      console.error(
        "Song API error:",
        error
      );

      songs = [];
      filteredSongs = [];

      setStatus(
        "Song API could not be loaded",
        "error"
      );

      renderCategories();
      renderSidebarCategories();

      renderSongs([]);

    }

  }


  function normalizeSong(song, index) {

    return {

      id:
        song.id ||
        `song-${index + 1}`,

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
        "Music",

      category:
        song.category ||
        song.genre ||
        song.album ||
        "Other",

      cover:
        song.cover ||
        song.image ||
        "/images/default-cover.svg",

      url:
        song.url ||
        song.src ||
        "",

      file:
        song.file ||
        ""

    };

  }


  /* =======================================================
     STATUS
  ======================================================= */

  function setStatus(
    message,
    type
  ) {

    if (apiStatus) {
      apiStatus.textContent = message;
    }

    if (!statusDot) return;

    statusDot.classList.remove(
      "ok",
      "error"
    );

    if (type === "ok") {
      statusDot.classList.add("ok");
    }

    if (type === "error") {
      statusDot.classList.add("error");
    }

  }


  /* =======================================================
     CATEGORIES
  ======================================================= */

  function getCategories() {

    const categorySet =
      new Set();

    songs.forEach(song => {

      if (song.category) {

        categorySet.add(
          song.category
        );

      }

    });

    return [
      "All Songs",
      ...Array.from(categorySet)
        .sort((a, b) =>
          a.localeCompare(b)
        )
    ];

  }


  function categoryIcon(category) {

    const name =
      String(category)
        .toLowerCase();

    if (
      name.includes("bhakti") ||
      name.includes("devotional") ||
      name.includes("ganesh") ||
      name.includes("ganpati")
    ) {
      return "ॐ";
    }

    if (
      name.includes("love") ||
      name.includes("romantic")
    ) {
      return "♥";
    }

    if (
      name.includes("energetic") ||
      name.includes("party")
    ) {
      return "⚡";
    }

    if (
      name.includes("lofi") ||
      name.includes("chill")
    ) {
      return "☁";
    }

    if (
      name.includes("ambient")
    ) {
      return "◌";
    }

    if (
      name.includes("marathi")
    ) {
      return "म";
    }

    return "♫";

  }


  function renderCategories() {

    if (!categoriesContainer) return;

    const categories =
      getCategories();


    if (!categories.length) {

      categoriesContainer.innerHTML = `
        <div class="loading-card">
          No categories available
        </div>
      `;

      return;

    }


    categoriesContainer.innerHTML =
      categories.map(
        category => {

          const count =
            category === "All Songs"
              ? songs.length
              : songs.filter(
                  song =>
                    song.category === category
                ).length;

          return `

            <button
              class="category-card"
              data-category="${escapeAttribute(category)}">

              <span class="category-icon">
                ${categoryIcon(category)}
              </span>

              <span>
                <h3>
                  ${escapeHTML(category)}
                </h3>

                <p>
                  ${count}
                  ${count === 1 ? "song" : "songs"}
                </p>
              </span>

            </button>

          `;

        }
      ).join("");


    categoriesContainer
      .querySelectorAll(
        ".category-card"
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


  function renderSidebarCategories() {

    if (!sidebarCategories) return;

    const categories =
      getCategories()
        .filter(
          category =>
            category !== "All Songs"
        );


    if (!categories.length) {

      sidebarCategories.innerHTML = `
        <div class="category-loading">
          No categories
        </div>
      `;

      return;

    }


    sidebarCategories.innerHTML =
      categories.map(
        category => `

          <button
            class="sidebar-category"
            data-category="${escapeAttribute(category)}">

            <span class="cat-dot"></span>

            <span>
              ${escapeHTML(category)}
            </span>

          </button>

        `
      ).join("");


    sidebarCategories
      .querySelectorAll(
        ".sidebar-category"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            selectCategory(
              button.dataset.category
            );

            closeMobileMenu();

          }
        );

      });

  }


  /* =======================================================
     CATEGORY FILTER
  ======================================================= */

  function selectCategory(category) {

    currentCategory =
      category || "All Songs";

    if (currentCategory === "All Songs") {

      filteredSongs =
        [...songs];

    } else {

      filteredSongs =
        songs.filter(
          song =>
            String(song.category)
              .toLowerCase() ===
            String(currentCategory)
              .toLowerCase()
        );

    }


    if (songsTitle) {
      songsTitle.textContent =
        currentCategory;
    }

    if (pageTitle) {
      pageTitle.textContent =
        currentCategory;
    }


    searchInput.value = "";

    renderSongs(filteredSongs);

    document
      .getElementById("songsSection")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

  }


  /* =======================================================
     SONG RENDERING
  ======================================================= */

  function renderSongs(list) {

    if (!songsContainer) return;


    if (songCount) {

      songCount.textContent =
        `${list.length} ${
          list.length === 1
            ? "song"
            : "songs"
        }`;

    }


    if (!list.length) {

      songsContainer.innerHTML = "";

      emptyState?.classList.remove(
        "hidden"
      );

      return;

    }


    emptyState?.classList.add(
      "hidden"
    );


    songsContainer.innerHTML =
      list.map(
        (song, index) => {

          const actualIndex =
            songs.findIndex(
              item =>
                item.id === song.id
            );

          const liked =
            likedSongs.includes(
              song.id
            );

          return `

            <article
              class="song-card ${
                actualIndex === currentIndex
                  ? "playing"
                  : ""
              }"
              data-id="${escapeAttribute(song.id)}">

              <div class="song-cover">

                ${
                  song.cover
                    ? `
                      <img
                        src="${escapeAttribute(song.cover)}"
                        alt=""
                        loading="lazy"
                        onerror="this.style.display='none'"
                      />
                    `
                    : ""
                }

                <span class="cover-placeholder">
                  ${categoryIcon(song.category)}
                </span>

                <button
                  class="song-play"
                  data-action="play"
                  aria-label="Play ${
                    escapeAttribute(song.title)
                  }">

                  ${
                    actualIndex === currentIndex &&
                    !audio.paused
                      ? "❚❚"
                      : "▶"
                  }

                </button>

              </div>


              <div class="song-info">

                <strong class="song-title">
                  ${escapeHTML(song.title)}
                </strong>

                <span class="song-artist">
                  ${escapeHTML(song.artist)}
                </span>

                <span class="song-category">
                  ${escapeHTML(song.category)}
                </span>

              </div>

            </article>

          `;

        }
      ).join("");


    songsContainer
      .querySelectorAll(".song-card")
      .forEach(card => {

        const play =
          card.querySelector(
            "[data-action='play']"
          );

        play?.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            const song =
              songs.find(
                item =>
                  item.id ===
                  card.dataset.id
              );

            if (!song) return;

            const index =
              songs.findIndex(
                item =>
                  item.id === song.id
              );

            playSong(index);

          }
        );


        card.addEventListener(
          "click",
          event => {

            if (
              event.target.closest(
                "button"
              )
            ) return;

            const index =
              songs.findIndex(
                item =>
                  item.id ===
                  card.dataset.id
              );

            playSong(index);

          }
        );

      });

  }


  /* =======================================================
     PLAY SONG
  ======================================================= */

  function playSong(index) {

    if (
      index < 0 ||
      index >= songs.length
    ) return;

    const song =
      songs[index];

    if (!song.url) {

      console.error(
        "Song URL missing:",
        song
      );

      return;

    }


    currentIndex = index;


    audio.src =
      song.url;


    audio.load();


    audio.play()
      .then(() => {

        updatePlayer();

        saveRecent(song);

        renderSongs(
          getDisplayedSongs()
        );

      })
      .catch(error => {

        console.error(
          "Playback failed:",
          error
        );

        updatePlayer();

      });

  }


  function updatePlayer() {

    if (currentIndex < 0) {

      playerTitle.textContent =
        "Select a song";

      playerArtist.textContent =
        "स्वरAJ";

      playerCover.textContent =
        "♪";

      return;

    }


    const song =
      songs[currentIndex];


    playerTitle.textContent =
      song.title;

    playerArtist.textContent =
      song.artist;


    if (song.cover) {

      playerCover.innerHTML = `
        <img
          src="${escapeAttribute(song.cover)}"
          alt=""
          style="
            width:100%;
            height:100%;
            object-fit:cover;
            border-radius:inherit;
          "
        />
      `;

    } else {

      playerCover.textContent =
        categoryIcon(
          song.category
        );

    }


    updatePlayButton();
    updateLikeButton();

  }


  /* =======================================================
     PLAY / PAUSE
  ======================================================= */

  function togglePlay() {

    if (currentIndex < 0) {

      if (songs.length) {
        playSong(0);
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


  function updatePlayButton() {

    if (!playButton) return;

    playButton.textContent =
      audio.paused
        ? "▶"
        : "❚❚";

  }


  /* =======================================================
     NEXT / PREVIOUS
  ======================================================= */

  function nextSong() {

    if (!songs.length) return;


    let nextIndex;


    if (isShuffle) {

      nextIndex =
        Math.floor(
          Math.random() *
          songs.length
        );

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


  function previousSong() {

    if (!songs.length) return;


    if (
      audio.currentTime > 3
    ) {

      audio.currentTime = 0;

      return;

    }


    let previousIndex =
      currentIndex - 1;


    if (previousIndex < 0) {
      previousIndex =
        songs.length - 1;
    }


    playSong(
      previousIndex
    );

  }


  /* =======================================================
     SEARCH
  ======================================================= */

  function searchSongs(value) {

    const query =
      String(value)
        .trim()
        .toLowerCase();


    if (!query) {

      filteredSongs =
        getCategorySongs();

      renderSongs(
        filteredSongs
      );

      return;

    }


    const base =
      getCategorySongs();


    filteredSongs =
      base.filter(
        song => {

          return [

            song.title,
            song.artist,
            song.album,
            song.category

          ]
            .join(" ")
            .toLowerCase()
            .includes(query);

        }
      );


    renderSongs(
      filteredSongs
    );

  }


  function getCategorySongs() {

    if (
      currentCategory ===
      "All Songs"
    ) {

      return [...songs];

    }

    return songs.filter(
      song =>
        String(song.category)
          .toLowerCase() ===
        String(currentCategory)
          .toLowerCase()
    );

  }


  function getDisplayedSongs() {

    if (
      searchInput &&
      searchInput.value.trim()
    ) {

      return filteredSongs;

    }

    return getCategorySongs();

  }


  /* =======================================================
     AUDIO EVENTS
  ======================================================= */

  audio.addEventListener(
    "play",
    () => {

      updatePlayButton();

      renderSongs(
        getDisplayedSongs()
      );

    }
  );


  audio.addEventListener(
    "pause",
    () => {

      updatePlayButton();

      renderSongs(
        getDisplayedSongs()
      );

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


  audio.addEventListener(
    "loadedmetadata",
    () => {

      if (
        Number.isFinite(
          audio.duration
        )
      ) {

        duration.textContent =
          formatTime(
            audio.duration
          );

      }

    }
  );


  audio.addEventListener(
    "timeupdate",
    () => {

      if (
        !audio.duration ||
        !Number.isFinite(
          audio.duration
        )
      ) return;


      const percent =
        (
          audio.currentTime /
          audio.duration
        ) * 100;


      progress.value =
        percent;


      currentTime.textContent =
        formatTime(
          audio.currentTime
        );

    }
  );


  /* =======================================================
     PROGRESS
  ======================================================= */

  progress?.addEventListener(
    "input",
    () => {

      if (!audio.duration)
        return;

      audio.currentTime =
        (
          Number(progress.value) /
          100
        ) * audio.duration;

    }
  );


  /* =======================================================
     VOLUME
  ======================================================= */

  audio.volume =
    Number(
      volume?.value || .8
    );


  volume?.addEventListener(
    "input",
    () => {

      audio.volume =
        Number(volume.value);

      if (
        audio.volume > 0
      ) {

        audio.muted = false;

        muteButton.textContent =
          "🔊";

      }

    }
  );


  muteButton?.addEventListener(
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


  /* =======================================================
     SHUFFLE / REPEAT
  ======================================================= */

  shuffleButton?.addEventListener(
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


  repeatButton?.addEventListener(
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


  /* =======================================================
     LIKES
  ======================================================= */

  function updateLikeButton() {

    if (
      currentIndex < 0
    ) return;


    const song =
      songs[currentIndex];


    const liked =
      likedSongs.includes(
        song.id
      );


    playerLike.textContent =
      liked
        ? "♥"
        : "♡";

  }


  playerLike?.addEventListener(
    "click",
    () => {

      if (
        currentIndex < 0
      ) return;


      const song =
        songs[currentIndex];


      const existing =
        likedSongs.indexOf(
          song.id
        );


      if (existing === -1) {

        likedSongs.push(
          song.id
        );

      } else {

        likedSongs.splice(
          existing,
          1
        );

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


  /* =======================================================
     RECENT
  ======================================================= */

  function saveRecent(song) {

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
        30
      );


    localStorage.setItem(
      "swarajRecentSongs",
      JSON.stringify(
        recentSongs
      )
    );

  }


  /* =======================================================
     MOBILE MENU
     IMPORTANT FIX
  ======================================================= */

  function openMobileMenu() {

    sidebar.classList.add(
      "open"
    );

    menuBackdrop.classList.add(
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
      "open"
    );

    menuBackdrop.classList.remove(
      "show"
    );

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    document.body.style.overflow =
      "";

  }


  menuButton?.addEventListener(
    "click",
    event => {

      event.preventDefault();
      event.stopPropagation();

      if (
        sidebar.classList.contains(
          "open"
        )
      ) {

        closeMobileMenu();

      } else {

        openMobileMenu();

      }

    }
  );


  closeMenu?.addEventListener(
    "click",
    closeMobileMenu
  );


  menuBackdrop?.addEventListener(
    "click",
    closeMobileMenu
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeMobileMenu();

      }

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

          setActivePage(
            page
          );

          if (page === "home") {

            currentCategory =
              "All Songs";

            songsTitle.textContent =
              "All Songs";

            pageTitle.textContent =
              "Home";

            searchInput.value = "";

            filteredSongs =
              [...songs];

            renderSongs(
              filteredSongs
            );

          }


          if (page === "library") {

            currentCategory =
              "All Songs";

            songsTitle.textContent =
              "Library";

            pageTitle.textContent =
              "Library";

            searchInput.value = "";

            renderSongs(
              songs
            );

          }


          if (page === "liked") {

            const liked =
              songs.filter(
                song =>
                  likedSongs.includes(
                    song.id
                  )
              );

            songsTitle.textContent =
              "Liked Songs";

            pageTitle.textContent =
              "Liked Songs";

            renderSongs(
              liked
            );

          }


          if (page === "recent") {

            const recent =
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

            pageTitle.textContent =
              "Recently Played";

            renderSongs(
              recent
            );

          }


          closeMobileMenu();

        }
      );

    });


  function setActivePage(page) {

    document
      .querySelectorAll(
        "[data-page]"
      )
      .forEach(button => {

        button.classList.toggle(
          "active",
          button.dataset.page === page
        );

      });

  }


  /* =======================================================
     BUTTONS
  ======================================================= */

  playButton?.addEventListener(
    "click",
    togglePlay
  );


  nextButton?.addEventListener(
    "click",
    nextSong
  );


  previousButton?.addEventListener(
    "click",
    previousSong
  );


  startListening?.addEventListener(
    "click",
    () => {

      if (!songs.length) {

        loadSongs();

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


  exploreButton?.addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "categoriesSection"
        )
        ?.scrollIntoView({
          behavior: "smooth"
        });

    }
  );


  /* =======================================================
     SEARCH UI
  ======================================================= */

  searchButton?.addEventListener(
    "click",
    () => {

      const panel =
        $("searchPanel");

      panel?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      setTimeout(
        () =>
          searchInput?.focus(),
        250
      );

    }
  );


  searchInput?.addEventListener(
    "input",
    () => {

      searchSongs(
        searchInput.value
      );

    }
  );


  clearSearch?.addEventListener(
    "click",
    () => {

      searchInput.value = "";

      searchSongs("");

      searchInput.focus();

    }
  );


  /* =======================================================
     REFRESH
  ======================================================= */

  refreshButton?.addEventListener(
    "click",
    loadSongs
  );


  statusRefresh?.addEventListener(
    "click",
    loadSongs
  );


  /* =======================================================
     KEYBOARD
  ======================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.target.tagName ===
        "INPUT"
      ) return;


      if (
        event.code ===
        "Space"
      ) {

        event.preventDefault();

        togglePlay();

      }


      if (
        event.key === "ArrowRight"
      ) {

        nextSong();

      }


      if (
        event.key === "ArrowLeft"
      ) {

        previousSong();

      }

    }
  );


  /* =======================================================
     UTILITIES
  ======================================================= */

  function formatTime(seconds) {

    if (
      !Number.isFinite(seconds)
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
    ).padStart(2, "0")}`;

  }


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


  /* =======================================================
     START
  ======================================================= */

  loadSongs();

})();