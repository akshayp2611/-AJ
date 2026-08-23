"use strict";

const API = "/api/songs";

const audio = document.getElementById("audio");

const state = {
  songs: [],
  filtered: [],
  currentIndex: -1,
  shuffle: false,
  repeat: false,
  liked: JSON.parse(
    localStorage.getItem("swaraj-liked") || "[]"
  )
};


/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}


function formatTime(seconds) {

  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const min =
    Math.floor(seconds / 60);

  const sec =
    Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");

  return `${min}:${sec}`;
}


/* =========================================
   LOAD SONGS
========================================= */

async function loadSongs() {

  console.log(
    "SwarAJ: loading /api/songs"
  );

  try {

    const response =
      await fetch(API, {
        cache: "no-store",
        headers: {
          Accept:
            "application/json"
        }
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    console.log(
      "SwarAJ API:",
      data
    );

    if (
      !data ||
      !Array.isArray(data.songs)
    ) {
      throw new Error(
        "Invalid songs response"
      );
    }

    state.songs =
      data.songs.map(
        (song, index) => ({
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
            "Music",

          cover:
            song.cover ||
            "/images/default-cover.svg",

          url:
            song.url ||
            "",

          file:
            song.file ||
            ""
        })
      );

    state.filtered =
      [...state.songs];

    updateCount();

    renderQuickPicks();

    renderCategories();

    renderSongs(
      state.songs,
      "songList"
    );

    renderLibrary();

    renderLiked();

    renderAlbums();

    renderArtists();

  } catch (error) {

    console.error(
      "Song API could not be loaded:",
      error
    );

    const list =
      document.getElementById(
        "songList"
      );

    if (list) {
      list.innerHTML = `
        <div class="loading">
          Song API could not be loaded.
          <br>
          ${escapeHTML(
            error.message
          )}
        </div>
      `;
    }
  }
}


/* =========================================
   COUNT
========================================= */

function updateCount() {

  const element =
    document.getElementById(
      "songCount"
    );

  if (element) {
    element.textContent =
      `${state.songs.length} songs`;
  }
}


/* =========================================
   QUICK PICKS
========================================= */

function renderQuickPicks() {

  const container =
    document.getElementById(
      "quickPicks"
    );

  if (!container) return;

  const songs =
    state.songs.slice(0, 6);

  container.innerHTML =
    songs.map(
      (song, index) => `
        <div
          class="quick-card"
          data-index="${index}"
        >

          <img
            src="${escapeHTML(song.cover)}"
            onerror="
              this.src='/images/default-cover.svg'
            "
          />

          <div class="quick-card-info">

            <strong>
              ${escapeHTML(song.title)}
            </strong>

            <span>
              ${escapeHTML(song.artist)}
            </span>

          </div>

          <button
            class="quick-play"
            data-index="${index}"
          >
            ▶
          </button>

        </div>
      `
    ).join("");

  container
    .querySelectorAll(".quick-play")
    .forEach(button => {

      button.addEventListener(
        "click",
        e => {

          e.stopPropagation();

          playIndex(
            Number(
              button.dataset.index
            )
          );

        }
      );

    });
}


/* =========================================
   CATEGORIES
========================================= */

function renderCategories() {

  const container =
    document.getElementById(
      "categories"
    );

  if (!container) return;

  const categories = {};

  state.songs.forEach(song => {

    const name =
      song.category ||
      "Music";

    categories[name] =
      (categories[name] || 0) + 1;

  });

  container.innerHTML =
    Object.entries(categories)
      .map(
        ([name, count]) => `
          <div
            class="category-card"
            data-category="${escapeHTML(name)}"
          >

            <h3>
              ${escapeHTML(name)}
            </h3>

            <span>
              ${count} songs
            </span>

          </div>
        `
      )
      .join("");

  container
    .querySelectorAll(
      ".category-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const category =
            card.dataset.category;

          state.filtered =
            state.songs.filter(
              song =>
                song.category ===
                category
            );

          renderSongs(
            state.filtered,
            "songList"
          );

        }
      );

    });
}


/* =========================================
   SONG LIST
========================================= */

function renderSongs(
  songs,
  containerId
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) return;

  if (!songs.length) {

    container.innerHTML = `
      <div class="loading">
        No songs found
      </div>
    `;

    return;
  }

  container.innerHTML =
    songs.map(
      (song, index) => {

        const liked =
          state.liked.includes(
            song.id
          );

        return `
          <div
            class="song-row"
            data-index="${index}"
          >

            <span class="song-number">
              ${index + 1}
            </span>

            <div class="song-main">

              <img
                class="song-cover"
                src="${escapeHTML(song.cover)}"
                alt=""
                onerror="
                  this.src='/images/default-cover.svg'
                "
              />

              <div class="song-text">

                <div class="song-title">
                  ${escapeHTML(song.title)}
                </div>

                <div class="song-artist">
                  ${escapeHTML(song.artist)}
                  •
                  ${escapeHTML(song.album)}
                </div>

              </div>

            </div>

            <div class="song-actions">

              <button
                class="song-like"
                data-id="${escapeHTML(song.id)}"
              >
                ${liked ? "♥" : "♡"}
              </button>

              <button
                class="song-play"
                data-index="${index}"
              >
                ▶
              </button>

            </div>

          </div>
        `;
      }
    ).join("");

  container
    .querySelectorAll(
      ".song-play"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        e => {

          e.stopPropagation();

          const index =
            Number(
              button.dataset.index
            );

          const song =
            songs[index];

          const realIndex =
            state.songs.findIndex(
              item =>
                item.id ===
                song.id
            );

          playIndex(
            realIndex
          );

        }
      );

    });

  container
    .querySelectorAll(
      ".song-like"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        e => {

          e.stopPropagation();

          toggleLike(
            button.dataset.id
          );

        }
      );

    });
}


/* =========================================
   PLAY
========================================= */

function playIndex(index) {

  if (
    index < 0 ||
    index >= state.songs.length
  ) {
    return;
  }

  state.currentIndex =
    index;

  const song =
    state.songs[index];

  if (!song.url) {
    console.error(
      "Missing song URL",
      song
    );

    return;
  }

  audio.pause();

  audio.src =
    song.url;

  audio.load();

  audio.play()
    .then(() => {

      updatePlayer(
        song
      );

    })
    .catch(error => {

      console.error(
        "Playback failed:",
        error
      );

    });
}


/* =========================================
   PLAYER
========================================= */

function updatePlayer(song) {

  const cover =
    document.getElementById(
      "playerCover"
    );

  const title =
    document.getElementById(
      "playerTitle"
    );

  const artist =
    document.getElementById(
      "playerArtist"
    );

  if (cover) {
    cover.src =
      song.cover ||
      "/images/default-cover.svg";
  }

  if (title) {
    title.textContent =
      song.title;
  }

  if (artist) {
    artist.textContent =
      song.artist;
  }
}


/* =========================================
   PLAY / PAUSE
========================================= */

document
  .getElementById("playBtn")
  ?.addEventListener(
    "click",
    () => {

      if (
        state.currentIndex === -1
      ) {

        if (state.songs.length) {
          playIndex(0);
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
  );


audio.addEventListener(
  "play",
  () => {

    const button =
      document.getElementById(
        "playBtn"
      );

    if (button) {
      button.textContent =
        "❚❚";
    }

  }
);


audio.addEventListener(
  "pause",
  () => {

    const button =
      document.getElementById(
        "playBtn"
      );

    if (button) {
      button.textContent =
        "▶";
    }

  }
);


/* =========================================
   NEXT
========================================= */

document
  .getElementById("nextBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!state.songs.length) {
        return;
      }

      let index;

      if (state.shuffle) {

        index =
          Math.floor(
            Math.random() *
            state.songs.length
          );

      } else {

        index =
          (
            state.currentIndex +
            1
          ) %
          state.songs.length;

      }

      playIndex(index);

    }
  );


/* =========================================
   PREVIOUS
========================================= */

document
  .getElementById("prevBtn")
  ?.addEventListener(
    "click",
    () => {

      if (!state.songs.length) {
        return;
      }

      let index =
        state.currentIndex - 1;

      if (index < 0) {

        index =
          state.songs.length - 1;

      }

      playIndex(index);

    }
  );


/* =========================================
   SHUFFLE
========================================= */

document
  .getElementById("shuffleBtn")
  ?.addEventListener(
    "click",
    () => {

      state.shuffle =
        !state.shuffle;

    }
  );


/* =========================================
   REPEAT
========================================= */

document
  .getElementById("repeatBtn")
  ?.addEventListener(
    "click",
    () => {

      state.repeat =
        !state.repeat;

    }
  );


/* =========================================
   END
========================================= */

audio.addEventListener(
  "ended",
  () => {

    if (state.repeat) {

      playIndex(
        state.currentIndex
      );

      return;
    }

    document
      .getElementById(
        "nextBtn"
      )
      ?.click();

  }
);


/* =========================================
   PROGRESS
========================================= */

audio.addEventListener(
  "timeupdate",
  () => {

    const progress =
      document.getElementById(
        "progress"
      );

    const current =
      document.getElementById(
        "currentTime"
      );

    if (!progress) return;

    if (
      Number.isFinite(
        audio.duration
      )
    ) {

      progress.value =
        (
          audio.currentTime /
          audio.duration
        ) * 100;

    }

    if (current) {

      current.textContent =
        formatTime(
          audio.currentTime
        );

    }

  }
);


audio.addEventListener(
  "loadedmetadata",
  () => {

    const duration =
      document.getElementById(
        "duration"
      );

    if (duration) {

      duration.textContent =
        formatTime(
          audio.duration
        );

    }

  }
);


document
  .getElementById("progress")
  ?.addEventListener(
    "input",
    event => {

      if (
        Number.isFinite(
          audio.duration
        )
      ) {

        audio.currentTime =
          (
            Number(
              event.target.value
            ) / 100
          ) *
          audio.duration;

      }

    }
  );


/* =========================================
   VOLUME
========================================= */

document
  .getElementById("volume")
  ?.addEventListener(
    "input",
    event => {

      audio.volume =
        Number(
          event.target.value
        );

    }
  );


/* =========================================
   LIKE
========================================= */

function toggleLike(id) {

  if (
    state.liked.includes(id)
  ) {

    state.liked =
      state.liked.filter(
        item =>
          item !== id
      );

  } else {

    state.liked.push(id);

  }

  localStorage.setItem(
    "swaraj-liked",
    JSON.stringify(
      state.liked
    )
  );

  renderSongs(
    state.songs,
    "songList"
  );

  renderLiked();

}


/* =========================================
   LIKED
========================================= */

function renderLiked() {

  const container =
    document.getElementById(
      "likedSongs"
    );

  if (!container) return;

  const songs =
    state.songs.filter(
      song =>
        state.liked.includes(
          song.id
        )
    );

  renderSongs(
    songs,
    "likedSongs"
  );
}


/* =========================================
   LIBRARY
========================================= */

function renderLibrary() {

  renderSongs(
    state.songs,
    "librarySongs"
  );
}


/* =========================================
   ALBUMS
========================================= */

function renderAlbums() {

  const container =
    document.getElementById(
      "albumGrid"
    );

  if (!container) return;

  const albums = {};

  state.songs.forEach(song => {

    const key =
      `${song.album}-${song.artist}`;

    if (!albums[key]) {

      albums[key] = {
        album: song.album,
        artist: song.artist,
        cover: song.cover,
        count: 0
      };

    }

    albums[key].count++;

  });

  container.innerHTML =
    Object.values(albums)
      .map(
        album => `
          <div class="album-card">

            <img
              src="${escapeHTML(album.cover)}"
              onerror="
                this.src='/images/default-cover.svg'
              "
            />

            <strong>
              ${escapeHTML(album.album)}
            </strong>

            <span>
              ${escapeHTML(album.artist)}
              •
              ${album.count} songs
            </span>

          </div>
        `
      )
      .join("");
}


/* =========================================
   ARTISTS
========================================= */

function renderArtists() {

  const container =
    document.getElementById(
      "artistGrid"
    );

  if (!container) return;

  const artists = {};

  state.songs.forEach(song => {

    const name =
      song.artist;

    if (!artists[name]) {

      artists[name] = {
        name,
        cover: song.cover,
        count: 0
      };

    }

    artists[name].count++;

  });

  container.innerHTML =
    Object.values(artists)
      .map(
        artist => `
          <div class="artist-card">

            <img
              src="${escapeHTML(artist.cover)}"
              onerror="
                this.src='/images/default-cover.svg'
              "
            />

            <strong>
              ${escapeHTML(artist.name)}
            </strong>

            <p>
              ${artist.count} songs
            </p>

          </div>
        `
      )
      .join("");
}


/* =========================================
   SEARCH
========================================= */

function searchSongs(query) {

  query =
    query
      .trim()
      .toLowerCase();

  const results =
    !query
      ? state.songs
      : state.songs.filter(
          song =>
            [
              song.title,
              song.artist,
              song.album,
              song.category
            ].some(
              value =>
                String(value)
                  .toLowerCase()
                  .includes(query)
            )
        );

  renderSongs(
    results,
    "searchResults"
  );
}


document
  .getElementById("search")
  ?.addEventListener(
    "input",
    e => {

      searchSongs(
        e.target.value
      );

    }
  );


document
  .getElementById("largeSearch")
  ?.addEventListener(
    "input",
    e => {

      searchSongs(
        e.target.value
      );

    }
  );


/* =========================================
   PAGE NAVIGATION
========================================= */

function showPage(id) {

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active-page"
      );

    });

  const page =
    document.getElementById(id);

  if (page) {

    page.classList.add(
      "active-page"
    );

  }

  document
    .querySelectorAll(
      ".nav-item, .mobile-nav-item"
    )
    .forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.page === id
      );

    });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


document
  .querySelectorAll(
    "[data-page]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        showPage(
          button.dataset.page
        );

      }
    );

  });


/* =========================================
   HERO PLAY
========================================= */

document
  .getElementById("heroPlayBtn")
  ?.addEventListener(
    "click",
    () => {

      if (state.songs.length) {

        playIndex(
          state.currentIndex >= 0
            ? state.currentIndex
            : 0
        );

      }

    }
  );


/* =========================================
   INITIALIZE
========================================= */

loadSongs();