const audio =
  document.getElementById("audio");

const state = {
  songs: [],
  filtered: [],
  index: -1,
  shuffle: false,
  repeat: false,

  liked: JSON.parse(
    localStorage.getItem(
      "swaraj-liked"
    ) || "[]"
  )
};

// --------------------------------------------------
// Helper
// --------------------------------------------------

function $(id) {
  return document.getElementById(id);
}

function esc(value) {
  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]
  );
}

// --------------------------------------------------
// Normalize song
// --------------------------------------------------

function normalizeSong(
  song,
  index
) {
  return {
    id:
      song.id ||
      `song-${index + 1}`,

    title:
      song.title ||
      "Untitled",

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
  };
}

// --------------------------------------------------
// LOAD SONGS
// --------------------------------------------------

async function loadSongs() {
  const songList =
    $("songList");

  try {
    songList.innerHTML = `
      <div class="empty">
        Loading songs...
      </div>
    `;

    console.log(
      "Loading /api/songs..."
    );

    const response =
      await fetch(
        "/api/songs",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    console.log(
      "Songs API status:",
      response.status
    );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    console.log(
      "Songs API response:",
      data
    );

    // Support both:
    //
    // [...]
    //
    // and:
    //
    // { songs: [...] }

    let songs = [];

    if (
      Array.isArray(data)
    ) {
      songs = data;
    } else if (
      data &&
      Array.isArray(
        data.songs
      )
    ) {
      songs =
        data.songs;
    }

    state.songs =
      songs.map(
        normalizeSong
      );

    state.filtered =
      [...state.songs];

    if ($("songCount")) {
      $("songCount").textContent =
        state.songs.length;
    }

    console.log(
      `Loaded ${state.songs.length} songs`
    );

    renderSongs(
      state.songs
    );

    await loadCategories();

  } catch (error) {
    console.error(
      "Song API could not be loaded:",
      error
    );

    if ($("songCount")) {
      $("songCount").textContent =
        "0";
    }

    songList.innerHTML = `
      <div class="empty">
        <strong>
          Song API could not be loaded
        </strong>

        <br><br>

        ${esc(
          error.message
        )}

        <br><br>

        <button
          onclick="loadSongs()"
          class="retry-btn"
        >
          Retry
        </button>
      </div>
    `;
  }
}

// --------------------------------------------------
// CATEGORIES
// --------------------------------------------------

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

    if (!response.ok) {
      throw new Error(
        `Categories HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    let categories = [];

    if (
      Array.isArray(data)
    ) {
      categories =
        data;
    } else if (
      data &&
      Array.isArray(
        data.categories
      )
    ) {
      categories =
        data.categories;
    }

    renderCategories(
      categories
    );

  } catch (error) {
    console.error(
      "Categories error:",
      error
    );

    renderCategories(
      []
    );
  }
}

// --------------------------------------------------
// RENDER SONGS
// --------------------------------------------------

function renderSongs(
  songs
) {
  state.filtered =
    [...songs];

  if (!songs.length) {
    $("songList").innerHTML = `
      <div class="empty">
        No songs found.
        <br><br>
        Add MP3 files inside
        <strong>songs/</strong>.
      </div>
    `;

    return;
  }

  $("songList").innerHTML =
    songs
      .map(
        (song, index) => `
          <div class="song">

            <img
              src="${esc(
                song.cover
              )}"
              alt=""
              onerror="
                this.onerror=null;
                this.src='/images/default-cover.svg';
              "
            >

            <div class="song-info">

              <b>
                ${esc(
                  song.title
                )}
              </b>

              <span>
                ${esc(
                  song.artist
                )}
                •
                ${esc(
                  song.category
                )}
              </span>

            </div>

            <button
              onclick="playSong(${index})"
            >
              ▶
            </button>

          </div>
        `
      )
      .join("");
}

// --------------------------------------------------
// RENDER CATEGORIES
// --------------------------------------------------

function renderCategories(
  categories
) {
  const container =
    $("categories");

  if (!container) {
    return;
  }

  if (!categories.length) {
    container.innerHTML = `
      <div class="empty">
        No categories found.
      </div>
    `;

    return;
  }

  container.innerHTML =
    categories
      .map(
        category => {
          const name =
            typeof category ===
            "string"
              ? category
              : category.name;

          const count =
            typeof category ===
            "string"
              ? state.songs.filter(
                  song =>
                    song.category ===
                    name
                ).length
              : category.count;

          return `
            <button
              class="category"
              onclick="filterCategory('${esc(
                name
              )}')"
            >
              <h3>
                ${esc(
                  name
                )}
              </h3>

              <p>
                ${count} songs
              </p>
            </button>
          `;
        }
      )
      .join("");
}

// --------------------------------------------------
// PLAY SONG
// --------------------------------------------------

function playSong(
  index
) {
  const song =
    state.filtered[index];

  if (!song) {
    return;
  }

  const realIndex =
    state.songs.findIndex(
      item =>
        item.id ===
        song.id
    );

  if (
    realIndex === -1
  ) {
    return;
  }

  state.index =
    realIndex;

  console.log(
    "Playing:",
    song.title
  );

  console.log(
    "Audio URL:",
    song.url
  );

  if (!song.url) {
    alert(
      "Song URL is missing."
    );

    return;
  }

  audio.pause();

  audio.src =
    song.url;

  audio.load();

  audio.play()
    .then(() => {
      if ($("playBtn")) {
        $("playBtn").textContent =
          "❚❚";
      }
    })
    .catch(error => {
      console.error(
        "Playback error:",
        error
      );

      alert(
        `Unable to play ${song.title}`
      );
    });

  if ($("nowTitle")) {
    $("nowTitle").textContent =
      song.title;
  }

  if ($("nowArtist")) {
    $("nowArtist").textContent =
      song.artist;
  }

  if ($("cover")) {
    $("cover").src =
      song.cover;
  }
}

// --------------------------------------------------
// FILTER CATEGORY
// --------------------------------------------------

window.filterCategory =
  function (
    category
  ) {
    if (
      category ===
      "All Songs"
    ) {
      renderSongs(
        state.songs
      );

      return;
    }

    const songs =
      state.songs.filter(
        song =>
          song.category ===
          category
      );

    renderSongs(
      songs
    );
  };

// --------------------------------------------------
// SEARCH
// --------------------------------------------------

if ($("search")) {
  $("search").addEventListener(
    "input",
    event => {
      const query =
        event.target.value
          .trim()
          .toLowerCase();

      if (!query) {
        renderSongs(
          state.songs
        );

        return;
      }

      const results =
        state.songs.filter(
          song =>
            [
              song.title,
              song.artist,
              song.album,
              song.category,
              song.file
            ].some(value =>
              String(
                value
              )
                .toLowerCase()
                .includes(
                  query
                )
            )
        );

      renderSongs(
        results
      );
    }
  );
}

// --------------------------------------------------
// PLAY / PAUSE
// --------------------------------------------------

if ($("playBtn")) {
  $("playBtn").onclick =
    () => {
      if (
        state.index === -1
      ) {
        if (
          state.songs.length
        ) {
          state.filtered =
            [...state.songs];

          playSong(0);
        }

        return;
      }

      if (
        audio.paused
      ) {
        audio
          .play()
          .catch(
            console.error
          );
      } else {
        audio.pause();
      }
    };
}

// --------------------------------------------------
// NEXT
// --------------------------------------------------

if ($("nextBtn")) {
  $("nextBtn").onclick =
    () => {
      if (
        !state.songs.length
      ) {
        return;
      }

      let nextIndex;

      if (
        state.shuffle
      ) {
        nextIndex =
          Math.floor(
            Math.random() *
              state.songs.length
          );
      } else {
        nextIndex =
          (
            state.index +
            1 +
            state.songs.length
          ) %
          state.songs.length;
      }

      state.filtered =
        [...state.songs];

      playSong(
        nextIndex
      );
    };
}

// --------------------------------------------------
// PREVIOUS
// --------------------------------------------------

if ($("prevBtn")) {
  $("prevBtn").onclick =
    () => {
      if (
        !state.songs.length
      ) {
        return;
      }

      const previousIndex =
        (
          state.index -
          1 +
          state.songs.length
        ) %
        state.songs.length;

      state.filtered =
        [...state.songs];

      playSong(
        previousIndex
      );
    };
}

// --------------------------------------------------
// AUDIO EVENTS
// --------------------------------------------------

audio.addEventListener(
  "play",
  () => {
    if ($("playBtn")) {
      $("playBtn").textContent =
        "❚❚";
    }
  }
);

audio.addEventListener(
  "pause",
  () => {
    if ($("playBtn")) {
      $("playBtn").textContent =
        "▶";
    }
  }
);

audio.addEventListener(
  "ended",
  () => {
    if (
      state.repeat &&
      state.index >= 0
    ) {
      state.filtered =
        [...state.songs];

      playSong(
        state.index
      );

      return;
    }

    if ($("nextBtn")) {
      $("nextBtn").click();
    }
  }
);

// --------------------------------------------------
// PROGRESS
// --------------------------------------------------

if ($("progress")) {
  audio.addEventListener(
    "timeupdate",
    () => {
      if (
        audio.duration
      ) {
        $("progress").value =
          (
            audio.currentTime /
            audio.duration
          ) *
          100;
      }
    }
  );

  $("progress").oninput =
    event => {
      if (
        audio.duration
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
    };
}

// --------------------------------------------------
// SHUFFLE
// --------------------------------------------------

if ($("shuffleBtn")) {
  $("shuffleBtn").onclick =
    () => {
      state.shuffle =
        !state.shuffle;
    };
}

// --------------------------------------------------
// REPEAT
// --------------------------------------------------

if ($("repeatBtn")) {
  $("repeatBtn").onclick =
    () => {
      state.repeat =
        !state.repeat;
    };
}

// --------------------------------------------------
// INITIALIZE
// --------------------------------------------------

loadSongs();