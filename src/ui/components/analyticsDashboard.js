/**
 * analyticsDashboard.js
 * Webview UI component — shows personal usage stats and streak info.
 * Pure SVG bar chart, no external libraries.
 */

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createAnalyticsDashboardHTML() {
    return `
        <div class="settings-section" id="analytics-dashboard">
            <h3>📊 My Usage Stats</h3>

            <div id="analytics-opt-in-notice" class="info-notice" style="display:none;">
                <p>📈 Analytics is disabled. Enable it in Settings to track your usage.</p>
                <button id="enable-analytics-btn" class="secondary-button">Enable Analytics</button>
            </div>

            <div id="analytics-content">
                <div class="stat-grid">
                    <div class="stat-card">
                        <span class="stat-label">Total Events</span>
                        <span class="stat-value" id="analytics-total-events">—</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Sessions</span>
                        <span class="stat-value" id="analytics-sessions">—</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">First Used</span>
                        <span class="stat-value" id="analytics-first-used">—</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Last Used</span>
                        <span class="stat-value" id="analytics-last-used">—</span>
                    </div>
                </div>

                <h4>🏆 Top Features</h4>
                <div id="analytics-feature-chart">
                    <!-- SVG bar chart rendered here -->
                </div>

                <div class="button-row">
                    <button id="refresh-analytics-btn" class="secondary-button">🔄 Refresh</button>
                    <button id="clear-analytics-btn"   class="danger-button">🗑 Clear Data</button>
                </div>
            </div>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Component Class
// ─────────────────────────────────────────────

class AnalyticsDashboardComponent {
    constructor(vscodeApi) {
        this.vscode = vscodeApi;
        this.init();
    }

    init() {
        document.getElementById('refresh-analytics-btn')?.addEventListener('click', () => this.requestData());
        document.getElementById('clear-analytics-btn')?.addEventListener('click', () => this.clearData());
        document.getElementById('enable-analytics-btn')?.addEventListener('click', () => {
            this.vscode?.postMessage({ type: 'enableAnalytics' });
        });
        this.requestData();
    }

    requestData() {
        this.vscode?.postMessage({ type: 'requestAnalyticsStats' });
    }

    clearData() {
        if (confirm('Clear all local analytics data? This cannot be undone.')) {
            this.vscode?.postMessage({ type: 'clearAnalyticsData' });
        }
    }

    /** Called from the main message handler. */
    onStatsReceived(stats, isEnabled) {
        const notice = document.getElementById('analytics-opt-in-notice');
        const content = document.getElementById('analytics-content');

        if (!isEnabled) {
            if (notice) { notice.style.display = 'block'; }
            if (content) { content.style.display = 'none'; }
            return;
        }

        if (notice) { notice.style.display = 'none'; }
        if (content) { content.style.display = 'block'; }

        this._setText('analytics-total-events', stats.totalEvents ?? 0);
        this._setText('analytics-sessions', stats.totalSessions ?? 0);
        this._setText('analytics-first-used', stats.firstUsed ? this._formatDate(stats.firstUsed) : '—');
        this._setText('analytics-last-used', stats.lastUsed ? this._formatDate(stats.lastUsed) : '—');

        this._renderBarChart(stats.featureCounts ?? {});
    }

    _renderBarChart(featureCounts) {
        const container = document.getElementById('analytics-feature-chart');
        if (!container) { return; }

        const entries = Object.entries(featureCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8); // Top 8 features

        if (entries.length === 0) {
            container.innerHTML = '<p class="empty-state">No events yet. Start using CodeTune features!</p>';
            return;
        }

        const maxVal = entries[0][1];
        const barH = 20;
        const gap = 6;
        const labelW = 130;
        const chartW = 200;
        const totalH = entries.length * (barH + gap);
        const colors = ['#c8993a', '#2d8a55', '#1e7ea1', '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#e67e22'];

        const bars = entries.map(([name, count], i) => {
            const barWidth = Math.max(4, Math.round((count / maxVal) * chartW));
            const y = i * (barH + gap);
            const color = colors[i % colors.length];
            const label = name.length > 18 ? name.substring(0, 16) + '…' : name;
            return `
                <text x="${labelW - 4}" y="${y + barH - 5}" text-anchor="end"
                      font-size="11" fill="var(--ct-text-secondary, #aaa)">${label}</text>
                <rect x="${labelW}" y="${y}" width="${barWidth}" height="${barH}"
                      fill="${color}" rx="3" opacity="0.85"/>
                <text x="${labelW + barWidth + 4}" y="${y + barH - 5}"
                      font-size="11" fill="var(--ct-text-primary, #fff)">${count}</text>
            `;
        }).join('');

        container.innerHTML = `
            <svg width="100%" viewBox="0 0 ${labelW + chartW + 40} ${totalH + 10}"
                 xmlns="http://www.w3.org/2000/svg" style="max-width:360px;">
                ${bars}
            </svg>
        `;
    }

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) { el.textContent = String(value); }
    }

    _formatDate(ts) {
        return new Date(ts).toLocaleDateString();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyticsDashboardComponent, createAnalyticsDashboardHTML };
}
