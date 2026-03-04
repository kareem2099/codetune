

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createNotificationSettingsHTML() {
    return `
        <div class="settings-section" id="notification-settings">
            <h3>🔔 Notification Settings</h3>

            <div class="setting-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="pause-during-coding" checked>
                    Pause reminders during active coding (Focus Mode)
                </label>
                <p class="help-text">Automatically pause notifications when you're actively typing or navigating code.</p>
            </div>

            <div class="setting-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="quiet-hours-enabled">
                    Enable Quiet Hours (Do Not Disturb)
                </label>
                <p class="help-text">Stop notifications during your preferred quiet period.</p>

                <div id="quiet-hours-config" class="sub-settings" style="display: none;">
                    <div class="time-input-group">
                        <label for="quiet-start-hour">Quiet Hours Start:</label>
                        <input type="time" id="quiet-start-hour" value="22:00">
                    </div>
                    <div class="time-input-group">
                        <label for="quiet-end-hour">Quiet Hours End:</label>
                        <input type="time" id="quiet-end-hour" value="07:00">
                    </div>
                </div>
            </div>

            <div class="setting-group">
                <label for="focus-mode-duration">Focus Mode Inactivity Duration (seconds):</label>
                <input type="number" id="focus-mode-duration" min="5" max="300" value="15" step="1">
                <p class="help-text">Exit focus mode after this many seconds of inactivity (5–300 seconds).</p>
            </div>

            <div class="setting-group">
                <h4>Current Status</h4>
                <div id="notification-status" class="status-display">
                    <p><strong>Focus Mode:</strong> <span id="focus-status">Inactive</span></p>
                    <p><strong>In Quiet Hours:</strong> <span id="quiet-status">No</span></p>
                    <p><strong>Time Since Activity:</strong> <span id="activity-time">N/A</span></p>
                </div>
            </div>

            <button id="save-notification-settings" class="primary-button">Save Settings</button>
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
        // ✅ receives vscodeApi instead of smartNotifications object
        // smartNotifications lives in the Extension Host, not the Webview
        this.vscode = vscodeApi;
        this.statusInterval = null; // ✅ stored to avoid memory leak
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

        // ✅ Store interval reference
        this.statusInterval = setInterval(() => this.requestStatusUpdate(), 1000);

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
        const activityTimeEl = document.getElementById('activity-time');

        if (focusStatusEl) {
            focusStatusEl.textContent = status.focusModeActive ? '🔴 Active' : '🟢 Inactive';
            focusStatusEl.className = status.focusModeActive ? 'status-active' : 'status-inactive';
        }

        if (quietStatusEl) {
            quietStatusEl.textContent = status.inQuietHours ? 'Yes ⛔' : 'No';
            quietStatusEl.className = status.inQuietHours ? 'status-active' : 'status-inactive';
        }

        if (activityTimeEl && typeof status.timeSinceLastActivity === 'number') {
            const seconds = Math.floor(status.timeSinceLastActivity / 1000);
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

            // ✅ Validate focusModeDuration range
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

            // ✅ postMessage to Extension Host instead of calling object directly
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
        // ✅ Use CSS classes instead of inline style colors
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
    }
}

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NotificationSettingsComponent, createNotificationSettingsHTML };
}