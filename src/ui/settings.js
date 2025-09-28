// CodeTune Settings - JavaScript
class SettingsManager {
    constructor() {
        this.settings = {
            quranVolume: 70,
            defaultReciter: 'default',
            audioQuality: '128',
            playbackMode: 'surah',
            autoPlay: false,
            continueLast: true,
            theme: 'auto',
            compactMode: false,
            showNotifications: true,
            // Islamic reminders
            enableReminders: true,
            reminderInterval: 60, // minutes
            showAdia: true,
            showAhadis: true,
            showWisdom: true,
            workingHoursOnly: false,
            language: 'auto',
            cacheSize: 100,
            downloadTimeout: 30,
            retryAttempts: 3
        };

        this.init();
    }

    init() {
        // Localize the page
        if (window.localization) {
            window.localization.localizeElements();
        }
        this.loadSettings();
        this.bindEvents();
        this.applyInitialTheme();
    }

    bindEvents() {
        // Auto-save on changes
        document.querySelectorAll('input, select').forEach(element => {
            element.addEventListener('change', (e) => {
                // Special handling for theme select
                if (e.target.id === 'themeSelect') {
                    this.updateTheme(e.target.value);
                    this.saveSettings();
                }
                // Special handling for language select (saves internally)
                else if (e.target.id === 'languageSelect') {
                    this.updateLanguage(e.target.value);
                }
                // Regular save for other elements
                else {
                    this.saveSettings();
                }
            });
        });
    }

    // Load settings from localStorage or use defaults
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('codeTuneSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }

        // Update UI with current settings
        document.getElementById('quranVolume').value = this.settings.quranVolume;
        document.getElementById('quranVolumeValue').textContent = this.settings.quranVolume + '%';
        document.getElementById('defaultReciter').value = this.settings.defaultReciter;
        document.getElementById('audioQuality').value = this.settings.audioQuality;
        document.getElementById('playbackMode').value = this.settings.playbackMode;
        document.getElementById('autoPlay').checked = this.settings.autoPlay;
        document.getElementById('continueLast').checked = this.settings.continueLast;
        document.getElementById('themeSelect').value = this.settings.theme;
        document.getElementById('compactMode').checked = this.settings.compactMode;
        document.getElementById('showNotifications').checked = this.settings.showNotifications;

        // Islamic reminder settings
        document.getElementById('enableReminders').checked = this.settings.enableReminders;
        document.getElementById('reminderInterval').value = this.settings.reminderInterval;
        document.getElementById('showAdia').checked = this.settings.showAdia;
        document.getElementById('showAhadis').checked = this.settings.showAhadis;
        document.getElementById('showWisdom').checked = this.settings.showWisdom;
        document.getElementById('workingHoursOnly').checked = this.settings.workingHoursOnly;

        document.getElementById('languageSelect').value = this.settings.language;
        document.getElementById('cacheSize').value = this.settings.cacheSize;
        document.getElementById('downloadTimeout').value = this.settings.downloadTimeout;
        document.getElementById('retryAttempts').value = this.settings.retryAttempts;
    }

    // Update functions for real-time feedback
    updateQuranVolume(value) {
        document.getElementById('quranVolumeValue').textContent = value + '%';
        this.settings.quranVolume = parseInt(value);
    }

    updateAutoPlay(checked) {
        this.settings.autoPlay = checked;
    }

    updateContinueLast(checked) {
        this.settings.continueLast = checked;
    }

    updateCompactMode(checked) {
        this.settings.compactMode = checked;
    }

    updateShowNotifications(checked) {
        this.settings.showNotifications = checked;
    }

    // Islamic reminder functions
    updateEnableReminders(checked) {
        this.settings.enableReminders = checked;
    }

    updateShowAdia(checked) {
        this.settings.showAdia = checked;
    }

    updateShowAhadis(checked) {
        this.settings.showAhadis = checked;
    }

    updateShowWisdom(checked) {
        this.settings.showWisdom = checked;
    }

    updateWorkingHoursOnly(checked) {
        this.settings.workingHoursOnly = checked;
    }

    // Theme toggle functionality
    updateTheme(theme) {
        this.settings.theme = theme;

        // Remove existing theme classes
        document.body.classList.remove('light-theme', 'dark-theme');

        // Apply new theme
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            this.postMessage('showNotification', {
                message: 'Switched to light theme',
                type: 'info'
            });
        } else if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            this.postMessage('showNotification', {
                message: 'Switched to dark theme',
                type: 'info'
            });
        } else {
            // Auto theme - follow VS Code
            this.postMessage('showNotification', {
                message: 'Theme set to auto (follows VS Code)',
                type: 'info'
            });
        }
    }

    applyInitialTheme() {
        this.updateTheme(this.settings.theme);
    }

    // Language change functionality
    updateLanguage(language) {
        this.settings.language = language;

        // Save to localStorage for this webview
        localStorage.setItem('codeTuneSettings', JSON.stringify(this.settings));

        // Save to VSCode configuration via extension
        this.postMessage('updateLanguageSetting', { language: language });

        // Update localization
        if (window.localization) {
            // Force re-initialization of localization with new language
            window.localization = new LocalizationManager();
            window.localization.localizeElements();
        }

        // Notify extension about language change so activity bar can update
        this.postMessage('languageChanged', { language: language });

        // Show notification
        const languageName = language === 'ar' ? 'العربية (Arabic)' : language === 'en' ? 'English' : 'Auto (Follow VS Code)';
        this.postMessage('showNotification', {
            message: `Language changed to ${languageName}`,
            type: 'info'
        });
    }

    // Save settings
    saveSettings() {
        // Update settings object with current form values
        this.settings.defaultReciter = document.getElementById('defaultReciter').value;
        this.settings.audioQuality = document.getElementById('audioQuality').value;
        this.settings.playbackMode = document.getElementById('playbackMode').value;
        this.settings.theme = document.getElementById('themeSelect').value;

        // Islamic reminder settings
        this.settings.enableReminders = document.getElementById('enableReminders').checked;
        this.settings.reminderInterval = parseInt(document.getElementById('reminderInterval').value);
        this.settings.showAdia = document.getElementById('showAdia').checked;
        this.settings.showAhadis = document.getElementById('showAhadis').checked;
        this.settings.showWisdom = document.getElementById('showWisdom').checked;
        this.settings.workingHoursOnly = document.getElementById('workingHoursOnly').checked;

        this.settings.language = document.getElementById('languageSelect').value;
        this.settings.cacheSize = parseInt(document.getElementById('cacheSize').value);
        this.settings.downloadTimeout = parseInt(document.getElementById('downloadTimeout').value);
        this.settings.retryAttempts = parseInt(document.getElementById('retryAttempts').value);

        // Save to localStorage
        localStorage.setItem('codeTuneSettings', JSON.stringify(this.settings));

        // Send to extension
        this.postMessage('saveSettings', { settings: this.settings });

        // Send Islamic reminder settings update
        const islamicSettings = {
            enableReminders: this.settings.enableReminders,
            reminderInterval: this.settings.reminderInterval,
            showAdia: this.settings.showAdia,
            showAhadis: this.settings.showAhadis,
            showWisdom: this.settings.showWisdom,
            workingHoursOnly: this.settings.workingHoursOnly
        };
        this.postMessage('updateIslamicReminders', { settings: islamicSettings });

        // Show confirmation message
        this.postMessage('showNotification', {
            message: 'Settings saved successfully!',
            type: 'success'
        });
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            localStorage.removeItem('codeTuneSettings');
            this.settings = {
                quranVolume: 70,
                defaultReciter: 'default',
                audioQuality: '128',
                playbackMode: 'surah',
                autoPlay: false,
                continueLast: true,
                theme: 'auto',
                compactMode: false,
                showNotifications: true,
                // Islamic reminders
                enableReminders: true,
                reminderInterval: 60,
                showAdia: true,
                showAhadis: true,
                showWisdom: true,
                workingHoursOnly: false,
                cacheSize: 100,
                downloadTimeout: 30,
                retryAttempts: 3
            };
            this.loadSettings();
            this.postMessage('resetSettings');
        }
    }

    closeSettings() {
        this.postMessage('closeSettings');
    }

    // Message handling
    postMessage(type, data = {}) {
        if (window.vscode) {
            window.vscode.postMessage({ type, ...data });
        }
    }

    // Handle messages from extension
    handleMessage(message) {
        switch (message.command) {
            case 'updateSettings':
                if (message.settings) {
                    this.settings = { ...this.settings, ...message.settings };
                    this.loadSettings();
                }
                break;
        }
    }
}

// Global functions for HTML onclick handlers
function saveSettings() {
    window.settingsManager.saveSettings();
}

function resetSettings() {
    window.settingsManager.resetSettings();
}

function closeSettings() {
    window.settingsManager.closeSettings();
}

function updateQuranVolume(value) {
    window.settingsManager.updateQuranVolume(value);
}

function updateAutoPlay(checked) {
    window.settingsManager.updateAutoPlay(checked);
}

function updateContinueLast(checked) {
    window.settingsManager.updateContinueLast(checked);
}

function updateCompactMode(checked) {
    window.settingsManager.updateCompactMode(checked);
}

function updateShowNotifications(checked) {
    window.settingsManager.updateShowNotifications(checked);
}

function updateEnableReminders(checked) {
    window.settingsManager.updateEnableReminders(checked);
}

function updateShowAdia(checked) {
    window.settingsManager.updateShowAdia(checked);
}

function updateShowAhadis(checked) {
    window.settingsManager.updateShowAhadis(checked);
}

function updateShowWisdom(checked) {
    window.settingsManager.updateShowWisdom(checked);
}

function updateWorkingHoursOnly(checked) {
    window.settingsManager.updateWorkingHoursOnly(checked);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

// Handle messages from extension
window.addEventListener('message', event => {
    if (window.settingsManager && event.data) {
        window.settingsManager.handleMessage(event.data);
    }
});
