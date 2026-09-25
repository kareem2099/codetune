

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createNotificationSettingsHTML() {
    return `
        <div class="settings-section" id="notification-settings">
            <div class="settings-title">
                <span>🔔</span>
                <span data-localize="notificationSettings">Notification Settings</span>
            </div>

            <div class="setting-item">
                <div class="setting-control">
                    <label class="checkbox-label">
                        <input type="checkbox" id="pause-during-coding" checked>
                        <span data-localize="pauseDuringCoding">Pause reminders during active coding (Focus Mode)</span>
                    </label>
                </div>
                <div class="setting-description" data-localize="pauseDuringCodingDesc">Automatically pause notifications when you're actively typing or navigating code.</div>
            </div>

            <div class="setting-item">
                <div class="setting-control">
                    <label class="checkbox-label">
                        <input type="checkbox" id="quiet-hours-enabled">
                        <span data-localize="quietHoursEnabled">Enable Quiet Hours (Do Not Disturb)</span>
                    </label>
                </div>
                <div class="setting-description" data-localize="quietHoursEnabledDesc">Stop notifications during your preferred quiet period.</div>

                <div id="quiet-hours-config" class="sub-settings" style="display: none; margin-top: 10px;">
                    <div class="time-input-group" style="margin-bottom: 8px;">
                        <label for="quiet-start-hour" data-localize="quietHoursStart">Quiet Hours Start:</label>
                        <input type="time" id="quiet-start-hour" value="22:00" class="setting-select" style="width: auto;">
                    </div>
                    <div class="time-input-group">
                        <label for="quiet-end-hour" data-localize="quietHoursEnd">Quiet Hours End:</label>
                        <input type="time" id="quiet-end-hour" value="07:00" class="setting-select" style="width: auto;">
                    </div>
                </div>
            </div>

            <div class="setting-item">
                <div class="setting-label" data-localize="focusModeDuration">Focus Mode Inactivity Duration (seconds):</div>
                <div class="setting-description" data-localize="focusModeDurationDesc">Exit focus mode after this many seconds of inactivity (5–300 seconds).</div>
                <div class="setting-control">
                    <input type="number" id="focus-mode-duration" min="5" max="300" value="15" step="1" class="setting-select" style="width: 100px;">
                </div>
            </div>

            <div class="setting-item">
                <div class="setting-label" data-localize="currentStatus">Current Status</div>
                <div id="notification-status" class="status-display" style="padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; font-size: 11px;">
                    <p><strong data-localize="focusMode">Focus Mode:</strong> <span id="focus-status">Inactive</span></p>
                    <p><strong data-localize="inQuietHours">In Quiet Hours:</strong> <span id="quiet-status">No</span></p>
                    <p><strong data-localize="timeSinceActivity">Time Since Activity:</strong> <span id="activity-time">N/A</span></p>
                </div>
            </div>

            <button id="save-notification-settings" class="primary-button" data-localize="saveSettings" style="margin-top: 10px;">Save Settings</button>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Component Class
// ─────────────────────────────────────────────

class NotificationSettingsComponent {
    /**
     * @param {ReturnType<typeof acquireVsCodeApi>} vscodeApi
     */
    constructor(vscodeApi) {
        // receives vscodeApi or falls back to global window.vscode
        this.vscode = vscodeApi || (typeof window !== 'undefined' ? window.vscode : null);
        this.statusInterval = null; // periodic IPC refresh
        this.localTickerInterval = null; // client-side 1s display ticker
        this.lastActivityTimeMs = null;
        this.init();
    }

    init() {
        const quietHoursCheckbox = document.getElementById('quiet-hours-enabled');
        const quietHoursConfig = document.getElementById('quiet-hours-config');
        const saveButton = document.getElementById('save-notification-settings');

        // Show/hide quiet hours config when toggled
        quietHoursCheckbox?.addEventListener('change', (e) => {
            if (quietHoursConfig) {
                quietHoursConfig.style.display = e.target.checked ? 'block' : 'none';
            }
        });

        saveButton?.addEventListener('click', () => this.saveSettings());

        // Poll extension host every 30s instead of spamming every 1s
        this.statusInterval = setInterval(() => this.requestStatusUpdate(), 30000);

        // Local ticker updates the "Xs ago" counter every second client-side
        this.localTickerInterval = setInterval(() => this.updateActivityTimeDisplay(), 1000);

        // Request initial status
        this.requestStatusUpdate();
    }

    /**
     * Ask the Extension Host for current SmartNotifications status
     */
    requestStatusUpdate() {
        this.vscode?.postMessage({ type: 'requestNotificationStatus' });
    }

    /**
     * Called from the main webview message handler when Extension replies
     * with { type: 'notificationStatus', payload: { ... } }
     * @param {object} status
     */
    onStatusReceived(status) {
        const focusStatusEl = document.getElementById('focus-status');
        const quietStatusEl = document.getElementById('quiet-status');

        if (focusStatusEl) {
            focusStatusEl.textContent = status.focusModeActive ? '🔴 Active' : '🟢 Inactive';
            focusStatusEl.className = status.focusModeActive ? 'status-active' : 'status-inactive';
        }

        if (quietStatusEl) {
            quietStatusEl.textContent = status.inQuietHours ? 'Yes ⛔' : 'No';
            quietStatusEl.className = status.inQuietHours ? 'status-active' : 'status-inactive';
        }

        if (typeof status.timeSinceLastActivity === 'number') {
            this.lastActivityTimeMs = Date.now() - status.timeSinceLastActivity;
            this.updateActivityTimeDisplay();
        }
    }

    updateActivityTimeDisplay() {
        const activityTimeEl = document.getElementById('activity-time');
        if (activityTimeEl && this.lastActivityTimeMs !== null) {
            const seconds = Math.max(0, Math.floor((Date.now() - this.lastActivityTimeMs) / 1000));
            activityTimeEl.textContent = `${seconds}s ago`;
        }
    }

    saveSettings() {
        try {
            const pauseDuringCoding = document.getElementById('pause-during-coding')?.checked ?? false;
            const quietHoursEnabled = document.getElementById('quiet-hours-enabled')?.checked ?? false;
            const quietStartValue = document.getElementById('quiet-start-hour')?.value ?? '22:00';
            const quietEndValue = document.getElementById('quiet-end-hour')?.value ?? '07:00';
            const durationRaw = parseInt(document.getElementById('focus-mode-duration')?.value ?? '15', 10);

            // Validate focusModeDuration range
            if (isNaN(durationRaw) || durationRaw < 5 || durationRaw > 300) {
                this.showMessage('Focus duration must be between 5 and 300 seconds.', 'error');
                return;
            }

            const [quietHoursStart] = quietStartValue.split(':').map(Number);
            const [quietHoursEnd] = quietEndValue.split(':').map(Number);

            const settings = {
                pauseDuringCoding,
                quietHoursEnabled,
                quietHoursStart,
                quietHoursEnd,
                focusModeDuration: durationRaw * 1000 // convert to ms
            };

            // postMessage to Extension Host instead of calling object directly
            this.vscode?.postMessage({ type: 'updateSmartNotifications', settings });

            this.showMessage('Settings saved successfully! ✅', 'success');
        } catch (error) {
            logger.error('Error saving notification settings:', error);
            this.showMessage('Error saving settings. Please try again.', 'error');
        }
    }

    /**
     * @param {string} message
     * @param {'success' | 'error' | 'info'} type
     */
    showMessage(message, type = 'info') {
        // Remove any existing message first
        document.querySelector('.settings-message')?.remove();

        const msgEl = document.createElement('div');
        // Use CSS classes instead of inline style colors
        msgEl.className = `settings-message message-${type}`;
        msgEl.textContent = message;

        const section = document.getElementById('notification-settings');
        if (section) {
            section.insertBefore(msgEl, section.firstChild);
            setTimeout(() => msgEl.remove(), 3000);
        }
    }

    /**
     * Cleanup — call when component is removed
     */
    dispose() {
        if (this.statusInterval !== null) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        if (this.localTickerInterval !== null) {
            clearInterval(this.localTickerInterval);
            this.localTickerInterval = null;
        }
    }
}

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

if (typeof window !== 'undefined') {
    window.NotificationSettingsComponent = NotificationSettingsComponent;
    window.createNotificationSettingsHTML = createNotificationSettingsHTML;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSettingsComponent, createNotificationSettingsHTML };
}