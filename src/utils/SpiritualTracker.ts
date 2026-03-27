import * as vscode from 'vscode';
import { logger } from './Logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface DailyTrackerData {
    date: string; // YYYY-MM-DD
    quranListeningMinutes: number;
    dhikrCount: number;
    customGoal?: {
        name: string;
        targetValue: number;
        currentValue: number;
        completed: boolean;
    };
}

interface TrackerStats {
    totalQuranMinutes: number;
    totalDhikrCount: number;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    totalActiveDays: number;
}

type TrackerDataMap = Record<string, DailyTrackerData>;

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const TRACKER_KEY = 'codeTune_spiritualTracker';
const STATS_KEY = 'codeTune_trackerStats';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const EMPTY_STATS: TrackerStats = {
    totalQuranMinutes: 0,
    totalDhikrCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    totalActiveDays: 0
};

// ─────────────────────────────────────────────
// Class
// ─────────────────────────────────────────────

export class SpiritualTracker {
    private context: vscode.ExtensionContext;
    private currentFajrTime: Date | null = null; // Store Fajr time

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeTracker();
        logger.info('SpiritualTracker initialized');
    }

    // ── Public Setters for Prayer Times ───────

    /**
     * Update Fajr time from IslamicRemindersManager or API
     */
    public updateFajrTime(fajrTime: Date): void {
        this.currentFajrTime = fajrTime;
        logger.debug(`SpiritualTracker: Fajr time updated to ${fajrTime.toLocaleTimeString()}`);
    }

    // ── Private helpers ───────────────────────

    /**
     * Format a Date object as YYYY-MM-DD.
     * Single source of truth - replaces getTodayString() and getYesterdayString().
     */
    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Magic function: Gets the "Islamic worship day" date based on Fajr
     */
    private getHabitTrackingDate(date: Date = new Date()): string {
        const now = new Date(date);
        
        // Default: If API hasn't fetched Fajr time yet, assume 4:00 AM
        let fajrHour = 4;
        let fajrMinute = 0;

        if (this.currentFajrTime) {
            fajrHour = this.currentFajrTime.getHours();
            fajrMinute = this.currentFajrTime.getMinutes();
        }

        const fajrTimeToday = new Date(now);
        fajrTimeToday.setHours(fajrHour, fajrMinute, 0, 0);

        // If we're currently before Fajr, then we're religiously part of "yesterday"
        if (now < fajrTimeToday) {
            now.setDate(now.getDate() - 1);
        }

        return this.formatDate(now);
    }

    /**
     * Helper function to go back days safely (without timezone issues)
     */
    private getPreviousDateString(baseDateStr: string, daysBack: number): string {
        const [y, m, d] = baseDateStr.split('-').map(Number);
        // Set time to 12 noon to avoid any issues with daylight saving time
        const date = new Date(y, m - 1, d, 12, 0, 0); 
        date.setDate(date.getDate() - daysBack);
        return this.formatDate(date);
    }

    private getTrackerData(): TrackerDataMap {
        return (this.context.globalState.get<TrackerDataMap>(TRACKER_KEY)) ?? {};
    }

    private getStats(): TrackerStats {
        return this.context.globalState.get<TrackerStats>(STATS_KEY) ?? { ...EMPTY_STATS };
    }

    /**
     * Persist a mutated TrackerDataMap to globalState
     */
    private async saveTrackerData(data: TrackerDataMap): Promise<void> {
        await this.context.globalState.update(TRACKER_KEY, data);
    }

    /**
     * Persist a mutated TrackerStats object to globalState
     */
    private async saveStats(stats: TrackerStats): Promise<void> {
        await this.context.globalState.update(STATS_KEY, stats);
    }

    /**
     * Initialize globalState keys on first use
     */
    private initializeTracker(): void {
        const todayStr = this.getHabitTrackingDate(); // Use Islamic date

        if (!this.context.globalState.get(TRACKER_KEY)) {
            this.context.globalState.update(TRACKER_KEY, {
                [todayStr]: { date: todayStr, quranListeningMinutes: 0, dhikrCount: 0 }
            });
            logger.debug('Spiritual tracker initialized with empty data');
        }
        if (!this.context.globalState.get(STATS_KEY)) {
            this.context.globalState.update(STATS_KEY, { ...EMPTY_STATS });
            logger.debug('Tracker stats initialized');
        }
    }

    /**
     * Get (or create) today's data entry.
     * NOTE: Call saveTrackerData() after mutating the returned object.
     */
    private getTodayEntry(data: TrackerDataMap): DailyTrackerData {
        const todayStr = this.getHabitTrackingDate(); // Use Islamic date

        if (!data[todayStr]) {
            data[todayStr] = { date: todayStr, quranListeningMinutes: 0, dhikrCount: 0 };
        }
        return data[todayStr];
    }

    /**
     * Recalculate and persist all stats from the raw data map.
     */
    private async updateStats(data: TrackerDataMap): Promise<void> {
        let totalQuranMinutes = 0;
        let totalDhikrCount = 0;
        const activeDates: string[] = [];

        for (const [date, entry] of Object.entries(data)) {
            if (entry.quranListeningMinutes > 0 || entry.dhikrCount > 0) {
                activeDates.push(date);
                totalQuranMinutes += entry.quranListeningMinutes;
                totalDhikrCount += entry.dhikrCount;
            }
        }

        const currentStreak = this.calculateCurrentStreak(activeDates);
        const longestStreak = this.calculateLongestStreak(activeDates);

        // Preserve longestStreak if it was ever higher (handles data deletion edge-case)
        const existing = this.getStats();

        const updated: TrackerStats = {
            totalQuranMinutes,
            totalDhikrCount,
            currentStreak,
            longestStreak: Math.max(longestStreak, existing.longestStreak),
            lastActivityDate: this.getHabitTrackingDate(), // Update with last activity using Islamic date
            totalActiveDays: activeDates.length
        };

        await this.saveStats(updated);
        logger.debug('Tracker stats updated:', updated);
    }

    /**
     * Calculate the current consecutive streak ending today (or yesterday).
     *
     * The streak is valid if today OR yesterday has activity, so a user
     * who hasn't recorded yet today doesn't lose their streak.
     */
    private calculateCurrentStreak(activeDates: string[]): number {
        if (activeDates.length === 0) { return 0; }
        const activeSet = new Set(activeDates);

        const todayStr = this.getHabitTrackingDate(); // Calculate streak from Islamic day
        const yesterdayStr = this.getPreviousDateString(todayStr, 1);

        // Continuation is allowed if there's activity today or yesterday
        if (!activeSet.has(todayStr) && !activeSet.has(yesterdayStr)) {
            return 0; 
        }

        let streak = 0;
        let currentCheckStr = activeSet.has(todayStr) ? todayStr : yesterdayStr;

        for (let i = 0; i < 365; i++) {
            if (activeSet.has(currentCheckStr)) {
                streak++;
                currentCheckStr = this.getPreviousDateString(currentCheckStr, 1);
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * Calculate the longest streak ever recorded.
     * Sorts dates ascending and walks forward, counting consecutive days.
     */
    private calculateLongestStreak(activeDates: string[]): number {
        if (activeDates.length === 0) { return 0; }

        // Sort ascending (earliest first)
        const sorted = [...activeDates].sort();

        let maxStreak = 1;
        let currentStreak = 1;

        for (let i = 1; i < sorted.length; i++) {
            const prev = new Date(`${sorted[i - 1]}T12:00:00`);
            const current = new Date(`${sorted[i]}T12:00:00`);
            const diff = Math.round((current.getTime() - prev.getTime()) / MS_PER_DAY);

            if (diff === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }

        return maxStreak;
    }

    // ── Public API ────────────────────────────

    /**
     * Record Quran listening time for today
     */
    public async addQuranListeningTime(minutes: number): Promise<void> {
        if (minutes <= 0) {
            logger.warn('Invalid quran listening time:', minutes);
            return;
        }

        const data = this.getTrackerData();
        const today = this.getTodayEntry(data);
        today.quranListeningMinutes += minutes;

        await this.saveTrackerData(data);
        await this.updateStats(data);
        logger.debug(`Added ${minutes} minutes of Quran listening`);
    }

    /**
     * Increment Dhikr counter (prayers upon the Prophet ﷺ)
     */
    public async incrementDhikr(count: number = 1): Promise<void> {
        if (count <= 0) {
            logger.warn('Invalid dhikr count:', count);
            return;
        }

        const data = this.getTrackerData();
        const today = this.getTodayEntry(data);
        today.dhikrCount += count;

        await this.saveTrackerData(data);
        await this.updateStats(data);
        logger.debug(`Incremented Dhikr by ${count}`);
    }

    /**
     * Get today's statistics
     */
    public getTodayStats(): { date: string; quranMinutes: number; dhikrCount: number } {
        const data = this.getTrackerData();
        const today = this.getTodayEntry(data); // Automatically gets Islamic day data
        return {
            date: today.date,
            quranMinutes: today.quranListeningMinutes,
            dhikrCount: today.dhikrCount
        };
    }

    /**
     * Get all-time statistics
     */
    public getAllTimeStats(): TrackerStats {
        return this.getStats();
    }

    /**
     * Get tracker data for a specific date (YYYY-MM-DD), or null
     */
    public getDataForDate(dateStr: string): DailyTrackerData | null {
        return this.getTrackerData()[dateStr] ?? null;
    }

    /**
     * Get tracker data for the last N days (most recent first)
     * Days with no entry are included as zeroed-out records for consistent charting
     */
    public getLastNDays(days: number): DailyTrackerData[] {
        const data = this.getTrackerData();
        const result: DailyTrackerData[] = [];
        const todayStr = this.getHabitTrackingDate(); // Display days based on Islamic timing

        for (let i = 0; i < days; i++) {
            const dateStr = this.getPreviousDateString(todayStr, i);
            result.push(data[dateStr] ?? { date: dateStr, quranListeningMinutes: 0, dhikrCount: 0 });
        }

        return result;
    }

    /**
     * Get completion status for today
     */
    public getTodayCompletionStatus(): {
        hasQuranActivity: boolean;
        hasDhikrActivity: boolean;
        hasAnyActivity: boolean;
    } {
        const today = this.getTodayStats();
        return {
            hasQuranActivity: today.quranMinutes > 0,
            hasDhikrActivity: today.dhikrCount > 0,
            hasAnyActivity: today.quranMinutes > 0 || today.dhikrCount > 0
        };
    }

    /**
     * Reset all tracker data. Use with caution!
     */
    public async resetAllData(): Promise<void> {
        await this.context.globalState.update(TRACKER_KEY, {});
        await this.context.globalState.update(STATS_KEY, { ...EMPTY_STATS });
        logger.info('All tracker data has been reset');
    }

    /**
     * Export all tracker data as a plain object (for backup or debugging)
     */
    public exportData(): { data: TrackerDataMap; stats: TrackerStats; exportedAt: string } {
        return {
            data: this.getTrackerData(),
            stats: this.getStats(),
            exportedAt: new Date().toISOString()
        };
    }
}