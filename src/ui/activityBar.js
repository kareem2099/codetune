// Modern Quran Player - Activity Bar JavaScript
const vscode = acquireVsCodeApi();

class QuranActivityBar {
    constructor() {
        this.currentSurah = null;
        this.currentAyah = null;
        this.isPlaying = false;
        this.volume = 70;
        this.playbackMode = 'surah'; // 'surah' or 'ayah'
        this.currentPlaybackMode = null; // Track current audio playback mode
        this.reciter = 'ar.alafasy';
        this.audioQuality = '128';
        this.searchTimeout = null;
        this.surahData = this.getSurahData();
        this.audioElement = null;
        this.currentAudioUrl = null;
        this.currentTime = 0;
        this.duration = 0;
        this.selectedSurahNumber = null; // Initialize selectedSurahNumber

        // Salawat Counter properties
        this.salawatCounter = {
            currentCount: 0,
            dailyTarget: 11,
            lastResetDate: null,
            userSetTarget: false
        };

        // Tasbih Counter properties
        this.tasbihCounters = {
            subhanallah: 0,
            alhamdulillah: 0,
            laIlahaIllaAllah: 0,
            allahuAkbar: 0
        };

        // Istighfar Counter properties
        this.istighfarCounters = {
            astaghfirullah: 0,
            subhanakallahumma: 0
        };

        // Popular Adhkar Counter properties
        this.adhkarCounters = {
            auzubillahi: 0,
            rabbiGhifir: 0,
            hasbiyallah: 0,
            laHawla: 0
        };

        // Islamic Goals - Prayer completion tracking
        this.prayerGoals = {
            fajr: false,
            dhuhr: false,
            asr: false,
            maghrib: false,
            isha: false
        };

        this.loadSalawatCounter();
        this.loadTasbihCounters();
        this.loadIstighfarCounters();
        this.loadAdhkarCounters();
        this.loadPrayerGoals();

        // Create Islamic reminders instance for counter integration
        this.fridayReminders = null; // Will be initialized from extension global

        // Quran Reader properties
        this.currentReadingSurah = null;
        this.currentReadingPage = 1;
        this.totalReadingPages = 1;
        this.versesPerPage = 10; // Show 10 verses per page
        this.cachedVerses = {}; // Cache for verse data

        // Auto Reading properties
        this.autoReadingEnabled = false;
        this.autoReadingActive = false;
        this.autoReadingSpeed = 1; // 0.5 = slow, 1 = normal, 1.5 = fast, 2 = very fast
        this.autoReadingInterval = null;

        // Additional settings properties
        this.autoPlayStartup = false;
        this.theme = 'auto';
        this.compactMode = false;
        this.showNotifications = true;
        this.language = 'auto';
        this.enableReminders = true;
        this.reminderInterval = 30;
        this.reminderTypes = {
            showAdia: true,
            showAhadis: true,
            showWisdom: true,
            showMorningAzkar: true,
            showEveningAzkar: true
        };
        this.workingHoursOnly = false;
        this.islamicReminders = {
            fajr: false,
            dhuhr: false,
            asr: false,
            maghrib: false,
            isha: false
        };
        this.cacheSize = 100;
        this.downloadTimeout = 30;
        this.retryAttempts = 3;

        // Quran Listening Statistics
        this.listeningStats = {
            totalSessions: 0,
            totalTimePlayed: 0, // in milliseconds
            dailyStats: {},
            dailyTimeStats: {}, // time in milliseconds per day
            lastUpdated: null,
            statsMode: 'sessions' // 'sessions' or 'time'
        };

        // Time tracking
        this.playStartTime = null;
        this.currentSessionTime = 0; // time played in current session

        // Initialize the activity bar components
        this.loadSettings();
        this.bindEvents();
        this.initializeAudio();
        this.startIslamicTimer();
        this.forceUpdateIslamicInfo();
        this.updateSalawatCounterUI();
        this.listenForLanguageChanges();
        if (window.localization) {
            window.localization.localizeElements();
        }
        this.showWelcomeMessage();
    }

    bindEvents() {
        // Statistics mode toggle
        const statsIcon = document.querySelector('.stats-icon');
        if (statsIcon) {
            statsIcon.style.cursor = 'pointer';
            statsIcon.addEventListener('click', () => {
                this.toggleStatisticsMode();
            });
        }

        try {
            // Quick access surah cards (audio)
            document.querySelectorAll('.surah-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const surahNumber = e.currentTarget.dataset.surah;
                    this.showPlaybackOptionsModal(surahNumber);
                });
            });

            // Reader surah cards (text reading)
            document.querySelectorAll('.read-surah-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const surahNumber = e.currentTarget.dataset.surah;
                    this.openQuranReader(surahNumber);
                });
            });

            // Browse read surahs button
            document.getElementById('browseReadBtn').addEventListener('click', () => {
                this.openSurahBrowser(true); // true = reading mode
            });

            // Quran Reader Modal close events
            const quranReaderModal = document.getElementById('quranReaderModal');
            if (quranReaderModal) {
                quranReaderModal.addEventListener('click', (e) => {
                    if (e.target.id === 'quranReaderModal') {
                        this.closeQuranReader();
                    }
                });
            }

            const readerCloseBtn = document.getElementById('readerClose');
            if (readerCloseBtn) {
                readerCloseBtn.addEventListener('click', () => {
                    this.closeQuranReader();
                });
            }

            const closeReaderBtn = document.getElementById('closeReaderBtn');
            if (closeReaderBtn) {
                closeReaderBtn.addEventListener('click', () => {
                    this.closeQuranReader();
                });
            }

            // Navigation buttons
            const prevPageBtn = document.getElementById('prevPageBtn');
            if (prevPageBtn) {
                prevPageBtn.addEventListener('click', () => {
                    this.navigatePage('prev');
                });
            }

            const nextPageBtn = document.getElementById('nextPageBtn');
            if (nextPageBtn) {
                nextPageBtn.addEventListener('click', () => {
                    this.navigatePage('next');
                });
            }

            // Playback controls - add null checks
            const playPauseBtn = document.getElementById('playPauseBtn');
            if (playPauseBtn) {
                playPauseBtn.addEventListener('click', () => {
                    this.togglePlayback();
                });
            }

            const prevBtn = document.getElementById('prevBtn');
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    this.previousSurah();
                });
            }

            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    this.nextSurah();
                });
            }

            // Volume control
            const volumeSlider = document.getElementById('volumeSlider');
            if (volumeSlider) {
                volumeSlider.addEventListener('input', (e) => {
                    this.setVolume(e.target.value);
                });
            }

            // Search functionality
            const surahSearch = document.getElementById('surahSearch');
            if (surahSearch) {
                surahSearch.addEventListener('input', (e) => {
                    this.handleSearch(e.target.value);
                });
            }

            // Browse button
            const browseBtn = document.getElementById('browseBtn');
            if (browseBtn) {
                browseBtn.addEventListener('click', () => {
                    this.openSurahBrowser();
                });
            }



            // Header language selector
            const headerLanguageSelect = document.getElementById('headerLanguageSelect');
            if (headerLanguageSelect) {
                headerLanguageSelect.addEventListener('change', (e) => {
                    this.updateLanguageSetting(e.target.value);
                });
            }

            // Settings controls
            const reciterSelect = document.getElementById('reciterSelect');
            if (reciterSelect) {
                reciterSelect.addEventListener('change', (e) => {
                    this.updateReciterSetting(e.target.value);
                });
            }

            const autoPlayStartup = document.getElementById('autoPlayStartup');
            if (autoPlayStartup) {
                autoPlayStartup.addEventListener('change', (e) => {
                    this.updateAutoPlaySetting(e.target.checked);
                });
            }

            // Playback mode and theme are no longer UI controls - kept as settings only

            const compactMode = document.getElementById('compactMode');
            if (compactMode) {
                compactMode.addEventListener('change', (e) => {
                    this.updateCompactModeSetting(e.target.checked);
                });
            }

            const showNotifications = document.getElementById('showNotifications');
            if (showNotifications) {
                showNotifications.addEventListener('change', (e) => {
                    this.updateNotificationsSetting(e.target.checked);
                });
            }

            // Islamic reminders settings
            const enableReminders = document.getElementById('enableReminders');
            if (enableReminders) {
                enableReminders.addEventListener('change', (e) => {
                    this.updateEnableRemindersSetting(e.target.checked);
                });
            }

            const reminderIntervalSelect = document.getElementById('reminderIntervalSelect');
            if (reminderIntervalSelect) {
                reminderIntervalSelect.addEventListener('change', (e) => {
                    this.updateReminderIntervalSetting(e.target.value);
                });
            }

            // Reminder types
            ['showAdia', 'showAhadis', 'showWisdom', 'showMorningAzkar', 'showEveningAzkar'].forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', (e) => {
                        this.updateReminderTypeSetting(id, e.target.checked);
                    });
                }
            });

            const workingHoursOnly = document.getElementById('workingHoursOnly');
            if (workingHoursOnly) {
                workingHoursOnly.addEventListener('change', (e) => {
                    this.updateWorkingHoursSetting(e.target.checked);
                });
            }

            // Prayer reminders
            ['fajrReminder', 'duhrReminder', 'asrReminder', 'maghribReminder', 'ishaReminder'].forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', (e) => {
                        this.updateIslamicReminderSetting(id, e.target.checked);
                    });
                }
            });

            // Prayer Confirmation Modal
            const prayerYesBtn = document.getElementById('prayerYesBtn');
            if (prayerYesBtn) {
                prayerYesBtn.addEventListener('click', () => {
                    this.confirmPrayerCompleted();
                });
            }

            const prayerNoBtn = document.getElementById('prayerNoBtn');
            if (prayerNoBtn) {
                prayerNoBtn.addEventListener('click', () => {
                    this.dismissPrayerConfirmation();
                });
            }

            // Advanced settings
            const cacheSizeSelect = document.getElementById('cacheSizeSelect');
            if (cacheSizeSelect) {
                cacheSizeSelect.addEventListener('change', (e) => {
                    this.updateCacheSizeSetting(e.target.value);
                });
            }

            const downloadTimeoutSelect = document.getElementById('downloadTimeoutSelect');
            if (downloadTimeoutSelect) {
                downloadTimeoutSelect.addEventListener('change', (e) => {
                    this.updateDownloadTimeoutSetting(e.target.value);
                });
            }

            const retryAttemptsSelect = document.getElementById('retryAttemptsSelect');
            if (retryAttemptsSelect) {
                retryAttemptsSelect.addEventListener('change', (e) => {
                    this.updateRetryAttemptsSetting(e.target.value);
                });
            }

            // Surah Browser Modal
            const modalClose = document.getElementById('modalClose');
            if (modalClose) {
                modalClose.addEventListener('click', () => {
                    this.closeSurahBrowser();
                });
            }

            const surahModal = document.getElementById('surahModal');
            if (surahModal) {
                surahModal.addEventListener('click', (e) => {
                    if (e.target.id === 'surahModal') {
                        this.closeSurahBrowser();
                    }
                });
            }

            // Playback Options Modal
            const playbackOptionsClose = document.getElementById('playbackOptionsClose');
            if (playbackOptionsClose) {
                playbackOptionsClose.addEventListener('click', () => {
                    this.closePlaybackOptionsModal();
                });
            }

            const playbackOptionsModal = document.getElementById('playbackOptionsModal');
            if (playbackOptionsModal) {
                playbackOptionsModal.addEventListener('click', (e) => {
                    if (e.target.id === 'playbackOptionsModal') {
                        this.closePlaybackOptionsModal();
                    }
                });
            }

            const cancelPlaybackBtn = document.getElementById('cancelPlaybackBtn');
            if (cancelPlaybackBtn) {
                cancelPlaybackBtn.addEventListener('click', () => {
                    this.closePlaybackOptionsModal();
                });
            }

            const startPlaybackBtn = document.getElementById('startPlaybackBtn');
            if (startPlaybackBtn) {
                startPlaybackBtn.addEventListener('click', () => {
                    this.startSelectedPlayback();
                });
            }

            // Progress bar
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.addEventListener('click', (e) => {
                    this.seekToPosition(e);
                });
            }

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                this.handleKeyboard(e);
            });

            // Theme toggle
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    this.toggleTheme();
                });
            }

            // Auto reading controls
            const autoReadToggle = document.getElementById('autoReadToggle');
            if (autoReadToggle) {
                autoReadToggle.addEventListener('click', () => {
                    this.toggleAutoReading();
                });
            }

            const playPauseAutoRead = document.getElementById('playPauseAutoRead');
            if (playPauseAutoRead) {
                playPauseAutoRead.addEventListener('click', () => {
                    this.toggleAutoReadingPlayback();
                });
            }

            // Speed control buttons
            const speedButtons = document.querySelectorAll('.speed-btn');
            speedButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const speed = parseFloat(e.target.dataset.speed);
                    this.setAutoReadingSpeed(speed);
                });
            });

            // Salawat Counter Increment Button
            const salawatIncrementBtn = document.getElementById('salawatIncrementBtn');
            if (salawatIncrementBtn) {
                salawatIncrementBtn.addEventListener('click', () => {
                    this.incrementSalawatCounter();
                });
            }

            // Tasbih Counter Increment Buttons
            document.querySelectorAll('.dhikr-increment').forEach(button => {
                button.addEventListener('click', (e) => {
                    const dhikrType = e.currentTarget.dataset.dhikr;
                    this.incrementTasbihCounter(dhikrType);
                });
            });

            // Istighfar Counter Increment Buttons
            document.querySelectorAll('[data-dhikr^="istighfar-"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const dhikrType = e.currentTarget.dataset.dhikr;
                    this.incrementIstighfarCounter(dhikrType.replace('istighfar-', ''));
                });
            });

            // Adhkar Counter Increment Buttons
            document.querySelectorAll('[data-dhikr^="adhkar-"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const dhikrType = e.currentTarget.dataset.dhikr;
                    this.incrementAdhkarCounter(dhikrType.replace('adhkar-', ''));
                });
            });
        } catch (error) {
            console.warn('Failed to bind some events:', error);
        }
    }

    // Core functionality
    playSurah(surahNumber) {
        const surah = this.surahData.find(s => s.number === parseInt(surahNumber));
        if (!surah) {return;}

        this.currentSurah = surah;
        this.isPlaying = true;

        this.updateNowPlaying();
        this.updatePlaybackControls();
        this.showNotification(window.localization.getString('playingSurah', {
            surahName: surah.name,
            arabicName: surah.arabicName
        }));

        // Send message to extension
        this.postMessage('playQuran', { surah: surahNumber });
    }

    togglePlayback() {
        if (this.isPlaying) {
            this.pauseAudio();
        } else {
            this.resumeAudio();
        }
    }

    previousSurah() {
        if (!this.currentSurah) {return;}

        const currentIndex = this.surahData.findIndex(s => s.number === this.currentSurah.number);
        const prevIndex = Math.max(0, currentIndex - 1);
        this.playSurah(this.surahData[prevIndex].number.toString());
    }

    nextSurah() {
        if (!this.currentSurah) {return;}

        const currentIndex = this.surahData.findIndex(s => s.number === this.currentSurah.number);
        const nextIndex = Math.min(this.surahData.length - 1, currentIndex + 1);
        this.playSurah(this.surahData[nextIndex].number.toString());
    }

    setVolume(value) {
        this.volume = parseInt(value);
        document.getElementById('volumeValue').textContent = `${this.volume}%`;
        // Apply volume immediately to current audio
        if (this.audioElement) {
            this.audioElement.volume = this.volume / 100;
        }
        this.postMessage('setQuranVolume', { volume: this.volume / 100 });
        this.saveSettings();
    }

    // UI Updates
    updateUI() {
        this.updateNowPlaying();
        this.updatePlaybackControls();
        this.updateVolumeDisplay();
    }

    updateNowPlaying() {
        const nowPlayingEl = document.getElementById('nowPlaying');

        if (this.currentSurah) {
            document.getElementById('currentSurah').textContent = this.currentSurah.name;
            document.getElementById('currentSurahArabic').textContent = this.currentSurah.arabicName;
            nowPlayingEl.style.display = 'block';

            // Animate in
            nowPlayingEl.style.animation = 'none';
            setTimeout(() => {
                nowPlayingEl.style.animation = 'slideIn 0.3s ease-out';
            }, 10);
        } else {
            nowPlayingEl.style.display = 'none';
        }
    }

    updatePlaybackControls() {
        const playPauseIcon = document.getElementById('playPauseIcon');
        const playPauseBtn = document.getElementById('playPauseBtn');

        if (this.isPlaying) {
            playPauseIcon.textContent = '⏸️';
            playPauseBtn.classList.add('playing');
        } else {
            playPauseIcon.textContent = '▶️';
            playPauseBtn.classList.remove('playing');
        }
    }

    updateVolumeDisplay() {
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');

        if (volumeSlider) {
            volumeSlider.value = this.volume;
        }
        if (volumeValue) {volumeValue.textContent = `${this.volume}%`;}
    }

    // Search functionality
    handleSearch(query) {
        clearTimeout(this.searchTimeout);

        if (query.length < 2) {
            this.clearSearchHighlights();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    performSearch(query) {
        const filteredSurahs = this.surahData.filter(surah =>
            surah.name.toLowerCase().includes(query.toLowerCase()) ||
            surah.arabicName.includes(query) ||
            surah.number.toString().includes(query)
        );

        this.highlightSearchResults(filteredSurahs);
    }

    highlightSearchResults(results) {
        // Remove previous highlights
        document.querySelectorAll('.surah-card').forEach(card => {
            card.classList.remove('search-match', 'search-hidden');
        });

        if (results.length === 0) {return;}

        // Hide non-matching cards
        document.querySelectorAll('.surah-card').forEach(card => {
            const surahNumber = parseInt(card.dataset.surah);
            const isMatch = results.some(s => s.number === surahNumber);

            if (!isMatch) {
                card.classList.add('search-hidden');
            } else {
                card.classList.add('search-match');
            }
        });
    }

    clearSearchHighlights() {
        document.querySelectorAll('.surah-card').forEach(card => {
            card.classList.remove('search-match', 'search-hidden');
        });
    }

    // Modal functionality
    openSurahBrowser() {
        const modal = document.getElementById('surahModal');
        const surahList = document.getElementById('surahList');

        // Populate surah list
        surahList.innerHTML = '';
        this.surahData.forEach(surah => {
            const surahItem = document.createElement('div');
            surahItem.className = 'surah-item';
            surahItem.innerHTML = `
                <div class="surah-info">
                    <div class="surah-number">${surah.number}</div>
                    <div class="surah-details">
                        <div class="surah-name">${surah.name}</div>
                        <div class="surah-meta">${surah.verses} verses • ${surah.type}</div>
                    </div>
                </div>
                <div class="surah-arabic">${surah.arabicName}</div>
            `;

            surahItem.addEventListener('click', () => {
                this.showPlaybackOptionsModal(surah.number.toString());
                this.closeSurahBrowser();
            });

            surahList.appendChild(surahItem);
        });

        modal.style.display = 'flex';
        modal.style.animation = 'fadeIn 0.3s ease-out';

        // Focus search input
        document.getElementById('surahSearch').focus();
    }

    closeSurahBrowser() {
        const modal = document.getElementById('surahModal');
        modal.style.animation = 'fadeOut 0.3s ease-out';

        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // View switching functionality
    showMainView() {
        const playerCard = document.getElementById('player-card');
        const islamicCard = document.getElementById('islamic-info-card');
        const settingsView = document.getElementById('settingsActivityBarView');

        if (playerCard) {
            playerCard.style.display = 'block';
        }
        if (islamicCard) {
            islamicCard.style.display = 'block';
        }
        if (settingsView) {
            settingsView.style.display = 'none';
        }

        // Disable settings stylesheet when going back to main view
        const settingsStylesheet = document.getElementById('settingsStylesheet');
        if (settingsStylesheet) {
            settingsStylesheet.disabled = true;
        }
    }

    showSettingsView() {
        const playerCard = document.getElementById('player-card');
        const islamicCard = document.getElementById('islamic-info-card');
        const settingsView = document.getElementById('settingsActivityBarView');

        if (playerCard) {playerCard.style.display = 'none';}
        if (islamicCard) {islamicCard.style.display = 'none';}
        if (settingsView) {settingsView.style.display = 'block';}

        // Enable settings stylesheet and script
        const settingsStylesheet = document.getElementById('settingsStylesheet');
        if (settingsStylesheet) {
            settingsStylesheet.disabled = false;
        }

        // Settings content is already loaded by the HTML template
        // Initialize settings if needed
        this.initializeSettings();
    }

    openSettingsPopup() {
        // Execute VS Code command to open settings popup
        this.postMessage('executeCommand', { command: 'codeTune.openSettings' });
    }

    initializeSettings() {
        // Settings JavaScript is loaded by the HTML template
        // Ensure the settings manager is ready
        if (typeof window.initializeSettingsActivityBar === 'function') {
            window.initializeSettingsActivityBar();
        }
    }

    // Progress and seeking
    seekToPosition(event) {
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;

        document.querySelector('.progress-fill').style.width = `${percentage * 100}%`;

        // Send seek message to extension
        this.postMessage('seek', { position: percentage });
    }

    // Keyboard shortcuts
    handleKeyboard(event) {
        // Only handle if not typing in input
        if (event.target.tagName === 'INPUT' && event.target.type !== 'radio') {return;}

        // Don't handle keyboard shortcuts when modals are open
        const playbackModal = document.getElementById('playbackOptionsModal');
        const surahModal = document.getElementById('surahModal');
        const quranReaderModal = document.getElementById('quranReaderModal');

        // Handle Quran Reader modal keyboard navigation
        if (quranReaderModal && quranReaderModal.style.display === 'flex') {
            switch(event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    this.scrollQuranReaderPage('up');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.scrollQuranReaderPage('down');
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.navigatePage('prev');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigatePage('next');
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.closeQuranReader();
                    break;
                case 'Home':
                    event.preventDefault();
                    // Scroll to top of current page
                    const displayEl = document.getElementById('quranTextDisplay');
                    if (displayEl) {displayEl.scrollTop = 0;}
                    break;
                case 'End':
                    event.preventDefault();
                    // Scroll to bottom of current page
                    const displayEl2 = document.getElementById('quranTextDisplay');
                    if (displayEl2) {displayEl2.scrollTop = displayEl2.scrollHeight;}
                    break;
            }
            return;
        }

        // Handle other modals (playback, surah browser)
        if ((playbackModal && playbackModal.style.display === 'flex') ||
            (surahModal && surahModal.style.display === 'flex')) {
            // Only handle Escape for modals
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closePlaybackOptionsModal();
                this.closeSurahBrowser();
            }
            return;
        }

        switch(event.key) {
            case ' ':
                event.preventDefault();
                this.togglePlayback();
                break;
            case 'ArrowLeft':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.previousSurah();
                }
                break;
            case 'ArrowRight':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.nextSurah();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.setVolume(Math.min(100, this.volume + 5));
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.setVolume(Math.max(0, this.volume - 5));
                break;
            case 'Escape':
                this.closeSurahBrowser();
                this.closePlaybackOptionsModal();
                break;
        }
    }

    // Settings persistence
    saveSettings() {
        const settings = {
            volume: this.volume,
            playbackMode: this.playbackMode,
            reciter: this.reciter,
            audioQuality: this.audioQuality,
            autoPlayStartup: this.autoPlayStartup,
            theme: this.theme,
            compactMode: this.compactMode,
            showNotifications: this.showNotifications,
            language: this.language,
            enableReminders: this.enableReminders,
            reminderInterval: this.reminderInterval,
            reminderTypes: this.reminderTypes,
            workingHoursOnly: this.workingHoursOnly,
            islamicReminders: this.islamicReminders,
            cacheSize: this.cacheSize,
            downloadTimeout: this.downloadTimeout,
            retryAttempts: this.retryAttempts
        };

        localStorage.setItem('quranPlayerSettings', JSON.stringify(settings));
    }

    updateLanguageSetting(language) {
        this.language = language;

        // Update localStorage immediately to ensure localization system knows about the change
        try {
            const tuneSettings = JSON.parse(localStorage.getItem('codeTuneSettings') || '{}');
            tuneSettings.language = language;
            localStorage.setItem('codeTuneSettings', JSON.stringify(tuneSettings));
            console.log('Updated codeTuneSettings to:', tuneSettings);
        } catch (error) {
            console.warn('Failed to update localStorage:', error);
        }

        // Tell extension to update the global configuration
        this.postMessage('updateLanguageSetting', { language: language });

        // Update the UI selector immediately
        const headerLanguageSelect = document.getElementById('headerLanguageSelect');
        if (headerLanguageSelect) {
            headerLanguageSelect.value = language;
        }

        // Ensure localization is updated
        if (window.localization) {
            window.localization.refreshLocalization();
        }

        // Localize notification message
        const notificationMessage = window.localization ? window.localization.getString('language', 'Language updated successfully') : 'Language updated successfully';
        this.showNotification(notificationMessage, 'success');
        this.saveSettings();
    }

    updateReciterSetting(reciter) {
        this.reciter = reciter;
        this.postMessage('updateReciter', { reciter: reciter });
        this.showNotification('Quran reciter updated successfully', 'success');
        this.saveSettings();
    }

    updateAutoPlaySetting(enabled) {
        this.autoPlayStartup = enabled;
        this.showNotification(enabled ? 'Auto-play on startup enabled' : 'Auto-play on startup disabled', 'success');
        this.saveSettings();
    }

    updateCompactModeSetting(enabled) {
        this.compactMode = enabled;
        this.showNotification(enabled ? 'Compact mode enabled' : 'Compact mode disabled', 'success');
        this.saveSettings();
    }

    updateNotificationsSetting(enabled) {
        this.showNotifications = enabled;
        this.showNotification(enabled ? 'Notifications enabled' : 'Notifications disabled', 'success');
        this.saveSettings();
    }

    updateEnableRemindersSetting(enabled) {
        this.enableReminders = enabled;

        // Update Islamic reminders manager
        this.postMessage('updateIslamicReminders', {
            settings: this.getIslamicRemindersSettings()
        });

        this.showNotification(enabled ? 'Islamic reminders enabled' : 'Islamic reminders disabled', 'success');
        this.saveSettings();
    }

    updateReminderIntervalSetting(interval) {
        this.reminderInterval = parseInt(interval);

        // Update Islamic reminders manager
        this.postMessage('updateIslamicReminders', {
            settings: this.getIslamicRemindersSettings()
        });

        this.showNotification(`Reminder interval set to ${interval} minutes`, 'success');
        this.saveSettings();
    }

    updateReminderTypeSetting(type, enabled) {
        this.reminderTypes[type] = enabled;

        // Update Islamic reminders manager
        this.postMessage('updateIslamicReminders', {
            settings: this.getIslamicRemindersSettings()
        });

        const typeName = type === 'showAdia' ? 'Adia' :
                        type === 'showAhadis' ? 'Ahadis' :
                        type === 'showMorningAzkar' ? 'Morning Azkar' :
                        type === 'showEveningAzkar' ? 'Evening Azkar' :
                        'Islamic Wisdom';
        this.showNotification(`${typeName} ${enabled ? 'enabled' : 'disabled'}`, 'success');
        this.saveSettings();
    }

    updateWorkingHoursSetting(enabled) {
        this.workingHoursOnly = enabled;

        // Update Islamic reminders manager
        this.postMessage('updateIslamicReminders', {
            settings: this.getIslamicRemindersSettings()
        });

        this.showNotification(enabled ? 'Working hours only enabled' : 'Working hours only disabled', 'success');
        this.saveSettings();
    }

    updateIslamicReminderSetting(id, checked) {
        const reminderKey = id.replace('Reminder', '').toLowerCase();
        this.islamicReminders[reminderKey] = checked;

        // Update Islamic reminders manager
        this.postMessage('updateIslamicReminders', { settings: this.islamicReminders });

        this.saveSettings();
    }

    updateCacheSizeSetting(size) {
        this.cacheSize = parseInt(size);
        this.showNotification(`Cache size set to ${size} MB`, 'success');
        this.saveSettings();
    }

    updateDownloadTimeoutSetting(timeout) {
        this.downloadTimeout = parseInt(timeout);
        this.showNotification(`Download timeout set to ${timeout} seconds`, 'success');
        this.saveSettings();
    }

    updateRetryAttemptsSetting(attempts) {
        this.retryAttempts = parseInt(attempts);
        this.showNotification(`Retry attempts set to ${attempts}`, 'success');
        this.saveSettings();
    }

    getIslamicRemindersSettings() {
        return {
            enableReminders: this.enableReminders,
            reminderInterval: this.reminderInterval,
            showAdia: this.reminderTypes.showAdia,
            showAhadis: this.reminderTypes.showAhadis,
            showWisdom: this.reminderTypes.showWisdom,
            showMorningAzkar: this.reminderTypes.showMorningAzkar,
            showEveningAzkar: this.reminderTypes.showEveningAzkar,
            workingHoursOnly: this.workingHoursOnly
        };
    }

    // Send current settings to extension for QuranPlayer initialization
    sendSettingsToExtension() {
        try {
            const settings = JSON.parse(localStorage.getItem('quranPlayerSettings') || '{}');
            const reciter = settings.reciter || 'ar.alafasy';

            // Send the current reciter setting to extension to update QuranPlayer
            this.postMessage('updateReciter', { reciter: reciter });
            console.log('Sent initial reciter setting to extension:', reciter);
        } catch (error) {
            console.warn('Failed to send settings to extension:', error);
        }
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('quranPlayerSettings') || '{}');

            // Migration: Convert old 'default' reciter to 'ar.alafasy'
            if (settings.reciter === 'default') {
                settings.reciter = 'ar.alafasy';
                localStorage.setItem('quranPlayerSettings', JSON.stringify(settings));
                console.log('Migrated old reciter setting from default to ar.alafasy');
            }

            // Load all settings with defaults
            this.volume = settings.volume || 70;
            this.playbackMode = settings.playbackMode || 'surah';
            this.reciter = settings.reciter || 'ar.alafasy';
            this.audioQuality = settings.audioQuality || '128';
            this.autoPlayStartup = settings.autoPlayStartup || false;
            this.theme = settings.theme || 'auto';
            this.compactMode = settings.compactMode || false;
            this.showNotifications = settings.showNotifications !== false; // Default true
            this.language = settings.language || 'auto';
            this.enableReminders = settings.enableReminders !== false; // Default true
            this.reminderInterval = settings.reminderInterval || 30;
            this.reminderTypes = settings.reminderTypes || {
                showAdia: true,
                showAhadis: true,
                showWisdom: true,
                showMorningAzkar: true,
                showEveningAzkar: true
            };
            this.workingHoursOnly = settings.workingHoursOnly || false;
            this.islamicReminders = settings.islamicReminders || {
                fajr: false,
                dhuhr: false,
                asr: false,
                maghrib: false,
                isha: false
            };
            this.cacheSize = settings.cacheSize || 100;
            this.downloadTimeout = settings.downloadTimeout || 30;
            this.retryAttempts = settings.retryAttempts || 3;

            // Load listening statistics
            this.loadListeningStats();

            // Set theme
            if (this.theme === 'light') {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            } else if (this.theme === 'dark') {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                // Auto theme
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.classList.toggle('dark-theme', isDark);
                document.body.classList.toggle('light-theme', !isDark);
            }

            // Set UI elements
            this.updateSettingsUI();
            this.updateListeningStatsDisplay();

            this.updateUI();
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    updateReadingProgress() {
        // Load reading progress from localStorage
        try {
            const readingProgress = JSON.parse(localStorage.getItem('quranReadingProgress') || '{}');
            const lastSurah = readingProgress.lastSurah;
            const lastPage = readingProgress.lastPage;

            if (lastSurah) {
                const surah = this.surahData.find(s => s.number === lastSurah);
                if (surah) {
                    const progressEl = document.getElementById('readingProgress');
                    if (progressEl) {
                        progressEl.innerHTML = `
                            <div class="last-read">
                                Last read: ${surah.name} (Page ${lastPage || 1})
                            </div>
                            <button class="continue-reading-btn" onclick="window.quranActivityBar.continueReading()">
                                Continue Reading
                            </button>
                        `;
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load reading progress:', error);
        }
    }

    openQuranReader(surahNumber) {
        console.log('Opening Quran reader for surah:', surahNumber);

        this.currentReadingSurah = parseInt(surahNumber);
        const surah = this.surahData.find(s => s.number === this.currentReadingSurah);

        if (!surah) {
            this.showNotification('Surah not found', 'error');
            return;
        }

        // Load reading position from localStorage
        try {
            const readingProgress = JSON.parse(localStorage.getItem('quranReadingProgress') || '{}');
            if (readingProgress.lastSurah === this.currentReadingSurah) {
                this.currentReadingPage = readingProgress.lastPage || 1;
            } else {
                this.currentReadingPage = 1;
            }
        } catch (error) {
            this.currentReadingPage = 1;
        }

        // Calculate total pages for this surah
        this.totalReadingPages = Math.ceil(surah.verses / this.versesPerPage);

        // Update modal title
        document.getElementById('readerSurahTitle').textContent = `${surah.arabicName} (${surah.name})`;

        // Show modal
        document.getElementById('quranReaderModal').style.display = 'flex';

        // Load and display verses for current page
        this.loadReaderPage(this.currentReadingPage);
    }

    async loadReaderPage(pageNumber) {
        console.log('Loading reader page:', pageNumber, 'for surah:', this.currentReadingSurah);

        const displayEl = document.getElementById('quranTextDisplay');
        if (!displayEl) {
            console.error('Reader text display element not found');
            return;
        }

        displayEl.innerHTML = '<div class="loading-text">Loading Quran text...</div>';

        try {
            // Use cached verses if available
            let verses = this.cachedVerses[this.currentReadingSurah];

            if (!verses) {
                // Fetch verses from API
                const response = await fetch(`https://api.alquran.cloud/v1/surah/${this.currentReadingSurah}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.code !== 200 || !data.data || !data.data.ayahs) {
                    throw new Error('Invalid API response');
                }

                verses = data.data.ayahs.map(ayah => ({
                    number: ayah.number,
                    text: ayah.text,
                    numberInSurah: ayah.numberInSurah
                }));

                // Cache the verses
                this.cachedVerses[this.currentReadingSurah] = verses;
                console.log('Cached verses for surah:', this.currentReadingSurah);
            }

            // Calculate verses for current page
            const startAyah = (pageNumber - 1) * this.versesPerPage;
            const endAyah = Math.min(startAyah + this.versesPerPage, verses.length);
            const pageVerses = verses.slice(startAyah, endAyah);

            // Display the verses
            let html = '';
            pageVerses.forEach(ayah => {
                html += `
                    <div class="arabic-verse">
                        <span class="verse-text">${ayah.text}</span>
                        <span class="verse-number">${ayah.numberInSurah}</span>
                    </div>
                `;
            });

            displayEl.innerHTML = html;

            // Update page info
            document.getElementById('pageInfo').textContent = `Page ${pageNumber}/${this.totalReadingPages}`;
            document.getElementById('currentPageNumber').textContent = pageNumber;
            document.getElementById('totalPages').textContent = this.totalReadingPages;

            // Update navigation buttons
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');

            if (prevBtn) {
                prevBtn.style.opacity = pageNumber === 1 ? '0.5' : '1';
                prevBtn.disabled = pageNumber === 1;
            }

            if (nextBtn) {
                nextBtn.style.opacity = pageNumber === this.totalReadingPages ? '0.5' : '1';
                nextBtn.disabled = pageNumber === this.totalReadingPages;
            }

            // Save current reading position
            this.saveReadingProgress(this.currentReadingSurah, pageNumber);

        } catch (error) {
            console.error('Failed to load Quran text:', error);
            displayEl.innerHTML = '<div class="error-text">Failed to load Quran text. Please check your internet connection and try again.</div>';
        }
    }

    navigatePage(direction) {
        let newPage = this.currentReadingPage;

        if (direction === 'prev' && this.currentReadingPage > 1) {
            newPage = this.currentReadingPage - 1;
        } else if (direction === 'next' && this.currentReadingPage < this.totalReadingPages) {
            newPage = this.currentReadingPage + 1;
        }

        if (newPage !== this.currentReadingPage) {
            this.currentReadingPage = newPage;
            this.loadReaderPage(newPage);
        }
    }

    saveReadingProgress(surah, page) {
        try {
            const readingProgress = {
                lastSurah: surah,
                lastPage: page,
                lastUpdated: new Date().toISOString()
            };
            localStorage.setItem('quranReadingProgress', JSON.stringify(readingProgress));
            console.log('Saved reading progress:', readingProgress);
        } catch (error) {
            console.warn('Failed to save reading progress:', error);
        }
    }

    continueReading() {
        try {
            const readingProgress = JSON.parse(localStorage.getItem('quranReadingProgress') || '{}');
            if (readingProgress.lastSurah) {
                this.openQuranReader(readingProgress.lastSurah);
            } else {
                this.showNotification('No reading progress found', 'info');
            }
        } catch (error) {
            console.warn('Failed to continue reading:', error);
            this.showNotification('Unable to continue reading', 'error');
        }
    }

    closeQuranReader() {
        document.getElementById('quranReaderModal').style.display = 'none';
        this.currentReadingSurah = null;
        this.currentReadingPage = 1;
        this.totalReadingPages = 1;
    }

    scrollQuranReaderPage(direction) {
        const displayEl = document.getElementById('quranTextDisplay');
        if (!displayEl) {return;}

        const scrollAmount = 200; // Scroll 200px at a time

        if (direction === 'up') {
            displayEl.scrollTop -= scrollAmount;
        } else if (direction === 'down') {
            displayEl.scrollTop += scrollAmount;
        }
    }

    // Auto Reading Methods
    toggleAutoReading() {
        this.autoReadingEnabled = !this.autoReadingEnabled;

        const toggleBtn = document.getElementById('autoReadToggle');
        const speedControls = document.getElementById('speedControls');
        const playBtn = document.getElementById('playPauseAutoRead');

        if (this.autoReadingEnabled) {
            toggleBtn?.classList.add('active');
            toggleBtn.querySelector('span').innerText = '🔄 Auto Reading: ON';
            speedControls.style.display = 'flex';
            playBtn.disabled = false;
            playBtn.classList.remove('disabled');
        } else {
            toggleBtn?.classList.remove('active');
            toggleBtn.querySelector('span').innerText = '🔄 Auto Reading: OFF';
            speedControls.style.display = 'none';
            playBtn.disabled = true;
            playBtn.classList.add('disabled');
            this.stopAutoReading();
        }
    }

    setAutoReadingSpeed(speed) {
        this.autoReadingSpeed = parseFloat(speed);

        // Update speed button states
        const buttons = document.querySelectorAll('.speed-btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            }
        });

        console.log('Auto reading speed set to:', this.autoReadingSpeed);

        // If currently auto-reading, adjust the interval
        if (this.autoReadingActive) {
            this.stopAutoReading();
            this.startAutoReading();
        }
    }

    toggleAutoReadingPlayback() {
        if (!this.autoReadingEnabled) {return;}

        if (this.autoReadingActive) {
            this.stopAutoReading();
        } else {
            this.startAutoReading();
        }
    }

    startAutoReading() {
        if (!this.autoReadingEnabled || this.autoReadingActive) {return;}

        console.log('Starting auto reading at speed:', this.autoReadingSpeed);

        this.autoReadingActive = true;

        // Update play button
        const playBtn = document.getElementById('playPauseAutoRead');
        if (playBtn) {
            playBtn.innerHTML = '<span class="icon">⏸️</span>';
        }

        // Calculate interval based on speed (lower speed = slower scrolling)
        // Speed 0.5 = slow, 1 = normal, 1.5 = fast, 2 = very fast
        const intervalMs = Math.max(50, 2000 / this.autoReadingSpeed); // Min 50ms interval

        this.autoReadingInterval = setInterval(() => {
            this.performAutoScroll();
        }, intervalMs);

        this.showNotification('Auto reading started', 'success');
    }

    stopAutoReading() {
        if (!this.autoReadingActive) {return;}

        console.log('Stopping auto reading');

        this.autoReadingActive = false;

        if (this.autoReadingInterval) {
            clearInterval(this.autoReadingInterval);
            this.autoReadingInterval = null;
        }

        // Update play button
        const playBtn = document.getElementById('playPauseAutoRead');
        if (playBtn) {
            playBtn.innerHTML = '<span class="icon">▶️</span>';
        }

        this.showNotification('Auto reading stopped', 'info');
    }

    performAutoScroll() {
        if (!this.autoReadingActive) {return;}

        const displayEl = document.getElementById('quranTextDisplay');
        if (!displayEl) {return;}

        const currentScroll = displayEl.scrollTop;
        const maxScroll = displayEl.scrollHeight - displayEl.clientHeight;
        const isAtBottom = currentScroll >= maxScroll - 100; // 100px buffer

        if (isAtBottom) {
            // End of page reached - advance to next page or surah
            this.advanceToNextPage();
        } else {
            // Continue scrolling down
            const scrollBatch = Math.max(10, Math.min(50, this.autoReadingSpeed * 10));
            displayEl.scrollTop += scrollBatch;
        }
    }

    advanceToNextPage() {
        const currentPage = this.currentReadingPage;
        const totalPages = this.totalReadingPages;
        const currentSurah = this.currentReadingSurah;

        if (currentPage < totalPages) {
            // Next page in same surah
            const nextPage = currentPage + 1;
            console.log(`Auto-advancing to page ${nextPage} of surah ${currentSurah}`);

            // Stop auto-reading temporarily
            this.stopAutoReading();

            // Load next page
            this.loadReaderPage(nextPage);

            // Resume auto-reading after a delay to allow page load
            setTimeout(() => {
                if (this.autoReadingEnabled) {
                    this.startAutoReading();
                }
            }, 1500);
        } else {
            // Last page of surah reached - ask about next surah
            this.askAboutNextSurah();
        }
    }

    askAboutNextSurah() {
        console.log('Reached end of surah, asking user about next surah');

        // Stop auto-reading
        this.stopAutoReading();

        const nextSurahNum = this.currentReadingSurah + 1;

        if (nextSurahNum <= 114) {
            const nextSurah = this.surahData.find(s => s.number === nextSurahNum);
            const shouldContinue = confirm(`You've reached the end of the current Surah.\n\nContinue reading with the next Surah:\n"${nextSurah.arabicName} (${nextSurah.name})"?\n\nNote: This action cannot be automatically reversed once started.`);

            if (shouldContinue) {
                console.log('User chose to continue with next surah');
                this.openQuranReader(nextSurahNum);

                // Resume auto-reading after a delay to allow page load
                setTimeout(() => {
                    if (this.autoReadingEnabled) {
                        this.startAutoReading();
                    }
                }, 2000);
            } else {
                console.log('User chose not to continue');
                this.showNotification('Auto reading stopped at surah end', 'info');
            }
        } else {
            // End of Quran reached
            console.log('End of Quran reached');
            this.showNotification('🎉 You have completed the entire Quran! Congratulatory messages here.', 'success');
        }
    }

    updateSettingsUI() {
        // Header language selector
        const headerLanguageSelect = document.getElementById('headerLanguageSelect');
        if (headerLanguageSelect) {
            headerLanguageSelect.value = this.language || 'auto';
        }

        // Reciter select
        const reciterSelect = document.getElementById('reciterSelect');
        if (reciterSelect) {reciterSelect.value = this.reciter;}

        // Auto play checkbox
        const autoPlayStartup = document.getElementById('autoPlayStartup');
        if (autoPlayStartup) {autoPlayStartup.checked = this.autoPlayStartup;}

        // Compact mode checkbox
        const compactMode = document.getElementById('compactMode');
        if (compactMode) {compactMode.checked = this.compactMode;}

        // Show notifications checkbox
        const showNotifications = document.getElementById('showNotifications');
        if (showNotifications) {showNotifications.checked = this.showNotifications;}

        // Enable reminders checkbox
        const enableReminders = document.getElementById('enableReminders');
        if (enableReminders) {enableReminders.checked = this.enableReminders;}

        // Reminder interval select
        const reminderIntervalSelect = document.getElementById('reminderIntervalSelect');
        if (reminderIntervalSelect) {reminderIntervalSelect.value = this.reminderInterval;}

        // Reminder types checkboxes
        ['showAdia', 'showAhadis', 'showWisdom', 'showMorningAzkar', 'showEveningAzkar'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {checkbox.checked = this.reminderTypes[id] !== false;} // Default true
        });

        // Working hours checkbox
        const workingHoursOnly = document.getElementById('workingHoursOnly');
        if (workingHoursOnly) {workingHoursOnly.checked = this.workingHoursOnly;}

        // Prayer reminders checkboxes
        ['fajrReminder', 'duhrReminder', 'asrReminder', 'maghribReminder', 'ishaReminder'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                const reminderKey = id.replace('Reminder', '').toLowerCase();
                checkbox.checked = this.islamicReminders[reminderKey] || false;
            }
        });

        // Advanced settings
        const cacheSizeSelect = document.getElementById('cacheSizeSelect');
        if (cacheSizeSelect) {cacheSizeSelect.value = this.cacheSize;}

        const downloadTimeoutSelect = document.getElementById('downloadTimeoutSelect');
        if (downloadTimeoutSelect) {downloadTimeoutSelect.value = this.downloadTimeout;}

        const retryAttemptsSelect = document.getElementById('retryAttemptsSelect');
        if (retryAttemptsSelect) {retryAttemptsSelect.value = this.retryAttempts;}
    }

    // Theme toggle
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark-theme') || (!body.classList.contains('light-theme'));

        if (isDark) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            // Use VS Code notification system instead of webview notification
            this.postMessage('showNotification', {
                message: window.localization.getString('switchedToLightTheme'),
                type: 'info'
            });
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            // Use VS Code notification system instead of webview notification
            this.postMessage('showNotification', {
                message: window.localization.getString('switchedToDarkTheme'),
                type: 'info'
            });
        }

        this.saveSettings();
    }

    // Notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-text">${message}</span>
        `;

        // Add to body
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.showNotification(window.localization.getString('welcomeMessage'), 'success');
        }, 1000);
    }

    // Islamic Calendar & Prayer Times
    startIslamicTimer() {
        // Wait for DOM to be fully ready, then update Islamic information
        setTimeout(() => {
            console.log('Starting Islamic timer...');
            this.updateIslamicInfo();
        }, 500); // Longer delay to ensure DOM is ready

        // Update Islamic information every minute
        setInterval(() => {
            this.updateIslamicInfo();
        }, 60000); // Update every minute

        // Update prayer countdown every second
        setInterval(() => {
            this.updatePrayerCountdown();
        }, 1000); // Update every second
    }

    updateIslamicInfo() {
        try {
            // Update Hijri date using IslamicCalendar utility
            const hijriDate = this.getHijriDate();
            const hijriElement = document.getElementById('hijriDate');
            if (hijriElement) {
                hijriElement.textContent = hijriDate;
                console.log('Updated Hijri date:', hijriDate);
            } else {
                console.warn('Hijri date element not found');
            }

            // Update next prayer info
            this.updateNextPrayer();
        } catch (error) {
            console.warn('Failed to update Islamic information:', error);
            const hijriElement = document.getElementById('hijriDate');
            const prayerElement = document.getElementById('nextPrayer');
            const countdownElement = document.getElementById('prayerCountdown');

            if (hijriElement) {
                hijriElement.textContent = 'Error loading date';
            }
            if (prayerElement) {
                prayerElement.textContent = 'Error';
            }
            if (countdownElement) {
                countdownElement.textContent = 'Error';
            }
        }
    }

    getHijriDate() {
        // Use IslamicCalendar utility for accurate calculation
        const now = new Date();

        // Simplified Hijri calculation (for webview compatibility)
        const gregorianYear = now.getFullYear();
        const gregorianMonth = now.getMonth() + 1;
        const gregorianDay = now.getDate();

        // Approximate conversion (Hijri calendar is lunar)
        const hijriEpoch = 1948440; // Approximate Julian day
        const gregorianEpoch = new Date(622, 6, 16);

        const daysSinceEpoch = Math.floor((now.getTime() - gregorianEpoch.getTime()) / (1000 * 60 * 60 * 24));
        const hijriYear = Math.floor(daysSinceEpoch / 354.367) + 1;
        const yearStart = Math.floor((hijriYear - 1) * 354.367);
        const daysInYear = daysSinceEpoch - yearStart;

        const hijriMonths = [
            'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
            'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
            'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
        ];

        let month = 1;
        let day = daysInYear + 1;
        const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

        for (let i = 0; i < monthLengths.length; i++) {
            if (day <= monthLengths[i]) {
                month = i + 1;
                break;
            }
            day -= monthLengths[i];
        }

        return `${day} ${hijriMonths[month - 1]} ${hijriYear} AH`;
    }

    updateNextPrayer() {
        const now = new Date();

        // Use more accurate prayer times (adjust for your location)
        // These are approximate times for Cairo, Egypt - you may want to calculate based on location
        const prayerTimes = {
            fajr: { hour: 4, minute: 45, key: 'prayerFajr' },      // Fajr: ~4:45 AM
            dhuhr: { hour: 12, minute: 15, key: 'prayerDhuhr' },    // Dhuhr: ~12:15 PM
            asr: { hour: 15, minute: 45, key: 'prayerAsr' },      // Asr: ~3:45 PM
            maghrib: { hour: 18, minute: 15, key: 'prayerMaghrib' },  // Maghrib: ~6:15 PM
            isha: { hour: 19, minute: 45, key: 'prayerIsha' }      // Isha: ~7:45 PM
        };

        // Get localized prayer names
        const prayers = [
            { name: window.localization.getString(prayerTimes.fajr.key), time: prayerTimes.fajr },
            { name: window.localization.getString(prayerTimes.dhuhr.key), time: prayerTimes.dhuhr },
            { name: window.localization.getString(prayerTimes.asr.key), time: prayerTimes.asr },
            { name: window.localization.getString(prayerTimes.maghrib.key), time: prayerTimes.maghrib },
            { name: window.localization.getString(prayerTimes.isha.key), time: prayerTimes.isha }
        ];

        // Find next prayer
        let nextPrayer = null;
        let nextPrayerTime = null;

        for (const prayer of prayers) {
            const prayerTime = new Date();
            prayerTime.setHours(prayer.time.hour, prayer.time.minute, 0, 0);

            if (prayerTime > now) {
                nextPrayer = prayer.name;
                nextPrayerTime = prayerTime;
                break;
            }
        }

        // If all prayers have passed today, next prayer is tomorrow's Fajr
        if (!nextPrayer) {
            nextPrayer = window.localization.getString(prayerTimes.fajr.key);
            nextPrayerTime = new Date(now);
            nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
            nextPrayerTime.setHours(prayerTimes.fajr.hour, prayerTimes.fajr.minute, 0, 0);
        }

        const prayerElement = document.getElementById('nextPrayer');
        if (prayerElement) {
            prayerElement.textContent = nextPrayer;
        }

        this.nextPrayerTime = nextPrayerTime;
        this.updatePrayerCountdown();
    }

    updatePrayerCountdown() {
        if (!this.nextPrayerTime) {return;}

        const now = new Date();
        const timeDiff = this.nextPrayerTime.getTime() - now.getTime();

        if (timeDiff <= 0) {
            // Prayer time has arrived!
            this.showPrayerNotification();
            // Update to next prayer
            this.updateNextPrayer();
            return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        const countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('prayerCountdown').textContent = countdown;
    }

    // Prayer Notification and Modal Methods - NEW
    showPrayerNotification() {
        const nextPrayerElement = document.getElementById('nextPrayer');
        const currentPrayer = nextPrayerElement ? nextPrayerElement.textContent : '';

        // Show the prayer confirmation modal
        this.showPrayerConfirmModal(currentPrayer);
    }

    showPrayerConfirmModal(prayerName) {
        const modal = document.getElementById('prayerConfirmModal');
        const questionText = document.getElementById('prayerQuestionText');
        const timeNote = document.getElementById('prayerTimeNote');

        // Map prayer names for localization
        const prayerKeyMap = {
            'Fajr': 'prayerFajr',
            'الفجر': 'prayerFajr',
            'Dhuhr': 'prayerDhuhr',
            'الظهر': 'prayerDhuhr',
            'Asr': 'prayerAsr',
            'العصر': 'prayerAsr',
            'Maghrib': 'prayerMaghrib',
            'المغرب': 'prayerMaghrib',
            'Isha': 'prayerIsha',
            'العشاء': 'prayerIsha'
        };

        const localizedPrayerName = prayerKeyMap[prayerName] ? window.localization.getString(prayerKeyMap[prayerName]) : prayerName;

        if (questionText) {
            questionText.textContent = window.localization.getString('prayerCompletedQuestion', { prayerName: localizedPrayerName });
        }
        if (timeNote) {
            timeNote.textContent = window.localization.getString('prayerTimeNotification', { prayerName: localizedPrayerName });
        }

        // Store current prayer info for confirmation
        this.pendingPrayerConfirmation = prayerName;

        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }

        // Localize the buttons
        if (window.localization) {
            window.localization.localizeElements();
        }
    }

    closePrayerConfirmModal() {
        const modal = document.getElementById('prayerConfirmModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        this.pendingPrayerConfirmation = null;
    }

    confirmPrayerCompleted() {
        if (!this.pendingPrayerConfirmation) {
            console.warn('No pending prayer confirmation');
            return;
        }

        const prayerName = this.pendingPrayerConfirmation;

        // Map English prayer names to goal keys
        const prayerGoalMap = {
            'Fajr': 'fajr',
            'الفجر': 'fajr',
            'Dhuhr': 'dhuhr',
            'الظهر': 'dhuhr',
            'Asr': 'asr',
            'العصر': 'asr',
            'Maghrib': 'maghrib',
            'المغرب': 'maghrib',
            'Isha': 'isha',
            'العشاء': 'isha'
        };

        const goalKey = prayerGoalMap[prayerName];
        if (goalKey) {
            // Mark this prayer as completed in goals
            this.updatePrayerGoal(goalKey, true);

            // Show success message
            const localizedPrayerName = prayerGoalMap[prayerName] ? window.localization.getString(`prayer${prayerName.charAt(0).toUpperCase() + prayerName.slice(1).toLowerCase()}`) : prayerName;
            this.showNotification(window.localization.getString('prayerMarkedCompleted', { prayerName: localizedPrayerName }), 'success');
        }

        // Close the modal
        this.closePrayerConfirmModal();
    }

    dismissPrayerConfirmation() {
        // User dismissed the prayer check, just close modal
        this.closePrayerConfirmModal();
        this.showNotification('Prayer check dismissed', 'info');
    }

    forceUpdateIslamicInfo() {
        console.log('Force updating Islamic info...');
        // Try multiple times with increasing delays
        setTimeout(() => this.updateIslamicInfo(), 100);
        setTimeout(() => this.updateIslamicInfo(), 500);
        setTimeout(() => this.updateIslamicInfo(), 1000);
    }

    // Listen for VSCode configuration changes
    listenForLanguageChanges() {
        if (vscode.workspace) {
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('codeTune.language')) {
                    const config = vscode.workspace.getConfiguration('codeTune');
                    const language = config.get('language');
                    if (language && language !== 'auto') {
                        console.log('ActivityBar: Language configuration changed to:', language);
                        // Update localStorage
                        try {
                            const settings = JSON.parse(localStorage.getItem('codeTuneSettings') || '{}');
                            settings.language = language;
                            localStorage.setItem('codeTuneSettings', JSON.stringify(settings));
                        } catch (error) {
                            console.warn('Failed to update language in localStorage:', error);
                        }
                        // Update localization
                        if (window.localization) {
                            window.localization = new LocalizationManager();
                            window.localization.localizeElements();
                            console.log('ActivityBar: Localization updated for language:', language);
                        }
                    }
                }
            });
        }
    }

    // Message handling
    postMessage(type, data = {}) {
        vscode.postMessage({ type, ...data });
    }

    // Audio handling
    initializeAudio() {
        this.audioElement = document.getElementById('quranAudio');
        if (!this.audioElement) {
            console.error('Audio element not found');
            return;
        }

        // Set initial volume
        this.audioElement.volume = this.volume / 100;

        // Audio event listeners
        this.audioElement.addEventListener('loadstart', () => {
            console.log('Audio loading started');
        });

        this.audioElement.addEventListener('canplay', () => {
            console.log('Audio can play');
            this.duration = this.audioElement.duration;
            this.updateTimeDisplay();
            // Ensure volume is applied to new audio
            if (this.audioElement) {
                this.audioElement.volume = this.volume / 100;
            }
        });

        this.audioElement.addEventListener('play', () => {
            console.log('Audio started playing');
            this.isPlaying = true;
            this.updatePlaybackControls();

            // Start time tracking
            this.startTimeTracking();

            // Increment listening counter (for session mode)
            if (this.listeningStats.statsMode === 'sessions') {
                this.incrementListeningCounter();
            }
        });

        this.audioElement.addEventListener('pause', () => {
            console.log('Audio paused');
            this.isPlaying = false;
            this.updatePlaybackControls();

            // Stop time tracking and accumulate time
            this.stopTimeTracking();
        });

        this.audioElement.addEventListener('ended', () => {
            console.log('Audio ended');
            this.isPlaying = false;
            this.updatePlaybackControls();

            // Stop time tracking and accumulate time
            this.stopTimeTracking();

            // Check if we need to advance to next ayah in ayah-by-ayah mode
            if (this.currentPlaybackMode === 'ayah-by-ayah') {
                console.log('Ayah ended, requesting next ayah');
                this.postMessage('ayahEnded', {
                    currentSurah: this.currentSurah,
                    currentAyah: this.currentAyah
                });
            } else {
                console.log('Full surah or single ayah playback completed');
                // Handle end of surah - could auto-advance to next surah here
            }
        });

        this.audioElement.addEventListener('timeupdate', () => {
            this.currentTime = this.audioElement.currentTime;
            this.updateProgressBar();
            this.updateTimeDisplay();
        });

        this.audioElement.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            // Try fallback: switch to default reciter and retry with new URL
            if (this.reciter !== 'ar.alafasy') {
                console.log('Trying fallback to default reciter ar.alafasy');

                // Calculate global ayah number from current surah and ayah
                const globalAyah = this.calculateGlobalAyahNumber(this.currentSurah.number, this.currentAyah);

                // Construct new URL with fallback reciter
                const fallbackUrl = `https://cdn.islamic.network/quran/audio/${this.audioQuality}/ar.alafasy/${globalAyah}.mp3`;
                console.log('Fallback URL:', fallbackUrl);

                // Update reciter setting
                this.reciter = 'ar.alafasy';
                this.saveSettings();

                // Set new source and retry playback
                this.audioElement.src = fallbackUrl;
                this.currentAudioUrl = fallbackUrl;

                const playPromise = this.audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('Fallback audio started successfully');
                    }).catch(fallbackError => {
                        console.error('Fallback audio play failed:', fallbackError);
                        this.showNotification('Audio playback failed even with fallback reciter.', 'error');
                    });
                }

                // Show notification about fallback attempt
                this.showNotification('Audio not available for this reciter. Trying with default reciter...', 'warning');
            } else {
                this.showNotification('Audio playback failed. Try a different reciter or check your internet connection.', 'error');
            }
        });
    }

    playAudio(url, surah, mode = 'full-surah', message = null) {
        if (!this.audioElement) {
            console.error('Audio element not initialized');
            return;
        }

        // Stop current audio if playing
        this.audioElement.pause();

        // Set new source
        this.audioElement.src = url;
        this.currentAudioUrl = url;
        this.currentSurah = surah;
        this.currentPlaybackMode = mode;

        // Extract ayah number if present in message
        console.log('playAudio: Extracting ayah from message - surah:', surah, 'mode:', mode, 'ayah:', message.ayah);
        if (message.ayah) {
            this.currentAyah = message.ayah;
            console.log('Setting currentAyah from message.ayah:', this.currentAyah);
        } else if (mode === 'ayah-by-ayah') {
            // For ayah-by-ayah mode, calculate from globalAyah
            if (typeof surah === 'object' && surah.globalAyah) {
                const surahInfo = this.getSurahData().find(s => s.number === surah.number);
                if (surahInfo) {
                    let cumulativeVerses = 0;
                    for (let s = 1; s < surah.number; s++) {
                        const prevSurah = this.getSurahData().find(ts => ts.number === s);
                        if (prevSurah) {cumulativeVerses += prevSurah.verses;}
                    }
                    this.currentAyah = surah.globalAyah - cumulativeVerses;
                    console.log('Calculated currentAyah for ayah-by-ayah:', this.currentAyah, 'from globalAyah:', surah.globalAyah, 'surah:', surah.number);
                }
            }
        } else if (mode === 'single-ayah' && surah && typeof surah === 'object' && surah.number) {
            // For single-ayah mode, calculate from globalAyah
            if (typeof surah.globalAyah === 'number') {
                const surahInfo = this.getSurahData().find(s => s.number === surah.number);
                if (surahInfo) {
                    // Calculate local ayah number from global ayah
                    let cumulativeVerses = 0;
                    for (let s = 1; s < surah.number; s++) {
                        const prevSurah = this.getSurahData().find(ts => ts.number === s);
                        if (prevSurah) {cumulativeVerses += prevSurah.verses;}
                    }
                    this.currentAyah = surah.globalAyah - cumulativeVerses;
                    console.log('Calculated currentAyah for single-ayah:', this.currentAyah);
                }
            }
        } else {
            this.currentAyah = null; // Reset for full surah mode
        }

        // Update UI
        this.updateNowPlaying();

        // Start playing
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Audio started successfully');
            }).catch(error => {
                console.error('Audio play failed:', error);
                this.showNotification('Failed to start audio playback', 'error');
            });
        }
    }

    pauseAudio() {
        if (this.audioElement) {
            this.audioElement.pause();
        }
    }

    resumeAudio() {
        if (this.audioElement && this.currentAudioUrl) {
            this.audioElement.play().catch(error => {
                console.error('Resume audio failed:', error);
            });
        }
    }

    stopAudio() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPlaying = false;
            this.updatePlaybackControls();
        }
    }

    setAudioVolume(volume) {
        if (!isFinite(volume) || volume < 0 || volume > 1) {
            console.warn('Invalid volume value:', volume);
            return;
        }
        this.volume = Math.max(0, Math.min(100, volume * 100));
        if (this.audioElement) {
            this.audioElement.volume = volume;
        }
        this.updateVolumeDisplay();
        this.saveSettings();
    }

    seekAudio(position) {
        if (this.audioElement && this.duration) {
            const time = position * this.duration;
            this.audioElement.currentTime = time;
        }
    }

    updateProgressBar() {
        if (this.audioElement && this.duration) {
            const progress = (this.audioElement.currentTime / this.duration) * 100;
            document.querySelector('.progress-fill').style.width = `${progress}%`;
        }
    }

    updateTimeDisplay() {
        const currentTimeEl = document.getElementById('currentTime');
        const totalTimeEl = document.getElementById('totalTime');

        if (currentTimeEl && totalTimeEl) {
            const current = this.formatTime(this.currentTime);
            const total = this.formatTime(this.duration);
            currentTimeEl.textContent = current;
            totalTimeEl.textContent = total;
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) {
            return '0:00:00';
        }
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Handle messages from extension
    handleMessage(message) {
        switch (message.type) {
            case 'playAudio':
                console.log('Received playAudio message:', message);
                // Pass the message for ayah extraction
                this.playAudio(message.url, message.surah, message.mode, message);
                break;
            case 'pauseAudio':
                this.pauseAudio();
                break;
            case 'resumeAudio':
                this.resumeAudio();
                break;
            case 'stopAudio':
                this.stopAudio();
                break;
            case 'setAudioVolume':
                if (message.volume !== undefined && message.volume !== null) {
                    this.setAudioVolume(message.volume);
                }
                break;
            case 'seekAudio':
                this.seekAudio(message.position);
                break;
            case 'updateState':
                if (message.quranState) {
                    this.isPlaying = message.quranState.isPlaying;
                    if (message.quranState.currentSurah) {
                        this.currentSurah = this.surahData.find(s =>
                            s.number.toString() === message.quranState.currentSurah
                        );
                    }
                    this.updateUI();
                }
                break;
            case 'languageChanged':
                console.log('ActivityBar JS: Received languageChanged message', message);
                // Update localStorage with the new language setting
                if (message.language) {
                    try {
                        const settings = JSON.parse(localStorage.getItem('codeTuneSettings') || '{}');
                        settings.language = message.language;
                        localStorage.setItem('codeTuneSettings', JSON.stringify(settings));
                        console.log('ActivityBar JS: Updated localStorage to:', settings);
                    } catch (error) {
                        console.warn('Failed to update language in localStorage:', error);
                    }

                    // Set global language variable for localization system
                    window.currentLanguage = message.language;
                    console.log('ActivityBar JS: Set window.currentLanguage to:', window.currentLanguage);

                    // Re-localize the activity bar when language changes
                    if (window.localization) {
                        console.log('ActivityBar JS: Refreshing localization for language:', message.language);
                        window.localization.refreshLocalization();
                        console.log('ActivityBar JS: Localization updated');
                    } else {
                        console.log('ActivityBar JS: Creating new localization manager');
                        window.localization = new LocalizationManager();
                        window.localization.localizeElements();
                    }
                }
                break;
            case 'playbackStarted':
                this.showNotification(window.localization.getString('startedPlaying', { surahName: message.surahName }), 'success');
                break;
            case 'playbackError':
                this.showNotification(window.localization.getString('playbackError'), 'error');
                break;
        }
    }

    // Playback Options Modal
    showPlaybackOptionsModal(surahNumber) {
        this.selectedSurahNumber = surahNumber;

        // Get surah data
        const surah = this.surahData.find(s => s.number === parseInt(surahNumber));
        if (!surah) {return;}

        // Update surah info display
        const surahInfoEl = document.getElementById('selectedSurahInfo');
        if (surahInfoEl) {
            surahInfoEl.innerHTML = `
                <div class="surah-display">
                    <div class="surah-number">${surah.number}</div>
                    <div class="surah-details">
                        <div class="surah-name">${surah.name}</div>
                        <div class="surah-translation">${surah.arabicName}</div>
                        <div class="surah-meta">${surah.verses} verses • ${surah.type}</div>
                    </div>
                </div>
            `;
        }

        // Set default reciter from saved settings
        const reciterSelect = document.getElementById('playbackReciterSelect');
        if (reciterSelect) {
            reciterSelect.value = this.reciter;
        }

        // Show modal
        const modal = document.getElementById('playbackOptionsModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    closePlaybackOptionsModal() {
        const modal = document.getElementById('playbackOptionsModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }

        // Clear selected surah
        this.selectedSurahNumber = null;
    }

    startSelectedPlayback() {
        console.log('startSelectedPlayback called, selectedSurahNumber:', this.selectedSurahNumber);

        if (!this.selectedSurahNumber || this.selectedSurahNumber === null || this.selectedSurahNumber === undefined) {
            console.log('startSelectedPlayback: selectedSurahNumber is null/undefined, showing error');
            this.showNotification('Please select a Surah first', 'error');
            return;
        }

        // Get selected options
        const playbackModeElement = document.querySelector('input[name="playbackMode"]:checked');
        const playbackMode = playbackModeElement ? playbackModeElement.value : 'full-surah';
        const reciterElement = document.getElementById('playbackReciterSelect');
        const reciter = reciterElement ? reciterElement.value : this.reciter;

        console.log('startSelectedPlayback: sending message with surah:', this.selectedSurahNumber, 'mode:', playbackMode, 'reciter:', reciter);

        // Update current reciter if different
        if (reciter !== this.reciter) {
            this.updateReciterSetting(reciter);
        }

        // Capture surah number before closing modal
        const surahToPlay = this.selectedSurahNumber;

        // Close modal
        this.closePlaybackOptionsModal();

        // Send playback request with options
        this.postMessage('playQuran', {
            surah: surahToPlay,
            mode: playbackMode,
            reciter: reciter
        });
    }

    // Quran Listening Statistics
    incrementListeningCounter() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const now = new Date().getTime(); // Timestamp for last update

        // Initialize today's count if it doesn't exist
        if (!this.listeningStats.dailyStats[today]) {
            this.listeningStats.dailyStats[today] = 0;
        }

        // Increment counters
        this.listeningStats.totalSessions++;
        this.listeningStats.dailyStats[today]++;
        this.listeningStats.lastUpdated = now;

        // Save to localStorage
        this.saveListeningStats();

        // Update UI
        this.updateListeningStatsDisplay();

        console.log('Listening counter incremented:', this.listeningStats);
    }

    loadListeningStats() {
        try {
            const savedStats = localStorage.getItem('quranListeningStats');
            if (savedStats) {
                const parsed = JSON.parse(savedStats);
                this.listeningStats = {
                    totalSessions: parsed.totalSessions || 0,
                    totalTimePlayed: parsed.totalTimePlayed || 0,
                    dailyStats: parsed.dailyStats || {},
                    dailyTimeStats: parsed.dailyTimeStats || {},
                    lastUpdated: parsed.lastUpdated || null,
                    statsMode: parsed.statsMode || 'sessions'
                };
            }
            console.log('Loaded listening stats:', this.listeningStats);
        } catch (error) {
            console.warn('Failed to load listening stats:', error);
            // Use defaults
        }
    }

    saveListeningStats() {
        try {
            localStorage.setItem('quranListeningStats', JSON.stringify(this.listeningStats));
        } catch (error) {
            console.warn('Failed to save listening stats:', error);
        }
    }

    calculateWeeklyStats() {
        const today = new Date();
        let weekTotal = 0;

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];

            weekTotal += this.listeningStats.dailyStats[dateKey] || 0;
        }

        return weekTotal;
    }

    calculateMonthlyStats() {
        const today = new Date();
        // Start of current month (e.g., October 1st if today is October 1st)
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        let monthTotal = 0;

        for (const [dateKey, count] of Object.entries(this.listeningStats.dailyStats)) {
            const date = new Date(dateKey);
            // Only count days from start of month to today (inclusive)
            if (date >= startOfMonth && date <= today) {
                monthTotal += count;
            }
        }

        return monthTotal;
    }



    // Time tracking methods
    startTimeTracking() {
        this.playStartTime = Date.now();
        console.log('Started time tracking at:', this.playStartTime);
    }

    stopTimeTracking() {
        if (!this.playStartTime) {
            return; // Not currently tracking
        }

        const now = Date.now();
        const elapsedTime = now - this.playStartTime;
        this.currentSessionTime += elapsedTime;

        console.log('Stopped time tracking. Elapsed time:', elapsedTime, 'ms');

        // Accumulate to total and daily time
        const today = new Date().toISOString().split('T')[0];

        // Initialize daily time if not exists
        if (!this.listeningStats.dailyTimeStats[today]) {
            this.listeningStats.dailyTimeStats[today] = 0;
        }

        // Add time to totals
        this.listeningStats.totalTimePlayed += elapsedTime;
        this.listeningStats.dailyTimeStats[today] += elapsedTime;
        this.listeningStats.lastUpdated = now;

        // Save and reset tracking
        this.saveListeningStats();
        this.playStartTime = null;
        this.currentSessionTime = 0;
        this.updateListeningStatsDisplay();
    }

    // Format milliseconds to HH:MM:SS
    formatDuration(milliseconds) {
        if (!milliseconds || milliseconds < 1000) {
            return '0:00:00';
        }

        const seconds = Math.floor(milliseconds / 1000) % 60;
        const minutes = Math.floor(milliseconds / (1000 * 60)) % 60;
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));

        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Toggle between sessions and time statistics
    toggleStatisticsMode() {
        this.listeningStats.statsMode = this.listeningStats.statsMode === 'sessions' ? 'time' : 'sessions';
        this.saveListeningStats();
        this.updateListeningStatsDisplay();
        console.log('Toggled stats mode to:', this.listeningStats.statsMode);
    }

    updateListeningStatsDisplay() {
        const statsContainer = document.getElementById('listeningStats');
        if (!statsContainer) {
            console.log('Listening stats container not found');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const mode = this.listeningStats.statsMode;

        let icon, title;
        if (mode === 'time') {
            icon = '⏰';
            title = 'Quran Time';
        } else {
            icon = '📊';
            title = 'Quran Listening';
        }

        let totalValue, todayValue, weekValue, monthValue;

        if (mode === 'time') {
            // Time mode - show time in HH:MM:SS
            todayValue = this.formatDuration(this.listeningStats.dailyTimeStats[today] || 0);
            weekValue = this.formatDuration(this.calculateWeeklyTimeStats());
            monthValue = this.formatDuration(this.calculateMonthlyTimeStats());
        } else {
            // Session mode - show counts
            todayValue = this.listeningStats.dailyStats[today] || 0;
            weekValue = this.calculateWeeklyStats();
            monthValue = this.calculateMonthlyStats();

            // Format large numbers with commas
            todayValue = todayValue.toLocaleString();
            weekValue = weekValue.toLocaleString();
            monthValue = monthValue.toLocaleString();
        }

        const html = `
            <div class="stats-header">
                <span class="stats-icon">${icon}</span>
                <span class="stats-title">${title}</span>
                <span class="stats-reset" onclick="this.getRootNode().host.resetStats()" title="Reset all statistics">🔄</span>
            </div>
            <div class="stats-content">
                <div class="stat-item">
                    <span class="stat-label">${mode === 'time' ? 'Total Time' : 'Total Sessions'}</span>
                    <span class="stat-value">${mode === 'time' ? this.formatDuration(this.listeningStats.totalTimePlayed) : this.listeningStats.totalSessions.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Today</span>
                    <span class="stat-value">${todayValue}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">This Week</span>
                    <span class="stat-value">${weekValue}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">This Month</span>
                    <span class="stat-value">${monthValue}</span>
                </div>
            </div>
        `;

        statsContainer.innerHTML = html;
        statsContainer.style.display = 'block';
    }

    // Calculate weekly time stats (in milliseconds)
    calculateWeeklyTimeStats() {
        const today = new Date();
        let weekTotal = 0;

        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];

            weekTotal += this.listeningStats.dailyTimeStats[dateKey] || 0;
        }

        return weekTotal;
    }

    // Calculate monthly time stats (in milliseconds) - from start of month to today
    calculateMonthlyTimeStats() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        let monthTotal = 0;

        for (const [dateKey, time] of Object.entries(this.listeningStats.dailyTimeStats)) {
            const date = new Date(dateKey);
            if (date >= startOfMonth && date <= today) {
                monthTotal += time;
            }
        }

        return monthTotal;
    }

    resetStats() {
        const modeText = this.listeningStats.statsMode === 'time' ? 'listening time' : 'session';
        if (confirm(`Are you sure you want to reset all listening ${modeText} statistics? This cannot be undone.`)) {
            this.listeningStats = {
                totalSessions: 0,
                totalTimePlayed: 0,
                dailyStats: {},
                dailyTimeStats: {},
                lastUpdated: null,
                statsMode: this.listeningStats.statsMode || 'sessions'
            };
            this.saveListeningStats();
            this.updateListeningStatsDisplay();
            this.showNotification('Statistics reset successfully', 'success');
        }
    }

    // Helper method to calculate global ayah number from surah and ayah numbers
    calculateGlobalAyahNumber(surahNumber, ayahNumber) {
        let globalAyah = 0;
        for (let surah of this.surahData) {
            if (surah.number < surahNumber) {
                globalAyah += surah.verses;
            } else if (surah.number === surahNumber) {
                globalAyah += ayahNumber;
                break;
            }
        }
        return globalAyah;
    }

    // Salawat Counter Methods
    loadSalawatCounter() {
        try {
            const saved = localStorage.getItem('salawatCounter');
            if (saved) {
                this.salawatCounter = { ...this.salawatCounter, ...JSON.parse(saved) };
            }
            this.updateSalawatCounterUI();
        } catch (error) {
            console.warn('Failed to load salawat counter:', error);
        }
    }

    saveSalawatCounter() {
        try {
            localStorage.setItem('salawatCounter', JSON.stringify(this.salawatCounter));
        } catch (error) {
            console.warn('Failed to save salawat counter:', error);
        }
    }

    updateSalawatCounterUI() {
        const currentEl = document.getElementById('currentSalawatCount');
        const targetEl = document.getElementById('salawatTarget');
        const statusEl = document.getElementById('salawatStatus');
        const counterEl = document.getElementById('salawatCounter');

        if (!currentEl || !targetEl || !statusEl || !counterEl) {
            return; // Elements not found
        }

        if (this.salawatCounter.currentCount >= this.salawatCounter.dailyTarget) {
            // Completed target
            counterEl.classList.add('salawat-completed');
            statusEl.textContent = window.localization.getString('salawatCompleted');
        } else {
            // In progress
            counterEl.classList.remove('salawat-completed');
            const remaining = this.salawatCounter.dailyTarget - this.salawatCounter.currentCount;
            statusEl.textContent = window.localization.getString('salawatRemaining', { remaining: remaining });
        }

        // Update display
        currentEl.textContent = this.salawatCounter.currentCount;
        targetEl.textContent = this.salawatCounter.dailyTarget;
    }

    incrementSalawatCounter() {
        // Check date reset first
        this.checkSalawatCounterReset();

        this.salawatCounter.currentCount++;
        this.saveSalawatCounter();
        this.updateSalawatCounterUI();

        console.log(`Salawat counter incremented: ${this.salawatCounter.currentCount}/${this.salawatCounter.dailyTarget}`);
    }

    checkSalawatCounterReset() {
        const today = new Date().toDateString();
        if (this.salawatCounter.lastResetDate !== today) {
            this.salawatCounter.currentCount = 0;
            this.salawatCounter.lastResetDate = today;

            // Check if Ramadan and update target
            const isRamadan = this.isRamadanInIslamicCalendar();
            const isFriday = new Date().getDay() === 5;

            if (isRamadan) {
                this.salawatCounter.dailyTarget = 100; // Higher target for Ramadan
            } else if (isFriday) {
                this.salawatCounter.dailyTarget = 24; // Friday target
            } else {
                this.salawatCounter.dailyTarget = 11; // Regular target
            }

            this.saveSalawatCounter();
        }
    }

    isRamadanInIslamicCalendar() {
        // Simple Ramadan detection - adjust for your location
        const now = new Date();
        const year = now.getFullYear();
        // Approximate Ramadan timing (this should be calculated properly)
        // Adjust these dates based on actual Islamic calendar
        const ramadanStart = new Date(year, 2, 1); // March 1 (approximate)
        const ramadanEnd = new Date(year, 2, 31);   // March 31 (approximate)

        if (now >= ramadanStart && now <= ramadanEnd) {
            return true;
        }

        // If not found in March, check April (Ramadan shifts annually)
        const altStart = new Date(year, 3, 1);
        const altEnd = new Date(year, 3, 30);
        return now >= altStart && now <= altEnd;
    }

    // Tasbih Counter Methods
    loadTasbihCounters() {
        try {
            const saved = localStorage.getItem('tasbihCounters');
            if (saved) {
                this.tasbihCounters = { ...this.tasbihCounters, ...JSON.parse(saved) };
            }
            this.updateTasbihCountersUI();
        } catch (error) {
            console.warn('Failed to load tasbih counters:', error);
        }
    }

    saveTasbihCounters() {
        try {
            localStorage.setItem('tasbihCounters', JSON.stringify(this.tasbihCounters));
        } catch (error) {
            console.warn('Failed to save tasbih counters:', error);
        }
    }

    incrementTasbihCounter(dhikrType) {
        if (!this.tasbihCounters[dhikrType]) {
            this.tasbihCounters[dhikrType] = 0;
        }

        this.tasbihCounters[dhikrType]++;
        this.saveTasbihCounters();
        this.updateTasbihCountersUI();

        console.log(`${dhikrType} counter incremented to: ${this.tasbihCounters[dhikrType]}`);
    }

    updateTasbihCountersUI() {
        // Update each dhikr counter display
        ['subhanallah', 'alhamdulillah', 'la-ilaha', 'allahu-akbar'].forEach(dhikrType => {
            const elementId = this.mapDhikrTypeToElementId(dhikrType);
            const countElement = elementId ? document.querySelector(`#${elementId} .dhikr-count`) : null;

            if (countElement) {
                countElement.textContent = this.tasbihCounters[dhikrType] || 0;
            }
        });
    }

    mapDhikrTypeToElementId(dhikrType) {
        const mapping = {
            'subhanallah': 'dhikr-subhanallah',
            'alhamdulillah': 'dhikr-alhamdulillah',
            'la-ilaha': 'dhikr-la-ilaha',
            'allahu-akbar': 'dhikr-allahu-akbar'
        };
        return mapping[dhikrType];
    }

    resetTasbihCounters() {
        if (confirm(window.localization.getString('counterResetConfirm'))) {
            this.tasbihCounters = {
                subhanallah: 0,
                alhamdulillah: 0,
                laIlahaIllaAllah: 0,
                allahuAkbar: 0
            };
            this.saveTasbihCounters();
            this.updateTasbihCountersUI();
            this.showNotification('Tasbih counters reset successfully', 'success');
        }
    }

    // Istighfar Counter Methods
    loadIstighfarCounters() {
        try {
            const saved = localStorage.getItem('istighfarCounters');
            if (saved) {
                this.istighfarCounters = { ...this.istighfarCounters, ...JSON.parse(saved) };
            }
            this.updateIstighfarCountersUI();
        } catch (error) {
            console.warn('Failed to load istighfar counters:', error);
        }
    }

    saveIstighfarCounters() {
        try {
            localStorage.setItem('istighfarCounters', JSON.stringify(this.istighfarCounters));
        } catch (error) {
            console.warn('Failed to save istighfar counters:', error);
        }
    }

    incrementIstighfarCounter(dhikrType) {
        if (!this.istighfarCounters[dhikrType]) {
            this.istighfarCounters[dhikrType] = 0;
        }

        this.istighfarCounters[dhikrType]++;
        this.saveIstighfarCounters();
        this.updateIstighfarCountersUI();

        console.log(`${dhikrType} istighfar counter incremented to: ${this.istighfarCounters[dhikrType]}`);
    }

    updateIstighfarCountersUI() {
        // Update each istighfar counter display
        ['astaghfirullah', 'subhanakallahumma'].forEach(dhikrType => {
            const elementId = this.mapIstighfarTypeToElementId(dhikrType);
            const countElement = elementId ? document.querySelector(`#${elementId} .dhikr-count`) : null;

            if (countElement) {
                countElement.textContent = this.istighfarCounters[dhikrType] || 0;
            }
        });
    }

    mapIstighfarTypeToElementId(dhikrType) {
        const mapping = {
            'astaghfirullah': 'dhikr-istighfar-astaghfirullah',
            'subhanakallahumma': 'dhikr-istighfar-subhanakallahumma'
        };
        return mapping[dhikrType];
    }

    // Adhkar Counter Methods
    loadAdhkarCounters() {
        try {
            const saved = localStorage.getItem('adhkarCounters');
            if (saved) {
                this.adhkarCounters = { ...this.adhkarCounters, ...JSON.parse(saved) };
            }
            this.updateAdhkarCountersUI();
        } catch (error) {
            console.warn('Failed to load adhkar counters:', error);
        }
    }

    saveAdhkarCounters() {
        try {
            localStorage.setItem('adhkarCounters', JSON.stringify(this.adhkarCounters));
        } catch (error) {
            console.warn('Failed to save adhkar counters:', error);
        }
    }

    incrementAdhkarCounter(dhikrType) {
        if (!this.adhkarCounters[dhikrType]) {
            this.adhkarCounters[dhikrType] = 0;
        }

        this.adhkarCounters[dhikrType]++;
        this.saveAdhkarCounters();
        this.updateAdhkarCountersUI();

        console.log(`${dhikrType} adhkar counter incremented to: ${this.adhkarCounters[dhikrType]}`);
    }

    updateAdhkarCountersUI() {
        // Update each adhkar counter display
        ['auzubillahi', 'rabbiGhifir', 'hasbiyallah', 'laHawla'].forEach(dhikrType => {
            const elementId = this.mapAdhkarTypeToElementId(dhikrType);
            const countElement = elementId ? document.querySelector(`#${elementId} .dhikr-count`) : null;

            if (countElement) {
                countElement.textContent = this.adhkarCounters[dhikrType] || 0;
            }
        });
    }

    mapAdhkarTypeToElementId(dhikrType) {
        const mapping = {
            'auzubillahi': 'dhikr-adhkar-auzubillahi',
            'rabbiGhifir': 'dhikr-adhkar-rabbi-ghifir',
            'hasbiyallah': 'dhikr-adhkar-hasbiyallah',
            'laHawla': 'dhikr-adhkar-la-hawla'
        };
        return mapping[dhikrType];
    }

    // Prayer Goals Methods
    loadPrayerGoals() {
        try {
            const saved = localStorage.getItem('prayerGoals');
            if (saved) {
                this.prayerGoals = { ...this.prayerGoals, ...JSON.parse(saved) };
            }
            this.updatePrayerGoalsUI();
        } catch (error) {
            console.warn('Failed to load prayer goals:', error);
        }
    }

    savePrayerGoals() {
        try {
            localStorage.setItem('prayerGoals', JSON.stringify(this.prayerGoals));
        } catch (error) {
            console.warn('Failed to save prayer goals:', error);
        }
    }

    updatePrayerGoal(prayer, completed) {
        this.prayerGoals[prayer] = completed;
        this.savePrayerGoals();
        this.updatePrayerGoalsUI();

        console.log(`${prayer} goal updated to: ${completed}`);
    }

    updatePrayerGoalsUI() {
        // Update goal display percentage
        const completedCount = Object.values(this.prayerGoals).filter(Boolean).length;
        const goalsCompletedDisplay = document.getElementById('goalsCompletedDisplay');
        if (goalsCompletedDisplay) {
            const percentage = Math.round((completedCount / 5) * 100);
            goalsCompletedDisplay.textContent = `${completedCount}/5 (${percentage}%)`;
        }

        // Update individual goal checkboxes
        Object.keys(this.prayerGoals).forEach(prayer => {
            const checkbox = document.getElementById(`${prayer}Goal`);
            if (checkbox) {
                checkbox.checked = this.prayerGoals[prayer] || false;
            }
        });
    }

    // Surah data
    getSurahData() {
        return [
            { number: 1, name: "Al-Fatiha", arabicName: "الفاتحة", verses: 7, type: "Meccan" },
            { number: 2, name: "Al-Baqarah", arabicName: "البقرة", verses: 286, type: "Medinan" },
            { number: 3, name: "Aal-E-Imran", arabicName: "آل عمران", verses: 200, type: "Medinan" },
            { number: 4, name: "An-Nisa", arabicName: "النساء", verses: 176, type: "Medinan" },
            { number: 5, name: "Al-Ma'idah", arabicName: "المائدة", verses: 120, type: "Medinan" },
            { number: 6, name: "Al-An'am", arabicName: "الأنعام", verses: 165, type: "Meccan" },
            { number: 7, name: "Al-A'raf", arabicName: "الأعراف", verses: 206, type: "Meccan" },
            { number: 8, name: "Al-Anfal", arabicName: "الأنفال", verses: 75, type: "Medinan" },
            { number: 9, name: "At-Tawbah", arabicName: "التوبة", verses: 129, type: "Medinan" },
            { number: 10, name: "Yunus", arabicName: "يونس", verses: 109, type: "Meccan" },
            { number: 11, name: "Hud", arabicName: "هود", verses: 123, type: "Meccan" },
            { number: 12, name: "Yusuf", arabicName: "يوسف", verses: 111, type: "Meccan" },
            { number: 13, name: "Ar-Ra'd", arabicName: "الرعد", verses: 43, type: "Medinan" },
            { number: 14, name: "Ibrahim", arabicName: "إبراهيم", verses: 52, type: "Meccan" },
            { number: 15, name: "Al-Hijr", arabicName: "الحجر", verses: 99, type: "Meccan" },
            { number: 16, name: "An-Nahl", arabicName: "النحل", verses: 128, type: "Meccan" },
            { number: 17, name: "Al-Isra", arabicName: "الإسراء", verses: 111, type: "Meccan" },
            { number: 18, name: "Al-Kahf", arabicName: "الكهف", verses: 110, type: "Meccan" },
            { number: 19, name: "Maryam", arabicName: "مريم", verses: 98, type: "Meccan" },
            { number: 20, name: "Ta-Ha", arabicName: "طه", verses: 135, type: "Meccan" },
            { number: 21, name: "Al-Anbiya", arabicName: "الأنبياء", verses: 112, type: "Meccan" },
            { number: 22, name: "Al-Hajj", arabicName: "الحج", verses: 78, type: "Medinan" },
            { number: 23, name: "Al-Mu'minun", arabicName: "المؤمنون", verses: 118, type: "Meccan" },
            { number: 24, name: "An-Nur", arabicName: "النور", verses: 64, type: "Medinan" },
            { number: 25, name: "Al-Furqan", arabicName: "الفرقان", verses: 77, type: "Meccan" },
            { number: 26, name: "Ash-Shu'ara", arabicName: "الشعراء", verses: 227, type: "Meccan" },
            { number: 27, name: "An-Naml", arabicName: "النمل", verses: 93, type: "Meccan" },
            { number: 28, name: "Al-Qasas", arabicName: "القصص", verses: 88, type: "Meccan" },
            { number: 29, name: "Al-Ankabut", arabicName: "العنكبوت", verses: 69, type: "Meccan" },
            { number: 30, name: "Ar-Rum", arabicName: "الروم", verses: 60, type: "Meccan" },
            { number: 31, name: "Luqman", arabicName: "لقمان", verses: 34, type: "Meccan" },
            { number: 32, name: "As-Sajda", arabicName: "السجدة", verses: 30, type: "Meccan" },
            { number: 33, name: "Al-Ahzab", arabicName: "الأحزاب", verses: 73, type: "Medinan" },
            { number: 34, name: "Saba", arabicName: "سبأ", verses: 54, type: "Meccan" },
            { number: 35, name: "Fatir", arabicName: "فاطر", verses: 45, type: "Meccan" },
            { number: 36, name: "Ya-Sin", arabicName: "يس", verses: 83, type: "Meccan" },
            { number: 37, name: "As-Saffat", arabicName: "الصافات", verses: 182, type: "Meccan" },
            { number: 38, name: "Sad", arabicName: "ص", verses: 88, type: "Meccan" },
            { number: 39, name: "Az-Zumar", arabicName: "الزمر", verses: 75, type: "Meccan" },
            { number: 40, name: "Ghafir", arabicName: "غافر", verses: 85, type: "Meccan" },
            { number: 41, name: "Fussilat", arabicName: "فصلت", verses: 54, type: "Meccan" },
            { number: 42, name: "Ash-Shura", arabicName: "الشورى", verses: 53, type: "Meccan" },
            { number: 43, name: "Az-Zukhruf", arabicName: "الزخرف", verses: 89, type: "Meccan" },
            { number: 44, name: "Ad-Dukhan", arabicName: "الدخان", verses: 59, type: "Meccan" },
            { number: 45, name: "Al-Jathiya", arabicName: "الجاثية", verses: 37, type: "Meccan" },
            { number: 46, name: "Al-Ahqaf", arabicName: "الأحقاف", verses: 35, type: "Meccan" },
            { number: 47, name: "Muhammad", arabicName: "محمد", verses: 38, type: "Medinan" },
            { number: 48, name: "Al-Fath", arabicName: "الفتح", verses: 29, type: "Medinan" },
            { number: 49, name: "Al-Hujurat", arabicName: "الحجرات", verses: 18, type: "Medinan" },
            { number: 50, name: "Qaf", arabicName: "ق", verses: 45, type: "Meccan" },
            { number: 51, name: "Adh-Dhariyat", arabicName: "الذاريات", verses: 60, type: "Meccan" },
            { number: 52, name: "At-Tur", arabicName: "الطور", verses: 49, type: "Meccan" },
            { number: 53, name: "An-Najm", arabicName: "النجم", verses: 62, type: "Meccan" },
            { number: 54, name: "Al-Qamar", arabicName: "القمر", verses: 55, type: "Meccan" },
            { number: 55, name: "Ar-Rahman", arabicName: "الرحمن", verses: 78, type: "Medinan" },
            { number: 56, name: "Al-Waqi'a", arabicName: "الواقعة", verses: 96, type: "Meccan" },
            { number: 57, name: "Al-Hadid", arabicName: "الحديد", verses: 29, type: "Medinan" },
            { number: 58, name: "Al-Mujadila", arabicName: "المجادلة", verses: 22, type: "Medinan" },
            { number: 59, name: "Al-Hashr", arabicName: "الحشر", verses: 24, type: "Medinan" },
            { number: 60, name: "Al-Mumtahina", arabicName: "الممتحنة", verses: 13, type: "Medinan" },
            { number: 61, name: "As-Saff", arabicName: "الصف", verses: 14, type: "Medinan" },
            { number: 62, name: "Al-Jumu'a", arabicName: "الجمعة", verses: 11, type: "Medinan" },
            { number: 63, name: "Al-Munafiqun", arabicName: "المنافقون", verses: 11, type: "Medinan" },
            { number: 64, name: "At-Taghabun", arabicName: "التغابن", verses: 18, type: "Medinan" },
            { number: 65, name: "At-Talaq", arabicName: "الطلاق", verses: 12, type: "Medinan" },
            { number: 66, name: "At-Tahrim", arabicName: "التحريم", verses: 12, type: "Medinan" },
            { number: 67, name: "Al-Mulk", arabicName: "الملك", verses: 30, type: "Meccan" },
            { number: 68, name: "Al-Qalam", arabicName: "القلم", verses: 52, type: "Meccan" },
            { number: 69, name: "Al-Haqqah", arabicName: "الحاقة", verses: 52, type: "Meccan" },
            { number: 70, name: "Al-Ma'arij", arabicName: "المعارج", verses: 44, type: "Meccan" },
            { number: 71, name: "Nuh", arabicName: "نوح", verses: 28, type: "Meccan" },
            { number: 72, name: "Al-Jinn", arabicName: "الجن", verses: 28, type: "Meccan" },
            { number: 73, name: "Al-Muzzammil", arabicName: "المزمل", verses: 20, type: "Meccan" },
            { number: 74, name: "Al-Muddathir", arabicName: "المدثر", verses: 56, type: "Meccan" },
            { number: 75, name: "Al-Qiyamah", arabicName: "القيامة", verses: 40, type: "Meccan" },
            { number: 76, name: "Al-Insan", arabicName: "الإنسان", verses: 31, type: "Medinan" },
            { number: 77, name: "Al-Mursalat", arabicName: "المرسلات", verses: 50, type: "Meccan" },
            { number: 78, name: "An-Naba", arabicName: "النبأ", verses: 40, type: "Meccan" },
            { number: 79, name: "An-Nazi'at", arabicName: "النازعات", verses: 46, type: "Meccan" },
            { number: 80, name: "Abasa", arabicName: "عبس", verses: 42, type: "Meccan" },
            { number: 81, name: "At-Takwir", arabicName: "التكوير", verses: 29, type: "Meccan" },
            { number: 82, name: "Al-Infitar", arabicName: "الإنفطار", verses: 19, type: "Meccan" },
            { number: 83, name: "Al-Mutaffifin", arabicName: "المطففين", verses: 36, type: "Meccan" },
            { number: 84, name: "Al-Inshiqaq", arabicName: "الإنشقاق", verses: 25, type: "Meccan" },
            { number: 85, name: "Al-Buruj", arabicName: "البروج", verses: 22, type: "Meccan" },
            { number: 86, name: "At-Tariq", arabicName: "الطارق", verses: 17, type: "Meccan" },
            { number: 87, name: "Al-A'la", arabicName: "الأعلى", verses: 19, type: "Meccan" },
            { number: 88, name: "Al-Ghashiyah", arabicName: "الغاشية", verses: 26, type: "Meccan" },
            { number: 89, name: "Al-Fajr", arabicName: "الفجر", verses: 30, type: "Meccan" },
            { number: 90, name: "Al-Balad", arabicName: "البلد", verses: 20, type: "Meccan" },
            { number: 91, name: "Ash-Shams", arabicName: "الشمس", verses: 15, type: "Meccan" },
            { number: 92, name: "Al-Lail", arabicName: "الليل", verses: 21, type: "Meccan" },
            { number: 93, name: "Ad-Duha", arabicName: "الضحى", verses: 11, type: "Meccan" },
            { number: 94, name: "Ash-Sharh", arabicName: "الشرح", verses: 8, type: "Meccan" },
            { number: 95, name: "At-Tin", arabicName: "التين", verses: 8, type: "Meccan" },
            { number: 96, name: "Al-Alaq", arabicName: "العلق", verses: 19, type: "Meccan" },
            { number: 97, name: "Al-Qadr", arabicName: "القدر", verses: 5, type: "Meccan" },
            { number: 98, name: "Al-Bayyinah", arabicName: "البينة", verses: 8, type: "Medinan" },
            { number: 99, name: "Az-Zalzalah", arabicName: "الزلزلة", verses: 8, type: "Medinan" },
            { number: 100, name: "Al-Adiyat", arabicName: "العاديات", verses: 11, type: "Meccan" },
            { number: 101, name: "Al-Qari'ah", arabicName: "القارعة", verses: 11, type: "Meccan" },
            { number: 102, name: "At-Takathur", arabicName: "التكاثر", verses: 8, type: "Meccan" },
            { number: 103, name: "Al-Asr", arabicName: "العصر", verses: 3, type: "Meccan" },
            { number: 104, name: "Al-Humazah", arabicName: "الهمزة", verses: 9, type: "Meccan" },
            { number: 105, name: "Al-Fil", arabicName: "الفيل", verses: 5, type: "Meccan" },
            { number: 106, name: "Quraish", arabicName: "قريش", verses: 4, type: "Meccan" },
            { number: 107, name: "Al-Ma'un", arabicName: "الماعون", verses: 7, type: "Meccan" },
            { number: 108, name: "Al-Kawthar", arabicName: "الكوثر", verses: 3, type: "Meccan" },
            { number: 109, name: "Al-Kafirun", arabicName: "الكافرون", verses: 6, type: "Meccan" },
            { number: 110, name: "An-Nasr", arabicName: "النصر", verses: 3, type: "Medinan" },
            { number: 111, name: "Al-Masad", arabicName: "المسد", verses: 5, type: "Meccan" },
            { number: 112, name: "Al-Ikhlas", arabicName: "الإخلاص", verses: 4, type: "Meccan" },
            { number: 113, name: "Al-Falaq", arabicName: "الفلق", verses: 5, type: "Meccan" },
            { number: 114, name: "An-Nas", arabicName: "الناس", verses: 6, type: "Meccan" }
        ];
    }
}

// Initialize the activity bar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quranActivityBar = new QuranActivityBar();
});

// Handle messages from extension
window.addEventListener('message', event => {
    if (window.quranActivityBar && event.data) {
        window.quranActivityBar.handleMessage(event.data);
    }
});
