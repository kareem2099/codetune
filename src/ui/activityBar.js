// Modern Quran Player - Activity Bar JavaScript
const vscode = acquireVsCodeApi();

class QuranActivityBar {
    constructor() {
        this.currentSurah = null;
        this.isPlaying = false;
        this.volume = 70;
        this.playbackMode = 'surah'; // 'surah' or 'ayah'
        this.reciter = 'default';
        this.audioQuality = '128';
        this.searchTimeout = null;
        this.surahData = this.getSurahData();

        this.init();
    }

    init() {
        // Localize the page
        if (window.localization) {
            window.localization.localizeElements();
        }
        this.bindEvents();
        this.updateUI();
        this.loadSettings();
        this.showWelcomeMessage();
        this.startIslamicTimer();
        // Force immediate update of Islamic info
        this.forceUpdateIslamicInfo();
        // Listen for configuration changes
        this.listenForLanguageChanges();
    }

    bindEvents() {
        // Quick access surah cards
        document.querySelectorAll('.surah-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const surahNumber = e.currentTarget.dataset.surah;
                this.playSurah(surahNumber);
            });
        });

        // Playback controls
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.togglePlayback();
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            this.previousSurah();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextSurah();
        });

        // Volume control
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.setVolume(e.target.value);
        });

        // Search functionality
        document.getElementById('surahSearch').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Browse button
        document.getElementById('browseBtn').addEventListener('click', () => {
            this.openSurahBrowser();
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });



        // Modal
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeSurahBrowser();
        });

        document.getElementById('surahModal').addEventListener('click', (e) => {
            if (e.target.id === 'surahModal') {
                this.closeSurahBrowser();
            }
        });

        // Progress bar
        document.querySelector('.progress-bar').addEventListener('click', (e) => {
            this.seekToPosition(e);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
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
            this.pausePlayback();
        } else {
            this.resumePlayback();
        }
    }

    pausePlayback() {
        this.isPlaying = false;
        this.updatePlaybackControls();
        this.postMessage('pause');
    }

    resumePlayback() {
        if (this.currentSurah) {
            this.isPlaying = true;
            this.updatePlaybackControls();
            this.postMessage('resume');
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
        this.postMessage('setQuranVolume', { volume: this.volume / 100 });
        this.saveSettings();
    }

    setPlaybackMode(mode) {
        this.playbackMode = mode;

        // Update toggle buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        this.postMessage('setPlaybackMode', { mode: mode });
        this.saveSettings();
    }

    setReciter(reciter) {
        this.reciter = reciter;
        this.saveSettings();
        this.showNotification(window.localization.getString('reciterChanged', { reciter: reciter }));
    }

    setAudioQuality(quality) {
        this.audioQuality = quality;
        this.saveSettings();
        this.showNotification(window.localization.getString('audioQualitySet', { quality: quality }));
    }

    // UI Updates
    updateUI() {
        this.updateNowPlaying();
        this.updatePlaybackControls();
        this.updateVolumeDisplay();
        this.updateSettingsDisplay();
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
        document.getElementById('volumeSlider').value = this.volume;
        document.getElementById('volumeValue').textContent = `${this.volume}%`;
    }

    updateSettingsDisplay() {
        // Update settings-related UI elements if needed
        // This method was missing and causing initialization errors
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
                this.playSurah(surah.number.toString());
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

    // Settings
    openSettings() {
        this.postMessage('openSettings');
    }

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
        if (event.target.tagName === 'INPUT') {return;}

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
            theme: document.body.classList.contains('light-theme') ? 'light' : 'dark'
        };

        localStorage.setItem('quranPlayerSettings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('quranPlayerSettings') || '{}');

            this.volume = settings.volume || 70;
            this.playbackMode = settings.playbackMode || 'surah';
            this.reciter = settings.reciter || 'default';
            this.audioQuality = settings.audioQuality || '128';

            if (settings.theme === 'light') {
                document.body.classList.add('light-theme');
            }

            this.updateUI();
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
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
            fajr: { hour: 4, minute: 45 },      // Fajr: ~4:45 AM
            dhuhr: { hour: 12, minute: 15 },    // Dhuhr: ~12:15 PM
            asr: { hour: 15, minute: 45 },      // Asr: ~3:45 PM
            maghrib: { hour: 18, minute: 15 },  // Maghrib: ~6:15 PM
            isha: { hour: 19, minute: 45 }      // Isha: ~7:45 PM
        };

        const prayers = [
            { name: 'Fajr', time: prayerTimes.fajr },
            { name: 'Dhuhr', time: prayerTimes.dhuhr },
            { name: 'Asr', time: prayerTimes.asr },
            { name: 'Maghrib', time: prayerTimes.maghrib },
            { name: 'Isha', time: prayerTimes.isha }
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
            nextPrayer = 'Fajr';
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
            // Prayer time has passed, update to next prayer
            this.updateNextPrayer();
            return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        const countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('prayerCountdown').textContent = countdown;
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

    // Handle messages from extension
    handleMessage(message) {
        switch (message.type) {
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
                    } catch (error) {
                        console.warn('Failed to update language in localStorage:', error);
                    }
                }
                // Re-localize the activity bar when language changes
                if (window.localization) {
                    console.log('ActivityBar JS: Refreshing localization');
                    window.localization = new LocalizationManager();
                    window.localization.localizeElements();
                    console.log('ActivityBar JS: Localization updated');
                } else {
                    console.log('ActivityBar JS: Localization manager not found');
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
