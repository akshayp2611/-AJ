"use strict";

/*
    स्वरAJ Music Frontend

    Existing logic preserved:
    - /api/songs
    - /api/categories
    - local MP3 playback
    - category filtering

    Added:
    - mobile menu
    - YouTube search
    - YouTube embedded player
    - JioHotstar tab
    - Firebase-ready configuration
    - responsive desktop/mobile mode
    - favorites in localStorage
    - shuffle/repeat
*/

const state = {
    songs: [],
    filteredSongs: [],
    categories: [],

    activeCategory: "All Songs",
    activeView: "home",

    currentIndex: -1,

    isPlaying: false,
    isShuffle: false,
    isRepeat: false,

    likedSongs:
        JSON.parse(
            localStorage.getItem("swaraAJLikedSongs") || "[]"
        ),

    firebaseReady: false,

    youtubeResults: [],
    currentYouTube: null
};

// =============================================
// DOM
// =============================================

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    Array.from(document.querySelectorAll(selector));

const audio = $("#audio");

const sidebar = $("#sidebar");
const sidebarBackdrop = $("#sidebarBackdrop");

const menuButton = $("#menuButton");
const closeMenu = $("#closeMenu");

const globalSearch = $("#globalSearch");
const clearSearch = $("#clearSearch");

const categoryList = $("#categoryList");
const categoryCards = $("#categoryCards");

const songGrid = $("#songGrid");
const libraryGrid = $("#libraryGrid");

const songCount = $("#songCount");
const songSectionTitle = $("#songSectionTitle");

const playerCover = $("#playerCover");
const playerTitle = $("#playerTitle");
const playerArtist = $("#playerArtist");

const playButton = $("#playButton");
const previousButton = $("#previousButton");
const nextButton = $("#nextButton");

const shuffleButton = $("#shuffleButton");
const repeatButton = $("#repeatButton");

const progressTrack = $("#progressTrack");
const progressFill = $("#progressFill");
const progressThumb = $("#progressThumb");

const currentTimeElement = $("#currentTime");
const durationElement = $("#duration");

const volumeButton = $("#volumeButton");
const volumeSlider = $("#volumeSlider");

const likeButton = $("#likeButton");

const toast = $("#toast");

const connectionText = $("#connectionText");

const youtubeSearch = $("#youtubeSearch");
const youtubeSearchButton = $("#youtubeSearchButton");
const youtubeGrid = $("#youtubeGrid");
const youtubeStatus = $("#youtubeStatus");
const youtubePlayerArea = $("#youtubePlayerArea");
const youtubeFrame = $("#youtubeFrame");
const youtubeNowPlaying = $("#youtubeNowPlaying");

// =============================================
// INITIALIZE
// =============================================

document.addEventListener("DOMContentLoaded", async () => {

    setupNavigation();
    setupMenu();
    setupPlayerControls();
    setupSearch();
    setupCategoryControls();
    setupResponsiveMode();
    setupYouTube();

    audio.volume = 1;

    await loadConfig();
    await loadCategories();
    await loadSongs();

    updateConnection("connected");

});

// =============================================
// MENU
// =============================================

function setupMenu() {

    if (menuButton) {
        menuButton.addEventListener("click", event => {

            event.stopPropagation();

            sidebar.classList.add("open");
            sidebarBackdrop.classList.add("show");

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );
        });
    }

    if (closeMenu) {
        closeMenu.addEventListener("click", closeSidebar);
    }

    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener(
            "click",
            closeSidebar
        );
    }

    $$(".nav-item").forEach(button => {

        button.addEventListener("click", () => {

            closeSidebar();

            const view =
                button.dataset.view;

            if (view) {
                switchView(view);
            }
        });

    });
}

function closeSidebar() {

    sidebar.classList.remove("open");
    sidebarBackdrop.classList.remove("show");

    if (menuButton) {
        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}

// =============================================
// NAVIGATION
// =============================================

function setupNavigation() {

    $$(".nav-item").forEach(button => {

        button.addEventListener("click", () => {

            const view =
                button.dataset.view;

            switchView(view);

        });

    });

}

function switchView(view) {

    state.activeView = view;

    $$(".nav-item").forEach(item => {

        item.classList.toggle(
            "active",
            item.dataset.view === view
        );

    });

    $$(".view").forEach(section => {
        section.classList.remove(
            "active-view"
        );
    });

    const target =
        document.getElementById(
            `${view}View`
        );

    if (target) {
        target.classList.add(
            "active-view"
        );
    }

    if (view === "home") {
        applySongFilter();
    }

    if (view === "library") {
        renderSongGrid(
            state.songs,
            libraryGrid
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// =============================================
// CONFIG
// =============================================

async function loadConfig() {

    try {

        const response =
            await fetch("/api/config", {
                cache: "no-store"
            });

        if (!response.ok) {
            return;
        }

        const config =
            await response.json();

        if (
            config.firebase &&
            config.firebase.apiKey &&
            config.firebase.projectId &&
            config.firebase.appId
        ) {

            window.SWARAJ_CONFIG =
                window.SWARAJ_CONFIG || {};

            window.SWARAJ_CONFIG.firebase =
                config.firebase;

            state.firebaseReady = true;

            console.log(
                "Firebase configuration loaded."
            );

        }

    } catch (error) {

        console.warn(
            "Firebase config unavailable.",
            error
        );

    }
}

// =============================================
// SONGS
// =============================================

async function loadSongs() {

    setSongLoading();

    try {

        const response =
            await fetch(
                "/api/songs",
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

        if (!data.success) {
            throw new Error(
                data.error ||
                "Unable to load songs"
            );
        }

        state.songs =
            Array.isArray(data.songs)
                ? data.songs
                : [];

        state.filteredSongs =
            [...state.songs];

        applySongFilter();

        renderSongGrid(
            state.songs,
            libraryGrid
        );

        console.log(
            `स्वरAJ: ${state.songs.length} songs loaded`
        );

    } catch (error) {

        console.error(
            "Song loading error:",
            error
        );

        songGrid.innerHTML = `
            <div class="empty-state">
                Unable to load songs.
                <br>
                <small>
                    Check /api/songs
                </small>
            </div>
        `;

        showToast(
            "Unable to load local songs."
        );

    }

}

function setSongLoading() {

    songGrid.innerHTML = `
        <div class="empty-state">
            Loading your music...
        </div>
    `;

}

// =============================================
// CATEGORIES
// =============================================

async function loadCategories() {

    try {

        const response =
            await fetch(
                "/api/categories",
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

        state.categories =
            Array.isArray(data.categories)
                ? data.categories
                : [];

        renderCategories();

    } catch (error) {

        console.error(
            "Category loading error:",
            error
        );

        // Fallback from songs.
        buildCategoriesFromSongs();

    }

}

function buildCategoriesFromSongs() {

    const map = new Map();

    map.set(
        "All Songs",
        {
            name: "All Songs",
            count: state.songs.length
        }
    );

    state.songs.forEach(song => {

        const name =
            song.category ||
            "All Songs";

        if (!map.has(name)) {

            map.set(
                name,
                {
                    name,
                    count: 0
                }
            );

        }

        map.get(name).count++;

    });

    state.categories =
        Array.from(map.values());

    renderCategories();

}

function renderCategories() {

    if (!categoryList) {
        return;
    }

    if (!state.categories.length) {

        categoryList.innerHTML = `
            <div class="category-loading">
                No categories
            </div>
        `;

        return;
    }

    categoryList.innerHTML =
        state.categories
            .map(
                (category, index) => {

                    const active =
                        category.name ===
                        state.activeCategory;

                    return `
                        <button
                            class="category-item ${active ? "active" : ""}"
                            data-category="${escapeAttribute(category.name)}"
                            type="button"
                        >
                            <span class="category-left">
                                <span class="category-icon">
                                    ${categoryIcon(category.name)}
                                </span>

                                <span>
                                    ${escapeHTML(category.name)}
                                </span>
                            </span>

                            <span class="category-count">
                                ${category.count}
                            </span>
                        </button>
                    `;
                }
            )
            .join("");

    categoryCards.innerHTML =
        state.categories
            .filter(category =>
                category.name !== "All Songs"
            )
            .map(
                category => `
                    <button
                        class="category-card"
                        data-category="${escapeAttribute(category.name)}"
                        type="button"
                    >
                        <span class="category-card-icon">
                            ${categoryIcon(category.name)}
                        </span>

                        <strong>
                            ${escapeHTML(category.name)}
                        </strong>

                        <span>
                            ${category.count} songs
                        </span>
                    </button>
                `
            )
            .join("");

    if (!categoryCards.innerHTML) {

        categoryCards.innerHTML = `
            <button
                class="category-card"
                data-category="All Songs"
                type="button"
            >
                <span class="category-card-icon">
                    ♪
                </span>

                <strong>
                    All Songs
                </strong>

                <span>
                    ${state.songs.length} songs
                </span>
            </button>
        `;

    }

    $$(".category-item").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectCategory(
                    button.dataset.category
                );

            }
        );

    });

    $$(".category-card").forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectCategory(
                    button.dataset.category
                );

                switchView("home");

            }
        );

    });

}

function categoryIcon(name) {

    const value =
        String(name || "")
            .toLowerCase();

    if (
        value.includes("bhakti") ||
        value.includes("devotional") ||
        value.includes("ganesh") ||
        value.includes("ganpati")
    ) {
        return "ॐ";
    }

    if (
        value.includes("love") ||
        value.includes("romantic")
    ) {
        return "♡";
    }

    if (
        value.includes("energetic") ||
        value.includes("party")
    ) {
        return "⚡";
    }

    if (
        value.includes("emotional") ||
        value.includes("sad")
    ) {
        return "☾";
    }

    if (
        value.includes("lofi") ||
        value.includes("lo-fi")
    ) {
        return "☁";
    }

    if (
        value.includes("ambient")
    ) {
        return "◌";
    }

    if (
        value.includes("marathi")
    ) {
        return "अ";
    }

    if (
        value.includes("synth")
    ) {
        return "✦";
    }

    return "♪";
}

// =============================================
// CATEGORY FILTER
// =============================================

function setupCategoryControls() {

    const refresh =
        $("#refreshCategories");

    if (refresh) {

        refresh.addEventListener(
            "click",
            async () => {

                await loadCategories();

                await loadSongs();

                showToast(
                    "Music library refreshed."
                );

            }
        );

    }

    const showAll =
        $("#showAllCategories");

    if (showAll) {

        showAll.addEventListener(
            "click",
            () => {

                selectCategory(
                    "All Songs"
                );

            }
        );

    }

}

function selectCategory(category) {

    state.activeCategory =
        category || "All Songs";

    renderCategories();

    applySongFilter();

    switchView("home");

}

function applySongFilter() {

    const query =
        String(
            globalSearch?.value || ""
        )
            .trim()
            .toLowerCase();

    state.filteredSongs =
        state.songs.filter(song => {

            const categoryMatch =
                state.activeCategory ===
                "All Songs" ||
                song.category ===
                state.activeCategory;

            const searchMatch =
                !query ||
                String(song.title || "")
                    .toLowerCase()
                    .includes(query) ||
                String(song.artist || "")
                    .toLowerCase()
                    .includes(query) ||
                String(song.album || "")
                    .toLowerCase()
                    .includes(query) ||
                String(song.category || "")
                    .toLowerCase()
                    .includes(query);

            return categoryMatch &&
                searchMatch;

        });

    renderSongGrid(
        state.filteredSongs,
        songGrid
    );

    if (songSectionTitle) {

        songSectionTitle.textContent =
            state.activeCategory;

    }

    if (songCount) {

        songCount.textContent =
            `${state.filteredSongs.length} ${
                state.filteredSongs.length === 1
                    ? "song"
                    : "songs"
            }`;

    }

}

// =============================================
// SONG GRID
// =============================================

function renderSongGrid(
    songs,
    container
) {

    if (!container) {
        return;
    }

    if (!songs || !songs.length) {

        container.innerHTML = `
            <div class="empty-state">
                No songs found.
                <br>
                <small>
                    Add MP3 files to songs/
                </small>
            </div>
        `;

        return;
    }

    container.innerHTML =
        songs
            .map(
                (song, index) =>
                    createSongCard(
                        song,
                        index
                    )
            )
            .join("");

    container
        .querySelectorAll(
            ".song-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                event => {

                    if (
                        event.target.closest(
                            ".song-menu"
                        )
                    ) {
                        return;
                    }

                    const id =
                        card.dataset.id;

                    const index =
                        state.songs.findIndex(
                            song =>
                                song.id === id
                        );

                    if (index >= 0) {
                        playSong(index);
                    }

                }
            );

        });

}

function createSongCard(
    song,
    index
) {

    const liked =
        state.likedSongs.includes(
            song.id
        );

    return `
        <article
            class="song-card"
            data-id="${escapeAttribute(song.id)}"
            tabindex="0"
            aria-label="Play ${escapeAttribute(song.title)}"
        >

            <div class="song-art">

                <img
                    src="${escapeAttribute(
                        song.cover ||
                        "/images/default-cover.svg"
                    )}"
                    alt="${escapeAttribute(
                        song.title
                    )}"
                    loading="lazy"
                    onerror="this.onerror=null;this.src='/images/default-cover.svg';"
                >

            </div>

            <button
                class="song-menu"
                type="button"
                title="Like song"
                data-like-id="${escapeAttribute(song.id)}"
            >
                ${liked ? "♥" : "♡"}
            </button>

            <div class="song-meta">

                <strong>
                    ${escapeHTML(song.title)}
                </strong>

                <span>
                    ${escapeHTML(
                        song.artist ||
                        "स्वरAJ"
                    )}
                    •
                    ${escapeHTML(
                        song.category ||
                        "Music"
                    )}
                </span>

            </div>

        </article>
    `;
}

// =============================================
// PLAYER
// =============================================

function setupPlayerControls() {

    playButton?.addEventListener(
        "click",
        togglePlay
    );

    previousButton?.addEventListener(
        "click",
        previousSong
    );

    nextButton?.addEventListener(
        "click",
        nextSong
    );

    shuffleButton?.addEventListener(
        "click",
        () => {

            state.isShuffle =
                !state.isShuffle;

            shuffleButton.classList.toggle(
                "active",
                state.isShuffle
            );

            showToast(
                state.isShuffle
                    ? "Shuffle enabled"
                    : "Shuffle disabled"
            );

        }
    );

    repeatButton?.addEventListener(
        "click",
        () => {

            state.isRepeat =
                !state.isRepeat;

            repeatButton.classList.toggle(
                "active",
                state.isRepeat
            );

            showToast(
                state.isRepeat
                    ? "Repeat enabled"
                    : "Repeat disabled"
            );

        }
    );

    likeButton?.addEventListener(
        "click",
        toggleCurrentLike
    );

    audio.addEventListener(
        "loadedmetadata",
        updateDuration
    );

    audio.addEventListener(
        "timeupdate",
        updateProgress
    );

    audio.addEventListener(
        "play",
        () => {

            state.isPlaying = true;

            updatePlayButton();

        }
    );

    audio.addEventListener(
        "pause",
        () => {

            state.isPlaying = false;

            updatePlayButton();

        }
    );

    audio.addEventListener(
        "ended",
        handleSongEnded
    );

    audio.addEventListener(
        "error",
        () => {

            showToast(
                "Unable to play this audio file."
            );

        }
    );

    progressTrack?.addEventListener(
        "click",
        seekAudio
    );

    volumeSlider?.addEventListener(
        "input",
        () => {

            audio.volume =
                Number(
                    volumeSlider.value
                );

            updateVolumeIcon();

        }
    );

    volumeButton?.addEventListener(
        "click",
        toggleMute
    );

}

function playSong(index) {

    if (
        index < 0 ||
        index >= state.songs.length
    ) {
        return;
    }

    const song =
        state.songs[index];

    state.currentIndex =
        index;

    audio.src = song.url;

    audio.load();

    updatePlayer(song);

    audio.play()
        .then(() => {

            state.isPlaying = true;

            updatePlayButton();

        })
        .catch(error => {

            console.warn(
                "Autoplay/play failed:",
                error
            );

            showToast(
                "Tap Play to start the song."
            );

        });

}

function updatePlayer(song) {

    playerTitle.textContent =
        song.title || "Unknown Song";

    playerArtist.textContent =
        `${song.artist || "स्वरAJ"} • ${
            song.category || "Music"
        }`;

    if (
        song.cover &&
        song.cover.trim()
    ) {

        playerCover.innerHTML = `
            <img
                src="${escapeAttribute(song.cover)}"
                alt=""
                onerror="this.style.display='none';"
            >
        `;

    } else {

        playerCover.innerHTML =
            "<span>♪</span>";

    }

    updateLikeButton();

    currentTimeElement.textContent =
        "0:00";

    durationElement.textContent =
        "0:00";

    progressFill.style.width =
        "0%";

    progressThumb.style.left =
        "0%";

}

function togglePlay() {

    if (state.currentIndex === -1) {

        if (!state.songs.length) {

            showToast(
                "No local songs available."
            );

            return;
        }

        playSong(0);

        return;
    }

    if (audio.paused) {

        audio.play().catch(() => {});

    } else {

        audio.pause();

    }

}

function nextSong() {

    if (!state.songs.length) {
        return;
    }

    let nextIndex;

    if (state.isShuffle) {

        nextIndex =
            Math.floor(
                Math.random() *
                state.songs.length
            );

        if (
            state.songs.length > 1 &&
            nextIndex === state.currentIndex
        ) {
            nextIndex =
                (nextIndex + 1) %
                state.songs.length;
        }

    } else {

        nextIndex =
            (state.currentIndex + 1) %
            state.songs.length;

    }

    playSong(nextIndex);
}

function previousSong() {

    if (!state.songs.length) {
        return;
    }

    if (audio.currentTime > 4) {

        audio.currentTime = 0;

        return;
    }

    const previousIndex =
        state.currentIndex <= 0
            ? state.songs.length - 1
            : state.currentIndex - 1;

    playSong(previousIndex);
}

function handleSongEnded() {

    if (state.isRepeat) {

        audio.currentTime = 0;

        audio.play().catch(() => {});

        return;
    }

    nextSong();

}

function updatePlayButton() {

    if (!playButton) {
        return;
    }

    playButton.textContent =
        state.isPlaying
            ? "❚❚"
            : "▶";

    playButton.setAttribute(
        "aria-label",
        state.isPlaying
            ? "Pause"
            : "Play"
    );

}

function updateDuration() {

    if (
        !Number.isFinite(
            audio.duration
        )
    ) {
        return;
    }

    durationElement.textContent =
        formatTime(audio.duration);

}

function updateProgress() {

    if (
        !Number.isFinite(
            audio.duration
        ) ||
        audio.duration <= 0
    ) {
        return;
    }

    const percent =
        (audio.currentTime /
            audio.duration) *
        100;

    progressFill.style.width =
        `${percent}%`;

    progressThumb.style.left =
        `${percent}%`;

    currentTimeElement.textContent =
        formatTime(audio.currentTime);

}

function seekAudio(event) {

    if (
        !Number.isFinite(
            audio.duration
        )
    ) {
        return;
    }

    const rect =
        progressTrack.getBoundingClientRect();

    const ratio =
        Math.max(
            0,
            Math.min(
                1,
                (event.clientX -
                    rect.left) /
                    rect.width
            )
        );

    audio.currentTime =
        ratio *
        audio.duration;

}

function toggleMute() {

    if (audio.volume > 0) {

        audio.dataset.previousVolume =
            audio.volume;

        audio.volume = 0;

        volumeSlider.value = 0;

    } else {

        const previous =
            Number(
                audio.dataset.previousVolume ||
                1
            );

        audio.volume = previous;

        volumeSlider.value =
            previous;

    }

    updateVolumeIcon();

}

function updateVolumeIcon() {

    volumeButton.textContent =
        audio.volume === 0
            ? "×"
            : "◖";

}

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

    const remaining =
        Math.floor(
            seconds % 60
        );

    return `${minutes}:${String(
        remaining
    ).padStart(2, "0")}`;

}

// =============================================
// SEARCH
// =============================================

function setupSearch() {

    globalSearch?.addEventListener(
        "input",
        () => {

            applySongFilter();

            clearSearch.style.display =
                globalSearch.value
                    ? "block"
                    : "none";

        }
    );

    clearSearch?.addEventListener(
        "click",
        () => {

            globalSearch.value = "";

            clearSearch.style.display =
                "none";

            applySongFilter();

            globalSearch.focus();

        }
    );

    globalSearch?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                globalSearch.value.trim()
            ) {

                const query =
                    globalSearch.value.trim();

                // Search local music first.
                applySongFilter();

                // Then take user to YouTube.
                if (
                    state.activeView !==
                    "youtube"
                ) {

                    switchView(
                        "youtube"
                    );

                }

                youtubeSearch.value =
                    query;

                searchYouTube(query);

            }

        }
    );

}

// =============================================
// LIKE
// =============================================

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-like-id]"
            );

        if (!button) {
            return;
        }

        event.stopPropagation();

        toggleLike(
            button.dataset.likeId
        );

    }
);

function toggleLike(id) {

    if (!id) {
        return;
    }

    const position =
        state.likedSongs.indexOf(id);

    if (position >= 0) {

        state.likedSongs.splice(
            position,
            1
        );

        showToast(
            "Removed from liked songs."
        );

    } else {

        state.likedSongs.push(id);

        showToast(
            "Added to liked songs ♥"
        );

    }

    localStorage.setItem(
        "swaraAJLikedSongs",
        JSON.stringify(
            state.likedSongs
        )
    );

    applySongFilter();

    if (
        libraryGrid
    ) {
        renderSongGrid(
            state.songs,
            libraryGrid
        );
    }

    updateLikeButton();

}

function toggleCurrentLike() {

    if (state.currentIndex < 0) {
        return;
    }

    const song =
        state.songs[
            state.currentIndex
        ];

    if (song) {
        toggleLike(song.id);
    }

}

function updateLikeButton() {

    if (
        !likeButton ||
        state.currentIndex < 0
    ) {
        likeButton.textContent = "♡";
        likeButton.classList.remove(
            "liked"
        );

        return;
    }

    const song =
        state.songs[
            state.currentIndex
        ];

    const liked =
        song &&
        state.likedSongs.includes(
            song.id
        );

    likeButton.textContent =
        liked ? "♥" : "♡";

    likeButton.classList.toggle(
        "liked",
        Boolean(liked)
    );

}

// =============================================
// YOUTUBE
// =============================================

function setupYouTube() {

    youtubeSearchButton?.addEventListener(
        "click",
        () => {

            searchYouTube(
                youtubeSearch.value
            );

        }
    );

    youtubeSearch?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {

                searchYouTube(
                    youtubeSearch.value
                );

            }

        }
    );

}

async function searchYouTube(query) {

    query =
        String(query || "").trim();

    if (!query) {

        youtubeStatus.textContent =
            "Enter a song, artist or album.";

        return;

    }

    youtubeStatus.textContent =
        "Searching YouTube Music...";

    youtubeGrid.innerHTML = `
        <div class="empty-state">
            Searching...
        </div>
    `;

    try {

        const response =
            await fetch(
                `/api/youtube/search?q=${encodeURIComponent(query)}`,
                {
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                `HTTP ${response.status}`
            );

        }

        if (
            !data.success ||
            !Array.isArray(data.results)
        ) {

            throw new Error(
                "Invalid YouTube response"
            );

        }

        state.youtubeResults =
            data.results;

        renderYouTubeResults();

        youtubeStatus.textContent =
            `${data.count} results for "${query}"`;

    } catch (error) {

        console.error(
            "YouTube search:",
            error
        );

        youtubeGrid.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(
                    error.message ||
                    "YouTube search failed."
                )}
            </div>
        `;

        youtubeStatus.textContent =
            "YouTube search is unavailable.";

    }

}

function renderYouTubeResults() {

    if (!state.youtubeResults.length) {

        youtubeGrid.innerHTML = `
            <div class="empty-state">
                No YouTube results found.
            </div>
        `;

        return;
    }

    youtubeGrid.innerHTML =
        state.youtubeResults
            .map(
                result => `
                    <article
                        class="youtube-card"
                        data-youtube-id="${escapeAttribute(result.id)}"
                        tabindex="0"
                    >

                        <div class="youtube-thumbnail">

                            <img
                                src="${escapeAttribute(result.thumbnail)}"
                                alt="${escapeAttribute(result.title)}"
                                loading="lazy"
                            >

                        </div>

                        <div class="youtube-card-info">

                            <strong>
                                ${escapeHTML(result.title)}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    result.channel ||
                                    "YouTube"
                                )}
                            </span>

                        </div>

                    </article>
                `
            )
            .join("");

    $$(".youtube-card").forEach(card => {

        card.addEventListener(
            "click",
            () => {

                playYouTube(
                    card.dataset.youtubeId
                );

            }
        );

        card.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    playYouTube(
                        card.dataset.youtubeId
                    );

                }

            }
        );

    });

}

function playYouTube(id) {

    const result =
        state.youtubeResults.find(
            item => item.id === id
        );

    if (!result) {
        return;
    }

    state.currentYouTube =
        result;

    youtubeFrame.src =
        `https://www.youtube.com/embed/${encodeURIComponent(
            id
        )}?autoplay=1&rel=0&modestbranding=1`;

    youtubePlayerArea.classList.remove(
        "hidden"
    );

    youtubeNowPlaying.innerHTML = `
        <div>
            <span class="eyebrow">
                NOW PLAYING
            </span>

            <strong>
                ${escapeHTML(result.title)}
            </strong>

            <div style="color:#9ca6c4;font-size:10px;margin-top:6px;">
                ${escapeHTML(
                    result.channel ||
                    "YouTube"
                )}
            </div>
        </div>
    `;

    youtubePlayerArea.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}

// =============================================
// RESPONSIVE DESKTOP / MOBILE
// =============================================

function setupResponsiveMode() {

    const desktopButton =
        $("#desktopMode");

    const mobileButton =
        $("#mobileMode");

    desktopButton?.addEventListener(
        "click",
        () => {

            document.body.classList.remove(
                "force-mobile"
            );

            showToast(
                "Desktop interface enabled."
            );

        }
    );

    mobileButton?.addEventListener(
        "click",
        () => {

            document.body.classList.add(
                "force-mobile"
            );

            showToast(
                "Mobile interface mode enabled."
            );

        }
    );

}

// =============================================
// CONNECTION
// =============================================

function updateConnection(status) {

    if (!connectionText) {
        return;
    }

    if (status === "connected") {

        connectionText.textContent =
            "Server Online";

    } else {

        connectionText.textContent =
            "Server Offline";

    }

}

// =============================================
// TOAST
// =============================================

let toastTimer;

function showToast(message) {

    if (!toast) {
        return;
    }

    toast.textContent =
        message;

    toast.classList.add(
        "show"
    );

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}

// =============================================
// HERO
// =============================================

$("#heroPlay")?.addEventListener(
    "click",
    () => {

        if (!state.songs.length) {

            showToast(
                "No local songs found in songs/."
            );

            return;

        }

        playSong(
            state.currentIndex >= 0
                ? state.currentIndex
                : 0
        );

    }
);

$("#heroExplore")?.addEventListener(
    "click",
    () => {

        switchView("library");

    }
);

$("#brandLogo")?.addEventListener(
    "click",
    () => {

        switchView("home");

    }
);

$("#profileButton")?.addEventListener(
    "click",
    () => {

        showToast(
            state.firebaseReady
                ? "Firebase is ready for authentication."
                : "Firebase authentication is ready to configure."
        );

    }
);

// =============================================
// SECURITY / HTML HELPERS
// =============================================

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function escapeAttribute(value) {

    return escapeHTML(value);

}

// =============================================
// KEYBOARD SHORTCUTS
// =============================================

document.addEventListener(
    "keydown",
    event => {

        const tag =
            event.target?.tagName;

        if (
            tag === "INPUT" ||
            tag === "TEXTAREA"
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

        if (
            event.key === "/"
        ) {

            event.preventDefault();

            globalSearch?.focus();

        }

    }
);

// =============================================
// PAGE VISIBILITY
// =============================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden &&
            !audio.paused
        ) {
            // Don't stop music.
            // Browser decides background playback.
        }

    }
);