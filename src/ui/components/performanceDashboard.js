/**
 * performanceDashboard.js
 * Webview UI component — shows load time, memory, and recent slow operations.
 */

// ─────────────────────────────────────────────
// HTML Template
// ─────────────────────────────────────────────

function createPerformanceDashboardHTML() {
    return `
        <div class="settings-section" id="performance-dashboard">
            <h3>🚀 Performance</h3>

            <div class="stat-grid">
                <div class="stat-card">
                    <span class="stat-label">Load Time</span>
                    <span class="stat-value" id="perf-load-time">—</span>
                    <span class="stat-unit">ms</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Memory Used</span>
                    <span class="stat-value" id="perf-memory">—</span>
                    <span class="stat-unit">MB</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Avg Operation</span>
                    <span class="stat-value" id="perf-avg-op">—</span>
                    <span class="stat-unit">ms</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Slow Ops</span>
                    <span class="stat-value" id="perf-slow-ops">0</span>
                    <span class="stat-unit">total</span>
                </div>
            </div>

            <div id="slow-ops-list" style="display:none;">
                <h4>⚠️ Slow Operations (&gt;500ms)</h4>
                <ul id="slow-ops-items" class="compact-list"></ul>
            </div>

            <button id="refresh-perf-btn" class="secondary-button">🔄 Refresh</button>
        </div>
    `;
}

// ─────────────────────────────────────────────
// Component Class
// ─────────────────────────────────────────────

class PerformanceDashboardComponent {
    constructor(vscodeApi) {
        this.vscode = vscodeApi;
        this.refreshTimer = null;
        this.init();
    }

    init() {
        document.getElementById('refresh-perf-btn')?.addEventListener('click', () => this.requestData());
        this.refreshTimer = setInterval(() => this.requestData(), 10_000);
        this.requestData();
    }

    requestData() {
        this.vscode?.postMessage({ type: 'requestPerformanceReport' });
    }

    /** Called from the main message handler with the performance report payload. */
    onReportReceived(report) {
        if (!report) { return; }

        this._setText('perf-load-time', report.loadTimeMs ?? '—');
        this._setText('perf-memory', report.memoryMB ?? '—');
        this._setText('perf-avg-op', report.averageDurationMs ?? '—');
        this._setText('perf-slow-ops', (report.slowOperations ?? []).length);

        const slowList = document.getElementById('slow-ops-list');
        const slowItems = document.getElementById('slow-ops-items');
        const ops = report.slowOperations ?? [];

        if (ops.length > 0 && slowList && slowItems) {
            slowList.style.display = 'block';
            slowItems.innerHTML = ops.slice(0, 5).map(op =>
                `<li><strong>${op.label}</strong> — ${op.durationMs}ms</li>`
            ).join('');
        } else if (slowList) {
            slowList.style.display = 'none';
        }
    }

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) { el.textContent = String(value); }
    }

    dispose() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceDashboardComponent, createPerformanceDashboardHTML };
}
