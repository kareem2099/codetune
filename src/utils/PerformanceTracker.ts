import { logger } from './Logger';

export interface PerformanceMetric {
    label: string;
    durationMs: number;
    timestamp: number;
}

export interface MemorySnapshot {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    timestamp: number;
}

export interface PerformanceReport {
    metrics: PerformanceMetric[];
    memory: MemorySnapshot[];
    activeOperations: string[];
    averageDurationMs: number;
    peakMemoryMB: number;
}

const MAX_METRIC_ENTRIES = 100;
const SLOW_THRESHOLD_MS = 500;
const MEMORY_INTERVAL_MS = 30_000; // every 30 seconds

export class PerformanceTracker {
    private static _instance: PerformanceTracker;

    private metrics: PerformanceMetric[] = [];
    private memorySnapshots: MemorySnapshot[] = [];
    private activeOperations: Map<string, number> = new Map(); // id -> start timestamp
    private memoryTimer: NodeJS.Timeout | null = null;
    private markTimestamps: Map<string, number> = new Map();

    private constructor() {
        this.startMemoryMonitoring();
    }

    public static get instance(): PerformanceTracker {
        if (!PerformanceTracker._instance) {
            PerformanceTracker._instance = new PerformanceTracker();
        }
        return PerformanceTracker._instance;
    }

    // ── Mark / Measure API ──────────────────────────────────────────────────

    /**
     * Set a named timestamp mark (like performance.mark).
     */
    public mark(name: string): void {
        this.markTimestamps.set(name, Date.now());
    }

    /**
     * Measure the elapsed time between a previously set mark and now.
     * Records the result and logs it.
     */
    public measure(label: string, markName: string): number {
        const start = this.markTimestamps.get(markName);
        if (start === undefined) {
            logger.warn(`[PerformanceTracker] No mark found for: ${markName}`);
            return 0;
        }
        const durationMs = Date.now() - start;
        this.record(label, durationMs);
        this.markTimestamps.delete(markName);
        return durationMs;
    }

    // ── Operation Timing API ─────────────────────────────────────────────────

    /**
     * Start tracking a named operation. Returns a unique key for endOperation().
     */
    public startOperation(id: string): string {
        const key = `${id}_${Date.now()}`;
        this.activeOperations.set(key, Date.now());
        return key;
    }

    /**
     * End a tracked operation by the key returned from startOperation().
     * Returns the elapsed milliseconds.
     */
    public endOperation(key: string): number {
        const start = this.activeOperations.get(key);
        if (start === undefined) { return 0; }
        const durationMs = Date.now() - start;
        this.activeOperations.delete(key);

        // Derive label from key (strip the timestamp suffix)
        const label = key.replace(/_\d+$/, '');
        this.record(label, durationMs);
        return durationMs;
    }

    // ── Core Record ──────────────────────────────────────────────────────────

    /**
     * Directly record a labeled duration (use when you already have elapsed ms).
     */
    public record(label: string, durationMs: number): void {
        const metric: PerformanceMetric = { label, durationMs, timestamp: Date.now() };
        this.metrics.push(metric);

        // Keep rolling window
        if (this.metrics.length > MAX_METRIC_ENTRIES) {
            this.metrics.shift();
        }

        // Log via Logger (uses the new perf method added to Logger)
        logger.perf(label, durationMs);
    }

    // ── Memory Monitoring ────────────────────────────────────────────────────

    private startMemoryMonitoring(): void {
        this.captureMemory(); // immediate first snapshot
        this.memoryTimer = setInterval(() => {
            this.captureMemory();
        }, MEMORY_INTERVAL_MS);
    }

    private captureMemory(): void {
        try {
            const mem = process.memoryUsage();
            const snapshot: MemorySnapshot = {
                heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
                heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
                externalMB: Math.round(mem.external / 1024 / 1024 * 10) / 10,
                timestamp: Date.now()
            };
            this.memorySnapshots.push(snapshot);
            if (this.memorySnapshots.length > MAX_METRIC_ENTRIES) {
                this.memorySnapshots.shift();
            }
        } catch {
            // process.memoryUsage may not be available in all environments
        }
    }

    // ── Query API ────────────────────────────────────────────────────────────

    /**
     * Get the latest memory snapshot, or undefined if none yet.
     */
    public getLatestMemory(): MemorySnapshot | undefined {
        return this.memorySnapshots[this.memorySnapshots.length - 1];
    }

    /**
     * Get recent recorded metrics (last N, default 20).
     */
    public getRecentMetrics(count = 20): PerformanceMetric[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get a full performance report.
     */
    public getReport(): PerformanceReport {
        const total = this.metrics.reduce((sum, m) => sum + m.durationMs, 0);
        const avg = this.metrics.length > 0 ? Math.round(total / this.metrics.length) : 0;
        const peakMem = this.memorySnapshots.reduce(
            (max, s) => Math.max(max, s.heapUsedMB), 0
        );
        return {
            metrics: [...this.metrics],
            memory: [...this.memorySnapshots],
            activeOperations: Array.from(this.activeOperations.keys()),
            averageDurationMs: avg,
            peakMemoryMB: peakMem
        };
    }

    /**
     * Check if any recorded operation exceeded the slow threshold.
     */
    public hasSlowOperations(): boolean {
        return this.metrics.some(m => m.durationMs > SLOW_THRESHOLD_MS);
    }

    public getSlowOperations(): PerformanceMetric[] {
        return this.metrics.filter(m => m.durationMs > SLOW_THRESHOLD_MS);
    }

    public dispose(): void {
        if (this.memoryTimer) {
            clearInterval(this.memoryTimer);
            this.memoryTimer = null;
        }
        this.activeOperations.clear();
        this.markTimestamps.clear();
    }
}
