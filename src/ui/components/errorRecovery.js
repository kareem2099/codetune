// Use the global window.vscode set by activityBar.js — acquireVsCodeApi() can only
//    be called ONCE per webview lifetime. Calling it again from a module throws a runtime error.
const getVscode = () => window.vscode || null;


function sanitizeText(input) {
    if (!input) { return ''; }
    const div = document.createElement('div');
    div.textContent = String(input);
    return div.innerHTML;
}

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createErrorRecoveryHTML() {
    return `
        <div class="error-recovery-container" id="error-recovery-container" style="display: none;">
            <div class="network-status" id="network-status">
                <span class="status-indicator online" id="status-indicator"></span>
                <span class="status-text" id="status-text">Online</span>
            </div>

            <div class="error-alerts" id="error-alerts"></div>

            <div class="offline-notice" id="offline-notice" style="display: none;">
                <div class="notice-content">
                    <h3>⛔ You're Offline</h3>
                    <p>It looks like you've lost your internet connection.</p>
                    <div class="offline-suggestions">
                        <ul>
                            <li>Check your WiFi or network connection</li>
                            <li>Try moving closer to your router</li>
                            <li>Restart your network adapter</li>
                        </ul>
                    </div>
                    <button class="primary-button" id="reconnect-button">🔄 Check Connection</button>
                </div>
            </div>

            <div class="recent-errors-section" id="recent-errors-section" style="display: none;">
                <h3>📜 Recent Errors</h3>
                <div class="errors-list" id="errors-list"></div>
                <button class="secondary-button" id="clear-errors-button">Clear History</button>
            </div>

            <div class="retry-queue-section" id="retry-queue-section" style="display: none;">
                <h3>🔄 Pending Retries</h3>
                <div class="retry-items" id="retry-items"></div>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Component Class
// ─────────────────────────────────────────────

class ErrorRecoveryComponent {
    constructor() {
        this.pendingRetries = [];
        this.recentErrors = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNetworkMonitoring();
        this.setupMessageListener();

        this.updateNetworkStatus(navigator.onLine);
    }

    setupEventListeners() {
        const reconnectBtn = document.getElementById('reconnect-button');
        const clearErrorsBtn = document.getElementById('clear-errors-button');

        if (reconnectBtn) {
            reconnectBtn.addEventListener('click', () => this.handleReconnect());
        }

        if (clearErrorsBtn) {
            clearErrorsBtn.addEventListener('click', () => this.clearErrorHistory());
        }

        // Event Delegation for dynamically created close buttons
        document.getElementById('error-alerts')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('alert-close') || e.target.classList.contains('dismiss-btn')) {
                const alertEl = e.target.closest('.error-alert');
                if (alertEl) { alertEl.remove(); }
            }
        });

        // Event Delegation for dynamically created retry buttons
        document.getElementById('retry-items')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('retry-action-btn')) {
                const retryId = e.target.getAttribute('data-id');
                if (retryId) {
                    getVscode()?.postMessage({ command: 'executeRetry', retryId });
                }
            }
        });
    }

    setupMessageListener() {
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.command === 'showErrorAlert') {
                this.showAlert(message.title, message.text, message.type);
                document.getElementById('error-recovery-container').style.display = 'block';
            }
            else if (message.command === 'updateRecentErrors') {
                this.recentErrors = message.errors || [];
                this.renderRecentErrors();
            }
            else if (message.command === 'updatePendingRetries') {
                this.pendingRetries = message.retries || [];
                this.renderRetryQueue();
            }
        });
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => this.handleNetworkRestored());
        window.addEventListener('offline', () => this.handleNetworkLost());
    }

    updateNetworkStatus(isOnline) {
        const statusIndicator = document.getElementById('status-indicator');
        const statusText = document.getElementById('status-text');
        const offlineNotice = document.getElementById('offline-notice');

        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        }

        if (statusText) {
            statusText.textContent = isOnline ? 'Online' : 'Offline';
        }

        if (offlineNotice) {
            offlineNotice.style.display = isOnline ? 'none' : 'block';
        }
    }

    handleNetworkLost() {
        this.updateNetworkStatus(false);
        this.showAlert('Network Lost', 'You have lost your internet connection. Audio streaming may not work.', 'error');
        getVscode()?.postMessage({ command: 'networkStatusChanged', isOnline: false });
    }

    handleNetworkRestored() {
        this.updateNetworkStatus(true);
        this.showAlert('Network Restored', 'Your connection is back online!', 'success');
        getVscode()?.postMessage({ command: 'networkStatusChanged', isOnline: true });

        if (this.pendingRetries.length > 0) {
            getVscode()?.postMessage({ command: 'retryAllPending' });
        }
    }

    handleReconnect() {
        const btn = document.getElementById('reconnect-button');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Checking...';
        }

        setTimeout(() => {
            const isConnected = navigator.onLine;

            if (btn) {
                btn.disabled = false;
                btn.textContent = '🔄 Check Connection';
            }

            if (isConnected) {
                this.handleNetworkRestored();
            } else {
                this.showAlert('Still Offline', 'Unable to restore connection. Please check your network.', 'error');
            }
        }, 1000);
    }

    showAlert(title, message, type = 'info') {
        const alertsContainer = document.getElementById('error-alerts');
        if (!alertsContainer) { return; }

        const alertId = `alert-${Date.now()}`;
        const alertEl = document.createElement('div');
        alertEl.id = alertId;
        alertEl.className = `error-alert alert-${sanitizeText(type)}`;


        alertEl.innerHTML = `
            <div class="alert-header">
                <span class="alert-title">${this.getAlertIcon(type)} ${sanitizeText(title)}</span>
                <button class="alert-close">✕</button>
            </div>
            <p class="alert-message">${sanitizeText(message)}</p>
            <div class="alert-actions">
                <button class="micro-button dismiss-btn">Dismiss</button>
            </div>
        `;

        alertsContainer.prepend(alertEl);

        if (type !== 'error') {
            setTimeout(() => {
                if (document.getElementById(alertId)) {
                    document.getElementById(alertId).remove();
                }
            }, 6000);
        }
    }

    getAlertIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }

    renderRecentErrors() {
        const recentErrorsList = document.getElementById('recent-errors-section');
        const errorsList = document.getElementById('errors-list');

        if (!errorsList || !recentErrorsList) { return; }

        if (this.recentErrors.length === 0) {
            recentErrorsList.style.display = 'none';
            return;
        }

        recentErrorsList.style.display = 'block';

        errorsList.innerHTML = this.recentErrors.map(error => `
            <div class="error-item severity-${sanitizeText(error.severity?.toLowerCase() || 'info')}">
                <div class="error-header">
                    <span class="error-category">${sanitizeText(error.category)}</span>
                    <span class="error-time">${sanitizeText(new Date(error.timestamp).toLocaleTimeString())}</span>
                </div>
                <p class="error-message">${sanitizeText(error.userMessage || error.message)}</p>
            </div>
        `).join('');
    }

    renderRetryQueue() {
        const retrySection = document.getElementById('retry-queue-section');
        const retryItems = document.getElementById('retry-items');

        if (!retryItems || !retrySection) { return; }

        if (this.pendingRetries.length === 0) {
            retrySection.style.display = 'none';
            return;
        }

        retrySection.style.display = 'block';

        retryItems.innerHTML = this.pendingRetries.map(retry => `
            <div class="retry-item">
                <div class="retry-header">
                    <span class="retry-name">${sanitizeText(retry.operationName)}</span>
                    <span class="retry-attempts">${sanitizeText(retry.attempts)} attempts</span>
                </div>
                <button class="micro-button retry-action-btn" data-id="${sanitizeText(retry.id)}">Retry Now</button>
            </div>
        `).join('');
    }

    clearErrorHistory() {
        // Show confirmation dialog before clearing error history
        getVscode()?.postMessage({
            command: 'showConfirmDialog',
            message: 'Are you sure you want to clear all error history?',
            action: 'clearErrorHistory'
        });
    }
}

// ─────────────────────────────────────────────
// Self-mount bootstrap (Webview context)
// ─────────────────────────────────────────────

if (typeof acquireVsCodeApi !== 'undefined' || typeof window !== 'undefined') {
    // Running in a VS Code Webview — mount immediately
    document.addEventListener('DOMContentLoaded', () => {
        const mount = document.getElementById('error-recovery-mount');
        if (mount) {
            mount.innerHTML = createErrorRecoveryHTML();
        }
        // Expose globally so activityBar.js can call methods on it
        window.errorRecoveryComponent = new ErrorRecoveryComponent();
    });
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js / test environment
    module.exports = { ErrorRecoveryComponent, createErrorRecoveryHTML };
}