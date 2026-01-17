/**
 * Statistics Component - Manages listening statistics and display
 */
import { logger } from '../utils/Logger.js';
class StatisticsComponent {
    constructor() {
        // Statistics state
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

        this.loadListeningStats();
        this.setupEventListeners();
        this.updateListeningStatsDisplay();
    }

    setupEventListeners() {
        // Reset statistics button (use event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('stats-reset')) {
                this.resetStats();
            }
        });
    }

    // Attach event listeners for dynamically created elements
    attachEventListeners() {
        // Statistics mode toggle
        const statsIcon = document.querySelector('.stats-icon');
        if (statsIcon) {
            statsIcon.style.cursor = 'pointer';
            // Remove existing listeners to avoid duplicates
            statsIcon.removeEventListener('click', this.handleIconClick);
            // Add new listener
            statsIcon.addEventListener('click', this.handleIconClick.bind(this));
        }
    }

    // Handle icon click (bound to component instance)
    handleIconClick() {
        this.toggleStatisticsMode();
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

        // Save and update UI
        this.saveListeningStats();
        this.updateListeningStatsDisplay();

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

        this.updateListeningStatsDisplay();
    }

    // Calculate statistics
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

    calculateMonthlyStats() {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        let monthTotal = 0;

        for (const [dateKey, count] of Object.entries(this.listeningStats.dailyStats)) {
            const date = new Date(dateKey);
            if (date >= startOfMonth && date <= today) {
                monthTotal += count;
            }
        }

        return monthTotal;
    }

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
        logger.info('Toggled stats mode to:', this.listeningStats.statsMode);
    }

    updateListeningStatsDisplay() {
        const statsContainer = document.getElementById('listeningStats');
        if (!statsContainer) {
            logger.info('Listening stats container not found');
            return;
        }

        const mode = this.listeningStats.statsMode;

        let icon, title;
        if (mode === 'time') {
            icon = '⏰';
            title = window.localization ? window.localization.getString('quranTimeTitle') : 'Quran Time';
        } else {
            icon = '📊';
            title = window.localization ? window.localization.getString('quranListeningTitle') : 'Quran Listening';
        }

        // DEBUG: Log localization status
        logger.info('Statistics: Localization check:', {
            hasLocalization: !!window.localization,
            hasGetString: !!(window.localization && window.localization.getString),
            stringsCount: window.localization ? Object.keys(window.localization.strings || {}).length : 0,
            titleResult: title,
            rawTitle: window.localization ? window.localization.getString('quranListeningTitle') : 'NO_LOCALIZATION'
        });

        let totalValue, todayValue, weekValue, monthValue;

        if (mode === 'time') {
            // Time mode - show time in HH:MM:SS
            const today = new Date().toISOString().split('T')[0];
            todayValue = this.formatDuration(this.listeningStats.dailyTimeStats[today] || 0);
            weekValue = this.formatDuration(this.calculateWeeklyTimeStats());
            monthValue = this.formatDuration(this.calculateMonthlyTimeStats());
        } else {
            // Session mode - show counts
            const today = new Date().toISOString().split('T')[0];
            todayValue = this.listeningStats.dailyStats[today] || 0;
            weekValue = this.calculateWeeklyStats();
            monthValue = this.calculateMonthlyStats();

            // Format large numbers with commas
            todayValue = todayValue.toLocaleString();
            weekValue = weekValue.toLocaleString();
            monthValue = monthValue.toLocaleString();
        }

        // Get localized labels
        const totalLabel = window.localization ? window.localization.getString(mode === 'time' ? 'totalTime' : 'totalSessions') : (mode === 'time' ? 'Total Time' : 'Total Sessions');
        const todayLabel = window.localization ? window.localization.getString('today') : 'Today';
        const weekLabel = window.localization ? window.localization.getString('thisWeek') : 'This Week';
        const monthLabel = window.localization ? window.localization.getString('thisMonth') : 'This Month';

        const html = `
            <div class="stats-header">
                <span class="stats-icon">${icon}</span>
                <span class="stats-title">${title}</span>
                <span class="stats-reset" title="Reset all statistics">🔄</span>
            </div>
            <div class="stats-content">
                <div class="stat-item">
                    <span class="stat-label">${totalLabel}</span>
                    <span class="stat-value">${mode === 'time' ? this.formatDuration(this.listeningStats.totalTimePlayed) : this.listeningStats.totalSessions.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${todayLabel}</span>
                    <span class="stat-value">${todayValue}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${weekLabel}</span>
                    <span class="stat-value">${weekValue}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${monthLabel}</span>
                    <span class="stat-value">${monthValue}</span>
                </div>
            </div>
        `;

        statsContainer.innerHTML = html;
        statsContainer.style.display = 'block';

        // Re-attach event listeners after HTML update
        this.attachEventListeners();
    }

    resetStats() {
        const modeText = this.listeningStats.statsMode === 'time' ? 'listening time' : 'session';
        const confirmMessage = window.localization ?
            window.localization.getString('resetStatsConfirm', { mode: modeText }) :
            `Are you sure you want to reset all listening ${modeText} statistics? This cannot be undone.`;

        // Use VS Code dialog instead of browser confirm (webview is sandboxed)
        if (window.vscode) {
            window.vscode.postMessage({
                type: 'showConfirmDialog',
                message: confirmMessage,
                action: 'resetStats'
            });
        } else {
            logger.warn('VS Code API not available for confirmation dialog');
        }
    }

    // Method called from activityBar.js when user confirms reset
    confirmResetStats() {
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

    // Public interface for other components
    onAudioPlay() {
        this.startTimeTracking();
        if (this.listeningStats.statsMode === 'sessions') {
            this.incrementListeningCounter();
        }
    }

    onAudioPause() {
        this.stopTimeTracking();
    }

    onAudioEnd() {
        this.stopTimeTracking();
    }

    // Public method to refresh localization after language change
    refreshLocalization() {
        logger.info('StatisticsComponent: Refreshing localization');
        this.updateListeningStatsDisplay();
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
window.StatisticsComponent = StatisticsComponent;
