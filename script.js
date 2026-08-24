"use strict";

/*
=========================================================
स्वरAJ FRONTEND
=========================================================

IMPORTANT:
This frontend does NOT hardcode songs.

It loads songs from:

    /api/songs

Your existing server.js should provide:

    GET /api/songs

Expected response:

{
    "success": true,
    "count": 2,
    "songs": [...]
}

=========================================================
*/

const API_URL = "/api/songs";

let songs = [];
let filteredSongs = [];

let currentIndex = -1;

let shuffle = false;
let repeat = false;

const audio = document.getElementById("audio");

const songsContainer =
    document.getElementById("songs");

const categoriesContainer =
    document.getElementById("categories");

const songCount =
    document.getElementById("songCount");

const songHeading =
    document.getElementById("songHeading");

const emptyState =
    document.getElementById("emptyState");

const apiStatus =
    document.getElementById("apiStatus");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const playerCover =
    document.getElementById("playerCover");

const playBtn =
    document.getElementById("playBtn");

const prevBtn =
    document.getElementById("prevBtn");

const nextBtn =
    document.getElementById("nextBtn");

const shuffleBtn =
    document.getElementById("shuffleBtn");

const repeatBtn =
    document.getElementById("repeatBtn");

const progress =
    document.getElementById("progress");

const currentTime =
    document.getElementById("currentTime");

const duration =
    document.getElementById("duration");

const volume =
    document.getElementById("volume");

const muteBtn =
    document.getElementById("muteBtn");

const searchInput =
    document.getElementById("searchInput");


/* ======================================================
   API URL HELPER
====================================================== */

function getApiUrl() {

    return API_URL;
}


/* ======================================================
   SAFE TEXT
====================================================== */

function safeText(value, fallback = "") {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    return String(value);
}


/* ======================================================
   SONG URL
====================================================== */

function resolveUrl(url) {

    if (!url) {
        return "";
    }

    /*
     * If server already returns an absolute URL,
     * keep it unchanged.
     */

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("blob:")
    ) {
        return url;
    }

    /*
     * Keep root-relative URLs.
     */

    if (url.startsWith("/")) {
        return url;
    }

    return "/" + url;
}


/* ======================================================
   COVER
====================================================== */

function resolveCover(song) {

    const cover =
        song.cover ||
        song.image ||
        song.thumbnail ||
        "";

    if (!cover) {
        return "";
    }

    return resolveUrl(cover);
}


/* ======================================================
   LOAD SONGS
====================================================== */

async function loadSongs() {

    setStatus("Loading songs...");

    try {

        const response =
            await fetch(getApiUrl(), {
                method: "GET",
                cache: "no-store",
                headers: {
                    "Accept": "application/json"
                }
            });

        if (!response.ok) {
            throw new Error(
                "Song API returned HTTP " +
                response.status
            );
        }

        const data =
            await response.json();

        /*
         * IMPORTANT:
         * Support both:
         *
         * { songs: [] }
         *
         * and
         *
         * []
         */

        let receivedSongs = [];

        if (Array.isArray(data)) {

            receivedSongs = data;

        } else if (
            data &&
            Array.isArray(data.songs)
        ) {

            receivedSongs = data.songs;

        } else if (
            data &&
            Array.isArray(data.data)
        ) {

            receivedSongs = data.data;
        }

        songs =
            receivedSongs.map(
                normalizeSong
            );

        filteredSongs = [...songs];

        setStatus(
            songs.length +
            " song" +
            (songs.length === 1 ? "" : "s") +
            " available"
        );

        renderCategories();

        renderSongs();

    } catch (error) {

        console.error(
            "Song API error:",
            error
        );

        songs = [];
        filteredSongs = [];

        setStatus(
            "Song API could not be loaded"
        );

        renderCategories();
        renderSongsError();
    }
}


/* ======================================================
   NORMALIZE SONG
====================================================== */

function normalizeSong(song, index) {

    const category =
        safeText(
            song.category ||
            song.genre ||
            song.album ||
            "Other",
            "Other"
        );

    return {

        id:
            safeText(
                song.id,
                "song-" + (index + 1)
            ),

        title:
            safeText(
                song.title ||
                song.name,
                "Unknown Song"
            ),

        artist:
            safeText(
                song.artist ||
                song.singer,
                "स्वरAJ"
            ),

        album:
            safeText(
                song.album,
                category
            ),

        category,

        cover:
            resolveCover(song),

        url:
            resolveUrl(
                song.url ||
                song.src ||
                song.path ||
                ""
            ),

        file:
            safeText(song.file)

    };
}


/* ======================================================
   STATUS
====================================================== */

function setStatus(message) {

    if (apiStatus) {
        apiStatus.textContent = message;
    }
}


/* ======================================================
   CATEGORIES
====================================================== */

function renderCategories() {

    if (!categoriesContainer) {
        return;
    }

    if (!songs.length) {

        categoriesContainer.innerHTML = `
            <div class="loading-card">
                No categories available
            </div>
        `;

        return;
    }

    /*
     * Build categories from the actual songs.
     *
     * This avoids depending on a separate
     * /api/categories endpoint.
     */

    const map = new Map();

    songs.forEach(song => {

        const category =
            safeText(
                song.category,
                "Other"
            );

        if (!map.has(category)) {
            map.set(category, 0);
        }

        map.set(
            category,
            map.get(category) + 1
        );

    });

    const categoryIcons = [
        "♫",
        "◉",
        "✦",
        "♬",
        "♪",
        "✧",
        "◈",
        "★"
    ];

    const categories =
        Array.from(map.entries());

    categoriesContainer.innerHTML =
        categories.map(
            ([name, count], index) => {

                const icon =
                    categoryIcons[
                        index %
                        categoryIcons.length
                    ];

                return `
                    <article
                        class="category-card"
                        data-category="${escapeHtml(name)}"
                    >

                        <div class="category-icon">
                            ${icon}
                        </div>

                        <h3>
                            ${escapeHtml(name)}
                        </h3>

                        <p>
                            ${count}
                            song${count === 1 ? "" : "s"}
                        </p>

                    </article>
                `;

            }
        ).join("");

    document
        .querySelectorAll(".category-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const category =
                        card.dataset.category;

                    filterCategory(category);
                }
            );

        });

}


/* ======================================================
   SONGS
====================================================== */

function renderSongs() {

    if (!songsContainer) {
        return;
    }

    if (!filteredSongs.length) {

        songsContainer.innerHTML = "";

        emptyState.classList.remove("hidden");

        songCount.textContent =
            "0 songs";

        return;
    }

    emptyState.classList.add("hidden");

    songCount.textContent =
        filteredSongs.length +
        " song" +
        (filteredSongs.length === 1 ? "" : "s");

    songsContainer.innerHTML =
        filteredSongs
            .map(
                (song, index) =>
                    createSongCard(song, index)
            )
            .join("");

    document
        .querySelectorAll(".song-play")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const index =
                        Number(
                            button.dataset.index
                        );

                    playSongFromFiltered(
                        index
                    );

                }
            );

        });

    document
        .querySelectorAll(".song-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            card.dataset.index
                        );

                    playSongFromFiltered(
                        index
                    );

                }
            );

        });

}


/* ======================================================
   SONG CARD
====================================================== */

function createSongCard(song, index) {

    const cover = song.cover
        ? `
            <img
                src="${escapeHtml(song.cover)}"
                alt="${escapeHtml(song.title)}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
          `
        : "";

    return `
        <article
            class="song-card"
            data-index="${index}"
        >

            <div class="cover">

                ${cover}

                <span>♫</span>

            </div>

            <div class="song-info">

                <h3>
                    ${escapeHtml(song.title)}
                </h3>

                <p>
                    ${escapeHtml(song.artist)}
                </p>

            </div>

            <button
                class="song-play"
                data-index="${index}"
                aria-label="Play ${escapeHtml(song.title)}"
            >
                ▶
            </button>

        </article>
    `;
}


/* ======================================================
   API ERROR
====================================================== */

function renderSongsError() {

    songsContainer.innerHTML = `
        <div class="loading-card">
            Song API could not be loaded.
            <br><br>
            Please check the server deployment.
        </div>
    `;

    songCount.textContent = "0 songs";

}


/* ======================================================
   FILTER CATEGORY
====================================================== */

function filterCategory(category) {

    filteredSongs =
        songs.filter(
            song =>
                song.category
                    .toLowerCase() ===
                category.toLowerCase()
        );

    songHeading.textContent =
        category;

    renderSongs();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ======================================================
   ALL SONGS
====================================================== */

function showAllSongs() {

    filteredSongs = [...songs];

    songHeading.textContent =
        "All Songs";

    renderSongs();
}


/* ======================================================
   PLAY SONG
====================================================== */

function playSongFromFiltered(index) {

    const song =
        filteredSongs[index];

    if (!song) {
        return;
    }

    /*
     * Find actual position in main songs array.
     */

    currentIndex =
        songs.findIndex(
            item =>
                item.id === song.id
        );

    playSong(song);
}


/* ======================================================
   PLAY
====================================================== */

async function playSong(song) {

    if (!song.url) {

        console.error(
            "Song URL missing:",
            song
        );

        setStatus(
            "Song file URL unavailable"
        );

        return;
    }

    playerTitle.textContent =
        song.title;

    playerArtist.textContent =
        song.artist;

    if (song.cover) {

        playerCover.innerHTML = `
            <img
                src="${escapeHtml(song.cover)}"
                alt=""
            >
        `;

    } else {

        playerCover.innerHTML = "♫";

    }

    /*
     * Only change audio source when needed.
     */

    if (audio.src !==
        new URL(
            song.url,
            window.location.href
        ).href
    ) {

        audio.src = song.url;

    }

    try {

        await audio.play();

        updatePlayButton(true);

    } catch (error) {

        console.error(
            "Playback error:",
            error
        );

        setStatus(
            "Tap Play to start the song"
        );

        updatePlayButton(false);
    }

}


/* ======================================================
   PLAY / PAUSE
====================================================== */

playBtn.addEventListener(
    "click",
    async () => {

        if (!audio.src) {

            if (songs.length) {
                currentIndex = 0;
                await playSong(
                    songs[0]
                );
            }

            return;
        }

        if (audio.paused) {

            try {
                await audio.play();
                updatePlayButton(true);
            } catch (error) {
                console.error(error);
            }

        } else {

            audio.pause();

            updatePlayButton(false);
        }

    }
);


/* ======================================================
   UPDATE PLAY BUTTON
====================================================== */

function updatePlayButton(isPlaying) {

    playBtn.textContent =
        isPlaying ? "❚❚" : "▶";

}


/* ======================================================
   NEXT
====================================================== */

nextBtn.addEventListener(
    "click",
    () => {

        if (!songs.length) {
            return;
        }

        let nextIndex;

        if (shuffle) {

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

        currentIndex = nextIndex;

        playSong(
            songs[currentIndex]
        );

    }
);


/* ======================================================
   PREVIOUS
====================================================== */

prevBtn.addEventListener(
    "click",
    () => {

        if (!songs.length) {
            return;
        }

        /*
         * If song already played for more
         * than 3 seconds, restart it.
         */

        if (audio.currentTime > 3) {

            audio.currentTime = 0;

            return;
        }

        let previous =
            currentIndex - 1;

        if (previous < 0) {
            previous =
                songs.length - 1;
        }

        currentIndex = previous;

        playSong(
            songs[currentIndex]
        );

    }
);


/* ======================================================
   AUDIO ENDED
====================================================== */

audio.addEventListener(
    "ended",
    () => {

        if (repeat) {

            audio.currentTime = 0;

            audio.play();

            return;
        }

        nextBtn.click();

    }
);


/* ======================================================
   AUDIO PLAY
====================================================== */

audio.addEventListener(
    "play",
    () => {

        updatePlayButton(true);

    }
);


/* ======================================================
   AUDIO PAUSE
====================================================== */

audio.addEventListener(
    "pause",
    () => {

        updatePlayButton(false);

    }
);


/* ======================================================
   TIME UPDATE
====================================================== */

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
            percent || 0;

        currentTime.textContent =
            formatTime(
                audio.currentTime
            );

    }
);


/* ======================================================
   LOADED METADATA
====================================================== */

audio.addEventListener(
    "loadedmetadata",
    () => {

        duration.textContent =
            formatTime(
                audio.duration
            );

    }
);


/* ======================================================
   PROGRESS
====================================================== */

progress.addEventListener(
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


/* ======================================================
   VOLUME
====================================================== */

volume.addEventListener(
    "input",
    () => {

        audio.volume =
            Number(volume.value);

        if (audio.volume === 0) {
            muteBtn.textContent = "🔇";
        } else {
            muteBtn.textContent = "🔊";
        }

    }
);


/* ======================================================
   MUTE
====================================================== */

muteBtn.addEventListener(
    "click",
    () => {

        audio.muted =
            !audio.muted;

        muteBtn.textContent =
            audio.muted
                ? "🔇"
                : "🔊";

    }
);


/* ======================================================
   SHUFFLE
====================================================== */

shuffleBtn.addEventListener(
    "click",
    () => {

        shuffle =
            !shuffle;

        shuffleBtn.style.background =
            shuffle
                ? "rgba(155,92,255,.4)"
                : "";

    }
);


/* ======================================================
   REPEAT
====================================================== */

repeatBtn.addEventListener(
    "click",
    () => {

        repeat =
            !repeat;

        repeatBtn.style.background =
            repeat
                ? "rgba(155,92,255,.4)"
                : "";

    }
);


/* ======================================================
   SEARCH
====================================================== */

function searchSongs(value) {

    const query =
        value
            .trim()
            .toLowerCase();

    if (!query) {

        showAllSongs();

        return;
    }

    filteredSongs =
        songs.filter(
            song =>
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
                    .includes(query)
        );

    songHeading.textContent =
        "Search Results";

    renderSongs();

}


/* ======================================================
   SEARCH INPUT
====================================================== */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        () => {

            searchSongs(
                searchInput.value
            );

        }
    );

}


/* ======================================================
   SEARCH BUTTON
====================================================== */

const searchBtn =
    document.getElementById(
        "searchBtn"
    );

const searchPanel =
    document.getElementById(
        "searchPanel"
    );

if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        () => {

            searchPanel.classList.toggle(
                "open"
            );

            if (
                searchPanel.classList.contains(
                    "open"
                )
            ) {

                setTimeout(
                    () => {
                        searchInput.focus();
                    },
                    100
                );

            }

        }
    );

}


/* ======================================================
   CLEAR SEARCH
====================================================== */

const clearSearch =
    document.getElementById(
        "clearSearch"
    );

if (clearSearch) {

    clearSearch.addEventListener(
        "click",
        () => {

            searchInput.value = "";

            showAllSongs();

        }
    );

}


/* ======================================================
   MOBILE MENU
====================================================== */

const menuBtn =
    document.getElementById(
        "menuBtn"
    );

const sideNav =
    document.getElementById(
        "sideNav"
    );

if (menuBtn) {

    menuBtn.addEventListener(
        "click",
        () => {

            sideNav.classList.toggle(
                "open"
            );

        }
    );

}


/* ======================================================
   START LISTENING
====================================================== */

const startListening =
    document.getElementById(
        "startListening"
    );

if (startListening) {

    startListening.addEventListener(
        "click",
        () => {

            if (!songs.length) {
                return;
            }

            currentIndex = 0;

            playSong(
                songs[0]
            );

        }
    );

}


/* ======================================================
   REFRESH
====================================================== */

const refreshBtn =
    document.getElementById(
        "refreshBtn"
    );

if (refreshBtn) {

    refreshBtn.addEventListener(
        "click",
        () => {

            loadSongs();

        }
    );

}


/* ======================================================
   VIEW MODE
====================================================== */

const viewBtn =
    document.getElementById(
        "viewBtn"
    );

if (viewBtn) {

    viewBtn.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "compact-view"
            );

        }
    );

}


/* ======================================================
   KEYBOARD SHORTCUTS
====================================================== */

document.addEventListener(
    "keydown",
    event => {

        /*
         * Do not trigger shortcuts while
         * typing in an input.
         */

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

            playBtn.click();

        }

        if (
            event.code ===
            "ArrowRight"
        ) {

            nextBtn.click();

        }

        if (
            event.code ===
            "ArrowLeft"
        ) {

            prevBtn.click();

        }

    }
);


/* ======================================================
   FORMAT TIME
====================================================== */

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

    const secs =
        Math.floor(
            seconds % 60
        );

    return (
        minutes +
        ":" +
        String(secs).padStart(2, "0")
    );

}


/* ======================================================
   ESCAPE HTML
====================================================== */

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ======================================================
   INITIALIZE
====================================================== */

audio.volume = 0.8;

loadSongs();