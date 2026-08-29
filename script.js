(() => {
  "use strict";
  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    songs: [],
    filteredSongs: [],
    categories: [],
    currentIndex: -1,
    currentSong: null,
    favorites: JSON.parse(
      localStorage.getItem(
        "swaraj-favorites"
      ) || "[]"
    ),
    shuffle: false,
    repeat: false,
    currentCategory: null,
    youtubeReady: false,
    youtubePlayer: null,
    youtubeVideoId: null,
    isPlaying: false
  };
  /* =========================================================
     ELEMENTS
  ========================================================= */
  const $ = (selector) =>
    document.querySelector(selector);
  const audio =
    $("#audio");
  const elements = {
    songList:
      $("#songList"),
    categoryGrid:
      $("#categoryGrid"),
    sidebarCategories:
      $("#sidebarCategories"),
    songCount:
      $("#songCount"),
    categoryCount:
      $("#categoryCount"),
    likedCount:
      $("#likedCount"),
    searchInput:
      $("#searchInput"),
    clearSearch:
      $("#clearSearch"),
    playerTitle:
      $("#playerTitle"),
    playerCategory:
      $("#playerCategory"),
    playerCover:
      $("#playerCover"),
    playButton:
      $("#playButton"),
    previousButton:
      $("#previousButton"),
    nextButton:
      $("#nextButton"),
    progress:
      $("#progress"),
    currentTime:
      $("#currentTime"),
    duration:
      $("#duration"),
    volume:
      $("#volume"),
    volumeButton:
      $("#volumeButton"),
    playerLike:
      $("#playerLike"),
    toast:
      $("#toast"),
    refreshButton:
      $("#refreshButton"),
    playAllButton:
      $("#playAllButton"),
    shuffleButton:
      $("#shuffleButton"),
    showAllButton:
      $("#showAllButton"),
    sortSelect:
      $("#sortSelect"),
    shufflePlayer:
      $("#shufflePlayer"),
    repeatButton:
      $("#repeatButton"),
    mobileMenu:
      $("#mobileMenu"),
    sidebar:
      $("#sidebar"),
    youtubeSearch:
      $("#youtubeSearch"),
    youtubeButton:
      $("#youtubeButton"),
    youtubeResults:
      $("#youtubeResults"),
    youtubePlayerContainer:
      $("#youtubePlayerContainer"),
    youtubePlayerClose:
      $("#youtubePlayerClose")
  };
  /* =========================================================
     HTML ESCAPE
  ========================================================= */
  function escapeHTML(value) {
    return String(value)
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );
  }
  /* =========================================================
     TIME
  ========================================================= */
  function formatTime(seconds) {
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
    const secs =
      Math.floor(
        seconds % 60
      );
    return (
      `${minutes}:` +
      `${String(secs).padStart(
        2,
        "0"
      )}`
    );
  }
  /* =========================================================
     TOAST
  ========================================================= */
  function showToast(message) {
    if (!elements.toast) {
      return;
    }
    elements.toast.textContent =
      message;
    elements.toast.classList.add(
      "show"
    );
    clearTimeout(
      showToast.timer
    );
    showToast.timer =
      setTimeout(() => {
        elements.toast.classList.remove(
          "show"
        );
      }, 2500);
  }
  /* =========================================================
     FAVORITES
  ========================================================= */
  function isFavorite(song) {
    return Boolean(
      song &&
      state.favorites.includes(
        String(song.id)
      )
    );
  }
  function saveFavorites() {
    localStorage.setItem(
      "swaraj-favorites",
      JSON.stringify(
        state.favorites
      )
    );
    if (
      elements.likedCount
    ) {
      elements.likedCount.textContent =
        state.favorites.length;
    }
  }
  function toggleFavorite(song) {
    if (!song) {
      return;
    }
    const id =
      String(song.id);
    const index =
      state.favorites.indexOf(
        id
      );
    if (index === -1) {
      state.favorites.push(
        id
      );
      showToast(
        "Added to liked songs"
      );
    } else {
      state.favorites.splice(
        index,
        1
      );
      showToast(
        "Removed from liked songs"
      );
    }
    saveFavorites();
    renderSongs(
      state.filteredSongs
    );
    updatePlayerLike();
  }
  /* =========================================================
     YOUTUBE VIDEO ID
  ========================================================= */
  function getYouTubeId(value) {
    if (!value) {
      return null;
    }
    const text =
      String(value).trim();
    if (
      /^[A-Za-z0-9_-]{11}$/.test(
        text
      )
    ) {
      return text;
    }
    try {
      const url =
        new URL(text);
      const hostname =
        url.hostname.toLowerCase();
      if (
        hostname ===
          "youtu.be" ||
        hostname.endsWith(
          ".youtu.be"
        )
      ) {
        return (
          url.pathname
            .split("/")
            .filter(Boolean)[0] ||
          null
        );
      }
      if (
        hostname ===
          "youtube.com" ||
        hostname ===
          "www.youtube.com" ||
        hostname.endsWith(
          ".youtube.com"
        ) ||
        hostname ===
          "youtube-nocookie.com" ||
        hostname ===
          "www.youtube-nocookie.com"
      ) {
        const v =
          url.searchParams.get(
            "v"
          );
        if (v) {
          return v;
        }
        const parts =
          url.pathname
            .split("/")
            .filter(Boolean);
        const index =
          parts.findIndex(
            (part) =>
              [
                "embed",
                "shorts",
                "live"
              ].includes(part)
          );
        if (
          index >= 0 &&
          parts[index + 1]
        ) {
          return (
            parts[index + 1]
          );
        }
      }
    } catch (_) {}
    return null;
  }
  /* =========================================================
     NORMALIZE SONG
  ========================================================= */
  function normalizeSong(song) {
    const youtubeUrl =
      song.youtube_url ||
      song.youtubeUrl ||
      song.video_url ||
      song.videoUrl ||
      "";
    const youtubeId =
      song.youtube_video_id ||
      song.youtubeVideoId ||
      getYouTubeId(
        youtubeUrl
      );
    const isYouTube =
      song.type === "youtube" ||
      song.source === "youtube" ||
      song.source_type ===
        "youtube" ||
      Boolean(
        youtubeId
      );
    return {
      ...song,
      id:
        String(
          song.id ||
          crypto.randomUUID()
        ),
      title:
        song.title ||
        song.name ||
        "Unknown Song",
      artist:
        song.artist ||
        song.singer ||
        "Unknown Artist",
      category:
        song.category ||
        "Music",
      cover:
        song.cover ||
        song.cover_url ||
        song.coverUrl ||
        (
          isYouTube &&
          youtubeId
            ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
            : "/images/default-cover.jpg"
        ),
      type:
        isYouTube
          ? "youtube"
          : "mp3",
      youtubeUrl:
        isYouTube
          ? youtubeUrl ||
            `https://www.youtube.com/watch?v=${youtubeId}`
          : "",
      youtubeId:
        isYouTube
          ? youtubeId
          : null,
      audioUrl:
        song.audio_url ||
        song.audioUrl ||
        song.file_url ||
        song.fileUrl ||
        song.url ||
        ""
    };
  }
  /* =========================================================
     LOAD LOCAL LIBRARY
  ========================================================= */
  async function loadLibrary() {
    try {
      if (
        elements.songList
      ) {
        elements.songList.innerHTML =
          `
          <div class="loading-state">
            <div class="loader"></div>
            <span>
              Loading your music...
            </span>
          </div>
          `;
      }
      const response =
        await fetch(
          "/api/songs",
          {
            cache:
              "no-store"
          }
        );
      if (!response.ok) {
        throw new Error(
          `Songs API returned ${response.status}`
        );
      }
      const data =
        await response.json();
      if (!data.success) {
        throw new Error(
          data.error ||
            "Song API failed"
        );
      }
      state.songs =
        Array.isArray(
          data.songs
        )
          ? data.songs.map(
              normalizeSong
            )
          : [];
      state.filteredSongs =
        [
          ...state.songs
        ];
      if (
        elements.songCount
      ) {
        elements.songCount.textContent =
          state.songs.length;
      }
      saveFavorites();
      renderSongs(
        state.filteredSongs
      );
      await loadCategories();
      if (
        !state.songs.length
      ) {
        showToast(
          "No songs found. Add audio files to songs/"
        );
      }
    } catch (error) {
      console.error(
        "Library loading error:",
        error
      );
      if (
        elements.songList
      ) {
        elements.songList.innerHTML =
          `
          <div class="empty-state">
            <strong>
              Unable to load songs
            </strong>
            <span>
              ${escapeHTML(
                error.message
              )}
            </span>
            <button
              class="secondary-button"
              id="retryLibrary"
            >
              Try again
            </button>
          </div>
          `;
        const retry =
          $("#retryLibrary");
        if (retry) {
          retry.addEventListener(
            "click",
            loadLibrary
          );
        }
      }
      showToast(
        "Music library could not be loaded"
      );
    }
  }
  /* =========================================================
     CATEGORIES
  ========================================================= */
  async function loadCategories() {
    try {
      const response =
        await fetch(
          "/api/categories",
          {
            cache:
              "no-store"
          }
        );
      const data =
        await response.json();
      state.categories =
        Array.isArray(
          data.categories
        )
          ? data.categories
          : [];
      if (
        elements.categoryCount
      ) {
        elements.categoryCount.textContent =
          state.categories.length;
      }
      renderCategories();
      renderSidebarCategories();
    } catch (error) {
      console.error(
        "Category loading failed:",
        error
      );
    }
  }
  function categorySymbol(name) {
    const lower =
      String(name)
        .toLowerCase();
    if (
      lower.includes(
        "love"
      ) ||
      lower.includes(
        "romantic"
      )
    ) {
      return "♥";
    }
    if (
      lower.includes(
        "bhakti"
      ) ||
      lower.includes(
        "devotional"
      ) ||
      lower.includes(
        "ganpati"
      )
    ) {
      return "ॐ";
    }
    if (
      lower.includes(
        "marathi"
      )
    ) {
      return "म";
    }
    if (
      lower.includes(
        "energetic"
      ) ||
      lower.includes(
        "party"
      )
    ) {
      return "⚡";
    }
    if (
      lower.includes(
        "emotional"
      ) ||
      lower.includes(
        "sad"
      )
    ) {
      return "◒";
    }
    return "♫";
  }
  function renderCategories() {
    if (
      !elements.categoryGrid
    ) {
      return;
    }
    if (
      !state.categories.length
    ) {
      elements.categoryGrid.innerHTML =
        `
        <div class="empty-state">
          No categories found
        </div>
        `;
      return;
    }
    elements.categoryGrid.innerHTML =
      state.categories
        .map(
          (category) =>
            `
            <article
              class="category-card"
              data-category="${escapeHTML(
                category.name
              )}"
            >
              <div class="category-symbol">
                ${categorySymbol(
                  category.name
                )}
              </div>
              <h3>
                ${escapeHTML(
                  category.name
                )}
              </h3>
              <p>
                ${category.count}
                ${
                  category.count ===
                  1
                    ? "song"
                    : "songs"
                }
              </p>
            </article>
            `
        )
        .join("");
    elements.categoryGrid
      .querySelectorAll(
        ".category-card"
      )
      .forEach(
        (card) => {
          card.addEventListener(
            "click",
            () => {
              filterCategory(
                card.dataset
                  .category
              );
            }
          );
        }
      );
  }
  function renderSidebarCategories() {
    if (
      !elements.sidebarCategories
    ) {
      return;
    }
    if (
      !state.categories.length
    ) {
      elements.sidebarCategories.innerHTML =
        `
        <div class="sidebar-loading">
          No categories
        </div>
        `;
      return;
    }
    elements.sidebarCategories.innerHTML =
      state.categories
        .map(
          (category) =>
            `
            <button
              class="sidebar-category"
              data-category="${escapeHTML(
                category.name
              )}"
            >
              <span>
                ${escapeHTML(
                  category.name
                )}
              </span>
              <span
                class="sidebar-category-count"
              >
                ${category.count}
              </span>
            </button>
            `
        )
        .join("");
    elements.sidebarCategories
      .querySelectorAll(
        ".sidebar-category"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              filterCategory(
                button.dataset
                  .category
              );
            }
          );
        }
      );
  }
  /* =========================================================
     RENDER SONGS
  ========================================================= */
  function renderSongs(
    songs
  ) {
    if (
      !elements.songList
    ) {
      return;
    }
    if (!songs.length) {
      elements.songList.innerHTML =
        `
        <div class="empty-state">
          <strong>
            No songs found
          </strong>
          <span>
            Try another search or category.
          </span>
        </div>
        `;
      return;
    }
    elements.songList.innerHTML =
      songs
        .map(
          (song, index) => {
            const playing =
              state.currentSong &&
              String(
                state.currentSong.id
              ) ===
                String(
                  song.id
                ) &&
              state.isPlaying;
            const cover =
              song.cover ||
              "/images/default-cover.jpg";
            return `
              <article
                class="song-row ${
                  playing
                    ? "playing"
                    : ""
                }"
                data-id="${escapeHTML(
                  song.id
                )}"
              >
                <div class="song-number">
                  ${String(
                    index + 1
                  ).padStart(
                    2,
                    "0"
                  )}
                </div>
                <div class="song-info">
                  <img
                    class="song-cover"
                    src="${escapeHTML(
                      cover
                    )}"
                    alt=""
                    loading="lazy"
                    onerror="
                      this.src='/images/default-cover.jpg'
                    "
                  >
                  <div class="song-text">
                    <strong
                      class="song-title"
                    >
                      ${escapeHTML(
                        song.title
                      )}
                    </strong>
                    <span
                      class="song-meta"
                    >
                      ${escapeHTML(
                        song.artist ||
                          "SwarAJ"
                      )}
                      ·
                      ${
                        song.type ===
                        "youtube"
                          ? "YouTube"
                          : escapeHTML(
                              (
                                song.extension ||
                                "mp3"
                              ).toUpperCase()
                            )
                      }
                    </span>
                  </div>
                </div>
                <div class="song-category">
                  ${escapeHTML(
                    song.category
                  )}
                </div>
                ${
                  song.type ===
                  "youtube"
                    ? `
                      <button
                        class="youtube-watch-button"
                        data-youtube="${escapeHTML(
                          song.id
                        )}"
                        title="Watch on YouTube"
                      >
                        ▶
                      </button>
                    `
                    : ""
                }
                <button
                  class="song-play"
                  data-play="${escapeHTML(
                    song.id
                  )}"
                  title="Play"
                >
                  ${
                    playing
                      ? "❚❚"
                      : "▶"
                  }
                </button>
                <button
                  class="song-like ${
                    isFavorite(song)
                      ? "liked"
                      : ""
                  }"
                  data-like="${escapeHTML(
                    song.id
                  )}"
                  title="Like"
                >
                  ${
                    isFavorite(song)
                      ? "♥"
                      : "♡"
                  }
                </button>
              </article>
            `;
          }
        )
        .join("");
    elements.songList
      .querySelectorAll(
        "[data-play]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              playSongById(
                button.dataset
                  .play
              );
            }
          );
        }
      );
    elements.songList
      .querySelectorAll(
        "[data-like]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              const song =
                state.songs.find(
                  (item) =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset
                        .like
                    )
                );
              toggleFavorite(
                song
              );
            }
          );
        }
      );
    elements.songList
      .querySelectorAll(
        "[data-youtube]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              const song =
                state.songs.find(
                  (item) =>
                    String(
                      item.id
                    ) ===
                    String(
                      button.dataset
                        .youtube
                    )
                );
              if (
                song?.youtubeId
              ) {
                playSongById(
                  song.id,
                  true
                );
              }
            }
          );
        }
      );
    elements.songList
      .querySelectorAll(
        ".song-row"
      )
      .forEach(
        (row) => {
          row.addEventListener(
            "dblclick",
            () => {
              playSongById(
                row.dataset.id
              );
            }
          );
        }
      );
  }
  /* =========================================================
     FILTER
  ========================================================= */
  function filterCategory(
    category
  ) {
    state.currentCategory =
      category;
    state.filteredSongs =
      state.songs.filter(
        (song) =>
          song.category ===
          category
      );
    const title =
      $("#songSectionTitle");
    if (title) {
      title.textContent =
        category;
    }
    renderSongs(
      state.filteredSongs
    );
    const section =
      document.querySelector(
        ".section"
      );
    if (section) {
      window.scrollTo({
        top:
          section.offsetTop -
          80,
        behavior:
          "smooth"
      });
    }
  }
  function showAllSongs() {
    state.currentCategory =
      null;
    state.filteredSongs =
      [
        ...state.songs
      ];
    const title =
      $("#songSectionTitle");
    if (title) {
      title.textContent =
        "All Songs";
    }
    renderSongs(
      state.filteredSongs
    );
  }
  /* =========================================================
     SEARCH LOCAL MUSIC
  ========================================================= */
  function searchSongs(
    query
  ) {
    const value =
      String(query)
        .trim()
        .toLowerCase();
    if (
      elements.clearSearch
    ) {
      elements.clearSearch.hidden =
        !value;
    }
    if (!value) {
      showAllSongs();
      return;
    }
    state.currentCategory =
      null;
    state.filteredSongs =
      state.songs.filter(
        (song) => {
          const text =
            `
              ${song.title}
              ${song.artist}
              ${song.category}
              ${song.filename || ""}
            `.toLowerCase();
          return text.includes(
            value
          );
        }
      );
    const title =
      $("#songSectionTitle");
    if (title) {
      title.textContent =
        `Search: ${query}`;
    }
    renderSongs(
      state.filteredSongs
    );
  }
  /* =========================================================
     PLAY SONG
  ========================================================= */
  async function playSongById(
    id,
    showVideo = false
  ) {
    const index =
      state.songs.findIndex(
        (song) =>
          String(
            song.id
          ) ===
          String(id)
      );
    if (index === -1) {
      return;
    }
    const song =
      state.songs[index];
    stopCurrent();
    state.currentIndex =
      index;
    state.currentSong =
      song;
    updatePlayer();
    if (
      song.type ===
      "youtube"
    ) {
      await playYouTubeSong(
        song,
        showVideo
      );
    } else {
      playMp3Song(song);
    }
    renderSongs(
      state.filteredSongs
    );
  }
  /* =========================================================
     MP3 PLAYBACK
  ========================================================= */
  function playMp3Song(
    song
  ) {
    hideYouTube();
    if (!audio) {
      return;
    }
    audio.src =
      song.audioUrl ||
      song.url;
    audio.currentTime =
      0;
    audio.load();
    const promise =
      audio.play();
    if (
      promise &&
      typeof promise.then ===
        "function"
    ) {
      promise
        .then(() => {
          state.isPlaying =
            true;
          updatePlayButton();
          updatePlayer();
          startProgress();
        })
        .catch(
          (error) => {
            console.error(
              "MP3 playback failed:",
              error
            );
            state.isPlaying =
              false;
            updatePlayButton();
            showToast(
              "Unable to play this audio file"
            );
          }
        );
    }
  }
  /* =========================================================
     YOUTUBE IFRAME API
  ========================================================= */
  window.onYouTubeIframeAPIReady =
    function () {
      state.youtubeReady =
        true;
      createYouTubePlayer();
    };
  function createYouTubePlayer() {
    if (
      typeof YT ===
        "undefined" ||
      !YT.Player
    ) {
      return;
    }
    if (
      !$("#youtubePlayer")
    ) {
      return;
    }
    state.youtubePlayer =
      new YT.Player(
        "youtubePlayer",
        {
          width:
            "100%",
          height:
            "100%",
          videoId:
            "",
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1
          },
          events: {
            onReady:
              () => {
                state.youtubeReady =
                  true;
              },
            onStateChange:
              (event) => {
                if (
                  typeof YT ===
                    "undefined"
                ) {
                  return;
                }
                if (
                  event.data ===
                  YT.PlayerState
                    .PLAYING
                ) {
                  state.isPlaying =
                    true;
                  updatePlayButton();
                  renderSongs(
                    state.filteredSongs
                  );
                }
                if (
                  event.data ===
                  YT.PlayerState
                    .PAUSED
                ) {
                  state.isPlaying =
                    false;
                  updatePlayButton();
                  renderSongs(
                    state.filteredSongs
                  );
                }
                if (
                  event.data ===
                  YT.PlayerState
                    .ENDED
                ) {
                  if (
                    state.repeat
                  ) {
                    try {
                      state.youtubePlayer.seekTo(
                        0,
                        true
                      );
                      state.youtubePlayer.playVideo();
                    } catch (_) {}
                    return;
                  }
                  nextSong();
                }
              }
          }
        }
      );
  }
  /* =========================================================
     PLAY YOUTUBE
  ========================================================= */
  async function playYouTubeSong(
    song,
    showVideo = false
  ) {
    const videoId =
      song.youtubeId ||
      getYouTubeId(
        song.youtubeUrl
      );
    if (!videoId) {
      showToast(
        "Invalid YouTube URL"
      );
      return;
    }
    if (
      !state.youtubeReady ||
      !state.youtubePlayer
    ) {
      showToast(
        "YouTube player is still loading. Please try again."
      );
      return;
    }
    state.youtubeVideoId =
      videoId;
    if (audio) {
      audio.pause();
      audio.removeAttribute(
        "src"
      );
      audio.load();
    }
    try {
      state.youtubePlayer.loadVideoById(
        videoId
      );
      state.youtubePlayer.playVideo();
      state.isPlaying =
        true;
      updatePlayButton();
      updatePlayer();
      if (showVideo) {
        showYouTube();
      }
    } catch (error) {
      console.error(
        "YouTube playback error:",
        error
      );
      showToast(
        "Unable to play YouTube video"
      );
    }
  }
  /* =========================================================
     STOP
  ========================================================= */
  function stopCurrent() {
    if (audio) {
      audio.pause();
    }
    if (
      state.youtubePlayer
    ) {
      try {
        state.youtubePlayer.stopVideo();
      } catch (_) {}
    }
    state.isPlaying =
      false;
  }
  /* =========================================================
     YOUTUBE DISPLAY
  ========================================================= */
  function showYouTube() {
    if (
      elements.youtubePlayerContainer
    ) {
      elements.youtubePlayerContainer.classList.add(
        "visible"
      );
    }
  }
  function hideYouTube() {
    if (
      elements.youtubePlayerContainer
    ) {
      elements.youtubePlayerContainer.classList.remove(
        "visible"
      );
    }
  }
  /* =========================================================
     NEXT
  ========================================================= */
  function nextSong() {
    if (
      !state.songs.length
    ) {
      return;
    }
    let index;
    if (
      state.shuffle
    ) {
      index =
        Math.floor(
          Math.random() *
            state.songs.length
        );
    } else {
      index =
        state.currentIndex +
        1;
      if (
        index >=
        state.songs.length
      ) {
        index = 0;
      }
    }
    playSongById(
      state.songs[index].id
    );
  }
  /* =========================================================
     PREVIOUS
  ========================================================= */
  function previousSong() {
    if (
      !state.songs.length
    ) {
      return;
    }
    let currentTime =
      0;
    const song =
      state.currentSong;
    if (
      song?.type ===
      "youtube"
    ) {
      try {
        currentTime =
          state.youtubePlayer
            ?.getCurrentTime() ||
          0;
      } catch (_) {}
    } else if (audio) {
      currentTime =
        audio.currentTime ||
        0;
    }
    if (
      currentTime > 3
    ) {
      if (
        song?.type ===
        "youtube"
      ) {
        try {
          state.youtubePlayer.seekTo(
            0,
            true
          );
          state.youtubePlayer.playVideo();
        } catch (_) {}
      } else if (audio) {
        audio.currentTime =
          0;
        audio.play().catch(
          () => {}
        );
      }
      return;
    }
    let index =
      state.currentIndex -
      1;
    if (index < 0) {
      index =
        state.songs.length -
        1;
    }
    playSongById(
      state.songs[index].id
    );
  }
  /* =========================================================
     PLAY / PAUSE
  ========================================================= */
  function togglePlay() {
    if (
      !state.currentSong
    ) {
      if (
        state.songs.length
      ) {
        playSongById(
          state.songs[0].id
        );
      }
      return;
    }
    if (
      state.currentSong.type ===
      "youtube"
    ) {
      if (
        !state.youtubePlayer
      ) {
        return;
      }
      try {
        const playerState =
          state.youtubePlayer.getPlayerState();
        if (
          typeof YT !==
            "undefined" &&
          playerState ===
            YT.PlayerState.PLAYING
        ) {
          state.youtubePlayer.pauseVideo();
        } else {
          state.youtubePlayer.playVideo();
        }
      } catch (_) {}
      return;
    }
    if (!audio) {
      return;
    }
    if (audio.paused) {
      audio.play().catch(
        () => {}
      );
    } else {
      audio.pause();
    }
  }
  function updatePlayButton() {
    if (
      !elements.playButton
    ) {
      return;
    }
    elements.playButton.textContent =
      state.isPlaying
        ? "❚❚"
        : "▶";
  }
  /* =========================================================
     PLAYER INFO
  ========================================================= */
  function updatePlayer() {
    const song =
      state.currentSong;
    if (!song) {
      if (
        elements.playerTitle
      ) {
        elements.playerTitle.textContent =
          "Nothing playing";
      }
      if (
        elements.playerCategory
      ) {
        elements.playerCategory.textContent =
          "Select a song";
      }
      return;
    }
    if (
      elements.playerTitle
    ) {
      elements.playerTitle.textContent =
        song.title;
    }
    if (
      elements.playerCategory
    ) {
      elements.playerCategory.textContent =
        `${song.artist || "SwarAJ"} · ${
          song.type ===
          "youtube"
            ? "YouTube"
            : song.category
        }`;
    }
    if (
      elements.playerCover
    ) {
      elements.playerCover.innerHTML =
        `
        <img
          src="${escapeHTML(
            song.cover ||
              "/images/default-cover.jpg"
          )}"
          alt=""
          onerror="
            this.src='/images/default-cover.jpg'
          "
        >
        `;
    }
    updatePlayerLike();
    updatePlayButton();
  }
  function updatePlayerLike() {
    if (
      !elements.playerLike ||
      !state.currentSong
    ) {
      return;
    }
    const liked =
      isFavorite(
        state.currentSong
      );
    elements.playerLike.textContent =
      liked
        ? "♥"
        : "♡";
    elements.playerLike.classList.toggle(
      "liked",
      liked
    );
  }
  /* =========================================================
     PROGRESS
  ========================================================= */
  function updateProgress() {
    if (
      !elements.progress
    ) {
      return;
    }
    let current =
      0;
    let duration =
      0;
    if (
      state.currentSong?.type ===
      "youtube"
    ) {
      try {
        current =
          state.youtubePlayer
            ?.getCurrentTime() ||
          0;
        duration =
          state.youtubePlayer
            ?.getDuration() ||
          0;
      } catch (_) {}
    } else if (audio) {
      current =
        audio.currentTime ||
        0;
      duration =
        audio.duration ||
        0;
    }
    if (
      duration > 0
    ) {
      elements.progress.max =
        duration;
      elements.progress.value =
        current;
    } else {
      elements.progress.max =
        100;
      elements.progress.value =
        0;
    }
    if (
      elements.currentTime
    ) {
      elements.currentTime.textContent =
        formatTime(
          current
        );
    }
    if (
      elements.duration
    ) {
      elements.duration.textContent =
        formatTime(
          duration
        );
    }
  }
  function startProgress() {
    stopProgress();
    state.progressTimer =
      setInterval(
        updateProgress,
        500
      );
  }
  function stopProgress() {
    if (
      state.progressTimer
    ) {
      clearInterval(
        state.progressTimer
      );
      state.progressTimer =
        null;
    }
  }
  /* =========================================================
     SEEK
  ========================================================= */
  function seek(value) {
    const time =
      Number(value);
    if (
      !Number.isFinite(time)
    ) {
      return;
    }
    if (
      state.currentSong?.type ===
      "youtube"
    ) {
      try {
        state.youtubePlayer.seekTo(
          time,
          true
        );
      } catch (_) {}
      return;
    }
    if (audio) {
      audio.currentTime =
        time;
    }
  }
  /* =========================================================
     SORT
  ========================================================= */
  function sortSongs(type) {
    const songs =
      [
        ...state.filteredSongs
      ];
    if (
      type ===
      "title"
    ) {
      songs.sort(
        (a, b) =>
          a.title.localeCompare(
            b.title
          )
      );
    }
    if (
      type ===
      "category"
    ) {
      songs.sort(
        (a, b) =>
          a.category.localeCompare(
            b.category
          )
      );
    }
    if (
      type ===
      "recent"
    ) {
      songs.reverse();
    }
    state.filteredSongs =
      songs;
    renderSongs(
      state.filteredSongs
    );
  }
  /* =========================================================
     PLAY ALL
  ========================================================= */
  function playAll() {
    if (
      !state.songs.length
    ) {
      showToast(
        "Your library is empty"
      );
      return;
    }
    state.shuffle =
      false;
    playSongById(
      state.songs[0].id
    );
  }
  /* =========================================================
     SHUFFLE
  ========================================================= */
  function shufflePlay() {
    if (
      !state.songs.length
    ) {
      showToast(
        "Your library is empty"
      );
      return;
    }
    state.shuffle =
      true;
    const index =
      Math.floor(
        Math.random() *
          state.songs.length
      );
    playSongById(
      state.songs[index].id
    );
  }
  /* =========================================================
     REPEAT
  ========================================================= */
  function toggleRepeat() {
    state.repeat =
      !state.repeat;
    if (
      elements.repeatButton
    ) {
      elements.repeatButton.classList.toggle(
        "active",
        state.repeat
      );
    }
    showToast(
      state.repeat
        ? "Repeat enabled"
        : "Repeat disabled"
    );
  }
  /* =========================================================
     AUDIO EVENTS
  ========================================================= */
  if (audio) {
    audio.addEventListener(
      "play",
      () => {
        state.isPlaying =
          true;
        updatePlayButton();
        startProgress();
        renderSongs(
          state.filteredSongs
        );
      }
    );
    audio.addEventListener(
      "pause",
      () => {
        state.isPlaying =
          false;
        updatePlayButton();
        stopProgress();
        renderSongs(
          state.filteredSongs
        );
      }
    );
    audio.addEventListener(
      "timeupdate",
      updateProgress
    );
    audio.addEventListener(
      "loadedmetadata",
      updateProgress
    );
    audio.addEventListener(
      "ended",
      () => {
        if (
          state.repeat
        ) {
          audio.currentTime =
            0;
          audio.play().catch(
            () => {}
          );
          return;
        }
        nextSong();
      }
    );
    audio.addEventListener(
      "error",
      () => {
        showToast(
          "Audio playback error"
        );
      }
    );
  }
  /* =========================================================
     YOUTUBE SEARCH
  ========================================================= */
  async function searchYouTube(
    query
  ) {
    const value =
      String(query)
        .trim();
    if (!value) {
      showToast(
        "Enter a YouTube search"
      );
      return;
    }
    if (
      !elements.youtubeResults
    ) {
      return;
    }
    elements.youtubeResults.innerHTML =
      `
      <div class="youtube-loading">
        Searching YouTube...
      </div>
      `;
    try {
      const response =
        await fetch(
          `/api/youtube/search?q=${encodeURIComponent(
            value
          )}&limit=10`,
          {
            cache:
              "no-store"
          }
        );
      const data =
        await response.json();
      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "YouTube search failed"
        );
      }
      renderYouTubeResults(
        data.results ||
          []
      );
    } catch (error) {
      console.error(
        "YouTube search error:",
        error
      );
      elements.youtubeResults.innerHTML =
        `
        <div class="youtube-error">
          ${escapeHTML(
            error.message
          )}
        </div>
        `;
      showToast(
        "YouTube search failed"
      );
    }
  }
  function renderYouTubeResults(
    results
  ) {
    if (
      !elements.youtubeResults
    ) {
      return;
    }
    if (
      !results.length
    ) {
      elements.youtubeResults.innerHTML =
        `
        <div class="youtube-error">
          No YouTube videos found.
        </div>
        `;
      return;
    }
    elements.youtubeResults.innerHTML =
      results
        .map(
          (video) =>
            `
            <article
              class="youtube-result"
              data-youtube-id="${escapeHTML(
                video.videoId
              )}"
            >
              <img
                src="${escapeHTML(
                  video.thumbnail
                )}"
                alt=""
                loading="lazy"
              >
              <div class="youtube-result-info">
                <strong>
                  ${escapeHTML(
                    video.title
                  )}
                </strong>
                <span>
                  ${escapeHTML(
                    video.artist
                  )}
                </span>
              </div>
              <button
                class="youtube-result-play"
                data-video-id="${escapeHTML(
                  video.videoId
                )}"
              >
                ▶
              </button>
            </article>
            `
        )
        .join("");
    elements.youtubeResults
      .querySelectorAll(
        "[data-video-id]"
      )
      .forEach(
        (button) => {
          button.addEventListener(
            "click",
            () => {
              playYouTubeSearchResult(
                button.dataset
                  .videoId,
                button
                  .closest(
                    ".youtube-result"
                  )
              );
            }
          );
        }
      );
  }
  function playYouTubeSearchResult(
    videoId,
    element
  ) {
    if (!videoId) {
      return;
    }
    const title =
      element
        ?.querySelector(
          "strong"
        )
        ?.textContent ||
      "YouTube Music";
    const artist =
      element
        ?.querySelector(
          "span"
        )
        ?.textContent ||
      "YouTube";
    const thumbnail =
      element
        ?.querySelector(
          "img"
        )
        ?.src ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const song = {
      id:
        `youtube-${videoId}`,
      title,
      artist,
      category:
        "YouTube",
      type:
        "youtube",
      source_type:
        "youtube",
      youtubeId:
        videoId,
      youtubeUrl:
        `https://www.youtube.com/watch?v=${videoId}`,
      cover:
        thumbnail
    };
    const existingIndex =
      state.songs.findIndex(
        (item) =>
          item.type ===
            "youtube" &&
          item.youtubeId ===
            videoId
      );
    if (
      existingIndex ===
      -1
    ) {
      state.songs.push(
        song
      );
    } else {
      state.songs[
        existingIndex
      ] = {
        ...state.songs[
          existingIndex
        ],
        ...song
      };
    }
    state.filteredSongs =
      [
        ...state.songs
      ];
    const index =
      state.songs.findIndex(
        (item) =>
          item.youtubeId ===
          videoId
      );
    state.currentIndex =
      index;
    state.currentSong =
      state.songs[index];
    updatePlayer();
    playYouTubeSong(
      state.currentSong,
      true
    );
    renderSongs(
      state.filteredSongs
    );
    showToast(
      `Playing ${title}`
    );
  }
  /* =========================================================
     EVENT LISTENERS
  ========================================================= */
  if (
    elements.searchInput
  ) {
    elements.searchInput.addEventListener(
      "input",
      (event) => {
        searchSongs(
          event.target.value
        );
      }
    );
  }
  if (
    elements.clearSearch
  ) {
    elements.clearSearch.addEventListener(
      "click",
      () => {
        elements.searchInput.value =
          "";
        elements.clearSearch.hidden =
          true;
        showAllSongs();
      }
    );
  }
  if (
    elements.playButton
  ) {
    elements.playButton.addEventListener(
      "click",
      togglePlay
    );
  }
  if (
    elements.previousButton
  ) {
    elements.previousButton.addEventListener(
      "click",
      previousSong
    );
  }
  if (
    elements.nextButton
  ) {
    elements.nextButton.addEventListener(
      "click",
      nextSong
    );
  }
  if (
    elements.playerLike
  ) {
    elements.playerLike.addEventListener(
      "click",
      () =>
        toggleFavorite(
          state.currentSong
        )
    );
  }
  if (
    elements.playAllButton
  ) {
    elements.playAllButton.addEventListener(
      "click",
      playAll
    );
  }
  if (
    elements.shuffleButton
  ) {
    elements.shuffleButton.addEventListener(
      "click",
      shufflePlay
    );
  }
  if (
    elements.shufflePlayer
  ) {
    elements.shufflePlayer.addEventListener(
      "click",
      () => {
        state.shuffle =
          !state.shuffle;
        elements.shufflePlayer.classList.toggle(
          "active",
          state.shuffle
        );
        showToast(
          state.shuffle
            ? "Shuffle enabled"
            : "Shuffle disabled"
        );
      }
    );
  }
  if (
    elements.repeatButton
  ) {
    elements.repeatButton.addEventListener(
      "click",
      toggleRepeat
    );
  }
  if (
    elements.showAllButton
  ) {
    elements.showAllButton.addEventListener(
      "click",
      showAllSongs
    );
  }
  if (
    elements.sortSelect
  ) {
    elements.sortSelect.addEventListener(
      "change",
      (event) => {
        sortSongs(
          event.target.value
        );
      }
    );
  }
  if (
    elements.progress
  ) {
    elements.progress.addEventListener(
      "input",
      (event) => {
        seek(
          event.target.value
        );
      }
    );
  }
  if (
    elements.volume
  ) {
    elements.volume.addEventListener(
      "input",
      (event) => {
        if (audio) {
          audio.volume =
            Number(
              event.target.value
            );
        }
      }
    );
  }
  if (
    elements.volumeButton
  ) {
    elements.volumeButton.addEventListener(
      "click",
      () => {
        if (!audio) {
          return;
        }
        if (
          audio.volume >
          0
        ) {
          audio.dataset.previousVolume =
            audio.volume;
          audio.volume = 0;
          elements.volume.value =
            0;
          elements.volumeButton.textContent =
            "🔇";
        } else {
          const volume =
            Number(
              audio.dataset
                .previousVolume ||
                0.8
            );
          audio.volume =
            volume;
          elements.volume.value =
            volume;
          elements.volumeButton.textContent =
            "🔊";
        }
      }
    );
  }
  if (
    elements.refreshButton
  ) {
    elements.refreshButton.addEventListener(
      "click",
      loadLibrary
    );
  }
  if (
    elements.youtubeButton
  ) {
    elements.youtubeButton.addEventListener(
      "click",
      () => {
        searchYouTube(
          elements.youtubeSearch
            ?.value || ""
        );
      }
    );
  }
  if (
    elements.youtubeSearch
  ) {
    elements.youtubeSearch.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key ===
          "Enter"
        ) {
          event.preventDefault();
          searchYouTube(
            elements.youtubeSearch
              .value
          );
        }
      }
    );
  }
  if (
    elements.youtubePlayerClose
  ) {
    elements.youtubePlayerClose.addEventListener(
      "click",
      hideYouTube
    );
  }
  if (
    elements.mobileMenu
  ) {
    elements.mobileMenu.addEventListener(
      "click",
      () => {
        elements.sidebar?.classList.toggle(
          "open"
        );
      }
    );
  }
  /* =========================================================
     NAVIGATION
  ========================================================= */
  document
    .querySelectorAll(
      "[data-action]"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            const action =
              button.dataset
                .action;
            if (
              action ===
              "home"
            ) {
              window.scrollTo({
                top: 0,
                behavior:
                  "smooth"
              });
            }
            if (
              action ===
              "library"
            ) {
              const section =
                document.querySelector(
                  "#songList"
                );
              section?.scrollIntoView({
                behavior:
                  "smooth"
              });
            }
            if (
              action ===
              "categories"
            ) {
              const section =
                document.querySelector(
                  "#categoryGrid"
                );
              section?.scrollIntoView({
                behavior:
                  "smooth"
              });
            }
            if (
              action ===
              "favorites"
            ) {
              const liked =
                state.songs.filter(
                  (song) =>
                    isFavorite(
                      song
                    )
                );
              state.filteredSongs =
                liked;
              const title =
                $("#songSectionTitle");
              if (title) {
                title.textContent =
                  "Liked Songs";
              }
              renderSongs(
                liked
              );
            }
            elements.sidebar?.classList.remove(
              "open"
            );
          }
        );
      }
    );
  /* =========================================================
     INITIALIZE
  ========================================================= */
  function initialize() {
    if (audio) {
      audio.volume =
        Number(
          elements.volume
            ?.value || 0.8
        );
    }
    saveFavorites();
    loadLibrary();
    startProgress();
  }
  initialize();
})();