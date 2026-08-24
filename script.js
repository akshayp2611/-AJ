/* =========================================================
   स्वरAJ MUSIC ENGINE
   Local API + YouTube + Firebase-ready
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const CONFIG = {

    /*
     * Your existing backend endpoint.
     *
     * IMPORTANT:
     * Do not change this if server.js exposes /api/songs.
     */
    SONGS_API: "/api/songs",

    /*
     * YouTube search:
     *
     * A browser cannot safely use a private YouTube API key
     * unless you understand the exposure implications.
     *
     * Therefore this frontend supports:
     *
     * 1. Your own /api/youtube/search endpoint
     * 2. A configurable YouTube API key
     *
     * If neither exists, the interface still works for
     * YouTube URL/video-ID playback.
     */
    YOUTUBE_API_ENDPOINT: "/api/youtube/search",

    YOUTUBE_API_KEY: "",


    /*
     * Firebase-ready configuration.
     *
     * Replace these values with the Web App config from
     * Firebase Console when you are ready.
     *
     * Never put Firebase Admin private/service-account keys here.
     */
    FIREBASE: {

        apiKey: "",

        authDomain: "",

        projectId: "",

        storageBucket: "",

        messagingSenderId: "",

        appId: ""

    }

};


/* =========================================================
   STATE
========================================================= */

const state = {

    songs: [],

    filteredSongs: [],

    categories: [],

    activeCategory: "All",

    currentIndex: -1,

    isPlaying: false,

    isShuffle: false,

    isRepeat: false,

    likedSongs:
        JSON.parse(
            localStorage.getItem("swaraj-liked-songs") || "[]"
        ),

    currentPage: "home",

    youtubeResults: [],

    youtubeCurrentId: null,

    youtubePlayer: null,

    youtubeReady: false

};


/* =========================================================
   DOM
========================================================= */

const $ = (selector) =>
    document.querySelector(selector);


const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


const audio =
    $("#audioPlayer");


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupNavigation();

        setupMenu();

        setupSearch();

        setupPlayer();

        setupHero();

        setupKeyboardShortcuts();

        setupFirebase();

        await loadSongs();

        loadYouTubeApi();

    }
);


/* =========================================================
   MENU
========================================================= */

function setupMenu() {

    const menuButton =
        $("#menuButton");

    const desktopMenuButton =
        $("#desktopMenuButton");

    const closeButton =
        $("#closeMenuButton");

    const overlay =
        $("#menuOverlay");


    if (menuButton) {

        menuButton.addEventListener(
            "click",
            openMenu
        );

    }


    if (desktopMenuButton) {

        desktopMenuButton.addEventListener(
            "click",
            () => {

                const sidebar =
                    $("#sidebar");

                sidebar.classList.toggle("open");

            }
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeMenu
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMenu
        );

    }

}


function openMenu() {

    const sidebar =
        $("#sidebar");

    const overlay =
        $("#menuOverlay");


    sidebar.classList.add("open");

    overlay.classList.add("show");

}


function closeMenu() {

    const sidebar =
        $("#sidebar");

    const overlay =
        $("#menuOverlay");


    sidebar.classList.remove("open");

    overlay.classList.remove("show");

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    $$(".nav-item").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    switchPage(page);

                    closeMenu();

                }
            );

        }
    );


    $$(".mobile-nav-item").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    switchPage(
                        button.dataset.page
                    );

                }
            );

        }
    );


    $("#viewAllCategories")
        ?.addEventListener(
            "click",
            () => switchPage("categories")
        );


    $("#heroExploreButton")
        ?.addEventListener(
            "click",
            () => switchPage("categories")
        );

}


function switchPage(page) {

    state.currentPage =
        page;


    $$(".page").forEach(
        item => {

            item.classList.remove(
                "active-page"
            );

        }
    );


    const target =
        $(`#page-${page}`);


    if (target) {

        target.classList.add(
            "active-page"
        );

    }


    $$(".nav-item").forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        }
    );


    $$(".mobile-nav-item").forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        }
    );


    if (page === "youtube") {

        setTimeout(
            () => $("#youtubeSearchInput")?.focus(),
            100
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   LOAD SONGS
========================================================= */

async function loadSongs() {

    try {

        showSongLoading();

        /*
         * cache-busting avoids stale API responses
         */
        const response =
            await fetch(
                `${CONFIG.SONGS_API}?t=${Date.now()}`,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `API HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        /*
         * Supports both:
         *
         * {
         *   success: true,
         *   songs: [...]
         * }
         *
         * and
         *
         * [...]
         */

        const songs =
            Array.isArray(data)
                ? data
                : Array.isArray(data.songs)
                    ? data.songs
                    : [];


        state.songs =
            songs.map(
                normalizeSong
            );


        /*
         * IMPORTANT:
         * Do not show "0 songs" if the API actually
         * returned songs.
         */

        buildCategories();

        renderCategories();

        applyFilter();


        updateLibraryStats();


    } catch (error) {

        console.error(
            "Song loading failed:",
            error
        );


        state.songs = [];

        buildCategories();

        renderCategories();

        renderSongs([]);


        showToast(
            "Unable to load music library"
        );

    }

}


/* =========================================================
   NORMALIZE SONG
========================================================= */

function normalizeSong(song, index) {

    return {

        id:
            song.id ||
            `song-${index + 1}`,

        title:
            song.title ||
            song.name ||
            `Song ${index + 1}`,

        artist:
            song.artist ||
            "स्वरAJ",

        album:
            song.album ||
            song.category ||
            "Music",

        category:
            song.category ||
            getCategoryFromFile(song.file) ||
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


function getCategoryFromFile(file) {

    if (!file) {
        return "Other";
    }


    const parts =
        file
            .split("/")
            .filter(Boolean);


    return parts.length > 1
        ? parts[0]
        : "Other";

}


/* =========================================================
   CATEGORIES
========================================================= */

function buildCategories() {

    const set =
        new Set();


    state.songs.forEach(
        song => {

            if (
                song.category &&
                song.category.trim()
            ) {

                set.add(
                    song.category.trim()
                );

            }

        }
    );


    state.categories =
        [...set].sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity: "base"
                    }
                )
        );

}


/* =========================================================
   CATEGORY RENDERING
========================================================= */

function renderCategories() {

    const categoryGrid =
        $("#categoryGrid");

    const allGrid =
        $("#allCategoriesGrid");

    const sidebar =
        $("#sidebarCategories");


    const categories =
        state.categories;


    if (
        categoryGrid
    ) {

        categoryGrid.innerHTML = "";

        if (!categories.length) {

            categoryGrid.innerHTML =
                `
                <div class="loading-card">
                    No categories found
                </div>
                `;

        } else {

            categories.forEach(
                category => {

                    categoryGrid.appendChild(
                        createCategoryCard(
                            category
                        )
                    );

                }
            );

        }

    }


    if (allGrid) {

        allGrid.innerHTML = "";


        if (!categories.length) {

            allGrid.innerHTML =
                `
                <div class="loading-card">
                    No categories available
                </div>
                `;

        } else {

            categories.forEach(
                category => {

                    allGrid.appendChild(
                        createCategoryCard(
                            category
                        )
                    );

                }
            );

        }

    }


    if (sidebar) {

        sidebar.innerHTML = "";


        const allButton =
            document.createElement("button");

        allButton.className =
            "category-side" +
            (
                state.activeCategory === "All"
                    ? " active"
                    : ""
            );

        allButton.dataset.category =
            "All";

        allButton.innerHTML =
            `
            <span>✦</span>
            All Songs
            `;


        allButton.addEventListener(
            "click",
            () => {

                selectCategory("All");

                closeMenu();

            }
        );


        sidebar.appendChild(
            allButton
        );


        categories.forEach(
            category => {

                const button =
                    document.createElement("button");


                button.className =
                    "category-side" +
                    (
                        state.activeCategory === category
                            ? " active"
                            : ""
                    );


                button.dataset.category =
                    category;


                button.innerHTML =
                    `
                    <span>◈</span>
                    ${escapeHtml(category)}
                    `;


                button.addEventListener(
                    "click",
                    () => {

                        selectCategory(
                            category
                        );

                        closeMenu();

                    }
                );


                sidebar.appendChild(
                    button
                );

            }
        );

    }

}


/* =========================================================
   CATEGORY CARD
========================================================= */

function createCategoryCard(
    category
) {

    const button =
        document.createElement("button");


    button.className =
        "category-card";


    button.type =
        "button";


    const count =
        state.songs.filter(
            song =>
                song.category === category
        ).length;


    button.innerHTML =
        `
        <div class="category-icon">
            ${getCategoryIcon(category)}
        </div>

        <strong>
            ${escapeHtml(category)}
        </strong>

        <span>
            ${count} ${count === 1 ? "song" : "songs"}
        </span>
        `;


    button.addEventListener(
        "click",
        () => {

            selectCategory(
                category
            );

            switchPage("home");

        }
    );


    return button;

}


function getCategoryIcon(category) {

    const name =
        category.toLowerCase();


    if (
        name.includes("love")
    ) return "♡";


    if (
        name.includes("bhakti") ||
        name.includes("devotional") ||
        name.includes("gan")
    ) return "ॐ";


    if (
        name.includes("energetic") ||
        name.includes("party")
    ) return "⚡";


    if (
        name.includes("emotional")
    ) return "◒";


    if (
        name.includes("lofi")
    ) return "☾";


    if (
        name.includes("ambient")
    ) return "◌";


    if (
        name.includes("cyber")
    ) return "◈";


    if (
        name.includes("synth")
    ) return "✦";


    return "♪";

}


/* =========================================================
   SELECT CATEGORY
========================================================= */

function selectCategory(category) {

    state.activeCategory =
        category;


    $$(".category-side").forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.category === category
            );

        }
    );


    applyFilter();

}


/* =========================================================
   FILTER SONGS
========================================================= */

function applyFilter() {

    const search =
        (
            $("#searchInput")?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    state.filteredSongs =
        state.songs.filter(
            song => {

                const matchesCategory =
                    state.activeCategory === "All" ||
                    song.category === state.activeCategory;


                const searchable =
                    [
                        song.title,
                        song.artist,
                        song.album,
                        song.category
                    ]
                    .join(" ")
                    .toLowerCase();


                const matchesSearch =
                    !search ||
                    searchable.includes(search);


                return (
                    matchesCategory &&
                    matchesSearch
                );

            }
        );


    renderSongs(
        state.filteredSongs
    );


    const heading =
        $("#songsHeading");


    if (heading) {

        heading.textContent =
            state.activeCategory === "All"
                ? "All Songs"
                : state.activeCategory;

    }


    updateSongCount();

}


/* =========================================================
   RENDER SONGS
========================================================= */

function renderSongs(songs) {

    const grid =
        $("#songGrid");


    const library =
        $("#librarySongs");


    if (!grid) {
        return;
    }


    grid.innerHTML = "";


    if (!songs.length) {

        grid.innerHTML =
            `
            <div class="empty-state">

                <div class="empty-icon">
                    ♪
                </div>

                <h3>
                    No songs found
                </h3>

                <p>
                    ${
                        state.songs.length
                            ? "Try another category or search."
                            : "Add MP3 files to your songs folder."
                    }
                </p>

            </div>
            `;

    } else {

        songs.forEach(
            song => {

                grid.appendChild(
                    createSongCard(
                        song
                    )
                );

            }
        );

    }


    if (library) {

        library.innerHTML = "";

        songs.forEach(
            song => {

                library.appendChild(
                    createSongCard(song)
                );

            }
        );

    }

}


/* =========================================================
   SONG CARD
========================================================= */

function createSongCard(song) {

    const card =
        document.createElement("article");


    card.className =
        "song-card";


    const liked =
        state.likedSongs.includes(
            song.id
        );


    card.innerHTML =
        `
        <div class="song-cover">

            ${
                song.cover
                    ? `
                    <img
                        src="${escapeAttribute(song.cover)}"
                        alt="${escapeAttribute(song.title)} cover"
                        loading="lazy"
                        onerror="this.style.display='none'"
                    >
                    `
                    : ""
            }

            <div class="cover-placeholder">
                ♪
            </div>


            <button
                class="song-play"
                type="button"
                aria-label="Play ${escapeAttribute(song.title)}"
            >
                ▶
            </button>


            <button
                class="song-like"
                type="button"
                aria-label="Like ${escapeAttribute(song.title)}"
            >
                ${liked ? "♥" : "♡"}
            </button>

        </div>


        <div class="song-info">

            <span class="song-title">
                ${escapeHtml(song.title)}
            </span>

            <span class="song-artist">
                ${escapeHtml(song.artist)}
            </span>

        </div>
        `;


    card.querySelector(".song-play")
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                playSong(
                    song
                );

            }
        );


    card.querySelector(".song-like")
        ?.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                toggleLike(
                    song
                );

                renderSongs(
                    state.filteredSongs
                );

            }
        );


    card.addEventListener(
        "dblclick",
        () => {

            playSong(song);

        }
    );


    return card;

}


/* =========================================================
   PLAY SONG
========================================================= */

function playSong(song) {

    const index =
        state.songs.findIndex(
            item =>
                item.id === song.id
        );


    if (index === -1) {

        showToast(
            "Song not found"
        );

        return;

    }


    state.currentIndex =
        index;


    if (!song.url) {

        showToast(
            "Song URL unavailable"
        );

        return;

    }


    /*
     * Convert spaces and special characters safely.
     */

    let url =
        song.url;


    if (
        url.startsWith("/songs/")
    ) {

        const parts =
            url
                .split("/")
                .map(
                    (part, index) =>
                        index < 2
                            ? part
                            : encodeURIComponent(
                                decodeURIComponent(part)
                            )
                );


        url =
            parts.join("/");

    }


    audio.src =
        url;


    audio.load();


    audio.play()
        .then(
            () => {

                state.isPlaying =
                    true;

                updatePlayerUI();

            }
        )
        .catch(
            error => {

                console.warn(
                    "Playback failed:",
                    error
                );

                state.isPlaying =
                    false;

                updatePlayerUI();

                showToast(
                    "Tap Play to start audio"
                );

            }
        );


    updatePlayerSong(
        song
    );

}


/* =========================================================
   PLAYER SETUP
========================================================= */

function setupPlayer() {

    $("#playButton")
        ?.addEventListener(
            "click",
            togglePlay
        );


    $("#previousButton")
        ?.addEventListener(
            "click",
            previousSong
        );


    $("#nextButton")
        ?.addEventListener(
            "click",
            nextSong
        );


    $("#shuffleButton")
        ?.addEventListener(
            "click",
            () => {

                state.isShuffle =
                    !state.isShuffle;

                $("#shuffleButton")
                    ?.classList.toggle(
                        "active",
                        state.isShuffle
                    );

                showToast(
                    state.isShuffle
                        ? "Shuffle on"
                        : "Shuffle off"
                );

            }
        );


    $("#repeatButton")
        ?.addEventListener(
            "click",
            () => {

                state.isRepeat =
                    !state.isRepeat;

                $("#repeatButton")
                    ?.classList.toggle(
                        "active",
                        state.isRepeat
                    );

                showToast(
                    state.isRepeat
                        ? "Repeat on"
                        : "Repeat off"
                );

            }
        );


    $("#progressBar")
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
                            Number(event.target.value)
                            / 100
                        ) *
                        audio.duration;

                }

            }
        );


    $("#volumeBar")
        ?.addEventListener(
            "input",
            event => {

                audio.volume =
                    Number(event.target.value);

            }
        );


    $("#muteButton")
        ?.addEventListener(
            "click",
            () => {

                audio.muted =
                    !audio.muted;

                $("#muteButton").textContent =
                    audio.muted
                        ? "×"
                        : "◖";

            }
        );


    $("#likeButton")
        ?.addEventListener(
            "click",
            () => {

                const song =
                    getCurrentSong();

                if (song) {

                    toggleLike(song);

                    updatePlayerUI();

                    renderSongs(
                        state.filteredSongs
                    );

                }

            }
        );


    audio.volume =
        0.8;


    audio.addEventListener(
        "play",
        () => {

            state.isPlaying =
                true;

            updatePlayerUI();

        }
    );


    audio.addEventListener(
        "pause",
        () => {

            state.isPlaying =
                false;

            updatePlayerUI();

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
        handleSongEnded
    );


    audio.addEventListener(
        "error",
        () => {

            console.error(
                "Audio error",
                audio.error
            );

            showToast(
                "Unable to play this audio file"
            );

        }
    );

}


/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    const song =
        getCurrentSong();


    if (!song) {

        if (state.songs.length) {

            playSong(
                state.songs[0]
            );

        } else {

            showToast(
                "No songs available"
            );

        }

        return;

    }


    if (
        audio.paused
    ) {

        audio.play()
            .catch(
                () => {}
            );

    } else {

        audio.pause();

    }

}


/* =========================================================
   PREVIOUS
========================================================= */

function previousSong() {

    if (!state.songs.length) {
        return;
    }


    let index =
        state.currentIndex;


    if (index <= 0) {

        index =
            state.songs.length - 1;

    } else {

        index--;

    }


    playSong(
        state.songs[index]
    );

}


/* =========================================================
   NEXT
========================================================= */

function nextSong() {

    if (!state.songs.length) {
        return;
    }


    let index;


    if (state.isShuffle) {

        index =
            Math.floor(
                Math.random() *
                state.songs.length
            );

    } else {

        index =
            state.currentIndex + 1;

        if (
            index >=
            state.songs.length
        ) {

            index = 0;

        }

    }


    playSong(
        state.songs[index]
    );

}


/* =========================================================
   SONG END
========================================================= */

function handleSongEnded() {

    if (
        state.isRepeat
    ) {

        audio.currentTime =
            0;

        audio.play();

        return;

    }


    nextSong();

}


/* =========================================================
   PLAYER UI
========================================================= */

function updatePlayerSong(song) {

    $("#playerTitle").textContent =
        song.title;


    $("#playerArtist").textContent =
        song.artist;


    const cover =
        $("#playerCover");


    if (cover) {

        if (song.cover) {

            cover.innerHTML =
                `
                <img
                    src="${escapeAttribute(song.cover)}"
                    alt=""
                >
                `;

        } else {

            cover.textContent =
                "♪";

        }

    }


    updatePlayerUI();

}


function updatePlayerUI() {

    const playButton =
        $("#playButton");


    if (playButton) {

        playButton.textContent =
            state.isPlaying
                ? "Ⅱ"
                : "▶";

        playButton.setAttribute(
            "aria-label",
            state.isPlaying
                ? "Pause"
                : "Play"
        );

    }


    const song =
        getCurrentSong();


    const likeButton =
        $("#likeButton");


    if (
        likeButton &&
        song
    ) {

        likeButton.textContent =
            state.likedSongs.includes(
                song.id
            )
                ? "♥"
                : "♡";

    }

}


function updateProgress() {

    const progress =
        $("#progressBar");


    const currentTime =
        $("#currentTime");


    const duration =
        $("#duration");


    if (!progress) {
        return;
    }


    const current =
        Number.isFinite(
            audio.currentTime
        )
            ? audio.currentTime
            : 0;


    const total =
        Number.isFinite(
            audio.duration
        )
            ? audio.duration
            : 0;


    progress.value =
        total
            ? (
                current /
                total *
                100
            )
            : 0;


    if (currentTime) {

        currentTime.textContent =
            formatTime(current);

    }


    if (duration) {

        duration.textContent =
            formatTime(total);

    }

}


/* =========================================================
   CURRENT SONG
========================================================= */

function getCurrentSong() {

    if (
        state.currentIndex < 0
    ) {

        return null;

    }


    return state.songs[
        state.currentIndex
    ] || null;

}


/* =========================================================
   LIKES
========================================================= */

function toggleLike(song) {

    const index =
        state.likedSongs.indexOf(
            song.id
        );


    if (index === -1) {

        state.likedSongs.push(
            song.id
        );

        showToast(
            "Added to your library"
        );

    } else {

        state.likedSongs.splice(
            index,
            1
        );

        showToast(
            "Removed from library"
        );

    }


    localStorage.setItem(
        "swaraj-liked-songs",
        JSON.stringify(
            state.likedSongs
        )
    );


    updateLibraryStats();

}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

    const input =
        $("#searchInput");


    input?.addEventListener(
        "input",
        () => {

            applyFilter();

            if (
                state.currentPage !== "home"
            ) {

                switchPage("home");

            }

        }
    );


    $("#mobileSearchButton")
        ?.addEventListener(
            "click",
            () => {

                openMenu();

                setTimeout(
                    () => {

                        $("#searchInput")
                            ?.focus();

                    },
                    150
                );

            }
        );

}


/* =========================================================
   HERO
========================================================= */

function setupHero() {

    $("#heroPlayButton")
        ?.addEventListener(
            "click",
            () => {

                if (
                    state.currentIndex === -1 &&
                    state.songs.length
                ) {

                    playSong(
                        state.songs[0]
                    );

                } else {

                    togglePlay();

                }

            }
        );

}


/* =========================================================
   KEYBOARD
========================================================= */

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.target.matches(
                    "input, textarea"
                )
            ) {

                return;

            }


            if (
                event.code === "Space"
            ) {

                event.preventDefault();

                togglePlay();

            }


            if (
                event.code === "ArrowRight"
            ) {

                nextSong();

            }


            if (
                event.code === "ArrowLeft"
            ) {

                previousSong();

            }

        }
    );

}


/* =========================================================
   YOUTUBE API
========================================================= */

function loadYouTubeApi() {

    /*
     * YouTube IFrame API is loaded only once.
     */

    if (
        window.YT &&
        window.YT.Player
    ) {

        state.youtubeReady =
            true;

        setupYouTubeSearch();

        return;

    }


    const existing =
        document.querySelector(
            'script[src="https://www.youtube.com/iframe_api"]'
        );


    if (!existing) {

        const script =
            document.createElement("script");


        script.src =
            "https://www.youtube.com/iframe_api";


        document.head.appendChild(
            script
        );

    }


    window.onYouTubeIframeAPIReady =
        () => {

            state.youtubeReady =
                true;

            setupYouTubeSearch();

        };

}


/* =========================================================
   YOUTUBE SEARCH
========================================================= */

function setupYouTubeSearch() {

    const input =
        $("#youtubeSearchInput");


    const button =
        $("#youtubeSearchButton");


    if (button) {

        button.addEventListener(
            "click",
            () => {

                searchYouTube(
                    input?.value || ""
                );

            }
        );

    }


    input?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                searchYouTube(
                    input.value
                );

            }

        }
    );

}


/* =========================================================
   SEARCH YOUTUBE
========================================================= */

async function searchYouTube(query) {

    query =
        query.trim();


    if (!query) {

        showToast(
            "Enter a song name"
        );

        return;

    }


    showYouTubeLoading();


    /*
     * FIRST:
     * Try your backend endpoint.
     *
     * Recommended because your API key stays on
     * the server.
     */

    try {

        const url =
            `${CONFIG.YOUTUBE_API_ENDPOINT}?q=${encodeURIComponent(query)}`;


        const response =
            await fetch(url);


        if (response.ok) {

            const data =
                await response.json();


            const results =
                normalizeYouTubeResults(
                    data
                );


            if (results.length) {

                state.youtubeResults =
                    results;

                renderYouTubeResults();

                return;

            }

        }

    } catch (error) {

        console.warn(
            "Backend YouTube search unavailable",
            error
        );

    }


    /*
     * SECOND:
     * Optional browser-side API key.
     *
     * Only runs when you explicitly provide one.
     */

    if (
        CONFIG.YOUTUBE_API_KEY
    ) {

        try {

            const endpoint =
                "https://www.googleapis.com/youtube/v3/search";


            const params =
                new URLSearchParams({

                    part: "snippet",

                    maxResults: "15",

                    type: "video",

                    q: query,

                    key:
                        CONFIG.YOUTUBE_API_KEY

                });


            const response =
                await fetch(
                    `${endpoint}?${params}`
                );


            const data =
                await response.json();


            if (
                !response.ok
            ) {

                throw new Error(
                    data.error?.message ||
                    "YouTube API error"
                );

            }


            state.youtubeResults =
                normalizeYouTubeResults(
                    data
                );


            renderYouTubeResults();


            return;

        } catch (error) {

            console.error(
                error
            );

        }

    }


    /*
     * THIRD:
     * If no API search is configured, allow direct
     * YouTube URL / video ID playback.
     */

    const videoId =
        extractYouTubeId(query);


    if (videoId) {

        playYouTubeVideo(
            videoId,
            query
        );

        return;

    }


    showYouTubeMessage(
        "YouTube search API is not configured yet. Add /api/youtube/search to your server or set a YouTube API key."
    );

}


/* =========================================================
   NORMALIZE YOUTUBE RESULTS
========================================================= */

function normalizeYouTubeResults(data) {

    if (
        Array.isArray(data)
    ) {

        return data.map(
            normalizeYouTubeItem
        );

    }


    if (
        Array.isArray(data.items)
    ) {

        return data.items
            .map(
                normalizeYouTubeItem
            )
            .filter(
                item => item.id
            );

    }


    return [];

}


function normalizeYouTubeItem(item) {

    const id =
        typeof item.id === "string"
            ? item.id
            : item.id?.videoId;


    return {

        id,

        title:
            item.title ||
            item.snippet?.title ||
            "YouTube Music",

        channel:
            item.channel ||
            item.snippet?.channelTitle ||
            "",

        thumbnail:
            item.thumbnail ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            ""

    };

}


/* =========================================================
   YOUTUBE RESULTS
========================================================= */

function renderYouTubeResults() {

    const container =
        $("#youtubeResults");


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (
        !state.youtubeResults.length
    ) {

        showYouTubeMessage(
            "No YouTube results found."
        );

        return;

    }


    state.youtubeResults.forEach(
        result => {

            const button =
                document.createElement("button");


            button.type =
                "button";


            button.className =
                "youtube-result";


            button.innerHTML =
                `
                ${
                    result.thumbnail
                        ? `
                        <img
                            class="youtube-thumb"
                            src="${escapeAttribute(result.thumbnail)}"
                            alt=""
                            loading="lazy"
                        >
                        `
                        : `
                        <div class="youtube-thumb">
                            ▶
                        </div>
                        `
                }

                <div>

                    <strong>
                        ${escapeHtml(result.title)}
                    </strong>

                    <span>
                        ${escapeHtml(result.channel)}
                    </span>

                </div>
                `;


            button.addEventListener(
                "click",
                () => {

                    playYouTubeVideo(
                        result.id,
                        result.title
                    );

                }
            );


            container.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   YOUTUBE PLAYER
========================================================= */

function playYouTubeVideo(
    videoId,
    title = "YouTube Music"
) {

    if (!videoId) {

        showToast(
            "Invalid YouTube video"
        );

        return;

    }


    state.youtubeCurrentId =
        videoId;


    $("#youtubeTitle").textContent =
        title;


    const container =
        $("#youtubePlayer");


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    /*
     * Use iframe embed.
     *
     * This is compatible with normal browser embedding
     * and does not download or bypass YouTube content.
     */

    const iframe =
        document.createElement("iframe");


    iframe.src =
        `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;


    iframe.title =
        title;


    iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";


    iframe.allowFullscreen =
        true;


    iframe.referrerPolicy =
        "strict-origin-when-cross-origin";


    container.appendChild(
        iframe
    );

}


/* =========================================================
   YOUTUBE MESSAGE
========================================================= */

function showYouTubeMessage(message) {

    const container =
        $("#youtubeResults");


    if (!container) {
        return;
    }


    container.innerHTML =
        `
        <div class="empty-state compact">

            <div class="empty-icon">
                ▶
            </div>

            <h3>
                YouTube Music
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
        `;

}


function showYouTubeLoading() {

    const container =
        $("#youtubeResults");


    if (!container) {
        return;
    }


    container.innerHTML =
        `
        <div class="empty-state compact">

            <div class="empty-icon">
                ◌
            </div>

            <h3>
                Searching...
            </h3>

            <p>
                Finding music on YouTube.
            </p>

        </div>
        `;

}


/* =========================================================
   EXTRACT YOUTUBE ID
========================================================= */

function extractYouTubeId(value) {

    const input =
        value.trim();


    /*
     * Direct 11-character video ID
     */

    if (
        /^[a-zA-Z0-9_-]{11}$/.test(
            input
        )
    ) {

        return input;

    }


    try {

        const url =
            new URL(input);


        if (
            url.hostname.includes(
                "youtu.be"
            )
        ) {

            return url.pathname
                .replace("/", "")
                .slice(0, 11);

        }


        if (
            url.hostname.includes(
                "youtube.com"
            )
        ) {

            const id =
                url.searchParams.get(
                    "v"
                );


            if (id) {

                return id.slice(
                    0,
                    11
                );

            }


            const parts =
                url.pathname
                    .split("/")
                    .filter(Boolean);


            const index =
                parts.indexOf("embed");


            if (
                index !== -1 &&
                parts[index + 1]
            ) {

                return parts[index + 1]
                    .slice(0, 11);

            }

        }

    } catch {

        return null;

    }


    return null;

}


/* =========================================================
   FIREBASE READY
========================================================= */

async function setupFirebase() {

    /*
     * Firebase configuration is intentionally empty by default.
     *
     * Once CONFIG.FIREBASE is filled, this module loads
     * Firebase from the official CDN.
     */

    const config =
        CONFIG.FIREBASE;


    if (
        !config ||
        !config.apiKey ||
        !config.projectId ||
        !config.appId
    ) {

        console.info(
            "Firebase is ready but not configured."
        );

        return;

    }


    try {

        const {
            initializeApp
        } =
            await import(
                "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js"
            );


        const {
            getAuth,
            onAuthStateChanged
        } =
            await import(
                "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js"
            );


        const app =
            initializeApp(
                config
            );


        const auth =
            getAuth(app);


        window.swarajFirebase = {

            app,

            auth

        };


        onAuthStateChanged(
            auth,
            user => {

                if (user) {

                    $("#userName").textContent =
                        user.displayName ||
                        user.email ||
                        "User";

                } else {

                    $("#userName").textContent =
                        "Guest";

                }

            }
        );


        console.info(
            "Firebase initialized"
        );


    } catch (error) {

        console.error(
            "Firebase initialization failed:",
            error
        );

    }

}


/* =========================================================
   LIBRARY STATS
========================================================= */

function updateLibraryStats() {

    $("#librarySongCount").textContent =
        state.songs.length;


    $("#libraryCategoryCount").textContent =
        state.categories.length;


    $("#libraryLikedCount").textContent =
        state.likedSongs.length;


    updateSongCount();

}


function updateSongCount() {

    const count =
        state.filteredSongs.length;


    const element =
        $("#songCount");


    if (element) {

        element.textContent =
            `${count} ${
                count === 1
                    ? "song"
                    : "songs"
            }`;

    }

}


/* =========================================================
   LOADING UI
========================================================= */

function showSongLoading() {

    const grid =
        $("#songGrid");


    if (grid) {

        grid.innerHTML =
            `
            <div class="empty-state">

                <div class="empty-icon">
                    ◌
                </div>

                <h3>
                    Loading music
                </h3>

                <p>
                    Scanning your स्वरAJ library...
                </p>

            </div>
            `;

    }

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer;


function showToast(message) {

    const toast =
        $("#toast");


    if (!toast) {
        return;
    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );

}


/* =========================================================
   HELPERS
========================================================= */

function formatTime(seconds) {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
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


    return `${minutes}:${String(secs).padStart(2, "0")}`;

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHtml(value);

}