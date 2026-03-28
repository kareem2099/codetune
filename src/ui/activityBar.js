/**
 * Modern Quran Player - Clean Activity Bar Main Coordinator
 * Uses modular components for better maintainability
 */
import { logger } from './utils/Logger.js';
import { surahData } from './data/surahData.js';
window.vscode = acquireVsCodeApi();

class QuranActivityBar {
    constructor() {
        // Initialize all components
        this.counterComponent = null;
        this.audioPlayerComponent = null;
        this.prayerTrackerComponent = null;
        this.settingsComponent = null;

        // Quran Reader properties (keeping here as it's shared functionality)
        this.currentReadingSurah = null;
        this.currentReadingPage = 1;
        this.totalReadingPages = 1;
        this.versesPerPage = 50; // Show 50 verses per page for maximum auto-scrolling content
        this.cachedVerses = {}; // Cache for verse data
        this.isReaderModalOpen = false; // Track modal state for reliable visibility checks

        // Auto Reading properties
        this.autoReadingEnabled = false;
        this.autoReadingActive = false;
        this.autoReadingSpeed = 4; // 4x speed (very fast scrolling)
        this.autoReadingInterval = null;
        this.autoReadingState = 'idle'; // State machine: 'idle', 'starting', 'active', 'stopping'

        // Adaptive reading speed properties
        this.userReadingPatterns = []; // Track user's reading speed
        this.adaptiveSpeedMode = true; // Auto-adjust speed based on user behavior (enabled by default)
        this.lastPageLoadTime = Date.now();
        this.pageReadDurations = [];
        this.adaptiveSpeedUpdateInterval = null;
        this.targetReadTime = 8000; // Default 8 seconds per page
        this.adaptiveSpeedEnabled = true; // Always enabled - this learns from user
        this.lastManualNavigationTime = Date.now();
        this.adaptiveSpeedIndicator = null; // UI indicator for current adaptive speed
        this.detectedReadingSpeed = 1; // Estimated reading speed (0.5-2.0 scale)

        this.surahData = surahData;
        this.initializeComponents();

        // Initialize remaining functionality
        this.bindGlobalEventListeners();
        this.startTimers();
        this.showWelcomeMessage();
        this.initializeFridaySurahStatus();
        this.setupModalEventListeners();
        this.checkAndShowWhatsNew();

        // Set up periodic visibility updates for Friday Surah section
        setInterval(() => {
            this.updateFridaySurahVisibility();
        }, 60000); // Check every minute

        // Initial visibility check
        this.updateFridaySurahVisibility();
    }

    setupModalEventListeners() {
        // What's New modal close button
        const whatsNewClose = document.getElementById('whatsNewClose');
        if (whatsNewClose) {
            whatsNewClose.onclick = () => this.closeWhatsNewModal();
        }

        // What's New got it button
        const whatsNewGotIt = document.getElementById('whatsNewGotIt');
        if (whatsNewGotIt) {
            whatsNewGotIt.onclick = () => this.closeWhatsNewModal();
        }

        // Close modal when clicking overlay
        const whatsNewModal = document.getElementById('whatsNewModal');
        if (whatsNewModal) {
            whatsNewModal.onclick = (e) => {
                if (e.target.id === 'whatsNewModal') {
                    this.closeWhatsNewModal();
                }
            };
        }
    }

    async checkAndShowWhatsNew() {
        try {
            // Check if user has already seen this version
            const seenVersion = localStorage.getItem('codetune_whatsnew_seen');
            const currentVersion = '1.2.1';

            if (seenVersion === currentVersion) {
                logger.info('User has already seen v1.0.0 whats new modal');
                return;
            }

            // Load content from new_features.txt using injected URI
            const featuresUrl = window.newFeaturesUri || './new_features.txt';
            const response = await fetch(featuresUrl);
            if (!response.ok) {
                logger.error('Failed to load whats new content');
                return;
            }

            const content = await response.text();
            this.parseAndShowWhatsNewModal(content);

        } catch (error) {
            logger.error('Error checking whats new:', error);
        }
    }

    parseAndShowWhatsNewModal(content) {
        const lines = content.split('\n');
        let version = '';
        let recentUpdates = [];
        let comingSoon = [];
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) { continue; }

            if (trimmed.startsWith('v')) {
                version = trimmed;
            } else if (trimmed === 'RECENT_UPDATES') {
                currentSection = 'recent';
            } else if (trimmed === 'COMING_SOON') {
                currentSection = 'coming';
            } else if (currentSection === 'recent' && trimmed.includes('-')) {
                recentUpdates.push(trimmed);
            } else if (currentSection === 'coming' && trimmed.includes('-')) {
                comingSoon.push(trimmed);
            }
        }

        this.showWhatsNewModal(version, recentUpdates, comingSoon);
    }

    showWhatsNewModal(version, recentUpdates, comingSoon) {
        // Set title
        const titleEl = document.getElementById('whatsNewTitle');
        if (titleEl) {
            titleEl.textContent = `🎉 What's New in CodeTune ${version}`;
        }

        // Build content
        let contentHtml = '';

        if (recentUpdates.length > 0) {
            contentHtml += '<div class="update-section"><h4>✅ Recent Updates</h4><div class="feature-list">';
            recentUpdates.forEach(update => {
                const parts = update.split(' - ');
                const title = parts[0] || '';
                const description = parts[1] || '';
                contentHtml += `
                    <div class="feature-item">
                        <div class="feature-text">
                            <strong>${title}</strong>
                            <p>${description}</p>
                        </div>
                    </div>
                `;
            });
            contentHtml += '</div></div>';
        }

        if (comingSoon.length > 0) {
            contentHtml += '<div class="update-section"><h4>🚀 Coming Soon</h4><div class="feature-list">';
            comingSoon.forEach(feature => {
                const parts = feature.split(' - ');
                const title = parts[0] || '';
                const description = parts[1] || '';
                contentHtml += `
                    <div class="feature-item">
                        <div class="feature-text">
                            <strong>${title}</strong>
                            <p>${description}</p>
                        </div>
                    </div>
                `;
            });
            contentHtml += '</div></div>';
        }

        // Set content
        const contentEl = document.getElementById('whatsNewContent');
        if (contentEl) {
            contentEl.innerHTML = contentHtml + '<div class="modal-actions"><button class="btn-primary" id="whatsNewGotIt">Excited! 🎉</button></div>';

            // Re-attach event listener for the dynamically created button
            const gotItBtn = document.getElementById('whatsNewGotIt');
            if (gotItBtn) {
                gotItBtn.onclick = () => this.closeWhatsNewModal();
            }
        }

        // Show modal
        const modal = document.getElementById('whatsNewModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }
    }

    closeWhatsNewModal() {
        const modal = document.getElementById('whatsNewModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }

        // Mark as seen
        localStorage.setItem('codetune_whatsnew_seen', '1.2.1');
    }


    initializeComponents() {
        // Initialize components in order with proper dependencies
        try {
            this.counterComponent = new CounterComponent();
            this.audioPlayerComponent = new AudioPlayerComponent();
            this.prayerTrackerComponent = new PrayerTrackerComponent(window.vscode);
            this.settingsComponent = new SettingsComponent();
            logger.info('✅ All components initialized successfully');
        } catch (error) {
            logger.error('❌ Failed to initialize components:', error);
            this.showNotification('Failed to initialize some components', 'error');
        }
    }

    bindGlobalEventListeners() {
        // Search functionality
        const surahSearch = document.getElementById('surahSearch');
        if (surahSearch) {
            surahSearch.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Browse buttons
        const browseBtn = document.getElementById('browseBtn');
        const browseReadBtn = document.getElementById('browseReadBtn');

        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                this.openSurahBrowser(false);
            });
        }

        if (browseReadBtn) {
            browseReadBtn.addEventListener('click', () => {
                this.openSurahBrowser(true);
            });
        }

        // Quran Reader quick access cards
        document.querySelectorAll('.read-surah-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const surahNumber = e.currentTarget.dataset.surah;
                this.openQuranReader(surahNumber);
            });
        });
    }

    startTimers() {
        // Any remaining timer-based functionality that's not handled by components
        // (Most timers are now handled by individual components)
    }

    // Message handling - route to appropriate components
    handleMessage(message) {
        try {
            logger.info('ActivityBar: Received message:', message.type);

            switch (message.type) {
                // Audio-related messages -> audioPlayerComponent
                case 'playAudio':
                case 'pauseAudio':
                case 'resumeAudio':
                case 'stopAudio':
                case 'seekAudio':
                case 'setAudioVolume':
                    if (this.audioPlayerComponent && this.audioPlayerComponent.handleMessage) {
                        this.audioPlayerComponent.handleMessage(message);
                    }
                    break;

                // Settings-related messages -> settingsComponent
                case 'updateLanguageSetting':
                    if (this.settingsComponent && this.settingsComponent.updateLanguageSetting) {
                        this.settingsComponent.updateLanguageSetting(message.language);
                    }
                    break;

                // Activity bar view messages -> handle here or route to components
                case 'languageChanged':
                    logger.info('ActivityBar: Handling languageChanged message');
                    // Handle language changes across components
                    this.handleLanguageChange(message.language, message.localizationData);
                    break;

                // Playback start notification
                case 'playbackStarted':
                    this.showNotification('Started playing Quran surah', 'success');
                    break;

                case 'playbackError':
                    this.showNotification('Playback error occurred', 'error');
                    break;

                case 'openNextSurah':
                    logger.info('Opening next surah:', message.surahNumber, 'action:', message.action);
                    this.handleOpenNextSurah(message.surahNumber, message.action);
                    break;

                case 'autoPlayStartup':
                    logger.info('Auto-play startup triggered:', message);
                    this.handleAutoPlayStartup(message.lastPlayback, message.volume);
                    break;

                case 'enforceFridaySurahKahf':
                    logger.info('Enforcing Friday Surah Al-Kahf reading:', message);
                    this.handleEnforceFridaySurahKahf(message.surahNumber, message.message);
                    break;

                case 'fridaySurahStatus':
                    logger.info('Received Friday Surah status:', message.status);
                    this.updateFridaySurahStatus(message.status, message.message);
                    break;

                // Prayer tracker messages - handled by PrayerTrackerComponent directly
                case 'receiveLocation':
                case 'receivePrayerTimes':
                case 'locationError':
                    // Do nothing - these are handled by PrayerTrackerComponent
                    break;

                case 'dashboardData':
                    // Backend sent fresh tracker data — forward to the TrackerDashboard component
                    if (window.trackerDashboardComponent && window.trackerDashboardComponent.updateFromPayload) {
                        window.trackerDashboardComponent.updateFromPayload(message.payload);
                    }
                    break;

                case 'confirmResult':
                    logger.info('Confirm result received:', message.confirmed, 'for action:', message.action);
                    // Handle confirmation results
                    // Handle error history clear confirmation from ErrorRecoveryComponent
                    if (message.confirmed && message.action === 'clearErrorHistory' && window.errorRecoveryComponent) {
                        window.errorRecoveryComponent.recentErrors = [];
                        window.errorRecoveryComponent.renderRecentErrors();
                    }
                    break;

                case 'receiveHijriDate':
                    // Handle Hijri date updates from extension
                    logger.info('Received Hijri date from extension host:', message.payload);
                    if (window.localization && window.localization.updateHijriDate) {
                        window.localization.updateHijriDate(message.payload);
                    }
                    break;

                case 'updateStatus':
                    // Handle status message updates from extension
                    logger.info('Received status update:', message.elementId, message.message);
                    if (message.elementId) {
                        const statusElement = document.getElementById(message.elementId);
                        if (statusElement) {
                            statusElement.textContent = message.message;
                        }
                    }
                    break;

                default:
                    logger.info('Unknown message type:', message.type);
            }
        } catch (error) {
            logger.error('Error handling message:', message, error);
        }
    }

    // Handle opening next surah from extension (after countdown)
    handleOpenNextSurah(surahNumber, action) {
        logger.info('Handling open next surah:', surahNumber, 'action:', action);

        // Open the Quran reader for the next surah
        this.openQuranReader(surahNumber);

        // If it was an auto-transition (from finished surah), start auto-reading after a short delay
        if (action === 'autoTransition') {
            setTimeout(() => {
                if (this.autoReadingEnabled) {
                    this.startAutoReading();
                }
            }, 1500); // 1.5 seconds delay to load content first
        }
    }

    handleLanguageChange(language, localizationData) {
        // Update all components that need language changes
        if (window.localization) {
            window.currentLanguage = language;
            window.localization.refreshLocalization(language, localizationData);

            // Update component-specific language handling
            if (this.prayerTrackerComponent) {
                // Prayer's component handles its own language updates
            }

        }
    }

    // Handle auto-play startup - resume from last playback position
    handleAutoPlayStartup(lastPlayback, volume) {
        logger.info('Handling auto-play startup:', lastPlayback, 'volume:', volume);

        try {
            // Get last playback position from localStorage
            const lastPlaybackData = JSON.parse(localStorage.getItem('lastPlaybackPosition') || 'null');

            if (!lastPlaybackData) {
                logger.info('No last playback position found in localStorage');
                return;
            }

            logger.info('Found last playback position:', lastPlaybackData);

            // Set volume if provided
            if (volume && this.audioPlayerComponent && this.audioPlayerComponent.setVolume) {
                this.audioPlayerComponent.setVolume(volume);
            }

            // Start playing from the last position
            if (this.audioPlayerComponent && this.audioPlayerComponent.playSurah) {
                // Play the surah
                this.audioPlayerComponent.playSurah(lastPlaybackData.surahNumber);

                // Seek to the last position after a short delay to let playback start
                setTimeout(() => {
                    if (this.audioPlayerComponent && this.audioPlayerComponent.seekTo) {
                        this.audioPlayerComponent.seekTo(lastPlaybackData.currentTime);
                        logger.info('Auto-play: Seeked to position:', lastPlaybackData.currentTime);
                    }
                }, 1000); // 1 second delay

                this.showNotification(`🎵 Auto-playing ${lastPlaybackData.surahName} from ${this.formatTime(lastPlaybackData.currentTime)}`, 'success');
            } else {
                logger.warn('Audio player component not available for auto-play');
                this.showNotification('Audio player not ready for auto-play', 'error');
            }

        } catch (error) {
            logger.error('Error handling auto-play startup:', error);
            this.showNotification('Failed to start auto-play', 'error');
        }
    }

    // Format time in seconds to MM:SS format
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Handle Friday Surah Al-Kahf enforcement
    handleEnforceFridaySurahKahf(surahNumber, message) {
        logger.info('Handling Friday Surah Al-Kahf enforcement:', surahNumber, message);

        try {
            // Show special Friday notification
            this.showNotification(message, 'success');

            // Open Quran reader for Surah Al-Kahf (18)
            this.openQuranReader(surahNumber);

            // Start audio playback after a short delay to let the reader load
            setTimeout(() => {
                if (this.audioPlayerComponent && this.audioPlayerComponent.playSurah) {
                    logger.info('Starting Surah Al-Kahf audio playback for Friday enforcement');
                    this.audioPlayerComponent.playSurah(surahNumber);

                    // Mark as started in the extension
                    window.vscode.postMessage({
                        type: 'fridaySurahStarted',
                        surahNumber: surahNumber
                    });
                } else {
                    logger.warn('Audio player component not available for Friday Surah enforcement');
                }
            }, 2000); // 2 second delay to let reader load

        } catch (error) {
            logger.error('Error handling Friday Surah Al-Kahf enforcement:', error);
            this.showNotification('Failed to start Friday Surah Al-Kahf reading session', 'error');
        }
    }

    // Shared functionality across components
    handleSearch(query) {
        if (!query || query.length < 2) {
            this.clearSearchHighlights();
            return;
        }

        // Use the audio player component's surah data for search
        if (this.audioPlayerComponent && this.audioPlayerComponent.getSurahData) {
            const surahData = this.audioPlayerComponent.getSurahData();
            const filteredSurahs = surahData.filter(surah =>
                surah.name.toLowerCase().includes(query.toLowerCase()) ||
                surah.arabicName.includes(query) ||
                surah.number.toString().includes(query)
            );

            this.highlightSearchResults(filteredSurahs);
        }
    }

    highlightSearchResults(results) {
        // Remove previous highlights
        document.querySelectorAll('.surah-card').forEach(card => {
            card.classList.remove('search-match', 'search-hidden');
        });

        if (results.length === 0) { return; }

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

    populateSurahModal() {
        logger.info('Populating surah modal with surahs');

        const surahModalContent = document.getElementById('surahModalContent');
        if (!surahModalContent) {
            logger.error('Surah modal content element not found');
            return;
        }

        // Clear existing content
        surahModalContent.innerHTML = '';

        // Create search input
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="surahSearch" placeholder="Search surahs..." class="search-input">
        `;

        // Create surahs grid
        const surahsGrid = document.createElement('div');
        surahsGrid.className = 'surahs-grid';
        surahsGrid.id = 'surahsGrid';

        // Populate surahs
        const surahs = this.surahData;
        surahs.forEach(surah => {
            const surahCard = document.createElement('div');
            surahCard.className = 'surah-card';
            surahCard.dataset.surah = surah.number;
            surahCard.onclick = () => this.selectSurah(surah.number);

            surahCard.innerHTML = `
                <div class="surah-number">${surah.number}</div>
                <div class="surah-name-arabic">${surah.arabicName}</div>
                <div class="surah-name-english">${surah.name}</div>
                <div class="surah-info">${surah.verses} verses • ${surah.type}</div>
            `;

            surahsGrid.appendChild(surahCard);
        });

        // Assemble modal
        surahModalContent.appendChild(searchContainer);
        surahModalContent.appendChild(surahsGrid);

        // Focus search input
        setTimeout(() => {
            const searchInput = document.getElementById('surahSearch');
            if (searchInput) {
                searchInput.focus();
            }
        }, 100);
    }

    selectSurah(surahNumber) {
        logger.info('Selected surah:', surahNumber, 'reading mode:', this.currentReadingMode);

        // Close the surah browser modal
        const modal = document.getElementById('surahModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Either start playing audio or open reader based on mode
        if (this.currentReadingMode) {
            // Reading mode - open Quran reader
            this.openQuranReader(surahNumber);
        } else {
            // Audio mode - start audio playback
            if (this.audioPlayerComponent && this.audioPlayerComponent.playSurah) {
                this.audioPlayerComponent.playSurah(surahNumber);
            } else {
                logger.warn('Audio player component not available');
                this.showNotification('Audio player not ready', 'error');
            }
        }
    }

    openSurahBrowser(readingMode = false) {
        logger.info('Opening surah browser, reading mode:', readingMode);

        // Populate the modal with surahs
        this.populateSurahModal();

        // Show the modal
        const modal = document.getElementById('surahModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }

        // Store the mode for later use when a surah is selected
        this.currentReadingMode = readingMode;
    }

    // Quran Reader methods (keeping here as shared)
    openQuranReader(surahNumber) {
        logger.info('Opening Quran reader for surah:', surahNumber);

        // Check if any other modals are open and close them
        const modals = ['surahModal', 'playbackOptionsModal', 'prayerConfirmModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal && modal.style.display === 'flex') {
                logger.info('Closing conflicting modal:', modalId);
                modal.style.display = 'none';
            }
        });

        this.currentReadingSurah = parseInt(surahNumber);
        const surah = this.surahData.find(s => s.number === this.currentReadingSurah);

        if (!surah) {
            logger.error('Surah not found:', surahNumber);
            this.showNotification('Surah not found', 'error');
            return;
        }

        logger.info('Found surah:', surah);

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

        logger.info('Calculated total pages:', this.totalReadingPages);

        // Update modal title
        const titleElement = document.getElementById('readerSurahTitle');
        if (titleElement) {
            titleElement.textContent = `${surah.arabicName} (${surah.name})`;
            logger.info('Updated modal title to:', titleElement.textContent);
        } else {
            logger.error('readerSurahTitle element not found');
        }

        // Show modal
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = '10000'; // Ensure it's on top
            logger.info('Modal display set to flex, z-index set to 10000');
            this.isReaderModalOpen = true; // Track modal state
        } else {
            logger.error('quranReaderModal element not found');
            return;
        }

        // Set up modal event listeners
        this.setupReaderModalControls();

        // Load and display verses for current page
        this.loadReaderPage(this.currentReadingPage);
    }



    updateReaderNavigation(pageNumber) {
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
        } catch (error) {
            logger.warn('Failed to save reading progress:', error);
        }
    }

    closeQuranReader() {
        // Record final page reading time
        this.recordPageReadingTime();

        // Check if this was a Friday Surah Al-Kahf reading session
        if (this.currentReadingSurah === 18) {
            logger.info('Friday Surah Al-Kahf reading session completed');
            // Mark as completed in the extension
            window.vscode.postMessage({
                type: 'fridaySurahCompleted',
                surahNumber: 18
            });
        }

        // Close the modal directly
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Update modal state
        this.isReaderModalOpen = false;

        // Stop any auto reading
        this.stopAutoReading();

        this.currentReadingSurah = null;
        this.currentReadingPage = 1;
        this.totalReadingPages = 1;
    }

    // Set up event listeners for reader modal controls
    setupReaderModalControls() {
        logger.info('Setting up reader modal controls');

        // Close buttons
        const readerCloseBtn = document.getElementById('readerClose');
        if (readerCloseBtn) {
            readerCloseBtn.onclick = () => this.closeQuranReader();
        }

        const closeReaderBtn = document.getElementById('closeReaderBtn');
        if (closeReaderBtn) {
            closeReaderBtn.onclick = () => this.closeQuranReader();
        }

        // Navigation buttons
        const prevPageBtn = document.getElementById('prevPageBtn');
        if (prevPageBtn) {
            prevPageBtn.onclick = () => this.navigatePage('prev');
        }

        const nextPageBtn = document.getElementById('nextPageBtn');
        if (nextPageBtn) {
            nextPageBtn.onclick = () => this.navigatePage('next');
        }

        // Auto reading controls
        const autoReadToggle = document.getElementById('autoReadToggle');
        if (autoReadToggle) {
            autoReadToggle.onclick = () => this.toggleAutoReading();
        }

        const playPauseAutoRead = document.getElementById('playPauseAutoRead');
        if (playPauseAutoRead) {
            playPauseAutoRead.onclick = (e) => {
                // Prevent click if button is disabled
                if (playPauseAutoRead.disabled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                this.toggleAutoReadingPlayback();
            };
        }

        // Speed control buttons
        document.querySelectorAll('.speed-btn').forEach(button => {
            button.onclick = (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setAutoReadingSpeed(speed);
            };
        });

        // Modal click outside to close
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target.id === 'quranReaderModal') {
                    this.closeQuranReader();
                }
            };
        }
    }

    // Auto Reading methods (keeping here as shared)
    toggleAutoReading() {
        logger.info('Toggle auto reading called, current state:', this.autoReadingState, 'enabled:', this.autoReadingEnabled);

        // State machine: prevent operations during transitions
        if (this.autoReadingState === 'starting' || this.autoReadingState === 'stopping') {
            logger.info('🔍 DEBUG: Operation in progress, ignoring toggle');
            return;
        }

        // Don't allow toggling if modal is not open - show warning
        if (!this.isReaderModalOpen) {
            logger.info('🔍 DEBUG: Modal not visible for auto-reading toggle');
            this.showNotification('Please open Quran Reader first to enable auto-reading', 'error');
            return;
        }

        this.autoReadingEnabled = !this.autoReadingEnabled;

        const toggleBtn = document.getElementById('autoReadToggle');
        const speedControls = document.getElementById('speedControls');
        const playBtn = document.getElementById('playPauseAutoRead');

        logger.info('Button found:', !!toggleBtn);
        logger.info('Speed controls found:', !!speedControls);
        logger.info('Play button found:', !!playBtn);

        if (this.autoReadingEnabled) {
            toggleBtn?.classList.add('active');
            const textSpan = toggleBtn?.querySelector('[data-localize="autoReading"]') || toggleBtn?.querySelectorAll('span')[1];
            logger.info('Text span found:', !!textSpan, 'current text:', textSpan?.innerText);
            if (textSpan) { textSpan.innerText = 'Auto Reading: ON'; }
            if (speedControls) { speedControls.style.display = 'flex'; }
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.classList.remove('disabled');
                const icon = playBtn.querySelector('.icon');
                if (icon) { icon.textContent = '⏸️'; } // Already playing
            }
            logger.info('Auto reading mode enabled');

            // Show the speed indicator in main activity bar
            this.showAutoReadingIndicator();

            // Auto-start scrolling when toggled on - this is what the user expects
            this.startAutoReading();
        } else {
            // Stop any current scrolling and disable the mode
            this.stopAutoReading();

            toggleBtn?.classList.remove('active');
            const textSpan = toggleBtn?.querySelector('[data-localize="autoReading"]') || toggleBtn?.querySelectorAll('span')[1];
            logger.info('Text span found:', !!textSpan, 'current text:', textSpan?.innerText);
            if (textSpan) { textSpan.innerText = 'Auto Reading'; }
            if (speedControls) { speedControls.style.display = 'none'; }
            if (playBtn) {
                playBtn.disabled = true;
                playBtn.classList.add('disabled');
                const icon = playBtn.querySelector('.icon');
                if (icon) { icon.textContent = '▶️'; }
            }
            logger.info('Auto reading mode disabled');

            // Hide the speed indicator in main activity bar
            this.hideAutoReadingIndicator();

            this.showNotification('Auto-reading mode disabled', 'info');
        }
    }

    setAutoReadingSpeed(speed) {
        this.autoReadingSpeed = parseFloat(speed);

        // Update speed button states in modal
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.speed) === speed) {
                btn.classList.add('active');
            }
        });

        // Update the indicator display in main activity bar
        this.updateSpeedIndicatorDisplay();
    }

    toggleAutoReadingPlayback() {
        logger.info('toggleAutoReadingPlayback called - state:', this.autoReadingState, 'enabled:', this.autoReadingEnabled, 'active:', this.autoReadingActive);

        // State machine: prevent operations during transitions
        if (this.autoReadingState === 'starting' || this.autoReadingState === 'stopping') {
            logger.info('🔍 DEBUG: Operation in progress, ignoring playback toggle');
            return;
        }

        if (!this.autoReadingEnabled) {
            logger.info('Auto reading not enabled - cannot start');
            return;
        }

        if (this.autoReadingActive) {
            logger.info('Stopping auto reading');
            this.stopAutoReading();
        } else {
            logger.info('Starting auto reading');
            this.startAutoReading();
        }
    }



    stopAutoReading() {
        if (!this.autoReadingActive) { return; }

        logger.info('Stopping auto reading');

        // Set state to stopping
        this.autoReadingState = 'stopping';

        this.autoReadingActive = false;

        // Remove CSS class from modal
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.classList.remove('auto-reading-active');

            // Remove any residue current-reading classes
            const currentReadingVerses = modal.querySelectorAll('.current-reading');
            currentReadingVerses.forEach(verse => {
                verse.classList.remove('current-reading');
            });
        }

        if (this.autoReadingInterval) {
            clearInterval(this.autoReadingInterval);
            this.autoReadingInterval = null;
        }

        // Stop adaptive speed adjustment
        this.stopAdaptiveSpeedAdjustment();

        // Reset state to idle
        this.autoReadingState = 'idle';

        this.updateAutoReadingUI(false);
        this.showNotification('Auto reading stopped', 'info');
    }

    performAutoScroll() {
        // Comprehensive safety checks with debug logging
        logger.info('🔍 DEBUG: performAutoScroll called', {
            autoReadingActive: this.autoReadingActive,
            autoReadingEnabled: this.autoReadingEnabled,
            speed: this.autoReadingSpeed
        });

        if (!this.autoReadingActive) {
            logger.info('performAutoScroll: Auto reading not active, exiting');
            return;
        }

        if (!this.autoReadingEnabled) {
            logger.info('performAutoScroll: Auto reading not enabled, stopping');
            this.stopAutoReading();
            return;
        }

        // Simple modal state check using our state flag
        if (!this.isReaderModalOpen) {
            logger.info('performAutoScroll: Quran reader modal not visible, stopping auto-reading');
            this.stopAutoReading();
            return;
        }

        try {
            const displayEl = document.getElementById('quranTextDisplay');
            logger.info('🔍 DEBUG: Display element check', {
                elementExists: !!displayEl,
                scrollHeight: displayEl?.scrollHeight,
                clientHeight: displayEl?.clientHeight,
                canScroll: displayEl ? (displayEl.scrollHeight > displayEl.clientHeight) : false,
                innerHTML: displayEl?.innerHTML?.substring(0, 100) + '...'
            });

            if (!displayEl) {
                logger.error('performAutoScroll: quranTextDisplay element not found');
                this.stopAutoReading(); // Stop if element doesn't exist
                return;
            }

            // Enhanced scrollability validation
            const canScroll = displayEl.scrollHeight > displayEl.clientHeight + 10; // 10px buffer
            logger.info('🔍 DEBUG: Scrollability check', {
                scrollHeight: displayEl.scrollHeight,
                clientHeight: displayEl.clientHeight,
                canScroll: canScroll,
                difference: displayEl.scrollHeight - displayEl.clientHeight
            });

            if (!canScroll) {
                logger.info('Auto-scroll: Content not scrollable, advancing to next page');
                this.advanceToNextReaderPage();
                return;
            }

            // Check if content is still loading or failed to load
            if (displayEl.innerHTML.includes('Loading Quran text...') ||
                displayEl.innerHTML.includes('Failed to load Quran text')) {
                logger.info('Content still loading or failed to load, skipping auto-scroll');
                return;
            }

            // Check if there are verses to scroll through
            const verses = displayEl.querySelectorAll('.arabic-verse');
            if (verses.length === 0) {
                logger.info('No verses found, cannot auto-scroll');
                this.stopAutoReading();
                return;
            }

            // Ensure element has valid dimensions
            if (displayEl.clientHeight === 0 || displayEl.scrollHeight === 0) {
                logger.info('Element has invalid dimensions, skipping scroll');
                return;
            }

            // Force reflow to ensure accurate measurements
            displayEl.offsetHeight;

            const currentScroll = Math.max(0, Math.floor(displayEl.scrollTop));
            const maxScroll = Math.max(0, displayEl.scrollHeight - displayEl.clientHeight);
            const hasScrollableContent = maxScroll > 5; // Must have at least 5px to scroll

            logger.info('AutoScroll Debug:', {
                currentScroll,
                maxScroll,
                hasScrollableContent,
                scrollHeight: displayEl.scrollHeight,
                clientHeight: displayEl.clientHeight,
                versesCount: verses.length,
                remaining: maxScroll - currentScroll
            });

            // If no scrollable content exists, try to scroll anyway for a short time
            if (!hasScrollableContent || maxScroll <= 0) {
                logger.info('Minimal scrollable content, attempting slow scroll anyway');
                // Force a small scroll increment even with minimal content
                const forcedScrollIncrement = Math.max(1, Math.floor(displayEl.clientHeight * 0.05)); // 5% of container height
                const newScrollTop = Math.min(currentScroll + forcedScrollIncrement, maxScroll);

                if (newScrollTop > currentScroll) {
                    displayEl.scrollTop = newScrollTop;
                    logger.info('Forced scroll performed:', {
                        increment: forcedScrollIncrement,
                        oldScroll: currentScroll,
                        newScroll: newScrollTop
                    });
                    return; // Continue scrolling on next interval
                } else {
                    // If we still can't scroll, advance to next page
                    logger.info('Cannot force scroll, advancing to next page');
                    this.advanceToNextReaderPage();
                    return;
                }
            }

            // Improved bottom detection with multiple safety checks
            const containerHeight = displayEl.clientHeight;
            const bottomBuffer = Math.max(50, containerHeight * 0.2); // 20% of container or 50px minimum
            const isNearBottom = currentScroll >= Math.max(0, maxScroll - bottomBuffer);

            // Additional check: if we're within 10% of the bottom
            const isVeryNearBottom = currentScroll >= Math.max(0, maxScroll - Math.max(20, containerHeight * 0.1));

            if (isNearBottom || isVeryNearBottom) {
                logger.info('Reached bottom threshold, advancing to next page');
                this.advanceToNextReaderPage();
                return;
            }

            // Calculate smart scroll increment with improved logic
            let scrollIncrement = 1;

            // Validate reading speed with better bounds
            const safeSpeed = Math.max(0.3, Math.min(3.0, this.autoReadingSpeed));

            // Calculate base increment using a more sophisticated formula
            // Higher speed = more pixels per scroll, but with diminishing returns
            const baseIncrement = Math.max(1, Math.floor(safeSpeed * 2));

            // Adjust based on content density (verses per pixel height)
            if (verses.length > 0) {
                const contentDensity = displayEl.scrollHeight / verses.length;
                const availableScroll = maxScroll - currentScroll;

                // Adaptive increment based on content and remaining scroll
                if (contentDensity > 120) { // Very dense content (many verses)
                    scrollIncrement = Math.max(1, Math.min(baseIncrement, 3)); // Conservative scrolling
                } else if (contentDensity < 40) { // Sparse content (few verses)
                    scrollIncrement = Math.max(1, Math.min(baseIncrement + 1, 5)); // More aggressive
                } else {
                    scrollIncrement = Math.max(1, Math.min(baseIncrement, 4)); // Balanced
                }

                // Reduce increment near bottom to prevent overshooting
                if (availableScroll < 100) { // Less than 100px remaining
                    scrollIncrement = Math.max(1, Math.floor(scrollIncrement * 0.7));
                }
            } else {
                // Fallback if no verses found
                scrollIncrement = Math.max(1, Math.min(baseIncrement, 3));
            }

            // Final bounds checking - ensure reasonable scroll amounts
            scrollIncrement = Math.max(1, Math.min(scrollIncrement, 8)); // Max 8px per step for smoothness

            logger.info('🔍 DEBUG: Scroll increment calculation', {
                safeSpeed: safeSpeed,
                baseIncrement: baseIncrement,
                contentDensity: verses.length > 0 ? displayEl.scrollHeight / verses.length : 'N/A',
                availableScroll: maxScroll - currentScroll,
                finalIncrement: scrollIncrement
            });

            // Smooth scroll to new position with bounds checking
            const newScrollTop = Math.min(currentScroll + scrollIncrement, maxScroll);

            // Only scroll if it would actually move us
            if (newScrollTop > currentScroll) {
                displayEl.scrollTop = newScrollTop;

                logger.info('Performed auto-scroll:', {
                    increment: scrollIncrement,
                    oldScroll: currentScroll,
                    newScroll: newScrollTop,
                    maxScroll: maxScroll,
                    speed: safeSpeed
                });
            } else {
                // If we can't scroll further, advance to next page
                logger.info('Cannot scroll further, advancing to next page');
                this.advanceToNextReaderPage();
            }

        } catch (error) {
            logger.error('Error during auto-scroll:', error);
            // On any error, safely stop auto-reading to prevent infinite loops
            this.stopAutoReading();
            this.showNotification('Auto-reading stopped due to an error', 'error');
        }
    }

    advanceToNextReaderPage() {
        if (this.currentReadingPage < this.totalReadingPages) {
            this.stopAutoReading();

            const nextPage = this.currentReadingPage + 1;
            this.loadReaderPage(nextPage);

            setTimeout(() => {
                if (this.autoReadingEnabled) {
                    this.startAutoReading();
                }
            }, 1500);
        } else {
            this.askAboutNextReaderSurah();
        }
    }

    askAboutNextReaderSurah() {
        this.stopAutoReading();

        const nextSurahNum = this.currentReadingSurah + 1;

        if (nextSurahNum <= 114) {
            const nextSurah = this.surahData.find(s => s.number === nextSurahNum);
            const currentSurah = this.surahData.find(s => s.number === this.currentReadingSurah);

            // Send message to extension to show VS Code notification (non-blocking)
            window.vscode.postMessage({
                type: 'surahFinished',
                currentSurah: currentSurah,
                nextSurah: nextSurah,
                action: 'askContinueReading'
            });
        } else {
            this.showNotification('🎉 Completed reading the entire Quran!', 'success');
        }
    }

    // Keyboard shortcuts
    handleKeyboard(event) {
        // Only handle if not typing in input
        if (event.target.tagName === 'INPUT' && event.target.type !== 'radio') { return; }

        // Don't handle keyboard shortcuts when modals are open
        const modals = ['playbackOptionsModal', 'surahModal', 'quranReaderModal', 'prayerConfirmModal'];
        const modalOpen = modals.some(id => {
            const modal = document.getElementById(id);
            return modal && modal.style.display === 'flex';
        });

        if (modalOpen) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeAllModals();
            }
            return;
        }

        switch (event.key) {
            case ' ':
                event.preventDefault();
                if (this.audioPlayerComponent && this.audioPlayerComponent.togglePlayback) {
                    this.audioPlayerComponent.togglePlayback();
                }
                break;
            case 'ArrowLeft':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (this.audioPlayerComponent && this.audioPlayerComponent.previousSurah) {
                        this.audioPlayerComponent.previousSurah();
                    }
                }
                break;
            case 'ArrowRight':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (this.audioPlayerComponent && this.audioPlayerComponent.nextSurah) {
                        this.audioPlayerComponent.nextSurah();
                    }
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (this.audioPlayerComponent && this.audioPlayerComponent.setVolume) {
                    this.audioPlayerComponent.setVolume(
                        Math.min(100, (this.audioPlayerComponent.volume || 70) + 5)
                    );
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (this.audioPlayerComponent && this.audioPlayerComponent.setVolume) {
                    this.audioPlayerComponent.setVolume(
                        Math.max(0, (this.audioPlayerComponent.volume || 70) - 5)
                    );
                }
                break;
        }
    }

    closeAllModals() {
        // Close each modal type
        if (this.audioPlayerComponent && this.audioPlayerComponent.closePlaybackOptionsModal) {
            this.audioPlayerComponent.closePlaybackOptionsModal();
        }
        // Close surah browser modal
        const surahModal = document.getElementById('surahModal');
        if (surahModal) {
            surahModal.style.display = 'none';
        }
        this.closeQuranReader();
        if (this.prayerTrackerComponent && this.prayerTrackerComponent.closePrayerConfirmModal) {
            this.prayerTrackerComponent.closePrayerConfirmModal();
        }
    }

    // Theme toggle
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('dark-theme') || (!body.classList.contains('light-theme'));

        if (isDark) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            this.postMessage('showNotification', {
                message: 'Switched to light theme',
                type: 'info'
            });
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            this.postMessage('showNotification', {
                message: 'Switched to dark theme',
                type: 'info'
            });
        }

        // Save theme preference
        if (this.settingsComponent) {
            this.settingsComponent.saveSettings();
        }
    }

    // Adaptive Reading Speed Detection
    recordPageReadingTime() {
        if (!this.adaptiveSpeedEnabled) { return; }

        const pageTime = Date.now() - this.lastPageLoadTime;
        if (pageTime > 1000) { // Only record if page was viewed for more than 1 second
            this.pageReadDurations.push(pageTime);
            this.updateAdaptiveSpeed();
        }
    }

    updateAdaptiveSpeed() {
        if (this.pageReadDurations.length < 2) { return; } // Need at least 2 page reads

        // Calculate average time per page
        const avgTime = this.pageReadDurations.reduce((a, b) => a + b, 0) / this.pageReadDurations.length;
        const targetSpeed = this.targetReadTime / avgTime; // Speed multiplier

        // Clamp speed between 0.3 and 2.5
        this.detectedReadingSpeed = Math.max(0.3, Math.min(2.5, targetSpeed));

        logger.info(`Adaptive speed: ${this.detectedReadingSpeed.toFixed(2)} (avg page time: ${avgTime}ms)`);

        // Update UI indicator if we have one
        this.updateAdaptiveSpeedIndicator();

        // Keep only last 10 page readings for recent relevance
        if (this.pageReadDurations.length > 10) {
            this.pageReadDurations = this.pageReadDurations.slice(-10);
        }
    }

    updateAdaptiveSpeedIndicator() {
        if (!this.adaptiveSpeedIndicator) {
            // Create indicator element
            this.adaptiveSpeedIndicator = document.createElement('div');
            this.adaptiveSpeedIndicator.id = 'adaptiveSpeedIndicator';
            this.adaptiveSpeedIndicator.className = 'adaptive-speed-indicator';
            this.adaptiveSpeedIndicator.innerHTML = `
                <span class="adaptive-speed-icon">🎯</span>
                <span class="adaptive-speed-text">Auto Speed</span>
            `;
            document.body.appendChild(this.adaptiveSpeedIndicator);
        }

        const indicator = this.adaptiveSpeedIndicator;
        const speedNames = {
            0.5: 'Slow',
            0.7: 'Medium-Slow',
            1: 'Normal',
            1.3: 'Medium-Fast',
            1.8: 'Fast',
            2: 'Very Fast'
        };

        const closestSpeed = Object.keys(speedNames).reduce((a, b) =>
            Math.abs(b - this.detectedReadingSpeed) < Math.abs(a - this.detectedReadingSpeed) ? b : a
        );

        indicator.querySelector('.adaptive-speed-text').textContent = `Auto Speed: ${speedNames[closestSpeed]}`;

        // Show indicator briefly
        indicator.style.opacity = '1';
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    }

    async loadReaderPage(pageNumber) {
        logger.info('Loading reader page:', pageNumber, 'for surah:', this.currentReadingSurah);

        // Record time for previous page
        this.recordPageReadingTime();

        const displayEl = document.getElementById('quranTextDisplay');
        if (!displayEl) {
            logger.error('Reader text display element not found');
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
                logger.info('Cached verses for surah:', this.currentReadingSurah);
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

            // Update page info and navigation
            this.updateReaderNavigation(pageNumber);
            this.saveReadingProgress(this.currentReadingSurah, pageNumber);

            // Reset page load time for new page
            this.lastPageLoadTime = Date.now();

        } catch (error) {
            logger.error('Failed to load Quran text:', error);
            displayEl.innerHTML = '<div class="error-text">Failed to load Quran text. Please check your internet connection and try again.</div>';
        }
    }

    // Improved manual navigation detection
    wasManualNavigation() {
        const timeSinceNav = Date.now() - this.lastManualNavigationTime;
        return timeSinceNav < 750; // Increased to 750ms for better detection
    }

    // Enhance navigation to detect manual vs automatic
    navigatePage(direction) {
        // Record that this was manual navigation
        this.lastManualNavigationTime = Date.now();

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

    // Start adaptive speed updating when auto-reading begins
    startAutoReading() {
        if (!this.autoReadingEnabled || this.autoReadingActive || this.autoReadingState !== 'idle') { return; }

        logger.info('Starting auto reading at speed:', this.autoReadingSpeed, '(adaptive:', this.detectedReadingSpeed, ')');

        // Set state to starting
        this.autoReadingState = 'starting';

        // Clear any existing interval to prevent conflicts
        if (this.autoReadingInterval) {
            clearInterval(this.autoReadingInterval);
            this.autoReadingInterval = null;
        }

        this.autoReadingActive = true;

        // Add CSS class to modal for visual enhancements
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.classList.add('auto-reading-active');
        }

        this.updateAutoReadingUI(true);

        // Apply adaptive speed
        this.autoReadingSpeed = Math.max(0.5, Math.min(2, this.detectedReadingSpeed));

        // Add a small delay to ensure modal is fully ready before starting interval
        setTimeout(() => {
            if (!this.autoReadingActive || this.autoReadingState !== 'starting') { return; } // Check if still active after delay

            const intervalMs = Math.max(100, (2 / this.autoReadingSpeed) * 1000);
            logger.info('🔍 DEBUG: Setting up auto-scroll interval with', intervalMs, 'ms delay');

            this.autoReadingInterval = setInterval(() => {
                // Double-check modal state before each scroll attempt
                if (!this.isReaderModalOpen) {
                    logger.info('🔍 DEBUG: Modal not visible during interval, stopping auto-reading');
                    this.stopAutoReading();
                    return;
                }

                this.performAutoScroll();
            }, intervalMs);

            // Transition to active state
            this.autoReadingState = 'active';
            logger.info('🔍 DEBUG: Auto-scroll interval started, state now active');
        }, 200); // 200ms delay to let modal settle

        // Start adaptive speed adjustment (ensure only one)
        this.startAdaptiveSpeedAdjustment();

        this.showNotification(`Auto reading started (Adapted: ${this.autoReadingSpeed.toFixed(1)}x)`, 'success');
    }

    stopAutoReading() {
        if (!this.autoReadingActive) { return; }

        logger.info('Stopping auto reading');

        // Set state to stopping
        this.autoReadingState = 'stopping';

        this.autoReadingActive = false;

        // Remove CSS class from modal
        const modal = document.getElementById('quranReaderModal');
        if (modal) {
            modal.classList.remove('auto-reading-active');

            // Remove any residue current-reading classes
            const currentReadingVerses = modal.querySelectorAll('.current-reading');
            currentReadingVerses.forEach(verse => {
                verse.classList.remove('current-reading');
            });
        }

        // Clear any existing interval
        if (this.autoReadingInterval) {
            clearInterval(this.autoReadingInterval);
            this.autoReadingInterval = null;
        }

        // Stop adaptive speed adjustment
        this.stopAdaptiveSpeedAdjustment();

        // Reset state to idle
        this.autoReadingState = 'idle';

        this.updateAutoReadingUI(false);
        this.showNotification('Auto reading stopped', 'info');
    }

    startAdaptiveSpeedAdjustment() {
        this.stopAdaptiveSpeedAdjustment(); // Clear any existing

        // Only start adaptive adjustment if we have enough data (at least 2 page readings)
        if (this.pageReadDurations.length < 2) {
            logger.info('Not enough data for adaptive speed adjustment yet');
            return;
        }

        this.adaptiveSpeedUpdateInterval = setInterval(() => {
            // Only adjust if auto-reading is active and we have new page data
            if (this.adaptiveSpeedEnabled && this.autoReadingActive && this.pageReadDurations.length >= 2) {
                const previousSpeed = this.detectedReadingSpeed;

                this.updateAdaptiveSpeed();

                // Only adjust if speed changed significantly (prevent jittery changes)
                if (Math.abs(this.detectedReadingSpeed - previousSpeed) >= 0.2) {
                    this.adjustAutoReadingSpeed(this.detectedReadingSpeed);
                    this.updateAdaptiveSpeedIndicator();
                }
            }
        }, 15000); // Check every 15 seconds instead of 10 to prevent over-adjustment
    }

    stopAdaptiveSpeedAdjustment() {
        if (this.adaptiveSpeedUpdateInterval) {
            clearInterval(this.adaptiveSpeedUpdateInterval);
            this.adaptiveSpeedUpdateInterval = null;
        }
    }

    adjustAutoReadingSpeed(newSpeed) {
        this.autoReadingSpeed = Math.max(0.5, Math.min(2, newSpeed));

        // Restart interval with new speed
        if (this.autoReadingActive) {
            this.stopAutoReading();
            this.startAutoReading();
        }
    }

    // Consolidated UI state management for auto-reading
    updateAutoReadingUI(isActive) {
        try {
            const toggleBtn = document.getElementById('autoReadToggle');
            const speedControls = document.getElementById('speedControls');
            const playBtn = document.getElementById('playPauseAutoRead');
            const modal = document.getElementById('quranReaderModal');

            // Update toggle button (mode enable/disable)
            if (toggleBtn) {
                if (this.autoReadingEnabled) {
                    toggleBtn.classList.add('active');
                    const textSpan = toggleBtn.querySelector('[data-localize="autoReading"]') ||
                        toggleBtn.querySelectorAll('span')[1];
                    if (textSpan) {
                        textSpan.innerText = 'Auto Reading: ON';
                    }
                } else {
                    toggleBtn.classList.remove('active');
                    const textSpan = toggleBtn.querySelector('[data-localize="autoReading"]') ||
                        toggleBtn.querySelectorAll('span')[1];
                    if (textSpan) {
                        textSpan.innerText = 'Auto Reading';
                    }
                }
            }

            // Show/hide speed controls based on enabled state
            if (speedControls) {
                speedControls.style.display = this.autoReadingEnabled ? 'flex' : 'none';
            }

            // Update play/pause button (actual scrolling state)
            if (playBtn) {
                playBtn.disabled = !this.autoReadingEnabled;

                if (!this.autoReadingEnabled) {
                    playBtn.classList.add('disabled');
                    const icon = playBtn.querySelector('.icon');
                    if (icon) {
                        icon.textContent = '▶️';
                    }
                } else {
                    playBtn.classList.remove('disabled');
                    const icon = playBtn.querySelector('.icon');
                    if (icon) {
                        icon.textContent = isActive ? '⏸️' : '▶️';
                    }
                }
            }

            // Update modal state
            if (modal) {
                if (isActive) {
                    modal.classList.add('auto-reading-active');
                } else {
                    modal.classList.remove('auto-reading-active');
                    // Clear any current reading markers
                    const readingMarkers = modal.querySelectorAll('.current-reading');
                    readingMarkers.forEach(marker => marker.classList.remove('current-reading'));
                }
            }

        } catch (error) {
            logger.error('Error updating auto-reading UI:', error);
        }
    }

    // Clear content reading highlights
    clearCurrentReadingVerses() {
        const displayEl = document.getElementById('quranTextDisplay');
        if (displayEl) {
            const currentReadingVerses = displayEl.querySelectorAll('.current-reading');
            currentReadingVerses.forEach(verse => {
                verse.classList.remove('current-reading');
            });
        }
    }

    // Show auto reading indicator in main activity bar
    showAutoReadingIndicator() {
        logger.info('showAutoReadingIndicator called');
        const indicator = document.getElementById('autoReadingIndicator');
        logger.info('Indicator element found:', !!indicator);
        if (indicator) {
            indicator.style.display = 'block';
            this.updateSpeedIndicatorDisplay();
            this.bindSpeedButtonEvents();
            logger.info('Auto reading indicator shown');
        } else {
            logger.error('Auto reading indicator element not found');
        }
    }

    // Hide auto reading indicator in main activity bar
    hideAutoReadingIndicator() {
        logger.info('hideAutoReadingIndicator called');
        const indicator = document.getElementById('autoReadingIndicator');
        logger.info('Indicator element found:', !!indicator);
        if (indicator) {
            indicator.style.display = 'none';
            logger.info('Auto reading indicator hidden');
        } else {
            logger.error('Auto reading indicator element not found');
        }
    }

    // Update the speed display in the indicator
    updateSpeedIndicatorDisplay() {
        const speedValueEl = document.getElementById('currentSpeedValue');
        if (speedValueEl) {
            speedValueEl.textContent = `${this.autoReadingSpeed.toFixed(1)}x`;
        }

        // Update active speed button
        document.querySelectorAll('.speed-btn-bar').forEach(btn => {
            btn.classList.remove('active');
            if (parseFloat(btn.dataset.speed) === this.autoReadingSpeed) {
                btn.classList.add('active');
            }
        });
    }

    // Bind click events to speed buttons in the indicator
    bindSpeedButtonEvents() {
        document.querySelectorAll('.speed-btn-bar').forEach(button => {
            // Remove existing event listeners to avoid duplicates
            button.removeEventListener('click', this.handleSpeedButtonClick);
            // Add new event listener
            button.addEventListener('click', this.handleSpeedButtonClick.bind(this));
        });
    }

    // Handle speed button clicks from the indicator
    handleSpeedButtonClick(event) {
        const speed = parseFloat(event.target.dataset.speed);
        this.setAutoReadingSpeed(speed);
        this.updateSpeedIndicatorDisplay();
    }

    // Utility methods
    postMessage(type, data = {}) {
        window.vscode.postMessage({ type, ...data });
    }

    showNotification(message, type = 'info') {
        // Main notification method - components can delegate to this
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span class="notification-text">${message}</span>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

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
            this.showNotification('Welcome to CodeTune! 🕌', 'success');
        }, 1000);
    }

    // Counter reset method (called from HTML)
    resetTasbihCounters() {
        if (this.counterComponent && this.counterComponent.resetTasbihCounters) {
            this.counterComponent.resetTasbihCounters();
        }
    }

    // Friday Surah Al-Kahf reading method
    startFridaySurahReading() {
        logger.info('Starting Friday Surah Al-Kahf reading session');

        // Send message to extension to trigger the Friday Surah enforcement
        window.vscode.postMessage({
            type: 'enforceFridaySurahKahf',
            surahNumber: 18,
            message: '🕌 Starting Friday Surah Al-Kahf Reading Session'
        });

        // Update UI to show it's in progress
        this.updateFridaySurahStatus('started', 'Reading in progress...');
    }

    // Initialize Friday Surah status on load
    initializeFridaySurahStatus() {
        logger.info('Initializing Friday Surah status');

        // Request current Friday Surah status from extension
        window.vscode.postMessage({
            type: 'getFridaySurahStatus'
        });
    }

    // Check if Friday Surah section should be visible (Thursday sunset to Friday end)
    shouldShowFridaySurah() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 4 = Thursday, 5 = Friday
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Case 1: Friday (show all day)
        if (day === 5) {
            return true;
        }

        // Case 2: Thursday (after Maghrib)
        if (day === 4) {
            // Correct logic: if hour > 17 (18, 19, etc.) or if hour = 17 and minute >= 45
            // Thursday sunset approx 5:45 PM
            if (hour > 17 || (hour === 17 && minute >= 45)) {
                return true;
            }
        }

        return false;
    }

    // Update Friday Surah section visibility and status
    updateFridaySurahVisibility() {
        // Make sure you added ID to this section in HTML file
        // <div class="dhikr-section" id="fridaySurahSection"> ... </div>
        const fridaySection = document.getElementById('fridaySurahSection');

        if (!fridaySection) { return; }

        const shouldShow = this.shouldShowFridaySurah();

        // Show or hide the section completely
        if (shouldShow) {
            fridaySection.classList.remove('hidden-section'); // or fridaySection.style.display = 'block';

            // Update status only if section is visible
            this.updateFridaySurahStatus(); // Make sure this function exists or use requestFridaySurahStatus
        } else {
            fridaySection.classList.add('hidden-section'); // or fridaySection.style.display = 'none';
        }
    }

    // Update Friday Surah status display
    updateFridaySurahStatus(status, message) {
        const statusIcon = document.getElementById('fridayStatusIcon');
        const statusText = document.getElementById('fridayStatusText');
        const statusContainer = document.getElementById('fridaySurahStatus');

        if (statusIcon && statusText && statusContainer) {
            // Remove existing status classes
            statusContainer.classList.remove('completed', 'started', 'not-started');

            // Update based on status
            switch (status) {
                case 'completed':
                    statusContainer.classList.add('completed');
                    statusIcon.textContent = '✅';
                    // Use localized text
                    if (window.localization) {
                        statusText.textContent = window.localization.getString('fridaySurahCompleted');
                    } else {
                        statusText.textContent = 'Completed today! Alhamdulillah';
                    }
                    break;
                case 'started':
                    statusContainer.classList.add('started');
                    statusIcon.textContent = '📖';
                    // Use localized text
                    if (window.localization) {
                        statusText.textContent = window.localization.getString('fridaySurahInProgress');
                    } else {
                        statusText.textContent = message || 'Reading in progress...';
                    }
                    break;
                case 'not-started':
                default:
                    statusContainer.classList.add('not-started');
                    statusIcon.textContent = '⏳';
                    // Use localized text
                    if (window.localization) {
                        statusText.textContent = window.localization.getString('fridaySurahNotStarted');
                    } else {
                        statusText.textContent = message || 'Not started today';
                    }
                    break;
            }
        }
    }

    // Request Friday Surah status from extension
    requestFridaySurahStatus() {
        window.vscode.postMessage({
            type: 'getFridaySurahStatus'
        });
    }

    // Prayer goal update method (called from HTML)
    updatePrayerGoal(prayer, completed) {
        if (this.counterComponent && this.counterComponent.updatePrayerGoal) {
            this.counterComponent.updatePrayerGoal(prayer, completed);
        }
    }

    // Dispose method for proper cleanup
    dispose() {
        logger.info('Disposing QuranActivityBar...');

        // Stop all auto-reading functionality
        this.stopAutoReading();
        this.stopAdaptiveSpeedAdjustment();

        // Clear all intervals
        if (this.autoReadingInterval) {
            clearInterval(this.autoReadingInterval);
            this.autoReadingInterval = null;
        }
        if (this.adaptiveSpeedUpdateInterval) {
            clearInterval(this.adaptiveSpeedUpdateInterval);
            this.adaptiveSpeedUpdateInterval = null;
        }

        // Dispose components
        if (this.counterComponent && this.counterComponent.dispose) {
            this.counterComponent.dispose();
        }
        if (this.audioPlayerComponent && this.audioPlayerComponent.dispose) {
            this.audioPlayerComponent.dispose();
        }
        if (this.prayerTrackerComponent && this.prayerTrackerComponent.dispose) {
            this.prayerTrackerComponent.dispose();
        }
        if (this.settingsComponent && this.settingsComponent.dispose) {
            this.settingsComponent.dispose();
        }

        // Clear references
        this.counterComponent = null;
        this.audioPlayerComponent = null;
        this.prayerTrackerComponent = null;
        this.settingsComponent = null;
        logger.info('QuranActivityBar disposed successfully');
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
