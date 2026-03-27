import { logger } from '../utils/Logger.js';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Sanitize a string before injecting into innerHTML to prevent XSS
 * @param {string} input
 * @returns {string}
 */
function sanitizeText(input) {
    const div = document.createElement('div');
    div.textContent = String(input);
    return div.innerHTML;
}

/**
 * Get element by ID (returns null safely)
 * @param {string} id
 * @returns {HTMLElement | null}
 */
function el(id) {
    return document.getElementById(id);
}

/**
 * Show a toast notification (replaces alert/prompt feedback)
 * @param {string} message
 * @param {'success' | 'info' | 'error'} type
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `notification notification-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

/**
 * Show a custom input modal — replaces the blocked prompt()
 * VS Code Webview blocks prompt(), alert(), and confirm()
 *
 * @param {string} title
 * @param {string} placeholder
 * @param {string} defaultValue
 * @param {(value: number) => void} onConfirm
 */
function showInputModal(title, placeholder, defaultValue, onConfirm) {
    // Remove any existing modal first
    document.querySelector('.input-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'input-modal';
    modal.innerHTML = `
        <div class="td-modal-content">
            <h3>${sanitizeText(title)}</h3>
            <input type="number" id="modal-input"
                   placeholder="${sanitizeText(placeholder)}"
                   value="${sanitizeText(defaultValue)}"
                   min="1" />
            <div class="modal-actions">
                <button id="modal-confirm" class="primary-button">Confirm</button>
                <button id="modal-cancel"  class="secondary-button">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#modal-input');
    const confirm = modal.querySelector('#modal-confirm');
    const cancel = modal.querySelector('#modal-cancel');

    input.focus();
    input.select();

    confirm.addEventListener('click', () => {
        const value = parseInt(input.value, 10);
        if (!isNaN(value) && value > 0) {
            modal.remove();
            onConfirm(value);
        } else {
            input.classList.add('input-error');
        }
    });

    cancel.addEventListener('click', () => modal.remove());

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { confirm.click(); }
        if (e.key === 'Escape') { modal.remove(); }
    });
}

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createTrackerDashboardHTML() {
    return `
        <div class="tracker-dashboard" id="tracker-dashboard">
            <h3>
                📊 Spiritual Progress Tracker
                <div class="info-tooltip-container">
                    <span class="info-icon">ℹ️</span>
                    <div class="info-tooltip-content">
                        <strong>🕌 Smart Islamic Tracking</strong><br>
                        Daily goals reset at <b>Fajr</b> (not midnight).<br>
                        Friday events begin after <b>Maghrib</b> the evening before.
                    </div>
                </div>
            </h3>

            <!-- Daily Goals -->
            <div class="dashboard-section">
                <h4>📅 Today's Goals</h4>
                <div class="daily-goals">
                    <div class="goal-item" id="quran-goal">
                        <div class="goal-header">
                            <span class="goal-name">📖 Quran Listening</span>
                            <span class="goal-progress"><span id="quran-minutes">0</span>/15 min</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill quran-fill" id="quran-progress" style="width: 0%"></div>
                        </div>
                    </div>

                    <div class="goal-item" id="dhikr-goal">
                        <div class="goal-header">
                            <span class="goal-name">✨ Dhikr (Prayers)</span>
                            <span class="goal-progress"><span id="dhikr-count">0</span>/100</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill dhikr-fill" id="dhikr-progress" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Streak -->
            <div class="dashboard-section">
                <h4>🔥 Streak Status</h4>
                <div class="streak-display">
                    <div class="streak-item">
                        <div class="streak-count" id="current-streak">0</div>
                        <div class="streak-label">Days</div>
                        <div class="streak-sublabel">Current Streak</div>
                    </div>
                    <div class="streak-item">
                        <div class="streak-count" id="longest-streak">0</div>
                        <div class="streak-label">Days</div>
                        <div class="streak-sublabel">Longest Streak</div>
                    </div>
                    <div class="streak-item">
                        <div class="streak-count" id="next-milestone">7</div>
                        <div class="streak-label">Days</div>
                        <div class="streak-sublabel">To Next Milestone</div>
                    </div>
                </div>
                <div id="milestone-label" class="milestone-label">🔥 One Week Warrior</div>
            </div>

            <!-- All-Time Stats -->
            <div class="dashboard-section">
                <h4>📈 All-Time Statistics</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="total-quran">0</div>
                        <div class="stat-label">Minutes of Quran</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="total-dhikr">0</div>
                        <div class="stat-label">Total Dhikr</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="active-days">0</div>
                        <div class="stat-label">Active Days</div>
                    </div>
                </div>
            </div>

            <!-- Motivational Message -->
            <div class="dashboard-section">
                <div class="motivational-box" id="motivational-message">
                    💪 Start your spiritual journey today!
                </div>
            </div>

            <!-- Achievements -->
            <div class="dashboard-section">
                <h4>🏆 Achievements <span id="achievements-count" class="achievement-progress"></span></h4>
                <div id="achievements-list" class="achievements-grid"></div>
                <button id="view-all-achievements" class="secondary-button">View All Achievements</button>
            </div>

            <!-- Quick Actions -->
            <div class="dashboard-section">
                <h4>⚡ Quick Actions</h4>
                <div class="quick-actions">
                    <button id="log-quran-listening" class="action-button">📖 Log Quran Time</button>
                    <button id="track-dhikr"         class="action-button">✨ Track Dhikr</button>
                    <button id="refresh-dashboard"   class="action-button">🔄 Refresh</button>
                </div>
            </div>

            <!-- Weekly Summary -->
            <div class="dashboard-section">
                <h4>📊 Weekly Summary</h4>
                <div class="weekly-stats">
                    <div class="weekly-stat">
                        <span class="stat-name">Active Days This Week:</span>
                        <span id="weekly-active-days">0/7</span>
                    </div>
                    <div class="weekly-stat">
                        <span class="stat-name">Quran Minutes This Week:</span>
                        <span id="weekly-quran">0</span>
                    </div>
                    <div class="weekly-stat">
                        <span class="stat-name">Dhikr This Week:</span>
                        <span id="weekly-dhikr">0</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Component Class
// ─────────────────────────────────────────────

class TrackerDashboardComponent {
    /**
     * @param {object} trackerInsights
     * @param {object | null} spiritualTracker
     */
    constructor() {
        this.refreshInterval = null; // stored so we can clear it
        this.cachedAchievements = [];
        this.cachedSummary = null;
        this.cachedWeekly = null;
        this.init();
    }

    init() {
        this.setupEventListeners();

        // Request fresh data from the backend on mount
        window.vscode?.postMessage({ type: 'requestDashboardData' });

        // Refresh request every 30 s (backend responds with dashboardData)
        this.refreshInterval = setInterval(() => {
            window.vscode?.postMessage({ type: 'requestDashboardData' });
        }, 30000);
    }

    setupEventListeners() {
        // All listeners use addEventListener — no inline onclick strings
        el('log-quran-listening')?.addEventListener('click', () => this.handleLogQuran());
        el('track-dhikr')?.addEventListener('click', () => this.handleTrackDhikr());
        el('refresh-dashboard')?.addEventListener('click', () => this.updateDashboard());
        el('view-all-achievements')?.addEventListener('click', () => this.showAllAchievements());
    }

    /**
     * Called by activityBar.js when it receives a 'dashboardData' message from the backend.
     * @param {object} payload — the full payload from trackerInsights.getProgressSummary()
     */
    updateFromPayload(payload) {
        try {
            if (!payload) { return; }
            this.cachedSummary = payload;
            this.cachedAchievements = payload.allAchievements || [];
            this.cachedWeekly = payload.weeklyStats || null;

            this.updateDailyGoals(payload.dailyGoals || []);
            this.updateStreakDisplay(payload.streak || {});
            this.updateAllTimeStats(payload.allTime || {});
            this.updateMotivationalMessage(payload.motivationalMessage || '');
            this.updateAchievements(payload.unlockedAchievements || 0, payload.totalAchievements || 0);
            if (this.cachedWeekly) {
                this.updateWeeklySummary(this.cachedWeekly);
            }
        } catch (error) {
            logger.error('Error updating tracker dashboard from payload:', error);
        }
    }

    updateDailyGoals(goals) {
        for (const goal of goals) {
            if (goal.name === 'Quran Listening') {
                const minutesEl = el('quran-minutes');
                const progressEl = el('quran-progress');
                if (minutesEl) { minutesEl.textContent = goal.currentValue; }
                if (progressEl) { progressEl.style.width = `${Math.min(goal.percentage, 100)}%`; }
                el('quran-goal')?.classList.toggle('completed', goal.completed);

            } else if (goal.name === 'Dhikr (Prayers upon Prophet)') {
                const countEl = el('dhikr-count');
                const progressEl = el('dhikr-progress');
                if (countEl) { countEl.textContent = goal.currentValue; }
                if (progressEl) { progressEl.style.width = `${Math.min(goal.percentage, 100)}%`; }
                el('dhikr-goal')?.classList.toggle('completed', goal.completed);
            }
        }
    }

    updateStreakDisplay(streakInfo) {
        const setText = (id, value) => {
            const element = el(id);
            if (element) { element.textContent = value; }
        };
        setText('current-streak', streakInfo.currentStreak);
        setText('longest-streak', streakInfo.longestStreak);
        setText('next-milestone', streakInfo.daysUntilMilestone);
        setText('milestone-label', streakInfo.milestoneLabel);
    }

    updateAllTimeStats(allTimeStats) {
        const setText = (id, value) => {
            const element = el(id);
            if (element) { element.textContent = value; }
        };
        setText('total-quran', allTimeStats.totalQuranMinutes);
        setText('total-dhikr', allTimeStats.totalDhikrCount);
        setText('active-days', allTimeStats.totalActiveDays);
    }

    updateMotivationalMessage(message) {
        const msgEl = el('motivational-message');
        if (!msgEl) { return; }
        msgEl.textContent = message;
        msgEl.classList.remove('animate-message');
        void msgEl.offsetWidth; // force reflow to restart animation
        msgEl.classList.add('animate-message');
    }

    updateAchievements(unlockedCount, totalCount) {
        const list = el('achievements-list');
        if (!list) { return; }

        // Show first 4 as preview
        const preview = this.cachedAchievements.slice(0, 4);

        // sanitizeText on every dynamic value before innerHTML
        list.innerHTML = preview.map(a => `
            <div class="achievement-badge ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${sanitizeText(a.icon)}</div>
                <div class="achievement-name">${sanitizeText(a.name)}</div>
                <div class="achievement-status">${a.unlocked ? '✓ Unlocked' : 'Locked'}</div>
            </div>
        `).join('');

        const countEl = el('achievements-count');
        if (countEl) { countEl.textContent = `${unlockedCount}/${totalCount}`; }
    }

    updateWeeklySummary(weeklyStats) {
        const activeDaysEl = el('weekly-active-days');
        const quranEl = el('weekly-quran');
        const dhikrEl = el('weekly-dhikr');

        if (activeDaysEl) { activeDaysEl.textContent = `${weeklyStats.activeDays}/7`; }
        if (quranEl) { quranEl.textContent = `${weeklyStats.totalQuranMinutes} min`; }
        if (dhikrEl) { dhikrEl.textContent = weeklyStats.totalDhikrCount; }
    }

    handleLogQuran() {
        // postMessage to backend — SpiritualTracker lives in the Extension Host, not the webview
        showInputModal('Log Quran Time', 'Minutes listened', '15', (minutes) => {
            window.vscode?.postMessage({ type: 'logQuranTime', minutes });
            showToast('Quran time sent! 📖', 'success');
        });
    }

    handleTrackDhikr() {
        // postMessage to backend — SpiritualTracker lives in the Extension Host, not the webview
        showInputModal('Track Dhikr', 'Times recited', '100', (count) => {
            window.vscode?.postMessage({ type: 'incrementDhikr', count });
            showToast('Dhikr sent! ✨', 'success');
        });
    }

    showAllAchievements() {
        document.querySelector('.achievements-modal')?.remove();

        const modal = document.createElement('div');
        modal.className = 'achievements-modal';

        // sanitizeText on all dynamic content
        const items = this.cachedAchievements.map(a => `
            <div class="achievement-full ${a.unlocked ? 'unlocked' : 'locked'}">
                <span class="icon">${sanitizeText(a.icon)}</span>
                <div class="details">
                    <div class="name">${sanitizeText(a.name)}</div>
                    <div class="description">${sanitizeText(a.description)}</div>
                    <div class="status">${a.unlocked ? '✓ Unlocked' : 'Locked'}</div>
                </div>
            </div>
        `).join('');

        modal.innerHTML = `
            <div class="td-modal-content">
                <h3>🏆 All Achievements</h3>
                <div class="all-achievements-list">${items}</div>
                <button id="close-achievements" class="primary-button">Close</button>
            </div>
        `;

        document.body.appendChild(modal);

        // addEventListener instead of inline onclick
        modal.querySelector('#close-achievements')
            .addEventListener('click', () => modal.remove());
    }

    /**
     * Call this when the component is no longer needed
     * to avoid memory leaks from the setInterval
     */
    dispose() {
        if (this.refreshInterval !== null) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// ─────────────────────────────────────────────
// Self-mount bootstrap (Webview context)
// ─────────────────────────────────────────────

if (typeof acquireVsCodeApi !== 'undefined' || typeof window !== 'undefined') {
    // Running in a VS Code Webview — mount immediately
    document.addEventListener('DOMContentLoaded', () => {
        const mount = document.getElementById('tracker-dashboard-mount');
        if (mount) {
            mount.innerHTML = createTrackerDashboardHTML();
        }
        // Expose globally so activityBar.js can call updateFromPayload()
        window.trackerDashboardComponent = new TrackerDashboardComponent();
    });
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js / test environment
    module.exports = { TrackerDashboardComponent, createTrackerDashboardHTML };
}