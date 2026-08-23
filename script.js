"use strict";

/* =====================================================
   CONFIG
===================================================== */

const API_URL = "/api/songs";

const audio =
  document.getElementById("audio");


/* =====================================================
   STATE
===================================================== */

const state = {

  songs: [],

  filtered: [],

  currentIndex: -1,

  shuffle: false,

  repeat: false,

  liked: JSON.parse(
    localStorage.getItem(
      "swaraj-liked"
    ) || "[]"
  )

};


/* =====================================================
   ICON REFRESH
===================================================== */

function refreshIcons() {

  if (
    window.lucide &&
    typeof lucide.createIcons ===
      "function"
  ) {

    lucide.createIcons();

  }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    character => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"

    }[character])
  );

}


/* =====================================================
   FORMAT TIME
===================================================== */

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
    )
      .toString()
      .padStart(2, "0");

  return `${minutes}:${remaining}`;

}


/* =====================================================
   LOAD SONGS
===================================================== */

async function loadSongs() {

  console.log(
    "SwarAJ: loading songs..."
  );

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


    console.log(
      "SwarAJ Song API:",
      data
    );


    if (
      !data ||
      !Array.isArray(
        data.songs
      )
    ) {

      throw new Error(
        "Invalid /api/songs response"
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


    updateSongCount();

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

    refreshIcons();


    console.log(
      `SwarAJ: ${state.songs.length} songs loaded`
    );

  }
  catch (error) {

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

          <i data-lucide="alert-circle"></i>

          <br><br>

          Song API could not be loaded.

          <br>

          <small>
            ${escapeHTML(
              error.message
            )}
          </small>

        </div>

      `;

      refreshIcons();

    }

  }

}


/* =====================================================
   SONG COUNT
===================================================== */

function updateSongCount() {

  const element =
    document.getElementById(
      "songCount"
    );


  if (element) {

    element.textContent =
      `${state.songs.length} songs`;

  }

}


/* =====================================================
   QUICK PICKS
===================================================== */

function renderQuickPicks() {

  const container =
    document.getElementById(
      "quickPicks"
    );


  if (!container) {
    return;
  }


  const songs =
    state.songs.slice(
      0,
      6
    );


  if (!songs.length) {

    container.innerHTML = `
      <div class="loading">
        No songs available
      </div>
    `;

    return;

  }


  container.innerHTML =
    songs
      .map(
        (song, index) => `

          <div
            class="quick-card"
            data-index="${index}"
          >

            <img
              src="${escapeHTML(
                song.cover
              )}"
              alt=""
              onerror="
                this.onerror=null;
                this.src='/images/default-cover.svg';
              "
            >

            <div class="quick-card-info">

              <strong>
                ${escapeHTML(
                  song.title
                )}
              </strong>

              <span>
                ${escapeHTML(
                  song.artist
                )}
              </span>

            </div>


            <button
              class="quick-play"
              data-index="${index}"
              aria-label="Play"
            >
              <i data-lucide="play"></i>
            </button>

          </div>

        `
      )
      .join("");


  container
    .querySelectorAll(
      ".quick-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          playIndex(
            Number(
              card.dataset.index
            )
          );

        }
      );

    });


  container
    .querySelectorAll(
      ".quick-play"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          playIndex(
            Number(
              button.dataset.index
            )
          );

        }
      );

    });


  refreshIcons();

}


/* =====================================================
   CATEGORIES
===================================================== */

function renderCategories() {

  const container =
    document.getElementById(
      "categories"
    );


  if (!container) {
    return;
  }


  const categories = {};


  state.songs.forEach(
    song => {

      const category =
        song.category ||
        "Music";


      categories[category] =
        (
          categories[category] ||
          0
        ) + 1;

    }
  );


  const entries =
    Object.entries(
      categories
    );


  if (!entries.length) {

    container.innerHTML = `
      <div class="loading">
        No categories available
      </div>
    `;

    return;

  }


  container.innerHTML =
    entries
      .map(
        ([name, count]) => `

          <div
            class="category-card"
            data-category="${escapeHTML(
              name
            )}"
          >

            <h3>
              ${escapeHTML(
                name
              )}
            </h3>

            <span>
              ${count} ${
                count === 1
                  ? "song"
                  : "songs"
              }
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


          showPage(
            "home"
          );


          window.scrollTo({
            top: 700,
            behavior: "smooth"
          });

        }
      );

    });

}


/* =====================================================
   SONG LIST
===================================================== */

function renderSongs(
  songs,
  containerId
) {

  const container =
    document.getElementById(
      containerId
    );


  if (!container) {
    return;
  }


  if (!songs.length) {

    container.innerHTML = `

      <div class="loading">

        <i data-lucide="music"></i>

        <br><br>

        No songs found

      </div>

    `;

    refreshIcons();

    return;

  }


  container.innerHTML =
    songs
      .map(
        (song, index) => {

          const liked =
            state.liked.includes(
              song.id
            );


          return `

            <div
              class="song-row"
              data-song-id="${escapeHTML(
                song.id
              )}"
            >

              <span class="song-number">
                ${index + 1}
              </span>


              <div class="song-main">

                <img
                  class="song-cover"
                  src="${escapeHTML(
                    song.cover
                  )}"
                  alt=""
                  onerror="
                    this.onerror=null;
                    this.src='/images/default-cover.svg';
                  "
                >


                <div class="song-text">

                  <div class="song-title">
                    ${escapeHTML(
                      song.title
                    )}
                  </div>

                  <div class="song-artist">

                    ${escapeHTML(
                      song.artist
                    )}

                    <span> • </span>

                    ${escapeHTML(
                      song.album
                    )}

                  </div>

                </div>

              </div>


              <div class="song-actions">

                <button
                  class="song-like"
                  data-id="${escapeHTML(
                    song.id
                  )}"
                  aria-label="Like"
                >

                  <i
                    data-lucide="${
                      liked
                        ? "heart"
                        : "heart"
                    }"
                    ${
                      liked
                        ? 'fill="currentColor"'
                        : ""
                    }
                  ></i>

                </button>


                <button
                  class="song-play"
                  data-song-id="${escapeHTML(
                    song.id
                  )}"
                  aria-label="Play"
                >

                  <i data-lucide="play"></i>

                </button>

              </div>

            </div>

          `;

        }
      )
      .join("");


  container
    .querySelectorAll(
      ".song-row"
    )
    .forEach(row => {

      row.addEventListener(
        "dblclick",
        () => {

          playSongId(
            row.dataset.songId
          );

        }
      );

    });


  container
    .querySelectorAll(
      ".song-play"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          playSongId(
            button.dataset.songId
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
        event => {

          event.stopPropagation();

          toggleLike(
            button.dataset.id
          );

        }
      );

    });


  refreshIcons();

}


/* =====================================================
   PLAY SONG BY ID
===================================================== */

function playSongId(id) {

  const index =
    state.songs.findIndex(
      song =>
        String(song.id) ===
        String(id)
    );


  if (index === -1) {

    console.error(
      "Song not found:",
      id
    );

    return;

  }


  playIndex(index);

}


/* =====================================================
   PLAY INDEX
===================================================== */

function playIndex(index) {

  if (
    index < 0 ||
    index >= state.songs.length
  ) {

    return;

  }


  const song =
    state.songs[index];


  if (!song.url) {

    console.error(
      "Song URL missing:",
      song
    );

    return;

  }


  state.currentIndex =
    index;


  console.log(
    "Playing:",
    song.title
  );

  console.log(
    "URL:",
    song.url
  );


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
    .catch(
      error => {

        console.error(
          "Audio playback failed:",
          error
        );

      }
    );

}


/* =====================================================
   PLAYER
===================================================== */

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


/* =====================================================
   PLAY ICON
===================================================== */

function updatePlayIcon(
  playing
) {

  const button =
    document.getElementById(
      "playBtn"
    );


  if (!button) {
    return;
  }


  button.innerHTML =
    playing
      ? `<i data-lucide="pause"></i>`
      : `<i data-lucide="play"></i>`;


  refreshIcons();

}


/* =====================================================
   PLAY / PAUSE
===================================================== */

document
  .getElementById(
    "playBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        state.currentIndex ===
        -1
      ) {

        if (
          state.songs.length
        ) {

          playIndex(0);

        }

        return;

      }


      if (audio.paused) {

        audio
          .play()
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

    updatePlayIcon(
      true
    );

  }
);


audio.addEventListener(
  "pause",
  () => {

    updatePlayIcon(
      false
    );

  }
);


/* =====================================================
   NEXT
===================================================== */

document
  .getElementById(
    "nextBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        !state.songs.length
      ) {

        return;

      }


      let nextIndex;


      if (state.shuffle) {

        nextIndex =
          Math.floor(
            Math.random() *
            state.songs.length
          );

      } else {

        nextIndex =
          (
            state.currentIndex +
            1
          ) %
          state.songs.length;

      }


      playIndex(
        nextIndex
      );

    }
  );


/* =====================================================
   PREVIOUS
===================================================== */

document
  .getElementById(
    "prevBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        !state.songs.length
      ) {

        return;

      }


      let previousIndex =
        state.currentIndex - 1;


      if (
        previousIndex < 0
      ) {

        previousIndex =
          state.songs.length - 1;

      }


      playIndex(
        previousIndex
      );

    }
  );


/* =====================================================
   SHUFFLE
===================================================== */

document
  .getElementById(
    "shuffleBtn"
  )
  ?.addEventListener(
    "click",
    event => {

      state.shuffle =
        !state.shuffle;


      event.currentTarget
        .classList.toggle(
          "active",
          state.shuffle
        );

    }
  );


/* =====================================================
   REPEAT
===================================================== */

document
  .getElementById(
    "repeatBtn"
  )
  ?.addEventListener(
    "click",
    event => {

      state.repeat =
        !state.repeat;


      event.currentTarget
        .classList.toggle(
          "active",
          state.repeat
        );

    }
  );


/* =====================================================
   ENDED
===================================================== */

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


/* =====================================================
   PROGRESS
===================================================== */

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


    if (
      progress &&
      Number.isFinite(
        audio.duration
      )
    ) {

      progress.value =
        (
          audio.currentTime /
          audio.duration
        ) *
        100;

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
  .getElementById(
    "progress"
  )
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
            ) /
            100
          ) *
          audio.duration;

      }

    }
  );


/* =====================================================
   VOLUME
===================================================== */

document
  .getElementById(
    "volume"
  )
  ?.addEventListener(
    "input",
    event => {

      audio.volume =
        Number(
          event.target.value
        );

    }
  );


/* =====================================================
   LIKE
===================================================== */

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


  if (
    state.currentIndex >= 0
  ) {

    const current =
      state.songs[
        state.currentIndex
      ];

    if (
      current &&
      current.id === id
    ) {

      updatePlayer(
        current
      );

    }

  }

}


/* =====================================================
   PLAYER LIKE
===================================================== */

document
  .getElementById(
    "likeBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        state.currentIndex === -1
      ) {

        return;

      }


      const song =
        state.songs[
          state.currentIndex
        ];


      toggleLike(
        song.id
      );

    }
  );


/* =====================================================
   LIKED
===================================================== */

function renderLiked() {

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


/* =====================================================
   LIBRARY
===================================================== */

function renderLibrary() {

  renderSongs(
    state.songs,
    "librarySongs"
  );

}


/* =====================================================
   ALBUMS
===================================================== */

function renderAlbums() {

  const container =
    document.getElementById(
      "albumGrid"
    );


  if (!container) {
    return;
  }


  const albums = {};


  state.songs.forEach(
    song => {

      const key =
        `${song.album}-${song.artist}`;


      if (!albums[key]) {

        albums[key] = {

          album:
            song.album,

          artist:
            song.artist,

          cover:
            song.cover,

          count: 0

        };

      }


      albums[key].count++;

    }
  );


  const values =
    Object.values(
      albums
    );


  if (!values.length) {

    container.innerHTML = `
      <div class="loading">
        No albums available
      </div>
    `;

    return;

  }


  container.innerHTML =
    values
      .map(
        album => `

          <div
            class="album-card"
          >

            <img
              src="${escapeHTML(
                album.cover
              )}"
              alt=""
              onerror="
                this.onerror=null;
                this.src='/images/default-cover.svg';
              "
            >

            <strong>
              ${escapeHTML(
                album.album
              )}
            </strong>

            <span>
              ${escapeHTML(
                album.artist
              )}
              •
              ${album.count}
              ${
                album.count === 1
                  ? "song"
                  : "songs"
              }
            </span>

          </div>

        `
      )
      .join("");

}


/* =====================================================
   ARTISTS
===================================================== */

function renderArtists() {

  const container =
    document.getElementById(
      "artistGrid"
    );


  if (!container) {
    return;
  }


  const artists = {};


  state.songs.forEach(
    song => {

      const name =
        song.artist ||
        "स्वरAJ";


      if (!artists[name]) {

        artists[name] = {

          name,

          cover:
            song.cover,

          count: 0

        };

      }


      artists[name].count++;

    }
  );


  container.innerHTML =
    Object.values(
      artists
    )
      .map(
        artist => `

          <div
            class="artist-card"
          >

            <img
              src="${escapeHTML(
                artist.cover
              )}"
              alt=""
              onerror="
                this.onerror=null;
                this.src='/images/default-cover.svg';
              "
            >

            <strong>
              ${escapeHTML(
                artist.name
              )}
            </strong>

            <p>
              ${artist.count}
              ${
                artist.count === 1
                  ? "song"
                  : "songs"
              }
            </p>

          </div>

        `
      )
      .join("");

}


/* =====================================================
   SEARCH
===================================================== */

function searchSongs(query) {

  const value =
    query
      .trim()
      .toLowerCase();


  const results =
    !value

      ? state.songs

      : state.songs.filter(
          song =>
            [

              song.title,

              song.artist,

              song.album,

              song.category,

              song.file

            ].some(
              item =>
                String(item)
                  .toLowerCase()
                  .includes(
                    value
                  )
            )
        );


  renderSongs(
    results,
    "searchResults"
  );

}


document
  .getElementById(
    "search"
  )
  ?.addEventListener(
    "input",
    event => {

      searchSongs(
        event.target.value
      );

    }
  );


document
  .getElementById(
    "largeSearch"
  )
  ?.addEventListener(
    "input",
    event => {

      searchSongs(
        event.target.value
      );

    }
  );


/* =====================================================
   NAVIGATION
===================================================== */

function showPage(pageId) {

  document
    .querySelectorAll(
      ".page"
    )
    .forEach(
      page => {

        page.classList.remove(
          "active-page"
        );

      }
    );


  const page =
    document.getElementById(
      pageId
    );


  if (page) {

    page.classList.add(
      "active-page"
    );

  }


  document
    .querySelectorAll(
      ".nav-item, .mobile-nav-item"
    )
    .forEach(
      item => {

        item.classList.toggle(
          "active",
          item.dataset.page ===
            pageId
        );

      }
    );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (
    pageId === "searchPage"
  ) {

    document
      .getElementById(
        "largeSearch"
      )
      ?.focus();

  }

}


document
  .querySelectorAll(
    "[data-page]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          showPage(
            button.dataset.page
          );

        }
      );

    }
  );


/* =====================================================
   HERO PLAY
===================================================== */

document
  .getElementById(
    "heroPlayBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      if (
        !state.songs.length
      ) {

        return;

      }


      playIndex(
        state.currentIndex >= 0
          ? state.currentIndex
          : 0
      );

    }
  );


/* =====================================================
   MOBILE MENU
===================================================== */

document
  .getElementById(
    "mobileMenuBtn"
  )
  ?.addEventListener(
    "click",
    () => {

      /*
       * On mobile, open Library.
       * The bottom navigation remains
       * available for Home/Search/Library.
       */

      showPage(
        "library"
      );

    }
  );


/* =====================================================
   INITIALIZE
===================================================== */

refreshIcons();

loadSongs();