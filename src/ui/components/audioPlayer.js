/**
 * Audio Player Component - Manages Quran player controls and audio functionality
 */
import { logger } from '../utils/Logger.js';

class AudioPlayerComponent {
    constructor() {
        // Audio player state
        this.currentSurah = null;
        this.currentAyah = null;
        this.isPlaying = false;
        this.volume = 70;
        this.playbackMode = 'surah'; // 'surah' or 'ayah'
        this.currentPlaybackMode = null; // Track current audio playback mode
        this.reciter = 'ar.abdulbasitmurattal';
        this.audioQuality = '128';

        // Audio controls
        this.audioElement = null;
        this.currentAudioUrl = null;
        this.currentTime = 0;
        this.duration = 0;

        // Quran Reader state
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentReaderSurah = null;

        // Listening Statistics
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

        this.surahData = this.getSurahData();
        this.showReadingProgress = false;

        this.loadListeningStats();
        this.initializeAudio();
        this.setupAudioEventListeners();
    }

    setupAudioEventListeners() {
        // Quick access surah cards (audio)
        document.querySelectorAll('.surah-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const surahNumber = e.currentTarget.dataset.surah;
                this.showPlaybackOptionsModal(surahNumber);
            });
        });

        // Read surah cards (for Quran Reader)
        document.querySelectorAll('.read-surah-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const surahNumber = e.currentTarget.dataset.surah;
                this.openQuranReader(surahNumber);
            });
        });

        // Volume control
        const volumeSlider = document.getElementById('volumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value);
            });
        }

        // Playback controls
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

        // Progress bar
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                this.seekToPosition(e);
            });
        }

        // Playback Options Modal event listeners
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

        // Modal closers
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

        // Quran Reader modal event listeners
        const prevPageBtn = document.getElementById('prevPageBtn');
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                this.previousPage();
            });
        }

        const nextPageBtn = document.getElementById('nextPageBtn');
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                this.nextPage();
            });
        }

        const readerClose = document.getElementById('readerClose');
        if (readerClose) {
            readerClose.addEventListener('click', () => {
                this.closeQuranReader();
            });
        }

        const closeReaderBtn = document.getElementById('closeReaderBtn');
        if (closeReaderBtn) {
            closeReaderBtn.addEventListener('click', () => {
                this.closeQuranReader();
            });
        }

        const quranReaderModal = document.getElementById('quranReaderModal');
        if (quranReaderModal) {
            quranReaderModal.addEventListener('click', (e) => {
                if (e.target.id === 'quranReaderModal') {
                    this.closeQuranReader();
                }
            });
        }
    }

    postMessage(type, data = {}) {
        window.vscode.postMessage({ type, ...data });
    }

    // Direct playback method - starts immediately with default settings
    playSurahDirectly(surahNumber) {
        logger.info('playSurahDirectly called for surah:', surahNumber);

        // Start playback directly with default settings (full-surah mode, current reciter)
        this.postMessage('playQuran', {
            surah: surahNumber,
            mode: 'full-surah',
            reciter: this.reciter
        });
    }

    // Core audio functionality
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

    initializeAudio() {
        this.audioElement = document.getElementById('quranAudio');
        if (!this.audioElement) {
            logger.error('Audio element not found');
            return;
        }

        // Set initial volume
        this.audioElement.volume = this.volume / 100;

        // Audio event listeners
        this.audioElement.addEventListener('loadstart', () => {
            logger.info('Audio loading started');
        });

        this.audioElement.addEventListener('canplay', () => {
            logger.info('Audio can play');
            this.duration = this.audioElement.duration;
            this.updateTimeDisplay();
            // Ensure volume is applied to new audio
            if (this.audioElement) {
                this.audioElement.volume = this.volume / 100;
            }
        });

        this.audioElement.addEventListener('play', () => {
            logger.info('Audio started playing');
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
            logger.info('Audio paused');
            this.isPlaying = false;
            this.updatePlaybackControls();

            // Stop time tracking and accumulate time
            this.stopTimeTracking();
        });

        this.audioElement.addEventListener('ended', () => {
            logger.info('Audio ended');
            this.isPlaying = false;
            this.updatePlaybackControls();

            // Stop time tracking and accumulate time
            this.stopTimeTracking();

            // Check if we need to advance to next ayah in ayah-by-ayah mode
            if (this.currentPlaybackMode === 'ayah-by-ayah') {
                logger.info('Ayah ended, requesting next ayah');
                this.postMessage('ayahEnded', {
                    currentSurah: this.currentSurah,
                    currentAyah: this.currentAyah
                });
            } else {
                logger.info('Full surah or single ayah playback completed');
                // Handle end of surah - could auto-advance to next surah here
            }
        });

        this.audioElement.addEventListener('timeupdate', () => {
            this.currentTime = this.audioElement.currentTime;
            this.updateProgressBar();
            this.updateTimeDisplay();
            // Save current playback position for auto-resume
            this.savePlaybackPosition();
        });

        this.audioElement.addEventListener('error', (e) => {
            logger.error('Audio error:', e);
            // Try fallback: switch to default reciter and retry with new URL
            if (this.reciter !== 'ar.alafasy') {
                logger.info('Trying fallback to default reciter ar.alafasy');

                // Calculate global ayah number from current surah and ayah
                const globalAyah = this.calculateGlobalAyahNumber(this.currentSurah.number, this.currentAyah);

                // Construct new URL with fallback reciter
                const fallbackUrl = `https://cdn.islamic.network/quran/audio/${this.audioQuality}/ar.alafasy/${globalAyah}.mp3`;
                logger.info('Fallback URL:', fallbackUrl);

                // Update reciter setting
                this.reciter = 'ar.alafasy';
                this.saveSettings();

                // Set new source and retry playback
                this.audioElement.src = fallbackUrl;
                this.currentAudioUrl = fallbackUrl;

                const playPromise = this.audioElement.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        logger.info('Fallback audio started successfully');
                    }).catch(fallbackError => {
                        logger.error('Fallback audio play failed:', fallbackError);
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
        logger.info('AudioPlayer: playAudio called with URL:', url, 'surah:', surah, 'mode:', mode);
        if (!this.audioElement) {
            logger.error('Audio element not initialized');
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
        logger.info('playAudio: Extracting ayah from message - surah:', surah, 'mode:', mode, 'ayah:', message.ayah);
        if (message.ayah) {
            this.currentAyah = message.ayah;
            logger.info('Setting currentAyah from message.ayah:', this.currentAyah);
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
                    logger.info('Calculated currentAyah for ayah-by-ayah:', this.currentAyah, 'from globalAyah:', surah.globalAyah, 'surah:', surah.number);
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
                    logger.info('Calculated currentAyah for single-ayah:', this.currentAyah);
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
                logger.info('Audio started successfully');
            }).catch(error => {
                logger.error('Audio play failed:', error);
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
                logger.error('Resume audio failed:', error);
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

    seekToPosition(event) {
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = clickX / rect.width;

        document.querySelector('.progress-fill').style.width = `${percentage * 100}%`;

        // Send seek message to extension
        this.postMessage('seekAudio', { position: percentage });
    }

    updateProgressBar() {
        if (this.audioElement && this.duration) {
            const progress = (this.audioElement.currentTime / this.duration) * 100;
            document.querySelector('.progress-fill').style.width = `${progress}%`;
        }
    }

    seekAudio(position) {
        if (this.audioElement && this.duration) {
            const time = position * this.duration;
            this.audioElement.currentTime = time;
        }
    }

    showPlaybackOptionsModal(surahNumber) {
        const surah = this.surahData.find(s => s.number === parseInt(surahNumber));
        if (!surah) {return;}

        // Store the selected surah for playback
        this.currentSurah = surah;

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

    startSelectedPlayback() {
        logger.info('startSelectedPlayback called');
        logger.info('Current surah:', this.currentSurah);

        const playbackModeElement = document.querySelector('input[name="playbackMode"]:checked');
        const playbackMode = playbackModeElement ? playbackModeElement.value : 'full-surah';
        const reciterElement = document.getElementById('playbackReciterSelect');
        const reciter = reciterElement ? reciterElement.value : this.reciter;

        logger.info('Playback mode:', playbackMode, 'Reciter:', reciter);

        // Close modal and start playback
        this.closePlaybackOptionsModal();

        // Update current reciter if different
        if (reciter !== this.reciter) {
            this.reciter = reciter;
            this.saveSettings();
        }

        const surahToPlay = this.currentSurah ? this.currentSurah.number : 1;
        logger.info('Surah to play:', surahToPlay);

        if (!surahToPlay || surahToPlay === 1) {
            logger.error('No valid surah selected for playback!');
            this.showNotification('Please select a surah first', 'error');
            return;
        }

        this.postMessage('playQuran', {
            surah: surahToPlay,
            mode: playbackMode,
            reciter: reciter
        });
    }

    closePlaybackOptionsModal() {
        const modal = document.getElementById('playbackOptionsModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    // Open Quran Reader modal for reading text
    openQuranReader(surahNumber) {
        logger.info('openQuranReader called for surah:', surahNumber);

        const surah = this.surahData.find(s => s.number === parseInt(surahNumber));
        if (!surah) {
            logger.error('Surah not found:', surahNumber);
            return;
        }

        // Store current reader surah
        this.currentReaderSurah = parseInt(surahNumber);

        // Update modal title
        const titleEl = document.getElementById('readerSurahTitle');
        if (titleEl) {
            titleEl.textContent = `${surah.arabicName} (${surah.name})`;
        }

        // Reset pagination
        this.currentPage = 1;
        this.totalPages = 1;

        // Update page info
        this.updatePageInfo();

        // Load Quran text for this surah
        this.loadQuranText(surahNumber);

        // Show modal
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    // Load Quran text from API
    async loadQuranText(surahNumber) {
        const displayEl = document.getElementById('quranTextDisplay');
        if (!displayEl) {return;}

        // Show loading
        displayEl.innerHTML = '<div class="loading-text">Loading Quran text...</div>';

        try {
            // Use Al Quran Cloud API to get Arabic text
            const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();

            if (data.data && data.data.ayahs) {
                this.displayQuranText(data.data.ayahs, data.data.name);
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            logger.error('Error loading Quran text:', error);
            displayEl.innerHTML = '<div class="error-text">Failed to load Quran text. Please try again.</div>';
        }
    }

    // Display Quran text in the reader
    displayQuranText(ayahs, surahName) {
        const displayEl = document.getElementById('quranTextDisplay');
        if (!displayEl) {return;}

        let html = `<div class="surah-header">${surahName}</div>`;

        // Group ayahs into pages (approximately 10 ayahs per page for readability)
        const ayahsPerPage = 10;
        this.totalPages = Math.ceil(ayahs.length / ayahsPerPage);

        const startAyah = (this.currentPage - 1) * ayahsPerPage;
        const endAyah = Math.min(startAyah + ayahsPerPage, ayahs.length);

        for (let i = startAyah; i < endAyah; i++) {
            const ayah = ayahs[i];
            html += `
                <div class="arabic-verse">
                    <span class="verse-text">${ayah.text}</span>
                    <span class="verse-number">${ayah.numberInSurah}</span>
                </div>
            `;
        }

        displayEl.innerHTML = html;
        this.updatePageInfo();
    }

    // Update page information display
    updatePageInfo() {
        const pageInfoEl = document.getElementById('pageInfo');
        const currentPageEl = document.getElementById('currentPageNumber');
        const totalPagesEl = document.getElementById('totalPages');

        if (pageInfoEl) {
            pageInfoEl.textContent = `Page ${this.currentPage}/${this.totalPages}`;
        }
        if (currentPageEl) {
            currentPageEl.textContent = this.currentPage.toString();
        }
        if (totalPagesEl) {
            totalPagesEl.textContent = this.totalPages.toString();
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }

    // Navigate to previous page
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            // Reload current surah text for new page
            const surahNumber = this.getCurrentReaderSurah();
            if (surahNumber) {
                this.loadQuranText(surahNumber);
            }
        }
    }

    // Navigate to next page
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            // Reload current surah text for new page
            const surahNumber = this.getCurrentReaderSurah();
            if (surahNumber) {
                this.loadQuranText(surahNumber);
            }
        }
    }

    // Get current surah being read
    getCurrentReaderSurah() {
        return this.currentReaderSurah;
    }

    // Close Quran Reader modal
    closeQuranReader() {
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    // Statistics methods
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

        logger.info('Listening counter incremented:', this.listeningStats);
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
            logger.info('Loaded listening stats:', this.listeningStats);
        } catch (error) {
            logger.warn('Failed to load listening stats:', error);
        }
    }

    saveListeningStats() {
        try {
            localStorage.setItem('quranListeningStats', JSON.stringify(this.listeningStats));
        } catch (error) {
            logger.warn('Failed to save listening stats:', error);
        }
    }

    // Time tracking methods
    startTimeTracking() {
        this.playStartTime = Date.now();
        logger.info('Started time tracking at:', this.playStartTime);
    }

    stopTimeTracking() {
        if (!this.playStartTime) {
            return; // Not currently tracking
        }

        const now = Date.now();
        const elapsedTime = now - this.playStartTime;
        this.currentSessionTime += elapsedTime;

        logger.info('Stopped time tracking. Elapsed time:', elapsedTime, 'ms');

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
    }

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

    savePlaybackPosition() {
        if (!this.currentSurah || !this.audioElement) {
            return;
        }

        const playbackState = {
            surahNumber: this.currentSurah.number,
            surahName: this.currentSurah.name,
            currentTime: this.currentTime,
            duration: this.duration,
            reciter: this.reciter,
            lastPlayed: new Date().toISOString()
        };

        try {
            localStorage.setItem('quranLastPlayback', JSON.stringify(playbackState));
            logger.info('Saved playback position:', playbackState);
        } catch (error) {
            logger.warn('Failed to save playback position:', error);
        }
    }

    getLastPlaybackPosition() {
        try {
            const saved = localStorage.getItem('quranLastPlayback');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            logger.warn('Failed to load playback position:', error);
            return null;
        }
    }

    saveSettings() {
        const settings = {
            volume: this.volume,
            playbackMode: this.playbackMode,
            reciter: this.reciter,
            audioQuality: this.audioQuality,
            autoPlayStartup: false,
            theme: 'auto',
            compactMode: false,
            showNotifications: true,
            language: 'auto',
            enableReminders: true,
            reminderInterval: 30,
            reminderTypes: {
                showAdia: true,
                showAhadis: true,
                showWisdom: true,
                showMorningAzkar: true,
                showEveningAzkar: true
            },
            workingHoursOnly: false,
            islamicReminders: {
                fajr: false,
                dhuhr: false,
                asr: false,
                maghrib: false,
                isha: false
            },
            cacheSize: 100,
            downloadTimeout: 30,
            retryAttempts: 3
        };

        localStorage.setItem('quranPlayerSettings', JSON.stringify(settings));
    }

    // Handle messages from the extension
    handleMessage(message) {
        logger.info('AudioPlayer: Received message from extension:', message);

        switch (message.type) {
            case 'playAudio':
                logger.info('AudioPlayer: Handling playAudio message');
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
                if (message.volume !== undefined) {
                    this.setVolume(message.volume * 100); // Convert 0-1 to 0-100
                }
                break;
            case 'seekAudio':
                if (message.position !== undefined) {
                    this.seekAudio(message.position);
                }
                break;
            default:
                logger.info('AudioPlayer: Unknown message type:', message.type);
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        // This will delegate to the main component
        if (window.quranActivityBar && window.quranActivityBar.showNotification) {
            window.quranActivityBar.showNotification(message, type);
        }
    }

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

// Export for use in main activity bar
window.AudioPlayerComponent = AudioPlayerComponent;
