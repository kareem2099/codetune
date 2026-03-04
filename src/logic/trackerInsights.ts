import { SpiritualTracker } from '../utils/SpiritualTracker';
import { logger } from '../utils/Logger';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface SpiritualStats {
    totalActiveDays: number;
    currentStreak: number;
    longestStreak: number;
    totalQuranMinutes: number;
    totalDhikrCount: number;
}

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: (stats: SpiritualStats) => boolean;
    unlocked: boolean;
}

interface DailyGoal {
    name: string;
    targetValue: number;
    currentValue: number;
    unit: string;
    completed: boolean;
    percentage: number;
}

interface StreakInfo {
    currentStreak: number;
    longestStreak: number;
    nextMilestone: number;
    daysUntilMilestone: number;
    isOnTrack: boolean;
    milestoneLabel: string;
}

interface WeeklyStats {
    totalQuranMinutes: number;
    totalDhikrCount: number;
    activeDays: number;
    averageQuranPerDay: number;
    averageDhikrPerDay: number;
}

interface ProgressSummary {
    today: {
        quranMinutes: number;
        dhikrCount: number;
    };
    allTime: {
        totalQuranMinutes: number;
        totalDhikrCount: number;
        totalActiveDays: number;
    };
    streak: StreakInfo;
    dailyGoals: DailyGoal[];
    unlockedAchievements: number;
    totalAchievements: number;
    motivationalMessage: string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const DAILY_QURAN_TARGET_MINUTES = 15;
const DAILY_DHIKR_TARGET = 100;

const STREAK_MILESTONES = [7, 30, 100, 365] as const;

// ─────────────────────────────────────────────
// Class
// ─────────────────────────────────────────────

export class TrackerInsights {
    private tracker: SpiritualTracker;
    private achievements: Achievement[] = [];

    constructor(tracker: SpiritualTracker) {
        this.tracker = tracker;
        this.initializeAchievements();
        logger.info('TrackerInsights initialized');
    }

    // ── Private ───────────────────────────────

    /**
     * Initialize achievement definitions.
     * Conditions use the typed SpiritualStats interface instead of `any`.
     */
    private initializeAchievements(): void {
        this.achievements = [
            {
                id: 'first_step',
                name: 'First Step',
                description: 'Record your first spiritual activity',
                icon: '🌱',
                condition: (s) => s.totalActiveDays >= 1,
                unlocked: false
            },
            {
                id: 'week_streak',
                name: 'One Week Warrior',
                description: 'Maintain a 7-day streak',
                icon: '🔥',
                condition: (s) => s.currentStreak >= 7,
                unlocked: false
            },
            {
                id: 'month_streak',
                name: 'Month Master',
                description: 'Maintain a 30-day streak',
                icon: '👑',
                condition: (s) => s.currentStreak >= 30,
                unlocked: false
            },
            {
                id: 'quran_devotee',
                name: 'Quran Devotee',
                description: 'Listen to 100+ minutes of Quran',
                icon: '📖',
                condition: (s) => s.totalQuranMinutes >= 100,
                unlocked: false
            },
            {
                id: 'dhikr_champion',
                name: 'Dhikr Champion',
                description: 'Complete 1000+ Dhikr',
                icon: '💫',
                condition: (s) => s.totalDhikrCount >= 1000,
                unlocked: false
            },
            {
                id: 'consistent_learner',
                name: 'Consistent Learner',
                description: 'Stay active for 50 days',
                icon: '📚',
                condition: (s) => s.totalActiveDays >= 50,
                unlocked: false
            },
            {
                id: 'dedicated_soul',
                name: 'Dedicated Soul',
                description: 'Achieve 100-day streak',
                icon: '🌟',
                condition: (s) => s.currentStreak >= 100,
                unlocked: false
            },
            {
                id: 'quran_master',
                name: 'Quran Master',
                description: 'Listen to 500+ minutes of Quran',
                icon: '🏆',
                condition: (s) => s.totalQuranMinutes >= 500,
                unlocked: false
            }
        ];
    }

    /**
     * Get the next streak milestone above the current streak.
     */
    private getNextMilestone(currentStreak: number): number {
        return STREAK_MILESTONES.find(m => m > currentStreak) ?? STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
    }

    private getMilestoneLabel(days: number): string {
        const labels: Record<number, string> = {
            7: '🔥 One Week Warrior',
            30: '👑 Month Master',
            100: '🌟 Dedicated Soul',
            365: '💎 Year Round Champion'
        };
        return labels[days] ?? 'Keep Going!';
    }

    // ── Public ────────────────────────────────

    /**
     * Calculate daily goals with progress percentages
     */
    public calculateDailyGoals(): DailyGoal[] {
        const today = this.tracker.getTodayStats();

        return [
            {
                name: 'Quran Listening',
                targetValue: DAILY_QURAN_TARGET_MINUTES,
                currentValue: today.quranMinutes,
                unit: 'minutes',
                completed: today.quranMinutes >= DAILY_QURAN_TARGET_MINUTES,
                percentage: Math.min((today.quranMinutes / DAILY_QURAN_TARGET_MINUTES) * 100, 100)
            },
            {
                name: 'Dhikr (Prayers upon Prophet)',
                targetValue: DAILY_DHIKR_TARGET,
                currentValue: today.dhikrCount,
                unit: 'times',
                completed: today.dhikrCount >= DAILY_DHIKR_TARGET,
                percentage: Math.min((today.dhikrCount / DAILY_DHIKR_TARGET) * 100, 100)
            }
        ];
    }

    /**
     * Get streak information with the next milestone
     */
    public getStreakInfo(): StreakInfo {
        const stats = this.tracker.getAllTimeStats() as SpiritualStats;
        const completionStatus = this.tracker.getTodayCompletionStatus();
        const nextMilestone = this.getNextMilestone(stats.currentStreak);

        return {
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            nextMilestone,
            daysUntilMilestone: Math.max(nextMilestone - stats.currentStreak, 0),
            isOnTrack: completionStatus.hasAnyActivity,
            milestoneLabel: this.getMilestoneLabel(nextMilestone)
        };
    }

    /**
     * Get only the achievements the user has unlocked
     */
    public getUnlockedAchievements(): Achievement[] {
        const stats = this.tracker.getAllTimeStats() as SpiritualStats;
        return this.achievements
            .filter(a => a.condition(stats))
            .map(a => ({ ...a, unlocked: true }));
    }

    /**
     * Get all achievements, each annotated with its current unlock status
     */
    public getAllAchievements(): Achievement[] {
        const stats = this.tracker.getAllTimeStats() as SpiritualStats;
        return this.achievements.map(a => ({
            ...a,
            unlocked: a.condition(stats)
        }));
    }

    /**
     * Get the next achievement the user has not yet unlocked, or null if all are unlocked
     */
    public getNextAchievement(): Achievement | null {
        const stats = this.tracker.getAllTimeStats() as SpiritualStats;
        return this.achievements.find(a => !a.condition(stats)) ?? null;
    }

    /**
     * Generate a motivational message based on current activity
     */
    public getMotivationalMessage(): string {
        const streak = this.getStreakInfo();
        const completionStatus = this.tracker.getTodayCompletionStatus();

        if (streak.currentStreak === 0) {
            return '🌅 Start your spiritual journey today! Record your first activity.';
        }
        if (streak.currentStreak === 1) {
            return '✨ Amazing! You\'ve taken the first step. Keep it going!';
        }
        if (streak.currentStreak >= 100) {
            return `🌟 Incredible! You\'ve reached a ${streak.currentStreak}-day streak! You are truly dedicated!`;
        }
        if (streak.currentStreak >= 30) {
            return `👑 Outstanding! ${streak.currentStreak}-day streak! You\'re a Month Master! ${streak.daysUntilMilestone} days to Dedicated Soul!`;
        }
        if (streak.currentStreak >= 7) {
            return `🔥 Fantastic! You\'ve maintained a ${streak.currentStreak}-day streak! Just ${streak.daysUntilMilestone} days to Month Master!`;
        }

        // Streak 2-6: fallthrough to daily-completion messages
        if (!completionStatus.hasAnyActivity) {
            return '💪 You haven\'t recorded any activity today yet. Start now!';
        }
        if (completionStatus.hasQuranActivity && !completionStatus.hasDhikrActivity) {
            return '📖 Great Quran listening! Now try some Dhikr to complete your day.';
        }
        if (completionStatus.hasDhikrActivity && !completionStatus.hasQuranActivity) {
            return '✨ Wonderful Dhikr! Listen to some Quran to round out your day.';
        }

        return '🎉 You\'ve completed today\'s activities! Well done!';
    }

    /**
     * Get a full progress summary for the dashboard
     */
    public getProgressSummary(): ProgressSummary {
        const stats = this.tracker.getAllTimeStats() as SpiritualStats;
        const todayStats = this.tracker.getTodayStats();

        return {
            today: {
                quranMinutes: todayStats.quranMinutes,
                dhikrCount: todayStats.dhikrCount
            },
            allTime: {
                totalQuranMinutes: stats.totalQuranMinutes,
                totalDhikrCount: stats.totalDhikrCount,
                totalActiveDays: stats.totalActiveDays
            },
            streak: this.getStreakInfo(),
            dailyGoals: this.calculateDailyGoals(),
            unlockedAchievements: this.getUnlockedAchievements().length,
            totalAchievements: this.achievements.length,
            motivationalMessage: this.getMotivationalMessage()
        };
    }

    /**
     * Get today's progress percentage for a specific metric
     */
    public getProgressPercentage(metric: 'quran' | 'dhikr'): number {
        const today = this.tracker.getTodayStats();
        if (metric === 'quran') {
            return Math.min((today.quranMinutes / DAILY_QURAN_TARGET_MINUTES) * 100, 100);
        }
        return Math.min((today.dhikrCount / DAILY_DHIKR_TARGET) * 100, 100);
    }

    /**
     * Calculate statistics for the last 7 days
     */
    public getWeeklyStats(): WeeklyStats {
        const weekData = this.tracker.getLastNDays(7);

        let totalQuranMinutes = 0;
        let totalDhikrCount = 0;
        let activeDays = 0;

        for (const day of weekData) {
            totalQuranMinutes += day.quranListeningMinutes;
            totalDhikrCount += day.dhikrCount;
            if (day.quranListeningMinutes > 0 || day.dhikrCount > 0) {
                activeDays++;
            }
        }

        return {
            totalQuranMinutes,
            totalDhikrCount,
            activeDays,
            averageQuranPerDay: activeDays > 0 ? Math.round(totalQuranMinutes / activeDays) : 0,
            averageDhikrPerDay: activeDays > 0 ? Math.round(totalDhikrCount / activeDays) : 0
        };
    }
}