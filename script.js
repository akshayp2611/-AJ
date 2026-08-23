"use strict";

// =====================================================
// SwarAJ Music Player
// Frontend for /api/songs
// =====================================================

const API = {
    songs: "/api/songs",
    categories: "/api/categories",
    health: "/api/health"
};

const audio = document.getElementById("audio");

const state = {
    songs: [],
    filteredSongs: [],
    currentIndex: -1,
    shuffle: false,
    repeat: false,
    liked: JSON.parse(
        localStorage.getItem("swaraj-liked") || "[]"
    )
};

// =====================================================
// Helpers
// =====================================================

function get(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );
}

function normalizeSong(song, index) {
    return {
        id: song.id || `song-${index + 1}`,
        title: song.title || "Unknown Song",
        artist: song.artist || "स्वरAJ",
        album: song.album || song.category || "Music",
        category: song.category || "Music",
        cover: song.cover || "/images/default-cover.svg",
        url: song.url || "",
        file: song.file || ""
    };
}

// =====================================================
// LOAD SONGS
// =====================================================

async function loadSongs() {
    const songList = get("songList");

    if (songList) {
        songList.innerHTML = `
            <div class="empty">
                Loading songs...
            </div>
        `;
    }

    try {
        console.log("SwarAJ: Loading songs...");

        const response = await fetch(API.songs, {
            method: "GET",
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        console.log(
            "SwarAJ: /api/songs status:",
            response.status
        );

        if (!response.ok) {
            throw new Error(
                `Songs API returned HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log(
            "SwarAJ: API response:",
            data
        );

        if (!data || !Array.isArray(data.songs)) {
            throw new Error(
                "Invalid Songs API response"
            );
        }

        state.songs = data.songs.map(
            normalizeSong
        );

        state.filteredSongs = [
            ...state.songs
        ];

        console.log(
            `SwarAJ: ${state.songs.length} songs loaded`
        );

        updateSongCount();

        renderSongs(
            state.filteredSongs
        );

        await loadCategories();

    } catch (error) {
        console.error(
            "SwarAJ Song API Error:",
            error
        );

        state.songs = [];
        state.filteredSongs = [];

        updateSongCount();

        if (songList) {
            songList.innerHTML = `
                <div class="empty">
                    <h3>Song API could not be loaded</h3>
                    <p>${escapeHTML(error.message)}</p>

                    <button
                        type="button"
                        onclick="loadSongs()"
                    >
                        Retry
                    </button>
                </div>
            `;
        }
    }
}

// =====================================================
// SONG COUNT
// =====================================================

function updateSongCount() {
    const count = state.songs.length;

    const elements = [
        get("songCount"),
        get("totalSongs"),
        get("heroSongCount")
    ];

    elements.forEach(element => {
        if (element) {
            element.textContent = count;
        }
    });
}

// =====================================================
// RENDER SONGS
// =====================================================

function renderSongs(songs) {
    const songList = get("songList");

    if (!songList) {
        console.error(
            "SwarAJ: #songList not found in index.html"
        );
        return;
    }

    if (!songs.length) {
        songList.innerHTML = `
            <div class="empty">
                <h3>0 Songs</h3>
                <p>No songs available.</p>
            </div>
        `;

        return;
    }

    songList.innerHTML = songs.map(
        (song, index) => `
            <div
                class="song"
                data-song-id="${escapeHTML(song.id)}"
            >

                <img
                    src="${escapeHTML(song.cover)}"
                    alt="${escapeHTML(song.title)}"
                    class="song-cover"
                    onerror="
                        this.onerror=null;
                        this.src='/images/default-cover.svg';
                    "
                >

                <div class="song-info">

                    <div class="song-title">
                        ${escapeHTML(song.title)}
                    </div>

                    <div class="song-artist">
                        ${escapeHTML(song.artist)}
                    </div>

                    <div class="song-category">
                        ${escapeHTML(song.category)}
                    </div>

                </div>

                <button
                    class="play-song"
                    type="button"
                    data-index="${index}"
                    aria-label="Play ${escapeHTML(song.title)}"
                >
                    ▶
                </button>

            </div>
        `
    ).join("");

    songList
        .querySelectorAll(".play-song")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const index =
                        Number(
                            button.dataset.index
                        );

                    playFilteredSong(index);
                }
            );
        });
}

// =====================================================
// CATEGORIES
// =====================================================

async function loadCategories() {
    const container =
        get("categories");

    if (!container) {
        return;
    }

    try {
        const response = await fetch(
            API.categories,
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error(
                `Categories API HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        const categories =
            Array.isArray(data.categories)
                ? data.categories
                : [];

        renderCategories(
            categories
        );

    } catch (error) {
        console.error(
            "Category API error:",
            error
        );

        // Fallback: build categories
        // directly from loaded songs.

        const map = {};

        state.songs.forEach(song => {
            const category =
                song.category || "Music";

            map[category] =
                (map[category] || 0) + 1;
        });

        const categories =
            Object.entries(map)
                .map(
                    ([name, count]) => ({
                        name,
                        count
                    })
                );

        renderCategories(
            categories
        );
    }
}

function renderCategories(categories) {
    const container =
        get("categories");

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

    container.innerHTML = categories.map(
        category => `
            <button
                type="button"
                class="category"
                data-category="${escapeHTML(category.name)}"
            >
                <strong>
                    ${escapeHTML(category.name)}
                </strong>

                <span>
                    ${Number(category.count) || 0} songs
                </span>
            </button>
        `
    ).join("");

    container
        .querySelectorAll(".category")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    filterCategory(
                        button.dataset.category
                    );
                }
            );
        });
}

// =====================================================
// FILTER CATEGORY
// =====================================================

function filterCategory(category) {
    if (
        !category ||
        category === "All Songs"
    ) {
        state.filteredSongs = [
            ...state.songs
        ];
    } else {
        state.filteredSongs =
            state.songs.filter(
                song =>
                    song.category
                        .toLowerCase() ===
                    category.toLowerCase()
            );
    }

    renderSongs(
        state.filteredSongs
    );
}

// Make available to HTML buttons
window.filterCategory =
    filterCategory;

// =====================================================
// PLAY FILTERED SONG
// =====================================================

function playFilteredSong(index) {
    const song =
        state.filteredSongs[index];

    if (!song) {
        return;
    }

    const globalIndex =
        state.songs.findIndex(
            item =>
                item.id === song.id
        );

    state.currentIndex =
        globalIndex >= 0
            ? globalIndex
            : index;

    playSong(song);
}

// =====================================================
// PLAY SONG
// =====================================================

function playSong(song) {
    if (!song || !song.url) {
        console.error(
            "Song URL missing:",
            song
        );

        return;
    }

    console.log(
        "SwarAJ: Playing:",
        song.title
    );

    console.log(
        "SwarAJ: URL:",
        song.url
    );

    audio.pause();

    audio.src = song.url;

    audio.load();

    audio.play()
        .then(() => {
            updatePlayer(song);
        })
        .catch(error => {
            console.error(
                "Audio playback error:",
                error
            );
        });
}

// =====================================================
// PLAYER UI
// =====================================================

function updatePlayer(song) {
    const title =
        get("nowTitle");

    const artist =
        get("nowArtist");

    const cover =
        get("cover");

    if (title) {
        title.textContent =
            song.title;
    }

    if (artist) {
        artist.textContent =
            song.artist;
    }

    if (cover) {
        cover.src =
            song.cover ||
            "/images/default-cover.svg";

        cover.onerror = () => {
            cover.src =
                "/images/default-cover.svg";
        };
    }

    const playerTitle =
        get("playerTitle");

    if (playerTitle) {
        playerTitle.textContent =
            song.title;
    }

    const playerArtist =
        get("playerArtist");

    if (playerArtist) {
        playerArtist.textContent =
            song.artist;
    }
}

// =====================================================
// PLAY / PAUSE
// =====================================================

function togglePlay() {
    if (!state.songs.length) {
        return;
    }

    if (state.currentIndex === -1) {
        state.filteredSongs = [
            ...state.songs
        ];

        playSong(
            state.songs[0]
        );

        state.currentIndex = 0;

        return;
    }

    if (audio.paused) {
        audio.play()
            .catch(console.error);
    } else {
        audio.pause();
    }
}

const playButton =
    get("playBtn");

if (playButton) {
    playButton.addEventListener(
        "click",
        togglePlay
    );
}

// =====================================================
// NEXT
// =====================================================

function nextSong() {
    if (!state.songs.length) {
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
                state.currentIndex + 1
            ) %
            state.songs.length;
    }

    state.currentIndex =
        nextIndex;

    playSong(
        state.songs[nextIndex]
    );
}

const nextButton =
    get("nextBtn");

if (nextButton) {
    nextButton.addEventListener(
        "click",
        nextSong
    );
}

// =====================================================
// PREVIOUS
// =====================================================

function previousSong() {
    if (!state.songs.length) {
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

    state.currentIndex =
        previousIndex;

    playSong(
        state.songs[
            previousIndex
        ]
    );
}

const previousButton =
    get("prevBtn");

if (previousButton) {
    previousButton.addEventListener(
        "click",
        previousSong
    );
}

// =====================================================
// AUDIO EVENTS
// =====================================================

audio.addEventListener(
    "play",
    () => {
        if (playButton) {
            playButton.textContent =
                "❚❚";
        }
    }
);

audio.addEventListener(
    "pause",
    () => {
        if (playButton) {
            playButton.textContent =
                "▶";
        }
    }
);

audio.addEventListener(
    "ended",
    () => {
        if (state.repeat) {
            if (
                state.currentIndex >= 0
            ) {
                playSong(
                    state.songs[
                        state.currentIndex
                    ]
                );
            }

            return;
        }

        nextSong();
    }
);

// =====================================================
// SEARCH
// =====================================================

const searchInput =
    get("search");

if (searchInput) {
    searchInput.addEventListener(
        "input",
        event => {
            const query =
                event.target.value
                    .trim()
                    .toLowerCase();

            if (!query) {
                state.filteredSongs =
                    [...state.songs];

                renderSongs(
                    state.filteredSongs
                );

                return;
            }

            state.filteredSongs =
                state.songs.filter(
                    song =>
                        [
                            song.title,
                            song.artist,
                            song.album,
                            song.category,
                            song.file
                        ].some(value =>
                            String(value)
                                .toLowerCase()
                                .includes(
                                    query
                                )
                        )
                );

            renderSongs(
                state.filteredSongs
            );
        }
    );
}

// =====================================================
// SHUFFLE
// =====================================================

const shuffleButton =
    get("shuffleBtn");

if (shuffleButton) {
    shuffleButton.addEventListener(
        "click",
        () => {
            state.shuffle =
                !state.shuffle;

            shuffleButton.classList.toggle(
                "active",
                state.shuffle
            );
        }
    );
}

// =====================================================
// REPEAT
// =====================================================

const repeatButton =
    get("repeatBtn");

if (repeatButton) {
    repeatButton.addEventListener(
        "click",
        () => {
            state.repeat =
                !state.repeat;

            repeatButton.classList.toggle(
                "active",
                state.repeat
            );
        }
    );
}

// =====================================================
// PROGRESS
// =====================================================

const progress =
    get("progress");

if (progress) {

    audio.addEventListener(
        "timeupdate",
        () => {

            if (
                Number.isFinite(
                    audio.duration
                ) &&
                audio.duration > 0
            ) {
                progress.value =
                    (
                        audio.currentTime /
                        audio.duration
                    ) * 100;
            }
        }
    );

    progress.addEventListener(
        "input",
        () => {

            if (
                Number.isFinite(
                    audio.duration
                ) &&
                audio.duration > 0
            ) {
                audio.currentTime =
                    (
                        Number(
                            progress.value
                        ) / 100
                    ) *
                    audio.duration;
            }
        }
    );
}

// =====================================================
// INITIAL LOAD
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadSongs();
    }
);

// Also load immediately if script
// is placed at the bottom of body.
if (
    document.readyState ===
    "interactive" ||
    document.readyState ===
    "complete"
) {
    loadSongs();
}