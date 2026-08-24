/* ==================================================
   स्वरAJ MUSIC PLAYER
   Local songs only
================================================== */

(() => {
    "use strict";

    /* ==================================================
       STATE
    ================================================== */

    const state = {
        songs: [],
        filteredSongs: [],

        activeCategory: "All Songs",

        currentIndex: -1,
        currentSong: null,

        isPlaying: false,
        isShuffle: false,
        isRepeat: false,
        isMuted: false,

        volume: 0.8
    };

    /* ==================================================
       DOM
    ================================================== */

    const $ = (selector) =>
        document.querySelector(selector);

    const audio = $("#audio");

    const sidebar = $("#sidebar");
    const menuButton = $("#menuButton");
    const sidebarClose = $("#sidebarClose");
    const mobileOverlay = $("#mobileOverlay");

    const searchInput = $("#searchInput");
    const clearSearch = $("#clearSearch");

    const categoryList = $("#categoryList");
    const categoryCards = $("#categoryCards");

    const songGrid = $("#songGrid");

    const songsTitle = $("#songsTitle");
    const activeCategoryLabel =
        $("#activeCategoryLabel");

    const visibleSongCount =
        $("#visibleSongCount");

    const allSongCount =
        $("#allSongCount");

    const playerTitle =
        $("#playerTitle");

    const playerArtist =
        $("#playerArtist");

    const playerCover =
        $("#playerCover");

    const playButton =
        $("#playButton");

    const heroPlay =
        $("#heroPlay");

    const previousButton =
        $("#previousButton");

    const nextButton =
        $("#nextButton");

    const shuffleButton =
        $("#shuffleButton");

    const shufflePlayer =
        $("#shufflePlayer");

    const repeatButton =
        $("#repeatButton");

    const muteButton =
        $("#muteButton");

    const volumeSlider =
        $("#volumeSlider");

    const currentTime =
        $("#currentTime");

    const duration =
        $("#duration");

    const progressTrack =
        $("#progressTrack");

    const progressLiquid =
        $("#progressLiquid");

    const likeButton =
        $("#likeButton");

    /* ==================================================
       INIT
    ================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    async function init() {

        setupMenu();

        setupNavigation();

        setupSearch();

        setupPlayerControls();

        setupAudio();

        setupKeyboard();

        setupTouch();

        updateVolume();

        await loadSongs();
    }

    /* ==================================================
       MENU
    ================================================== */

    function setupMenu() {

        menuButton.addEventListener(
            "click",
            toggleMenu
        );

        sidebarClose.addEventListener(
            "click",
            closeMenu
        );

        mobileOverlay.addEventListener(
            "click",
            closeMenu
        );

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Escape"
                ) {
                    closeMenu();
                }
            }
        );
    }

    function toggleMenu() {

        const isOpen =
            sidebar.classList.contains("open");

        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {

        sidebar.classList.add("open");

        mobileOverlay.classList.add("active");

        menuButton.classList.add("active");

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        mobileOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";
    }

    function closeMenu() {

        sidebar.classList.remove("open");

        mobileOverlay.classList.remove(
            "active"
        );

        menuButton.classList.remove("active");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        mobileOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";
    }

    /* ==================================================
       NAVIGATION
    ================================================== */

    function setupNavigation() {

        document
            .querySelectorAll(".nav-item")
            .forEach((button) => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach((item) =>
                                item.classList.remove(
                                    "active"
                                )
                            );

                        button.classList.add(
                            "active"
                        );

                        const view =
                            button.dataset.view;

                        if (view === "home") {

                            window.scrollTo({
                                top: 0,
                                behavior: "smooth"
                            });

                        } else if (
                            view === "search"
                        ) {

                            searchInput.focus();

                        } else if (
                            view === "library"
                        ) {

                            setCategory(
                                "All Songs"
                            );
                        }

                        if (
                            window.innerWidth <= 800
                        ) {
                            closeMenu();
                        }
                    }
                );
            });
    }

    /* ==================================================
       SONG API
    ================================================== */

    async function loadSongs() {

        showLoading();

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

            if (
                !data ||
                !Array.isArray(data.songs)
            ) {
                throw new Error(
                    "Invalid song response"
                );
            }

            state.songs =
                normalizeSongs(data.songs);

            state.filteredSongs =
                [...state.songs];

            allSongCount.textContent =
                state.songs.length;

            renderCategories();

            renderSongs();

        } catch (error) {

            console.error(
                "Unable to load songs:",
                error
            );

            showError(
                "Unable to load songs",
                "Check that your server is running and your songs folder contains supported audio files."
            );
        }
    }

    /* ==================================================
       NORMALIZE
    ================================================== */

    function normalizeSongs(songs) {

        return songs.map(
            (song, index) => ({

                id:
                    song.id ||
                    `song-${index}`,

                title:
                    song.title ||
                    song.name ||
                    "Unknown Song",

                artist:
                    song.artist ||
                    song.category ||
                    "स्वरAJ",

                category:
                    song.category ||
                    "All Songs",

                url:
                    song.url ||
                    song.path ||
                    "",

                image:
                    song.image ||
                    "/images/default-cover.svg"
            })
        );
    }

    /* ==================================================
       CATEGORIES
    ================================================== */

    function getCategories() {

        const map =
            new Map();

        for (const song of state.songs) {

            const category =
                song.category ||
                "Other";

            map.set(
                category,
                (map.get(category) || 0) + 1
            );
        }

        return Array.from(
            map.entries()
        )
            .map(
                ([name, count]) => ({
                    name,
                    count
                })
            )
            .sort(
                (a, b) =>
                    a.name.localeCompare(
                        b.name
                    )
            );
    }

    function renderCategories() {

        const categories =
            getCategories();

        /* Sidebar */

        categoryList.innerHTML = "";

        const allButton =
            createCategoryButton(
                "All Songs",
                state.songs.length,
                true
            );

        categoryList.appendChild(
            allButton
        );

        categories.forEach(
            (category) => {

                categoryList.appendChild(
                    createCategoryButton(
                        category.name,
                        category.count,
                        false
                    )
                );
            }
        );

        /* Cards */

        categoryCards.innerHTML = "";

        if (!categories.length) {

            categoryCards.innerHTML = `
                <div class="loading-card">
                    No categories found.
                </div>
            `;

            return;
        }

        categories.forEach(
            (category, index) => {

                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "category-card";

                card.innerHTML = `
                    <div class="category-card-icon">
                        ${getCategoryIcon(index)}
                    </div>

                    <div class="category-card-title">
                        ${escapeHtml(category.name)}
                    </div>

                    <span class="category-card-count">
                        ${category.count} song${category.count === 1 ? "" : "s"}
                    </span>
                `;

                card.addEventListener(
                    "click",
                    () =>
                        setCategory(
                            category.name
                        )
                );

                categoryCards.appendChild(
                    card
                );
            }
        );
    }

    function createCategoryButton(
        name,
        count,
        active
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.type = "button";

        button.className =
            "category-item";

        if (active) {
            button.classList.add(
                "active"
            );
        }

        button.dataset.category =
            name;

        button.innerHTML = `
            <span class="category-symbol">
                ${getCategoryIcon(
                    name.length
                )}
            </span>

            <span>
                ${escapeHtml(name)}
            </span>

            <small>
                ${count}
            </small>
        `;

        button.addEventListener(
            "click",
            () => {

                setCategory(name);

                if (
                    window.innerWidth <= 800
                ) {
                    closeMenu();
                }
            }
        );

        return button;
    }

    function getCategoryIcon(index) {

        const icons = [
            "✦",
            "◉",
            "◆",
            "♫",
            "✧",
            "◈",
            "●",
            "✺",
            "❖"
        ];

        return icons[
            Math.abs(index) %
            icons.length
        ];
    }

    function setCategory(category) {

        state.activeCategory =
            category;

        document
            .querySelectorAll(
                ".category-item"
            )
            .forEach(
                (button) => {

                    button.classList.toggle(
                        "active",
                        button.dataset.category ===
                            category
                    );
                }
            );

        songsTitle.textContent =
            category;

        activeCategoryLabel.textContent =
            category === "All Songs"
                ? "YOUR MUSIC"
                : "CATEGORY";

        applyFilters();
    }

    /* ==================================================
       SEARCH
    ================================================== */

    function setupSearch() {

        searchInput.addEventListener(
            "input",
            () => {

                clearSearch.style.display =
                    searchInput.value
                        ? "block"
                        : "none";

                applyFilters();
            }
        );

        clearSearch.addEventListener(
            "click",
            () => {

                searchInput.value = "";

                clearSearch.style.display =
                    "none";

                applyFilters();

                searchInput.focus();
            }
        );

        $("#showAllCategories")
            .addEventListener(
                "click",
                () => {

                    window.scrollTo({
                        top:
                            document
                                .querySelector(
                                    ".category-section"
                                )
                                .offsetTop - 80,
                        behavior: "smooth"
                    });
                }
            );
    }

    function applyFilters() {

        const query =
            searchInput.value
                .trim()
                .toLowerCase();

        state.filteredSongs =
            state.songs.filter(
                (song) => {

                    const categoryMatch =
                        state.activeCategory ===
                            "All Songs" ||
                        song.category ===
                            state.activeCategory;

                    if (!categoryMatch) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    return (
                        song.title
                            .toLowerCase()
                            .includes(query) ||

                        song.artist
                            .toLowerCase()
                            .includes(query) ||

                        song.category
                            .toLowerCase()
                            .includes(query)
                    );
                }
            );

        renderSongs();
    }

    /* ==================================================
       SONG RENDER
    ================================================== */

    function renderSongs() {

        songGrid.innerHTML = "";

        visibleSongCount.textContent =
            state.filteredSongs.length;

        if (!state.filteredSongs.length) {

            songGrid.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ♪
                    </div>

                    <h3>
                        No songs found
                    </h3>

                    <p>
                        Add MP3/audio files to your
                        songs folder or change your search.
                    </p>

                </div>
            `;

            return;
        }

        state.filteredSongs.forEach(
            (song, index) => {

                const card =
                    document.createElement(
                        "article"
                    );

                card.className =
                    "song-card";

                if (
                    state.currentSong &&
                    state.currentSong.id ===
                        song.id
                ) {
                    card.classList.add(
                        "playing"
                    );
                }

                card.innerHTML = `
                    <div class="song-cover">

                        <img
                            src="${escapeAttribute(song.image)}"
                            alt=""
                            loading="lazy"
                            onerror="this.style.display='none'"
                        >

                        <button
                            class="song-play liquid-button"
                            type="button"
                            aria-label="Play ${escapeAttribute(song.title)}"
                        >
                            ▶
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

                    <button
                        class="song-menu"
                        type="button"
                        aria-label="Song options"
                    >
                        ⋮
                    </button>
                `;

                const play =
                    card.querySelector(
                        ".song-play"
                    );

                play.addEventListener(
                    "click",
                    (event) => {

                        event.stopPropagation();

                        playSong(song);
                    }
                );

                card.addEventListener(
                    "click",
                    () =>
                        playSong(song)
                );

                songGrid.appendChild(
                    card
                );
            }
        );
    }

    /* ==================================================
       PLAY SONG
    ================================================== */

    function playSong(song) {

        if (!song || !song.url) {

            console.error(
                "Song URL missing:",
                song
            );

            return;
        }

        state.currentSong =
            song;

        state.currentIndex =
            state.songs.findIndex(
                item =>
                    item.id === song.id
            );

        audio.src = song.url;

        audio.volume =
            state.isMuted
                ? 0
                : state.volume;

        updatePlayerUI();

        audio.play()
            .then(() => {

                state.isPlaying =
                    true;

                updatePlayButton();

                renderSongs();

            })
            .catch(
                (error) => {

                    console.error(
                        "Playback failed:",
                        error
                    );

                    state.isPlaying =
                        false;

                    updatePlayButton();
                }
            );
    }

    /* ==================================================
       AUDIO EVENTS
    ================================================== */

    function setupAudio() {

        audio.addEventListener(
            "play",
            () => {

                state.isPlaying =
                    true;

                updatePlayButton();
            }
        );

        audio.addEventListener(
            "pause",
            () => {

                state.isPlaying =
                    false;

                updatePlayButton();
            }
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
            "timeupdate",
            updateProgress
        );

        audio.addEventListener(
            "ended",
            handleEnded
        );

        audio.addEventListener(
            "error",
            () => {

                console.error(
                    "Audio error:",
                    audio.error
                );

                state.isPlaying =
                    false;

                updatePlayButton();
            }
        );
    }

    /* ==================================================
       PLAYER CONTROLS
    ================================================== */

    function setupPlayerControls() {

        playButton.addEventListener(
            "click",
            togglePlay
        );

        heroPlay.addEventListener(
            "click",
            () => {

                if (
                    state.currentSong
                ) {
                    togglePlay();
                    return;
                }

                if (
                    state.songs.length
                ) {
                    playSong(
                        state.songs[0]
                    );
                }
            }
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
            toggleShuffle
        );

        shufflePlayer.addEventListener(
            "click",
            toggleShuffle
        );

        repeatButton.addEventListener(
            "click",
            () => {

                state.isRepeat =
                    !state.isRepeat;

                repeatButton.classList.toggle(
                    "active",
                    state.isRepeat
                );
            }
        );

        muteButton.addEventListener(
            "click",
            toggleMute
        );

        volumeSlider.addEventListener(
            "input",
            () => {

                state.volume =
                    Number(
                        volumeSlider.value
                    );

                state.isMuted =
                    state.volume === 0;

                audio.volume =
                    state.isMuted
                        ? 0
                        : state.volume;

                updateMuteIcon();
            }
        );

        progressTrack.addEventListener(
            "click",
            seekAudio
        );

        likeButton.addEventListener(
            "click",
            () => {

                likeButton.classList.toggle(
                    "liked"
                );

                likeButton.textContent =
                    likeButton.classList.contains(
                        "liked"
                    )
                        ? "♥"
                        : "♡";
            }
        );
    }

    function togglePlay() {

        if (!state.currentSong) {

            if (state.songs.length) {
                playSong(
                    state.songs[0]
                );
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

    function playPrevious() {

        if (!state.songs.length) {
            return;
        }

        if (
            audio.currentTime > 5
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

        playSong(
            state.songs[index]
        );
    }

    function playNext() {

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

    function toggleShuffle() {

        state.isShuffle =
            !state.isShuffle;

        shuffleButton.classList.toggle(
            "active",
            state.isShuffle
        );

        shufflePlayer.classList.toggle(
            "active",
            state.isShuffle
        );
    }

    function handleEnded() {

        if (state.isRepeat) {

            audio.currentTime = 0;

            audio.play();

            return;
        }

        playNext();
    }

    /* ==================================================
       PROGRESS
    ================================================== */

    function updateProgress() {

        if (
            !audio.duration ||
            !Number.isFinite(
                audio.duration
            )
        ) {
            return;
        }

        const percentage =
            (
                audio.currentTime /
                audio.duration
            ) * 100;

        progressLiquid.style.width =
            `${percentage}%`;

        progressTrack.setAttribute(
            "aria-valuenow",
            String(
                Math.round(
                    percentage
                )
            )
        );

        currentTime.textContent =
            formatTime(
                audio.currentTime
            );
    }

    function seekAudio(event) {

        if (
            !audio.duration ||
            !Number.isFinite(
                audio.duration
            )
        ) {
            return;
        }

        const rect =
            progressTrack.getBoundingClientRect();

        const percentage =
            Math.max(
                0,
                Math.min(
                    1,
                    (
                        event.clientX -
                        rect.left
                    ) / rect.width
                )
            );

        audio.currentTime =
            audio.duration *
            percentage;
    }

    /* ==================================================
       VOLUME
    ================================================== */

    function updateVolume() {

        audio.volume =
            state.volume;

        volumeSlider.value =
            state.volume;

        updateMuteIcon();
    }

    function toggleMute() {

        state.isMuted =
            !state.isMuted;

        audio.volume =
            state.isMuted
                ? 0
                : state.volume;

        updateMuteIcon();
    }

    function updateMuteIcon() {

        muteButton.textContent =
            state.isMuted
                ? "×"
                : "◖";
    }

    /* ==================================================
       PLAYER UI
    ================================================== */

    function updatePlayerUI() {

        if (!state.currentSong) {

            playerTitle.textContent =
                "No song selected";

            playerArtist.textContent =
                "Select a song to start";

            return;
        }

        playerTitle.textContent =
            state.currentSong.title;

        playerArtist.textContent =
            state.currentSong.artist;

        if (
            state.currentSong.image
        ) {

            playerCover.style.backgroundImage =
                `url("${state.currentSong.image}")`;

            playerCover.style.backgroundSize =
                "cover";

            playerCover.style.backgroundPosition =
                "center";
        }
    }

    function updatePlayButton() {

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

        heroPlay.querySelector(
            ".button-icon"
        ).textContent =
            state.isPlaying
                ? "Ⅱ"
                : "▶";
    }

    /* ==================================================
       KEYBOARD
    ================================================== */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            (event) => {

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

                    togglePlay();
                }

                if (
                    event.code ===
                    "ArrowRight"
                ) {

                    playNext();
                }

                if (
                    event.code ===
                    "ArrowLeft"
                ) {

                    playPrevious();
                }
            }
        );
    }

    /* ==================================================
       TOUCH
    ================================================== */

    function setupTouch() {

        let touchStartX = 0;

        document.addEventListener(
            "touchstart",
            (event) => {

                if (
                    !event.touches.length
                ) {
                    return;
                }

                touchStartX =
                    event.touches[0]
                        .clientX;
            },
            {
                passive: true
            }
        );

        document.addEventListener(
            "touchend",
            (event) => {

                if (
                    !event.changedTouches.length
                ) {
                    return;
                }

                const touchEndX =
                    event.changedTouches[0]
                        .clientX;

                const difference =
                    touchEndX -
                    touchStartX;

                if (
                    Math.abs(
                        difference
                    ) < 80
                ) {
                    return;
                }

                if (
                    difference < 0
                ) {
                    playNext();
                } else {
                    playPrevious();
                }
            },
            {
                passive: true
            }
        );
    }

    /* ==================================================
       LOADING
    ================================================== */

    function showLoading() {

        songGrid.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ◌
                </div>

                <h3>
                    Loading your music
                </h3>

                <p>
                    Scanning the songs folder...
                </p>

            </div>
        `;
    }

    function showError(
        title,
        message
    ) {

        songGrid.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    !
                </div>

                <h3>
                    ${escapeHtml(title)}
                </h3>

                <p>
                    ${escapeHtml(message)}
                </p>

                <button
                    class="primary-button liquid-button"
                    style="margin:20px auto 0"
                    type="button"
                    onclick="location.reload()"
                >
                    Retry
                </button>

            </div>
        `;
    }

    /* ==================================================
       UTILITIES
    ================================================== */

    function formatTime(seconds) {

        if (
            !Number.isFinite(
                seconds
            ) ||
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

        return (
            `${minutes}:` +
            `${remaining
                .toString()
                .padStart(2, "0")}`
        );
    }

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

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

})();
