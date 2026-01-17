/**
 * Settings Component - Manages application settings and preferences
 */
import { logger } from '../utils/Logger.js';
class SettingsComponent {
    constructor() {
        // Settings state
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
        this.reciter = 'ar.abdulbasitmurattal';

        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
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

        // Review notification settings
        const enableReviewNotifications = document.getElementById('enableReviewNotifications');
        if (enableReviewNotifications) {
            enableReviewNotifications.addEventListener('change', (e) => {
                this.updateReviewNotificationsSetting(e.target.checked);
            });
        }

        const enableSponsorNotifications = document.getElementById('enableSponsorNotifications');
        if (enableSponsorNotifications) {
            enableSponsorNotifications.addEventListener('change', (e) => {
                this.updateSponsorNotificationsSetting(e.target.checked);
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
                this.openSettingsPopup();
            });
        }

        const surahModal = document.getElementById('surahModal');
        if (surahModal) {
            surahModal.addEventListener('click', (e) => {
                if (e.target.id === 'surahModal') {
                    this.openSettingsPopup();
                }
            });
        }

        // Browse button
        const browseBtn = document.getElementById('browseBtn');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                this.openSurahBrowser(false);
            });
        }

        const browseReadBtn = document.getElementById('browseReadBtn');
        if (browseReadBtn) {
            browseReadBtn.addEventListener('click', () => {
                this.openSurahBrowser(true); // reading mode
            });
        }

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
                // Delegate to main component
                if (window.quranActivityBar && window.quranActivityBar.navigatePage) {
                    window.quranActivityBar.navigatePage('prev');
                }
            });
        }

        const nextPageBtn = document.getElementById('nextPageBtn');
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                // Delegate to main component
                if (window.quranActivityBar && window.quranActivityBar.navigatePage) {
                    window.quranActivityBar.navigatePage('next');
                }
            });
        }

        // Auto reading controls
        const autoReadToggle = document.getElementById('autoReadToggle');
        if (autoReadToggle) {
            autoReadToggle.addEventListener('click', () => {
                // Delegate to main component
                if (window.quranActivityBar && window.quranActivityBar.toggleAutoReading) {
                    window.quranActivityBar.toggleAutoReading();
                }
            });
        }

        const playPauseAutoRead = document.getElementById('playPauseAutoRead');
        if (playPauseAutoRead) {
            playPauseAutoRead.addEventListener('click', () => {
                // Delegate to main component
                if (window.quranActivityBar && window.quranActivityBar.toggleAutoReadingPlayback) {
                    window.quranActivityBar.toggleAutoReadingPlayback();
                }
            });
        }

        // Speed control buttons
        document.querySelectorAll('.speed-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                if (window.quranActivityBar && window.quranActivityBar.setAutoReadingSpeed) {
                    window.quranActivityBar.setAutoReadingSpeed(speed);
                }
            });
        });
    }

    postMessage(type, data = {}) {
        window.vscode.postMessage({ type, ...data });
    }

    // Settings update methods
    updateLanguageSetting(language) {
        this.language = language;

        // Update localStorage immediately
        try {
            const settings = JSON.parse(localStorage.getItem('codeTuneSettings') || '{}');
            settings.language = language;
            localStorage.setItem('codeTuneSettings', JSON.stringify(settings));
        } catch (error) {
            logger.warn('Failed to update language in localStorage:', error);
        }

        // Tell extension to update the global configuration and notify webview
        this.postMessage('updateLanguageSetting', { language: language });

        // Update UI selector
        const headerLanguageSelect = document.getElementById('headerLanguageSelect');
        if (headerLanguageSelect) {
            headerLanguageSelect.value = language;
        }

        // Note: Localization will be updated by the extension via languageChanged message
        // No need to call refreshLocalization here

        this.saveSettings();
        this.showNotification('Language updated successfully', 'success');
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

    updateReviewNotificationsSetting(enabled) {
        this.postMessage('updateReviewNotifications', { settings: { enableReviewNotifications: enabled } });
        this.showNotification(enabled ? 'Review notifications enabled' : 'Review notifications disabled', 'success');
    }

    updateSponsorNotificationsSetting(enabled) {
        this.postMessage('updateReviewNotifications', { settings: { enableSponsorNotifications: enabled } });
        this.showNotification(enabled ? 'Sponsor notifications enabled' : 'Sponsor notifications disabled', 'success');
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

    // Modal and UI methods
    openSettingsPopup() {
        // Execute VS Code command to open settings popup
        this.postMessage('executeCommand', { command: 'codeTune.openSettings' });
    }

    openSurahBrowser(readingMode = false) {
        // Delegate to main component
        if (window.quranActivityBar && window.quranActivityBar.openSurahBrowser) {
            window.quranActivityBar.openSurahBrowser(readingMode);
        }
    }

    closeQuranReader() {
        // Delegate to main component
        if (window.quranActivityBar && window.quranActivityBar.closeQuranReader) {
            window.quranActivityBar.closeQuranReader();
        }
    }

    closePlaybackOptionsModal() {
        // Delegate to audio player component
        if (window.audioPlayerComponent && window.audioPlayerComponent.closePlaybackOptionsModal) {
            window.audioPlayerComponent.closePlaybackOptionsModal();
        }
    }

    startSelectedPlayback() {
        // Delegate to audio player component
        if (window.audioPlayerComponent && window.audioPlayerComponent.startSelectedPlayback) {
            window.audioPlayerComponent.startSelectedPlayback();
        }
    }

    // Settings persistence
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

    saveSettings() {
        const settings = {
            volume: 70, // Will be updated by audio component
            playbackMode: 'surah',
            reciter: this.reciter,
            audioQuality: '128',
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

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('quranPlayerSettings') || '{}');

            // Load all settings with defaults
            this.reciter = settings.reciter || 'ar.abdulbasitmurattal';
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

            // Set theme
            if (this.theme === 'light') {
                document.body.classList.add('light-theme');
                document.body.classList.remove('dark-theme');
            } else if (this.theme === 'dark') {
                document.body.classList.add('dark-theme');
                document.body.classList.remove('light-theme');
            } else {
                // Auto theme based on system preference
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.body.classList.toggle('dark-theme', prefersDark);
                document.body.classList.toggle('light-theme', !prefersDark);
            }

            this.updateSettingsUI();
        } catch (error) {
            logger.warn('Failed to load settings:', error);
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
        if (reciterSelect) {
            reciterSelect.value = this.reciter;
        }

        // Auto play checkbox
        const autoPlayStartup = document.getElementById('autoPlayStartup');
        if (autoPlayStartup) {
            autoPlayStartup.checked = this.autoPlayStartup;
        }

        // Compact mode checkbox
        const compactMode = document.getElementById('compactMode');
        if (compactMode) {
            compactMode.checked = this.compactMode;
        }

        // Show notifications checkbox
        const showNotifications = document.getElementById('showNotifications');
        if (showNotifications) {
            showNotifications.checked = this.showNotifications;
        }

        // Review notification checkboxes
        const enableReviewNotifications = document.getElementById('enableReviewNotifications');
        if (enableReviewNotifications) {
            enableReviewNotifications.checked = true; // Default enabled
        }

        const enableSponsorNotifications = document.getElementById('enableSponsorNotifications');
        if (enableSponsorNotifications) {
            enableSponsorNotifications.checked = true; // Default enabled
        }

        // Enable reminders checkbox
        const enableReminders = document.getElementById('enableReminders');
        if (enableReminders) {
            enableReminders.checked = this.enableReminders;
        }

        // Reminder interval select
        const reminderIntervalSelect = document.getElementById('reminderIntervalSelect');
        if (reminderIntervalSelect) {
            reminderIntervalSelect.value = this.reminderInterval;
        }

        // Reminder types checkboxes
        ['showAdia', 'showAhadis', 'showWisdom', 'showMorningAzkar', 'showEveningAzkar'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = this.reminderTypes[id] !== false; // Default true
            }
        });

        // Working hours checkbox
        const workingHoursOnly = document.getElementById('workingHoursOnly');
        if (workingHoursOnly) {
            workingHoursOnly.checked = this.workingHoursOnly;
        }

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
        if (cacheSizeSelect) {
            cacheSizeSelect.value = this.cacheSize;
        }

        const downloadTimeoutSelect = document.getElementById('downloadTimeoutSelect');
        if (downloadTimeoutSelect) {
            downloadTimeoutSelect.value = this.downloadTimeout;
        }

        const retryAttemptsSelect = document.getElementById('retryAttemptsSelect');
        if (retryAttemptsSelect) {
            retryAttemptsSelect.value = this.retryAttempts;
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        // This will delegate to the main component
        if (window.quranActivityBar && window.quranActivityBar.showNotification) {
            window.quranActivityBar.showNotification(message, type);
        }
    }
}

// Export for use in main activity bar
window.SettingsComponent = SettingsComponent;
