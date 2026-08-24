"use strict";

/* =========================================================
   STATE
========================================================= */

const state = {
    songs: [],

    filteredSongs: [],

    categories: [],

    activeCategory: "all",

    currentIndex: -1,

    playing: false,

    shuffle: false,

    repeat: false,

    youtubeVideos: [],

    youtubeCurrentId: null
};

/* =========================================================
   DOM
========================================================= */

const $ = selector =>
    document.querySelector(selector);

const $$ = selector =>
    document.querySelectorAll(selector);

const audio =
    $("#audio");

const sidebar =
    $("#sidebar");

const menuButton =
    $("#menuButton");

const sidebarClose =
    $("#sidebarClose");

const mobileOverlay =
    $("#mobileOverlay");

const categoryList =
    $("#categoryList");

const dynamicCategories =
    $("#dynamicCategories");

const categoryCards =
    $("#categoryCards");

const songGrid =
    $("#songGrid");

const libraryGrid =
    $("#libraryGrid");

const globalSearch =
    $("#globalSearch");

const songSectionTitle =
    $("#songSectionTitle");

const songCount =
    $("#songCount");

const allCount =
    $("#allCount");

const progress =
    $("#progress");

const progressFill =
    $("#progressFill");

const volume =
    $("#volume");

const playerTitle =
    $("#playerTitle");

const playerArtist =
    $("#playerArtist");

const playerArtwork =
    $("#playerArtwork");

const playButton =
    $("#playButton");

const prevButton =
    $("#prevButton");

const nextButton =
    $("#nextButton");

const shuffleButton =
    $("#shuffleButton");

const repeatButton =
    $("#repeatButton");

const refreshButton =
    $("#refreshButton");

const heroPlay =
    $("#heroPlay");

const heroShuffle =
    $("#heroShuffle");

const youtubeSearch =
    $("#youtubeSearch");

const youtubeSearchButton =
    $("#youtubeSearchButton");

const youtubeResults =
    $("#youtubeResults");

const youtubePlayer =
    $("#youtubePlayer");

const youtubeStatus =
    $("#youtubeStatus");

const youtubeResultCount =
    $("#youtubeResultCount");

const engineStatus =
    $("#engineStatus");

/* =========================================================
   INIT
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        bindEvents();

        volume.value = "0.8";

        audio.volume = 0.8;

        await loadSongs();

        await loadYouTubeStatus();

        setupKeyboardShortcuts();
    }
);

/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

    menuButton?.addEventListener(
        "click",
        toggleMenu
    );

    sidebarClose?.addEventListener(
        "click",
        closeMenu
    );

    mobileOverlay?.addEventListener(
        "click",
        closeMenu
    );

    refreshButton?.addEventListener(
        "click",
        loadSongs
    );

    heroPlay?.addEventListener(
        "click",
        () => {

            if (!state.songs.length) {
                showEmptySongs();
                return;
            }

            if (
                state.currentIndex === -1
            ) {
                playSong(0);
            } else {
                togglePlay();
            }
        }
    );

    heroShuffle?.addEventListener(
        "click",
        () => {

            state.shuffle = true;

            updateShuffleButton();

            if (!state.songs.length) {
                return;
            }

            const random =
                Math.floor(
                    Math.random() *
                    state.songs.length
                );

            playSong(random);
        }
    );

    playButton?.addEventListener(
        "click",
        togglePlay
    );

    prevButton?.addEventListener(
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

            state.shuffle =
                !state.shuffle;

            updateShuffleButton();
        }
    );

    repeatButton?.addEventListener(
        "click",
        () => {

            state.repeat =
                !state.repeat;

            updateRepeatButton();
        }
    );

    volume?.addEventListener(
        "input",
        () => {

            audio.volume =
                Number(volume.value);
        }
    );

    progress?.addEventListener(
        "input",
        () => {

            if (!audio.duration) {
                return;
            }

            const percent =
                Number(progress.value);

            audio.currentTime =
                audio.duration *
                percent /
                100;
        }
    );

    audio.addEventListener(
        "timeupdate",
        updateProgress
    );

    audio.addEventListener(
        "ended",
        handleSongEnded
    );

    audio.addEventListener(
        "loadedmetadata",
        updateProgress
    );

    audio.addEventListener(
        "play",
        () => {
            state.playing = true;
            updatePlayerUI();
        }
    );

    audio.addEventListener(
        "pause",
        () => {
            state.playing = false;
            updatePlayerUI();
        }
    );

    globalSearch?.addEventListener(
        "input",
        debounce(
            handleGlobalSearch,
            180
        )
    );

    youtubeSearchButton?.addEventListener(
        "click",
        searchYouTube
    );

    youtubeSearch?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter"
            ) {
                event.preventDefault();

                searchYouTube();
            }
        }
    );

    $$(".nav-item").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;

                    showPage(page);

                    closeMenu();
                }
            );
        }
    );

    $$(".category-nav").forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    setCategory(
                        button.dataset.category
                    );

                    closeMenu();
                }
            );
        }
    );

    $("#showAllCategories")
        ?.addEventListener(
            "click",
            () => {

                setCategory("all");

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
}

/* =========================================================
   MENU
========================================================= */

function toggleMenu() {

    const open =
        sidebar.classList.toggle(
            "open"
        );

    mobileOverlay.classList.toggle(
        "active",
        open
    );

    menuButton.classList.toggle(
        "active",
        open
    );

    menuButton.setAttribute(
        "aria-expanded",
        String(open)
    );

    document.body.style.overflow =
        open
            ? "hidden"
            : "";
}

function closeMenu() {

    sidebar.classList.remove(
        "open"
    );

    mobileOverlay.classList.remove(
        "active"
    );

    menuButton.classList.remove(
        "active"
    );

    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.style.overflow =
        "";
}

/* =========================================================
   LOAD SONGS
========================================================= */

async function loadSongs() {

    engineStatus.textContent =
        "Loading library...";

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
                "Songs API failed"
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

        state.categories =
            Array.isArray(data.categories)
                ? data.categories
                : [];

        state.filteredSongs =
            [...state.songs];

        renderCategories();

        renderSongs();

        engineStatus.textContent =
            `${state.songs.length} songs ready`;

        allCount.textContent =
            state.songs.length;

    } catch (error) {

        console.error(error);

        state.songs = [];

        state.filteredSongs = [];

        categoryCards.innerHTML =
            emptyCard(
                "Unable to load categories."
            );

        songGrid.innerHTML =
            emptyCard(
                "Unable to load songs."
            );

        engineStatus.textContent =
            "Library unavailable";
    }
}

/* =========================================================
   CATEGORIES
========================================================= */

function renderCategories() {

    dynamicCategories.innerHTML = "";

    categoryCards.innerHTML = "";

    if (!state.categories.length) {

        categoryCards.innerHTML =
            emptyCard(
                "No categories found. Add music inside songs/."
            );

        return;
    }

    const icons = [
        "♫",
        "☾",
        "⚡",
        "♡",
        "✦",
        "◉",
        "♪",
        "♬"
    ];

    state.categories.forEach(
        (category, index) => {

            const count =
                state.songs.filter(
                    song =>
                        song.category ===
                        category
                ).length;

            const nav =
                document.createElement(
                    "button"
                );

            nav.className =
                "category-nav";

            nav.dataset.category =
                category;

            nav.innerHTML = `
                <span>
                    ${icons[index % icons.length]}
                </span>

                ${escapeHtml(category)}

                <em>${count}</em>
            `;

            nav.addEventListener(
                "click",
                () => {

                    setCategory(category);

                    closeMenu();
                }
            );

            dynamicCategories.appendChild(
                nav
            );

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "category-card";

            card.innerHTML = `
                <div class="category-icon">
                    ${icons[index % icons.length]}
                </div>

                <h3>
                    ${escapeHtml(category)}
                </h3>

                <p>
                    ${count}
                    ${count === 1 ? "song" : "songs"}
                </p>
            `;

            card.addEventListener(
                "click",
                () => {

                    setCategory(category);

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });
                }
            );

            categoryCards.appendChild(
                card
            );
        }
    );
}

/* =========================================================
   CATEGORY FILTER
========================================================= */

function setCategory(category) {

    state.activeCategory =
        category;

    $$(".category-nav")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.category ===
                category
            );
        });

    if (
        category === "all"
    ) {

        state.filteredSongs =
            [...state.songs];

        songSectionTitle.textContent =
            "All Songs";

    } else {

        state.filteredSongs =
            state.songs.filter(
                song =>
                    song.category ===
                    category
            );

        songSectionTitle.textContent =
            category;
    }

    renderSongs();
}

/* =========================================================
   RENDER SONGS
========================================================= */

function renderSongs() {

    songCount.textContent =
        `${state.filteredSongs.length} ${
            state.filteredSongs.length === 1
                ? "song"
                : "songs"
        }`;

    if (!state.filteredSongs.length) {

        songGrid.innerHTML =
            emptyCard(
                state.songs.length
                    ? "No songs in this category."
                    : "No songs found. Add MP3 files to the songs/ folder."
            );

        libraryGrid.innerHTML =
            songGrid.innerHTML;

        return;
    }

    const html =
        state.filteredSongs
            .map(
                (song, index) =>
                    createSongCard(
                        song,
                        index
                    )
            )
            .join("");

    songGrid.innerHTML =
        html;

    libraryGrid.innerHTML =
        html;

    bindSongCards();
}

/* =========================================================
   SONG CARD
========================================================= */

function createSongCard(
    song,
    index
) {

    const artwork =
        song.image
            ? `
                <img
                    src="${escapeAttribute(song.image)}"
                    alt=""
                    loading="lazy"
                >
            `
            : `
                <div class="song-cover-placeholder">
                    ♪
                </div>
            `;

    return `
        <article
            class="song-card"
            data-song-id="${escapeAttribute(song.id)}"
        >

            <div class="song-cover">

                ${artwork}

                <button
                    class="song-play"
                    data-index="${index}"
                    aria-label="Play ${escapeAttribute(song.title)}"
                >
                    ▶
                </button>

            </div>

            <div class="song-info">

                <h3>
                    ${escapeHtml(song.title)}
                </h3>

                <p>
                    ${escapeHtml(song.category || "स्वरAJ")}
                </p>

            </div>

        </article>
    `;
}

function bindSongCards() {

    $$(".song-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            ".song-play"
                        );

                    if (!button) {
                        return;
                    }

                    const id =
                        card.dataset.songId;

                    const index =
                        state.songs.findIndex(
                            song =>
                                song.id === id
                        );

                    if (
                        index !== -1
                    ) {
                        playSong(index);
                    }
                }
            );
        });
}

/* =========================================================
   PLAY SONG
========================================================= */

async function playSong(index) {

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

    audio.src =
        song.url;

    playerTitle.textContent =
        song.title;

    playerArtist.textContent =
        song.category ||
        song.artist ||
        "स्वरAJ";

    if (song.image) {

        playerArtwork.innerHTML = `
            <img
                src="${escapeAttribute(song.image)}"
                alt=""
            >
        `;

    } else {

        playerArtwork.textContent =
            "♪";
    }

    try {

        await audio.play();

    } catch (error) {

        console.warn(
            "Playback requires user interaction:",
            error
        );
    }

    updatePlayerUI();
}

/* =========================================================
   PLAY / PAUSE
========================================================= */

function togglePlay() {

    if (!state.songs.length) {
        return;
    }

    if (
        state.currentIndex === -1
    ) {
        playSong(0);
        return;
    }

    if (audio.paused) {

        audio.play().catch(
            console.error
        );

    } else {

        audio.pause();
    }
}

function updatePlayerUI() {

    playButton.textContent =
        audio.paused
            ? "▶"
            : "Ⅱ";

    playButton.title =
        audio.paused
            ? "Play"
            : "Pause";
}

/* =========================================================
   NEXT / PREVIOUS
========================================================= */

function nextSong() {

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
            state.currentIndex + 1;

        if (
            index >=
            state.songs.length
        ) {
            index = 0;
        }
    }

    playSong(index);
}

function previousSong() {

    if (!state.songs.length) {
        return;
    }

    if (
        audio.currentTime > 3
    ) {

        audio.currentTime = 0;

        return;
    }

    let index =
        state.currentIndex - 1;

    if (index < 0) {
        index =
            state.songs.length - 1;
    }

    playSong(index);
}

function handleSongEnded() {

    if (state.repeat) {

        audio.currentTime = 0;

        audio.play();

        return;
    }

    nextSong();
}

/* =========================================================
   PROGRESS
========================================================= */

function updateProgress() {

    if (
        !audio.duration ||
        Number.isNaN(
            audio.duration
        )
    ) {
        return;
    }

    const percent =
        audio.currentTime /
        audio.duration *
        100;

    progress.value =
        percent;

    progressFill.style.width =
        `${percent}%`;
}

/* =========================================================
   PLAYER BUTTONS
========================================================= */

function updateShuffleButton() {

    shuffleButton.classList.toggle(
        "active",
        state.shuffle
    );
}

function updateRepeatButton() {

    repeatButton.classList.toggle(
        "active",
        state.repeat
    );
}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(page) {

    $$(".page")
        .forEach(element => {

            element.classList.remove(
                "active-page"
            );
        });

    $$(".nav-item")
        .forEach(element => {

            element.classList.toggle(
                "active",
                element.dataset.page ===
                page
            );
        });

    const target =
        $(`#${page}Page`);

    if (target) {

        target.classList.add(
            "active-page"
        );
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* =========================================================
   GLOBAL SEARCH
========================================================= */

function handleGlobalSearch() {

    const query =
        globalSearch.value
            .trim()
            .toLowerCase();

    if (!query) {

        setCategory(
            state.activeCategory
        );

        return;
    }

    state.filteredSongs =
        state.songs.filter(
            song => {

                return (
                    song.title
                        .toLowerCase()
                        .includes(query) ||

                    String(
                        song.artist || ""
                    )
                        .toLowerCase()
                        .includes(query) ||

                    String(
                        song.category || ""
                    )
                        .toLowerCase()
                        .includes(query)
                );
            }
        );

    songSectionTitle.textContent =
        `Search: ${globalSearch.value}`;

    renderSongs();
}

/* =========================================================
   YOUTUBE STATUS
========================================================= */

async function loadYouTubeStatus() {

    try {

        const response =
            await fetch(
                "/api/youtube/status",
                {
                    cache: "no-store"
                }
            );

        const data =
            await response.json();

        if (
            data.success &&
            data.configured
        ) {

            youtubeStatus.textContent =
                "● YouTube API Ready";

            youtubeStatus.className =
                "youtube-status ready";

        } else {

            youtubeStatus.textContent =
                "● API Key Required";

            youtubeStatus.className =
                "youtube-status error";
        }

    } catch (error) {

        youtubeStatus.textContent =
            "● YouTube unavailable";

        youtubeStatus.className =
            "youtube-status error";
    }
}

/* =========================================================
   YOUTUBE SEARCH
========================================================= */

async function searchYouTube() {

    const query =
        youtubeSearch.value.trim();

    if (!query) {

        youtubeSearch.focus();

        return;
    }

    youtubeSearchButton.disabled =
        true;

    youtubeSearchButton.textContent =
        "Searching...";

    youtubeResults.innerHTML = `
        <div class="youtube-loading">
            <div>
                <div class="loader-3d"></div>
                <p>Searching YouTube...</p>
            </div>
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

        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                "YouTube search failed."
            );
        }

        state.youtubeVideos =
            Array.isArray(data.videos)
                ? data.videos
                : [];

        renderYouTubeResults();

    } catch (error) {

        console.error(
            "YouTube:",
            error
        );

        youtubeResults.innerHTML = `
            <div class="youtube-error">

                <div>
                    <h3>
                        YouTube Search Error
                    </h3>

                    <p>
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                    <button
                        type="button"
                        id="youtubeRetry"
                    >
                        Try Again
                    </button>
                </div>

            </div>
        `;

        $("#youtubeRetry")
            ?.addEventListener(
                "click",
                searchYouTube
            );

    } finally {

        youtubeSearchButton.disabled =
            false;

        youtubeSearchButton.textContent =
            "Search";
    }
}

/* =========================================================
   YOUTUBE RESULTS
========================================================= */

function renderYouTubeResults() {

    youtubeResultCount.textContent =
        `${state.youtubeVideos.length} ${
            state.youtubeVideos.length === 1
                ? "result"
                : "results"
        }`;

    if (!state.youtubeVideos.length) {

        youtubeResults.innerHTML = `
            <div class="youtube-loading">
                No videos found.
            </div>
        `;

        return;
    }

    youtubeResults.innerHTML =
        state.youtubeVideos
            .map(
                (video, index) => `
                    <article
                        class="youtube-card"
                        data-youtube-index="${index}"
                    >

                        <div class="youtube-thumb">

                            <img
                                src="${escapeAttribute(video.thumbnail)}"
                                alt=""
                                loading="lazy"
                            >

                            <div class="youtube-card-play">
                                ▶
                            </div>

                        </div>

                        <div class="youtube-card-info">

                            <h3>
                                ${escapeHtml(video.title)}
                            </h3>

                            <p>
                                ${escapeHtml(video.channel)}
                            </p>

                        </div>

                    </article>
                `
            )
            .join("");

    $$(".youtube-card")
        .forEach(card => {

            card.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            card.dataset.youtubeIndex
                        );

                    const video =
                        state.youtubeVideos[index];

                    if (video) {
                        playYouTube(video);
                    }
                }
            );
        });
}

/* =========================================================
   YOUTUBE PLAYER
========================================================= */

function playYouTube(video) {

    if (!video?.id) {
        return;
    }

    state.youtubeCurrentId =
        video.id;

    youtubePlayer.classList.remove(
        "empty"
    );

    youtubePlayer.innerHTML = `
        <div class="youtube-frame-wrap">

            <iframe
                src="https://www.youtube.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
                title="${escapeAttribute(video.title)}"
                allow="
                    autoplay;
                    encrypted-media;
                    picture-in-picture;
                    web-share
                "
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
            </iframe>

        </div>

        <div class="youtube-now-playing">

            <strong>
                ${escapeHtml(video.title)}
            </strong>

            <span>
                ${escapeHtml(video.channel)}
            </span>

        </div>
    `;

    youtubePlayer.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================================================
   KEYBOARD
========================================================= */

function setupKeyboardShortcuts() {

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
                event.key ===
                "ArrowRight"
            ) {
                nextSong();
            }

            if (
                event.key ===
                "ArrowLeft"
            ) {
                previousSong();
            }
        }
    );

    document.addEventListener(
        "keydown",
        event => {

            if (
                (event.metaKey ||
                 event.ctrlKey) &&
                event.key.toLowerCase() ===
                "k"
            ) {

                event.preventDefault();

                globalSearch.focus();
            }
        }
    );
}

/* =========================================================
   HELPERS
========================================================= */

function emptyCard(message) {

    return `
        <div class="loading-card">
            ${escapeHtml(message)}
        </div>
    `;
}

function showEmptySongs() {

    alert(
        "No songs found. Add MP3 files inside the songs/ folder."
    );
}

function debounce(
    fn,
    delay
) {

    let timeout;

    return (...args) => {

        clearTimeout(timeout);

        timeout =
            setTimeout(
                () => fn(...args),
                delay
            );
    };
}

function escapeHtml(value) {

    return String(value ?? "")
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

function escapeAttribute(value) {

    return escapeHtml(value);
}