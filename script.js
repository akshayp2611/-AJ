/* =========================================================
   स्वरAJ MUSIC PLAYER
   Frontend logic
   Existing backend logic is preserved.
   ========================================================= */

"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const API_BASE = "";

const SONG_API = `${API_BASE}/api/songs`;

const HEALTH_API = `${API_BASE}/api/health`;


/* =========================================================
   STATE
   ========================================================= */

let songs = [];

let filteredSongs = [];

let currentIndex = -1;

let isPlaying = false;

let shuffleMode = false;

let repeatMode = false;

let currentPage = "home";

let likedSongs =
    JSON.parse(
        localStorage.getItem("swaraj-liked") || "[]"
    );


/* =========================================================
   ELEMENTS
   ========================================================= */

const audio =
    document.getElementById("audioPlayer");

const songGrid =
    document.getElementById("songGrid");

const categoryGrid =
    document.getElementById("categoryGrid");

const allCategoryGrid =
    document.getElementById("allCategoryGrid");

const searchResults =
    document.getElementById("searchResults");

const libraryResults =
    document.getElementById("libraryResults");

const queueList =
    document.getElementById("queueList");

const searchInput =
    document.getElementById("searchInput");

const clearSearch =
    document.getElementById("clearSearch");

const songCount =
    document.getElementById("songCount");

const playerTitle =
    document.getElementById("playerTitle");

const playerArtist =
    document.getElementById("playerArtist");

const playerCover =
    document.getElementById("playerCover");

const playButton =
    document.getElementById("playButton");

const previousButton =
    document.getElementById("previousButton");

const nextButton =
    document.getElementById("nextButton");

const shuffleButton =
    document.getElementById("shuffleButton");

const repeatButton =
    document.getElementById("repeatButton");

const likeButton =
    document.getElementById("likeButton");

const progressBar =
    document.getElementById("progressBar");

const currentTime =
    document.getElementById("currentTime");

const duration =
    document.getElementById("duration");

const volumeBar =
    document.getElementById("volumeBar");

const serverStatus =
    document.getElementById("serverStatus");

const toast =
    document.getElementById("toast");

const toastText =
    document.getElementById("toastText");


/* =========================================================
   DEFAULT CATEGORIES
   ========================================================= */

const CATEGORY_META = {

    Love: {
        icon: "♡",
        color: "#ff4fae"
    },

    Bhakti: {
        icon: "ॐ",
        color: "#ff9d4d"
    },

    Energetic: {
        icon: "⚡",
        color: "#5de8ff"
    },

    Emotional: {
        icon: "◒",
        color: "#9d72ff"
    },

    Sad: {
        icon: "☾",
        color: "#638dff"
    },

    Romantic: {
        icon: "♥",
        color: "#ff6b8e"
    },

    Devotional: {
        icon: "ॐ",
        color: "#ffb04d"
    },

    Other: {
        icon: "♫",
        color: "#9b5cff"
    }

};


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


async function init() {

    setupNavigation();

    setupPlayerControls();

    setupSearch();

    setupInterfaceSwitcher();

    setupMobileMenu();

    setupHero();

    setupExtraButtons();

    audio.volume = 0.8;

    await checkServer();

    await loadSongs();

    renderCategories();

    renderSongs(songs);

    renderLibrary();

}


/* =========================================================
   SERVER HEALTH
   ========================================================= */

async function checkServer() {

    try {

        const response =
            await fetch(
                HEALTH_API,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error("Health request failed");
        }

        const data =
            await response.json();

        if (
            data &&
            (
                data.status === "ok" ||
                data.success === true
            )
        ) {

            serverStatus.textContent =
                "Online";

        } else {

            serverStatus.textContent =
                "Connected";

        }

    } catch (error) {

        console.warn(
            "Health check failed:",
            error
        );

        /*
         * Do not block the music application
         * if /api/health is unavailable.
         */

        serverStatus.textContent =
            "Music API";
    }
}


/* =========================================================
   LOAD SONGS
   ========================================================= */

async function loadSongs() {

    showLoading();

    try {

        const response =
            await fetch(
                SONG_API,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `Songs API HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        /*
         * Supports:
         *
         * { songs: [...] }
         *
         * OR
         *
         * [...]
         */

        let rawSongs = [];

        if (Array.isArray(data)) {

            rawSongs = data;

        } else if (
            data &&
            Array.isArray(data.songs)
        ) {

            rawSongs = data.songs;

        }

        songs =
            rawSongs
                .map(normalizeSong)
                .filter(song => song.url);

        filteredSongs =
            [...songs];

        updateSongCount();

        if (songs.length === 0) {

            renderEmpty(
                "No songs found in your music library."
            );

            showToast(
                "No songs found"
            );

        }

    } catch (error) {

        console.error(
            "Song API error:",
            error
        );

        songs = [];

        filteredSongs = [];

        updateSongCount();

        renderEmpty(
            "Song API could not be loaded. Please check the server."
        );

        showToast(
            "Song API could not be loaded"
        );
    }
}


/* =========================================================
   NORMALIZE SONG
   ========================================================= */

function normalizeSong(song, index) {

    if (!song || typeof song !== "object") {

        return {
            id: `song-${index + 1}`,
            title: "Unknown Song",
            artist: "स्वरAJ",
            album: "Music",
            category: "Other",
            cover: "",
            url: ""
        };

    }

    let url =
        song.url ||
        song.src ||
        song.path ||
        song.file ||
        "";

    /*
     * Convert file path to URL if required.
     */

    if (
        url &&
        !url.startsWith("/") &&
        !url.startsWith("http://") &&
        !url.startsWith("https://")
    ) {

        url =
            "/" +
            url
                .split("\\")
                .map(encodeURIComponent)
                .join("/");

    }

    /*
     * If backend returns:
     *
     * Bhakti/song.mp3
     *
     * convert it into:
     *
     * /songs/Bhakti/song.mp3
     */

    if (
        url &&
        !url.startsWith("/") &&
        !url.startsWith("http")
    ) {

        url =
            "/songs/" +
            url
                .split("/")
                .map(encodeURIComponent)
                .join("/");
    }

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
            "स्वरAJ Music",

        category:
            song.category ||
            song.genre ||
            "Other",

        cover:
            song.cover ||
            song.image ||
            song.artwork ||
            "",

        url: normalizeUrl(url),

        file:
            song.file ||
            ""

    };
}


/* =========================================================
   URL NORMALIZER
   ========================================================= */

function normalizeUrl(url) {

    if (!url) {
        return "";
    }

    if (
        url.startsWith("http://") ||
        url.startsWith("https://")
    ) {

        return url;
    }

    if (!url.startsWith("/")) {

        url = "/" + url;
    }

    /*
     * Preserve already encoded URLs.
     */

    return url
        .split("/")
        .map(
            (part, index) =>
                index === 0
                    ? part
                    : encodePathPart(part)
        )
        .join("/");
}


function encodePathPart(part) {

    try {

        return decodeURIComponent(part)
            .split("/")
            .map(encodeURIComponent)
            .join("/");

    } catch {

        return encodeURIComponent(part);
    }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {

    document
        .querySelectorAll(
            "[data-page]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    navigateTo(
                        button.dataset.page
                    );

                }
            );

        });

    document
        .getElementById("likedNav")
        ?.addEventListener(
            "click",
            () => {

                navigateTo("library");

                renderLibrary();

            }
        );

    document
        .getElementById("queueNav")
        ?.addEventListener(
            "click",
            () => {

                navigateTo("queue");

                renderQueue();

            }
        );
}


function navigateTo(page) {

    currentPage = page;

    document
        .querySelectorAll(".page")
        .forEach(section => {

            section.classList.remove(
                "active"
            );

        });

    const pageElement =
        document.getElementById(
            `${page}Page`
        );

    if (pageElement) {

        pageElement.classList.add(
            "active"
        );

    }

    document
        .querySelectorAll(
            ".nav-item, .mobile-nav-item"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === page
            );

        });

    if (page === "library") {

        renderLibrary();

    }

    if (page === "queue") {

        renderQueue();

    }

    if (page === "categories") {

        renderCategories();

    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    searchInput
        ?.addEventListener(
            "input",
            handleSearch
        );

    clearSearch
        ?.addEventListener(
            "click",
            () => {

                searchInput.value = "";

                clearSearch.classList.add(
                    "hidden"
                );

                filteredSongs =
                    [...songs];

                if (
                    currentPage === "search"
                ) {

                    renderSearchResults(
                        songs
                    );
                }

            }
        );

}


function handleSearch() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();

    clearSearch.classList.toggle(
        "hidden",
        !query
    );

    const results =
        songs.filter(song => {

            return (

                song.title
                    .toLowerCase()
                    .includes(query)

                ||

                song.artist
                    .toLowerCase()
                    .includes(query)

                ||

                song.album
                    .toLowerCase()
                    .includes(query)

                ||

                song.category
                    .toLowerCase()
                    .includes(query)

            );

        });

    filteredSongs = results;

    navigateTo("search");

    renderSearchResults(
        results
    );
}


/* =========================================================
   RENDER SONGS
   ========================================================= */

function renderSongs(list) {

    if (!songGrid) return;

    if (!list.length) {

        renderEmpty(
            "No songs available.",
            songGrid
        );

        return;
    }

    songGrid.innerHTML =
        list
            .map(
                (song, index) =>
                    createSongCard(
                        song,
                        index
                    )
            )
            .join("");

    attachSongEvents(
        songGrid
    );
}


function renderSearchResults(list) {

    if (!searchResults) return;

    if (!list.length) {

        renderEmpty(
            "No songs matched your search.",
            searchResults
        );

        return;
    }

    searchResults.innerHTML =
        list
            .map(
                (song, index) =>
                    createSongCard(
                        song,
                        index
                    )
            )
            .join("");

    attachSongEvents(
        searchResults
    );
}


/* =========================================================
   SONG CARD
   ========================================================= */

function createSongCard(song) {

    const safeTitle =
        escapeHtml(song.title);

    const safeArtist =
        escapeHtml(song.artist);

    const safeCategory =
        escapeHtml(song.category);

    const cover =
        song.cover
            ? `
                <img
                    src="${escapeAttribute(song.cover)}"
                    alt="${safeTitle}"
                    loading="lazy"
                    onerror="this.style.display='none'"
                >
              `
            : `
                <span class="cover-note">
                    ♪
                </span>
              `;

    return `
        <article
            class="song-card"
            data-song-id="${escapeAttribute(song.id)}"
        >

            <div class="song-cover">

                ${cover}

                <button
                    class="song-play"
                    data-play-song="${escapeAttribute(song.id)}"
                    title="Play ${safeTitle}"
                >
                    ▶
                </button>

            </div>

            <h3>
                ${safeTitle}
            </h3>

            <p>
                ${safeArtist} • ${safeCategory}
            </p>

        </article>
    `;
}


/* =========================================================
   SONG EVENTS
   ========================================================= */

function attachSongEvents(container) {

    container
        .querySelectorAll(
            "[data-play-song]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    const id =
                        button.dataset.playSong;

                    playSongById(id);

                }
            );

        });

    container
        .querySelectorAll(
            ".song-card"
        )
        .forEach(card => {

            card.addEventListener(
                "dblclick",
                () => {

                    playSongById(
                        card.dataset.songId
                    );

                }
            );

        });
}


/* =========================================================
   PLAY SONG
   ========================================================= */

function playSongById(id) {

    const index =
        songs.findIndex(
            song =>
                String(song.id) ===
                String(id)
        );

    if (index === -1) {

        showToast(
            "Song not found"
        );

        return;
    }

    currentIndex = index;

    const song =
        songs[currentIndex];

    if (!song.url) {

        showToast(
            "Song URL is missing"
        );

        return;
    }

    /*
     * IMPORTANT:
     *
     * Backend already returns:
     *
     * /songs/Bhakti/file.mp3
     *
     * We use it directly.
     */

    audio.src = song.url;

    audio.load();

    updatePlayer(song);

    audio.play()
        .then(() => {

            isPlaying = true;

            updatePlayButton();

        })
        .catch(error => {

            console.error(
                "Playback failed:",
                error
            );

            isPlaying = false;

            updatePlayButton();

            showToast(
                "Tap Play to start the song"
            );

        });

}


/* =========================================================
   PLAYER
   ========================================================= */

function updatePlayer(song) {

    playerTitle.textContent =
        song.title;

    playerArtist.textContent =
        song.artist ||
        "स्वरAJ";

    if (song.cover) {

        playerCover.innerHTML =
            `
                <img
                    src="${escapeAttribute(song.cover)}"
                    alt=""
                    onerror="
                        this.style.display='none'
                    "
                >
            `;

    } else {

        playerCover.innerHTML =
            `<span>♪</span>`;
    }

    updateLikeButton();

}


function updatePlayButton() {

    playButton.textContent =
        isPlaying
            ? "Ⅱ"
            : "▶";

    playButton.title =
        isPlaying
            ? "Pause"
            : "Play";
}


/* =========================================================
   PLAYER CONTROLS
   ========================================================= */

function setupPlayerControls() {

    playButton.addEventListener(
        "click",
        togglePlay
    );

    previousButton.addEventListener(
        "click",
        playPrevious
    );

    nextButton.addEventListener(
        "click",
        playNext
    );

    shuffleButton.addEventListener(
        "click",
        () => {

            shuffleMode =
                !shuffleMode;

            shuffleButton.classList.toggle(
                "active",
                shuffleMode
            );

            showToast(
                shuffleMode
                    ? "Shuffle enabled"
                    : "Shuffle disabled"
            );
        }
    );

    repeatButton.addEventListener(
        "click",
        () => {

            repeatMode =
                !repeatMode;

            repeatButton.classList.toggle(
                "active",
                repeatMode
            );

            showToast(
                repeatMode
                    ? "Repeat enabled"
                    : "Repeat disabled"
            );
        }
    );


    audio.addEventListener(
        "play",
        () => {

            isPlaying = true;

            updatePlayButton();

        }
    );


    audio.addEventListener(
        "pause",
        () => {

            isPlaying = false;

            updatePlayButton();

        }
    );


    audio.addEventListener(
        "timeupdate",
        updateProgress
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
        "ended",
        handleSongEnded
    );


    progressBar.addEventListener(
        "input",
        () => {

            if (
                !Number.isFinite(
                    audio.duration
                )
            ) return;

            audio.currentTime =
                (
                    Number(progressBar.value) /
                    100
                ) *
                audio.duration;

        }
    );


    volumeBar.addEventListener(
        "input",
        () => {

            audio.volume =
                Number(
                    volumeBar.value
                );

        }
    );

}


function togglePlay() {

    if (currentIndex === -1) {

        if (songs.length) {

            playSongById(
                songs[0].id
            );

        } else {

            showToast(
                "No songs available"
            );

        }

        return;
    }

    if (audio.paused) {

        audio.play()
            .catch(error => {

                console.error(error);

                showToast(
                    "Unable to play this song"
                );

            });

    } else {

        audio.pause();

    }

}


/* =========================================================
   NEXT
   ========================================================= */

function playNext() {

    if (!songs.length) {

        showToast(
            "No songs available"
        );

        return;
    }

    let nextIndex;

    if (shuffleMode) {

        nextIndex =
            Math.floor(
                Math.random() *
                songs.length
            );

        if (
            songs.length > 1 &&
            nextIndex === currentIndex
        ) {

            nextIndex =
                (nextIndex + 1) %
                songs.length;

        }

    } else {

        nextIndex =
            currentIndex < 0
                ? 0
                : (
                    currentIndex + 1
                ) %
                songs.length;

    }

    currentIndex =
        nextIndex;

    playSongById(
        songs[currentIndex].id
    );
}


/* =========================================================
   PREVIOUS
   ========================================================= */

function playPrevious() {

    if (!songs.length) {

        showToast(
            "No songs available"
        );

        return;
    }

    /*
     * If more than 3 seconds played,
     * restart current song.
     */

    if (
        audio.currentTime > 3
    ) {

        audio.currentTime = 0;

        return;
    }

    let previousIndex =
        currentIndex - 1;

    if (
        previousIndex < 0
    ) {

        previousIndex =
            songs.length - 1;

    }

    currentIndex =
        previousIndex;

    playSongById(
        songs[currentIndex].id
    );
}


/* =========================================================
   ENDED
   ========================================================= */

function handleSongEnded() {

    if (repeatMode) {

        audio.currentTime = 0;

        audio.play();

        return;
    }

    playNext();
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress() {

    if (
        !Number.isFinite(
            audio.duration
        )
    ) {

        progressBar.value = 0;

        return;
    }

    const percentage =
        (
            audio.currentTime /
            audio.duration
        ) *
        100;

    progressBar.value =
        percentage || 0;

    currentTime.textContent =
        formatTime(
            audio.currentTime
        );
}


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
        String(secs).padStart(
            2,
            "0"
        )
    );
}


/* =========================================================
   CATEGORIES
   ========================================================= */

function getCategories() {

    const map =
        new Map();

    songs.forEach(song => {

        const category =
            song.category ||
            "Other";

        if (!map.has(category)) {

            map.set(
                category,
                0
            );

        }

        map.set(
            category,
            map.get(category) + 1
        );

    });

    return Array.from(
        map.entries()
    );
}


function getCategoryMeta(category) {

    return (
        CATEGORY_META[category] ||
        CATEGORY_META.Other
    );
}


function renderCategories() {

    const categories =
        getCategories();

    const html =
        categories.length
            ? categories
                .map(
                    ([category, count]) =>
                        createCategoryCard(
                            category,
                            count
                        )
                )
                .join("")
            : `
                <div class="loading-card">
                    Categories will appear when songs are available.
                </div>
              `;

    categoryGrid.innerHTML =
        html;

    allCategoryGrid.innerHTML =
        html;

    attachCategoryEvents(
        categoryGrid
    );

    attachCategoryEvents(
        allCategoryGrid
    );
}


function createCategoryCard(
    category,
    count
) {

    const meta =
        getCategoryMeta(
            category
        );

    return `
        <article
            class="category-card"
            style="--category-color:${meta.color}"
            data-category="${escapeAttribute(category)}"
        >

            <div class="category-icon">
                ${meta.icon}
            </div>

            <strong>
                ${escapeHtml(category)}
            </strong>

            <span>
                ${count}
                ${count === 1 ? "song" : "songs"}
            </span>

        </article>
    `;
}


function attachCategoryEvents(
    container
) {

    container
        .querySelectorAll(
            "[data-category]"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const category =
                        card.dataset.category;

                    const results =
                        songs.filter(
                            song =>
                                song.category
                                    .toLowerCase() ===
                                category.toLowerCase()
                        );

                    filteredSongs =
                        results;

                    navigateTo(
                        "search"
                    );

                    renderSearchResults(
                        results
                    );

                    searchInput.value =
                        category;

                    clearSearch.classList.remove(
                        "hidden"
                    );

                }
            );

        });
}


/* =========================================================
   LIBRARY / LIKES
   ========================================================= */

function isLiked(id) {

    return likedSongs.includes(
        String(id)
    );
}


function toggleLike() {

    if (currentIndex === -1) {

        showToast(
            "Play a song first"
        );

        return;
    }

    const id =
        String(
            songs[currentIndex].id
        );

    if (isLiked(id)) {

        likedSongs =
            likedSongs.filter(
                item => item !== id
            );

        showToast(
            "Removed from liked songs"
        );

    } else {

        likedSongs.push(id);

        showToast(
            "Added to liked songs"
        );

    }

    localStorage.setItem(
        "swaraj-liked",
        JSON.stringify(
            likedSongs
        )
    );

    updateLikeButton();

    renderLibrary();
}


function updateLikeButton() {

    if (
        currentIndex === -1
    ) {

        likeButton.textContent =
            "♡";

        likeButton.classList.remove(
            "liked"
        );

        return;
    }

    const liked =
        isLiked(
            songs[currentIndex].id
        );

    likeButton.textContent =
        liked
            ? "♥"
            : "♡";

    likeButton.classList.toggle(
        "liked",
        liked
    );
}


function renderLibrary() {

    const liked =
        songs.filter(
            song =>
                isLiked(song.id)
        );

    if (!liked.length) {

        renderEmpty(
            "No liked songs yet.",
            libraryResults
        );

        return;
    }

    libraryResults.innerHTML =
        liked
            .map(
                song =>
                    createSongCard(song)
            )
            .join("");

    attachSongEvents(
        libraryResults
    );
}


/* =========================================================
   QUEUE
   ========================================================= */

function renderQueue() {

    if (
        !queueList
    ) return;

    if (
        !songs.length
    ) {

        renderEmpty(
            "Queue is empty.",
            queueList
        );

        return;
    }

    const queue =
        songs.slice(
            currentIndex >= 0
                ? currentIndex + 1
                : 0
        );

    if (!queue.length) {

        renderEmpty(
            "No more songs in queue.",
            queueList
        );

        return;
    }

    queueList.innerHTML =
        queue
            .map(
                song =>
                    `
                    <div
                        class="queue-item"
                        data-song-id="${escapeAttribute(song.id)}"
                    >

                        <div class="queue-cover">

                            ${
                                song.cover
                                    ? `
                                        <img
                                            src="${escapeAttribute(song.cover)}"
                                            alt=""
                                            style="
                                                width:100%;
                                                height:100%;
                                                object-fit:cover;
                                            "
                                        >
                                      `
                                    : "♪"
                            }

                        </div>

                        <div class="queue-info">

                            <strong>
                                ${escapeHtml(song.title)}
                            </strong>

                            <span>
                                ${escapeHtml(song.artist)}
                            </span>

                        </div>

                        <span>
                            ▶
                        </span>

                    </div>
                    `
            )
            .join("");

    queueList
        .querySelectorAll(
            "[data-song-id]"
        )
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    playSongById(
                        item.dataset.songId
                    );

                }
            );

        });
}


/* =========================================================
   HERO
   ========================================================= */

function setupHero() {

    document
        .getElementById("heroPlay")
        ?.addEventListener(
            "click",
            () => {

                if (!songs.length) {

                    showToast(
                        "No songs available"
                    );

                    return;
                }

                if (
                    currentIndex === -1
                ) {

                    playSongById(
                        songs[0].id
                    );

                } else {

                    togglePlay();

                }

            }
        );

    document
        .getElementById("heroExplore")
        ?.addEventListener(
            "click",
            () => {

                navigateTo(
                    "categories"
                );

            }
        );

    document
        .getElementById(
            "seeAllCategories"
        )
        ?.addEventListener(
            "click",
            () => {

                navigateTo(
                    "categories"
                );

            }
        );

}


/* =========================================================
   EXTRA BUTTONS
   ========================================================= */

function setupExtraButtons() {

    likeButton.addEventListener(
        "click",
        toggleLike
    );

    document
        .getElementById(
            "queueButton"
        )
        ?.addEventListener(
            "click",
            () => {

                navigateTo(
                    "queue"
                );

                renderQueue();

            }
        );

    document
        .getElementById(
            "themeButton"
        )
        ?.addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "soft-mode"
                );

                showToast(
                    "Visual mode updated"
                );

            }
        );

}


/* =========================================================
   INTERFACE SWITCHER
   ========================================================= */

function setupInterfaceSwitcher() {

    const mobile =
        document.getElementById(
            "mobileModeBtn"
        );

    const desktop =
        document.getElementById(
            "desktopModeBtn"
        );

    mobile?.addEventListener(
        "click",
        () => {

            document.body.classList.add(
                "mobile-interface"
            );

            mobile.classList.add(
                "active"
            );

            desktop.classList.remove(
                "active"
            );

            localStorage.setItem(
                "swaraj-interface",
                "mobile"
            );

        }
    );

    desktop?.addEventListener(
        "click",
        () => {

            document.body.classList.remove(
                "mobile-interface"
            );

            desktop.classList.add(
                "active"
            );

            mobile.classList.remove(
                "active"
            );

            localStorage.setItem(
                "swaraj-interface",
                "desktop"
            );

        }
    );

    const saved =
        localStorage.getItem(
            "swaraj-interface"
        );

    if (saved === "mobile") {

        mobile?.click();

    }

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

function setupMobileMenu() {

    const menu =
        document.getElementById(
            "mobileMenu"
        );

    const sidebar =
        document.querySelector(
            ".sidebar"
        );

    menu?.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   HELPERS
   ========================================================= */

function updateSongCount() {

    songCount.textContent =
        `${songs.length} ${
            songs.length === 1
                ? "song"
                : "songs"
        }`;
}


function showLoading() {

    songGrid.innerHTML =
        `
            <div class="empty-state">
                Loading your music...
            </div>
        `;

}


function renderEmpty(
    message,
    container = songGrid
) {

    if (!container) return;

    container.innerHTML =
        `
            <div class="empty-state">
                ${escapeHtml(message)}
            </div>
        `;
}


function showToast(message) {

    if (!toast) return;

    toastText.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        showToast.timer
    );

    showToast.timer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );
}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
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


function escapeAttribute(value) {

    return escapeHtml(
        value
    );
}


/* =========================================================
   GLOBAL DEBUG
   ========================================================= */

window.swarAJ = {

    getSongs() {
        return songs;
    },

    getCurrentSong() {

        return currentIndex >= 0
            ? songs[currentIndex]
            : null;

    },

    play(id) {

        playSongById(id);

    },

    next() {

        playNext();

    },

    previous() {

        playPrevious();

    },

    reload() {

        loadSongs()
            .then(() => {

                renderCategories();

                renderSongs(
                    songs
                );

            });

    }

};