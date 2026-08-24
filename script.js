/* =====================================================
   स्वरAJ MUSIC ENGINE
   Local Music + YouTube
===================================================== */

(() => {

    "use strict";

    /* =================================================
       STATE
    ================================================= */

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

        volume: 0.8,

        youtubeVideos: [],

        youtubeCurrentId: null

    };

    /* =================================================
       DOM
    ================================================= */

    const $ = selector =>
        document.querySelector(selector);

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

    const searchInput =
        $("#searchInput");

    const clearSearch =
        $("#clearSearch");

    const categoryList =
        $("#categoryList");

    const categoryCards =
        $("#categoryCards");

    const songGrid =
        $("#songGrid");

    const songsTitle =
        $("#songsTitle");

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

    const homePage =
        $("#homePage");

    const youtubePage =
        $("#youtubePage");

    const youtubeSearch =
        $("#youtubeSearch");

    const youtubeSearchButton =
        $("#youtubeSearchButton");

    const youtubeResults =
        $("#youtubeResults");

    const youtubePlayer =
        $("#youtubePlayer");

    /* =================================================
       INIT
    ================================================= */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

    async function init() {

        setupMenu();

        setupNavigation();

        setupSearch();

        setupPlayer();

        setupAudio();

        setupKeyboard();

        setupHero();

        setupYouTube();

        updateVolume();

        await loadSongs();

    }

    /* =================================================
       MOBILE MENU
    ================================================= */

    function setupMenu() {

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

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {
                    closeMenu();
                }

            }
        );

    }

    function toggleMenu() {

        if (
            sidebar.classList.contains("open")
        ) {

            closeMenu();

        } else {

            openMenu();

        }

    }

    function openMenu() {

        sidebar.classList.add("open");

        mobileOverlay.classList.add(
            "active"
        );

        menuButton.classList.add(
            "active"
        );

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        mobileOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

    }

    function closeMenu() {

        sidebar.classList.remove("open");

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

        mobileOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }

    /* =================================================
       NAVIGATION
    ================================================= */

    function setupNavigation() {

        document
            .querySelectorAll(".nav-item")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(item =>
                                item.classList.remove(
                                    "active"
                                )
                            );

                        button.classList.add(
                            "active"
                        );

                        const view =
                            button.dataset.view;

                        if (
                            view === "youtube"
                        ) {

                            showYouTube();

                        } else {

                            showHome();

                            if (
                                view === "home"
                            ) {

                                window.scrollTo({
                                    top: 0,
                                    behavior:
                                        "smooth"
                                });

                            }

                            if (
                                view === "search"
                            ) {

                                setTimeout(
                                    () =>
                                        searchInput.focus(),
                                    150
                                );

                            }

                            if (
                                view === "library"
                            ) {

                                setCategory(
                                    "All Songs"
                                );

                            }

                        }

                        if (
                            window.innerWidth <=
                            800
                        ) {

                            closeMenu();

                        }

                    }
                );

            });

    }

    function showHome() {

        homePage.hidden = false;

        youtubePage.hidden = true;

    }

    function showYouTube() {

        homePage.hidden = true;

        youtubePage.hidden = false;

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }

    /* =================================================
       SONG API
    ================================================= */

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
                normalizeSongs(
                    data.songs
                );

            state.filteredSongs =
                [...state.songs];

            allSongCount.textContent =
                state.songs.length;

            renderCategories();

            renderSongs();

        } catch (error) {

            console.error(
                "Song loading error:",
                error
            );

            showError(
                "Unable to load songs",
                "Check /api/songs and make sure your songs folder contains audio files."
            );

        }

    }

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

    /* =================================================
       CATEGORIES
    ================================================= */

    function getCategories() {

        const map =
            new Map();

        state.songs.forEach(song => {

            const category =
                song.category ||
                "Other";

            map.set(
                category,
                (map.get(category) || 0) + 1
            );

        });

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

        categoryList.innerHTML = "";

        categoryList.appendChild(
            createCategoryButton(
                "All Songs",
                state.songs.length
            )
        );

        categories.forEach(
            category => {

                categoryList.appendChild(
                    createCategoryButton(
                        category.name,
                        category.count
                    )
                );

            }
        );

        categoryCards.innerHTML = "";

        if (!categories.length) {

            categoryCards.innerHTML =
                `
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

                card.innerHTML =
                    `
                    <div class="category-card-icon">
                        ${getCategoryIcon(index)}
                    </div>

                    <div class="category-card-title">
                        ${escapeHtml(
                            category.name
                        )}
                    </div>

                    <span class="category-card-count">
                        ${category.count}
                        song${category.count === 1 ? "" : "s"}
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
        count
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.type = "button";

        button.className =
            "category-item";

        button.dataset.category =
            name;

        if (
            state.activeCategory ===
            name
        ) {

            button.classList.add(
                "active"
            );

        }

        button.innerHTML =
            `
            <span class="cat-icon">
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
                    window.innerWidth <=
                    800
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
            .forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.category ===
                    category
                );

            });

        songsTitle.textContent =
            category;

        activeCategoryLabel.textContent =
            category === "All Songs"
                ? "YOUR MUSIC"
                : "CATEGORY";

        applyFilters();

        showHome();

    }

    /* =================================================
       SEARCH
    ================================================= */

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
            ?.addEventListener(
                "click",
                () => {

                    document
                        .querySelector(
                            ".category-grid"
                        )
                        ?.scrollIntoView({
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
                song => {

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

    /* =================================================
       SONG RENDER
    ================================================= */

    function renderSongs() {

        songGrid.innerHTML = "";

        visibleSongCount.textContent =
            state.filteredSongs.length;

        if (
            !state.filteredSongs.length
        ) {

            songGrid.innerHTML =
                `
                <div class="empty-state">

                    <div>♪</div>

                    <h3>
                        No songs found
                    </h3>

                    <p>
                        Add audio files to
                        your songs folder.
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

                card.innerHTML =
                    `
                    <div class="song-cover">

                        <img
                            src="${escapeAttribute(
                                song.image
                            )}"
                            alt=""
                            loading="lazy"
                            onerror="
                                this.style.display='none'
                            "
                        >

                        <button
                            class="song-play"
                            type="button"
                            aria-label="Play"
                        >
                            ▶
                        </button>

                    </div>

                    <div class="song-info">

                        <span class="song-title">
                            ${escapeHtml(
                                song.title
                            )}
                        </span>

                        <span class="song-artist">
                            ${escapeHtml(
                                song.artist
                            )}
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
                    event => {

                        event.stopPropagation();

                        playSong(
                            song
                        );

                    }
                );

                card.addEventListener(
                    "dblclick",
                    () =>
                        playSong(song)
                );

                songGrid.appendChild(
                    card
                );

            }
        );

    }

    /* =================================================
       PLAYER
    ================================================= */

    function setupPlayer() {

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

                } else if (
                    state.songs.length
                ) {

                    playSong(
                        state.songs[0]
                    );

                }

            }
        );

        nextButton.addEventListener(
            "click",
            nextSong
        );

        previousButton.addEventListener(
            "click",
            previousSong
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
            updateVolume
        );

        progressTrack.addEventListener(
            "click",
            seekAudio
        );

        likeButton.addEventListener(
            "click",
            () => {

                likeButton.textContent =
                    likeButton.textContent ===
                    "♥"
                        ? "♡"
                        : "♥";

            }
        );

    }

    function setupAudio() {

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
            "play",
            () => {

                state.isPlaying = true;

                updatePlayButtons();

                renderSongs();

            }
        );

        audio.addEventListener(
            "pause",
            () => {

                state.isPlaying = false;

                updatePlayButtons();

                renderSongs();

            }
        );

        audio.addEventListener(
            "ended",
            () => {

                if (
                    state.isRepeat
                ) {

                    audio.currentTime = 0;

                    audio.play();

                } else {

                    nextSong();

                }

            }
        );

        audio.addEventListener(
            "error",
            event => {

                console.error(
                    "Audio error:",
                    event
                );

            }
        );

    }

    function playSong(song) {

        if (!song || !song.url) {
            return;
        }

        state.currentSong =
            song;

        state.currentIndex =
            state.songs.findIndex(
                item =>
                    item.id ===
                    song.id
            );

        audio.src =
            song.url;

        audio.volume =
            state.volume;

        audio.muted =
            state.isMuted;

        playerTitle.textContent =
            song.title;

        playerArtist.textContent =
            song.artist;

        if (song.image) {

            playerCover.style.backgroundImage =
                `url("${song.image}")`;

            playerCover.style.backgroundSize =
                "cover";

            playerCover.textContent = "";

        }

        audio.play()
            .catch(error =>
                console.warn(
                    "Playback blocked:",
                    error
                )
            );

        renderSongs();

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
                .catch(console.error);

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

        } else {

            nextIndex =
                state.currentIndex + 1;

            if (
                nextIndex >=
                state.songs.length
            ) {

                nextIndex = 0;

            }

        }

        playSong(
            state.songs[nextIndex]
        );

    }

    function previousSong() {

        if (!state.songs.length) {
            return;
        }

        if (
            audio.currentTime > 5
        ) {

            audio.currentTime = 0;

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

        playSong(
            state.songs[previousIndex]
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

    function toggleMute() {

        state.isMuted =
            !state.isMuted;

        audio.muted =
            state.isMuted;

        muteButton.textContent =
            state.isMuted
                ? "×"
                : "◖";

    }

    function updateVolume() {

        state.volume =
            Number(
                volumeSlider.value
            );

        audio.volume =
            state.volume;

        if (
            state.volume > 0 &&
            state.isMuted
        ) {

            state.isMuted = false;

            audio.muted = false;

        }

    }

    function updateProgress() {

        if (
            !audio.duration
        ) {
            return;
        }

        const percent =
            (
                audio.currentTime /
                audio.duration
            ) * 100;

        progressLiquid.style.width =
            `${percent}%`;

        currentTime.textContent =
            formatTime(
                audio.currentTime
            );

        duration.textContent =
            formatTime(
                audio.duration
            );

        progressTrack.setAttribute(
            "aria-valuenow",
            String(
                Math.round(percent)
            )
        );

    }

    function seekAudio(event) {

        if (!audio.duration) {
            return;
        }

        const rect =
            progressTrack.getBoundingClientRect();

        const percent =
            Math.min(
                1,
                Math.max(
                    0,
                    (
                        event.clientX -
                        rect.left
                    ) /
                    rect.width
                )
            );

        audio.currentTime =
            audio.duration *
            percent;

    }

    function updatePlayButtons() {

        const symbol =
            state.isPlaying
                ? "Ⅱ"
                : "▶";

        playButton.textContent =
            symbol;

        heroPlay.innerHTML =
            `
            <b>
                ${symbol}
            </b>
            ${state.isPlaying
                ? "Pause"
                : "Play Music"}
            `;

    }

    /* =================================================
       HERO
    ================================================= */

    function setupHero() {

        const art =
            $("#heroArt");

        if (!art) {
            return;
        }

        art.addEventListener(
            "pointermove",
            event => {

                const rect =
                    art.getBoundingClientRect();

                const x =
                    (
                        event.clientX -
                        rect.left
                    ) /
                    rect.width -
                    .5;

                const y =
                    (
                        event.clientY -
                        rect.top
                    ) /
                    rect.height -
                    .5;

                art.style.transform =
                    `
                    perspective(700px)
                    rotateY(${x * 14}deg)
                    rotateX(${-y * 14}deg)
                    scale(1.04)
                    `;

            }
        );

        art.addEventListener(
            "pointerleave",
            () => {

                art.style.transform = "";

            }
        );

    }

    /* =================================================
       YOUTUBE
    ================================================= */

    function setupYouTube() {

        youtubeSearchButton.addEventListener(
            "click",
            searchYouTube
        );

        youtubeSearch.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {

                    searchYouTube();

                }

            }
        );

    }

    async function searchYouTube() {

        const query =
            youtubeSearch.value.trim();

        if (!query) {
            return;
        }

        youtubeResults.innerHTML =
            `
            <div class="youtube-empty">
                Searching YouTube...
            </div>
            `;

        showYouTube();

        try {

            const response =
                await fetch(
                    `/api/youtube/search?q=${encodeURIComponent(
                        query
                    )}`
                );

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "YouTube search failed"
                );

            }

            if (
                !data.success ||
                !Array.isArray(
                    data.videos
                )
            ) {

                throw new Error(
                    "Invalid YouTube response"
                );

            }

            state.youtubeVideos =
                data.videos;

            renderYouTubeResults();

            if (
                state.youtubeVideos.length
            ) {

                playYouTube(
                    state.youtubeVideos[0]
                );

            }

        } catch (error) {

            console.error(
                "YouTube error:",
                error
            );

            youtubeResults.innerHTML =
                `
                <div class="youtube-empty">

                    <strong>
                        YouTube search unavailable
                    </strong>

                    <p style="margin-top:10px">
                        ${escapeHtml(
                            error.message
                        )}
                    </p>

                    <p style="margin-top:10px">
                        Add YOUTUBE_API_KEY
                        in Render →
                        Environment Variables.
                    </p>

                </div>
                `;

        }

    }

    function renderYouTubeResults() {

        youtubeResults.innerHTML = "";

        state.youtubeVideos.forEach(
            video => {

                const card =
                    document.createElement(
                        "button"
                    );

                card.type = "button";

                card.className =
                    "youtube-card";

                card.innerHTML =
                    `
                    <img
                        src="${escapeAttribute(
                            video.thumbnail
                        )}"
                        alt=""
                        loading="lazy"
                    >

                    <div>

                        <strong>
                            ${escapeHtml(
                                video.title
                            )}
                        </strong>

                        <span>
                            ${escapeHtml(
                                video.channel
                            )}
                        </span>

                    </div>
                    `;

                card.addEventListener(
                    "click",
                    () =>
                        playYouTube(video)
                );

                youtubeResults.appendChild(
                    card
                );

            }
        );

    }

    function playYouTube(video) {

        if (!video || !video.id) {
            return;
        }

        state.youtubeCurrentId =
            video.id;

        youtubePlayer.innerHTML =
            `
            <iframe
                src="https://www.youtube.com/embed/${encodeURIComponent(
                    video.id
                )}?autoplay=1&rel=0&modestbranding=1"
                title="${escapeAttribute(
                    video.title
                )}"
                allow="
                    autoplay;
                    encrypted-media;
                    picture-in-picture;
                    web-share
                "
                allowfullscreen
                loading="lazy"
            ></iframe>
            `;

    }

    /* =================================================
       KEYBOARD
    ================================================= */

    function setupKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                const target =
                    event.target;

                if (
                    target &&
                    (
                        target.tagName ===
                        "INPUT" ||
                        target.tagName ===
                        "TEXTAREA"
                    )
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

            }
        );

    }

    /* =================================================
       HELPERS
    ================================================= */

    function showLoading() {

        songGrid.innerHTML =
            `
            <div class="empty-state">

                <div>♪</div>

                <h3>
                    Loading your music
                </h3>

                <p>
                    Scanning songs folder...
                </p>

            </div>
            `;

    }

    function showError(
        title,
        message
    ) {

        songGrid.innerHTML =
            `
            <div class="empty-state">

                <div>!</div>

                <h3>
                    ${escapeHtml(title)}
                </h3>

                <p>
                    ${escapeHtml(message)}
                </p>

            </div>
            `;

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

        const secs =
            Math.floor(
                seconds % 60
            )
                .toString()
                .padStart(2, "0");

        return `${minutes}:${secs}`;

    }

    function escapeHtml(value) {

        return String(value)
            .replace(
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

    function escapeAttribute(value) {

        return escapeHtml(value);

    }

})();