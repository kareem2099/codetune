/**
 * backupSettings.js
 * Webview UI component — list backups, create backup, and restore.
 */

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createBackupSettingsHTML() {
    return `
        <div class="settings-section" id="backup-settings">
            <h3>💾 Backup & Restore</h3>
            <p class="help-text">Backups include all your prayer streaks, Dhikr history, and settings. Stored locally on your device.</p>

            <div class="button-row">
                <button id="create-backup-btn" class="primary-button">➕ Create Backup Now</button>
                <button id="refresh-backups-btn" class="secondary-button">🔄 Refresh</button>
            </div>

            <div id="backup-list-container" style="margin-top:12px;">
                <h4>Saved Backups</h4>
                <div id="backup-list">
                    <p class="empty-state">No backups yet.</p>
                </div>
            </div>

            <div id="backup-status-msg" style="display:none;"></div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Component Class
// ─────────────────────────────────────────────

class BackupSettingsComponent {
    constructor(vscodeApi) {
        this.vscode = vscodeApi;
        this.backups = [];
        this.init();
    }

    init() {
        document.getElementById('create-backup-btn')?.addEventListener('click', () => this.createBackup());
        document.getElementById('refresh-backups-btn')?.addEventListener('click', () => this.requestBackupList());
        this.requestBackupList();
    }

    requestBackupList() {
        this.vscode?.postMessage({ type: 'requestBackupList' });
    }

    createBackup() {
        const btn = document.getElementById('create-backup-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating…'; }
        this.vscode?.postMessage({ type: 'createBackup' });
    }

    /** Called from the main message handler when backup list arrives. */
    onBackupListReceived(backups) {
        this.backups = backups ?? [];
        this._renderList();
        const btn = document.getElementById('create-backup-btn');
        if (btn) { btn.disabled = false; btn.textContent = '➕ Create Backup Now'; }
    }

    onBackupCreated(entry, error) {
        const btn = document.getElementById('create-backup-btn');
        if (btn) { btn.disabled = false; btn.textContent = '➕ Create Backup Now'; }

        if (error) {
            this._showStatus(`❌ Backup failed: ${error}`, 'error');
        } else {
            this._showStatus(`✅ Backup created: ${entry.filename}`, 'success');
            this.requestBackupList();
        }
    }

    onRestoreComplete(result) {
        if (result.success) {
            const msg = result.warning
                ? `⚠️ Restored (warning: ${result.warning})`
                : `✅ Restored ${result.restoredKeys.length} item(s) successfully.`;
            this._showStatus(msg, result.warning ? 'warning' : 'success');
        } else {
            this._showStatus(`❌ Restore failed: ${result.error}`, 'error');
        }
    }

    _renderList() {
        const container = document.getElementById('backup-list');
        if (!container) { return; }

        if (this.backups.length === 0) {
            container.innerHTML = '<p class="empty-state">No backups yet. Click "Create Backup Now" to start.</p>';
            return;
        }

        container.innerHTML = this.backups.map((b, i) => `
            <div class="backup-item" data-index="${i}">
                <div class="backup-meta">
                    <span class="backup-date">${new Date(b.createdAt).toLocaleString()}</span>
                    <span class="backup-size">${this._formatBytes(b.sizeBytes)}</span>
                </div>
                <div class="backup-actions">
                    <button class="micro-button restore-btn" data-filename="${b.filename}">↩ Restore</button>
                    <button class="micro-button danger-btn  delete-btn"  data-filename="${b.filename}">🗑</button>
                </div>
            </div>
        `).join('');

        // Bind buttons
        container.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filename = e.target.dataset.filename;
                if (confirm(`Restore from backup "${filename}"? Your current data will be overwritten.`)) {
                    this.vscode?.postMessage({ type: 'restoreBackup', filename });
                }
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filename = e.target.dataset.filename;
                if (confirm(`Delete backup "${filename}"?`)) {
                    this.vscode?.postMessage({ type: 'deleteBackup', filename });
                    this.requestBackupList();
                }
            });
        });
    }

    _showStatus(message, type = 'info') {
        const el = document.getElementById('backup-status-msg');
        if (!el) { return; }
        el.style.display = 'block';
        el.className = `settings-message message-${type}`;
        el.textContent = message;
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }

    _formatBytes(bytes) {
        if (!bytes) { return '—'; }
        if (bytes < 1024) { return `${bytes} B`; }
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BackupSettingsComponent, createBackupSettingsHTML };
}
