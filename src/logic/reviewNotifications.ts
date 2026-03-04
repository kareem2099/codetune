import * as vscode from 'vscode';
import { logger } from '../utils/Logger';

interface NotificationSettings {
    enableReviewNotifications: boolean;
    enableSponsorNotifications: boolean;
}

interface UsageMilestones {
    daysUsed: number;
    totalSurahsPlayed: number;
    totalDhikrCounts: number;
    firstUseDate: number;
    lastReviewPromptDate: number;
    lastSponsorPromptDate: number;
    reviewPromptsShown: number;
    sponsorPromptsShown: number;
}

export class ReviewNotificationManager {
    private settings: NotificationSettings = {
        enableReviewNotifications: true,
        enableSponsorNotifications: true
    };
    private milestones: UsageMilestones = {
        daysUsed: 1,
        totalSurahsPlayed: 0,
        totalDhikrCounts: 0,
        firstUseDate: Date.now(),
        lastReviewPromptDate: 0,
        lastSponsorPromptDate: 0,
        reviewPromptsShown: 0,
        sponsorPromptsShown: 0
    };
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadSettings();
        this.loadMilestones();
        this.checkForNotifications();
    }

    private loadSettings() {
        try {
            const config = vscode.workspace.getConfiguration('codeTune');
            this.settings = {
                enableReviewNotifications: config.get('enableReviewNotifications', true),
                enableSponsorNotifications: config.get('enableSponsorNotifications', true)
            };
            logger.info('Review notification settings loaded:', this.settings);
        } catch (error) {
            logger.warn('Failed to load notification settings:', error);
            this.settings = {
                enableReviewNotifications: true,
                enableSponsorNotifications: true
            };
        }
    }

    private loadMilestones() {
        try {
            const stored = this.context.globalState.get<UsageMilestones>('codeTune.usageMilestones');
            const now = Date.now();
            const today = new Date().toDateString();

            if (stored && stored.firstUseDate) {
                this.milestones = stored;
                // Update days used
                const daysSinceFirstUse = Math.floor((now - stored.firstUseDate) / (1000 * 60 * 60 * 24)) + 1;
                this.milestones.daysUsed = daysSinceFirstUse;
            } else {
                // First time setup
                this.milestones = {
                    daysUsed: 1,
                    totalSurahsPlayed: 0,
                    totalDhikrCounts: 0,
                    firstUseDate: now,
                    lastReviewPromptDate: 0,
                    lastSponsorPromptDate: 0,
                    reviewPromptsShown: 0,
                    sponsorPromptsShown: 0
                };
            }

            this.saveMilestones();
        } catch (error) {
            logger.warn('Failed to load usage milestones:', error);
            this.milestones = {
                daysUsed: 1,
                totalSurahsPlayed: 0,
                totalDhikrCounts: 0,
                firstUseDate: Date.now(),
                lastReviewPromptDate: 0,
                lastSponsorPromptDate: 0,
                reviewPromptsShown: 0,
                sponsorPromptsShown: 0
            };
        }
    }

    private saveMilestones() {
        try {
            this.context.globalState.update('codeTune.usageMilestones', this.milestones);
        } catch (error) {
            logger.warn('Failed to save usage milestones:', error);
        }
    }

    public updateUsageMetrics(action: 'surahPlayed' | 'dhikrIncremented') {
        const now = Date.now();

        switch (action) {
            case 'surahPlayed':
                this.milestones.totalSurahsPlayed++;
                break;
            case 'dhikrIncremented':
                this.milestones.totalDhikrCounts++;
                break;
        }

        this.saveMilestones();
        this.checkForNotifications();
    }

    private checkForNotifications() {
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const sevenDays = 7 * oneDay;
        const fourteenDays = 14 * oneDay;

        // Review notification logic
        if (this.settings.enableReviewNotifications) {
            const shouldShowReviewPrompt = this.shouldShowReviewPrompt(now, oneDay, sevenDays);
            if (shouldShowReviewPrompt) {
                this.showReviewNotification();
            }
        }

        // Sponsor notification logic
        if (this.settings.enableSponsorNotifications) {
            const shouldShowSponsorPrompt = this.shouldShowSponsorPrompt(now, fourteenDays);
            if (shouldShowSponsorPrompt) {
                this.showSponsorNotification();
            }
        }
    }

    private shouldShowReviewPrompt(now: number, oneDay: number, sevenDays: number): boolean {
        // Don't show if user has been prompted too many times
        if (this.milestones.reviewPromptsShown >= 3) { return false; }

        // Don't show if prompted in the last day
        if (now - this.milestones.lastReviewPromptDate < oneDay) { return false; }

        // Show after 7+ days AND (10+ surahs played OR 50+ dhikr counts)
        const daysCondition = this.milestones.daysUsed >= 7;
        const usageCondition = this.milestones.totalSurahsPlayed >= 10 || this.milestones.totalDhikrCounts >= 50;

        return daysCondition && usageCondition;
    }

    private shouldShowSponsorPrompt(now: number, fourteenDays: number): boolean {
        // Don't show if user has been prompted too many times
        if (this.milestones.sponsorPromptsShown >= 2) { return false; }

        // Don't show if prompted in the last day
        if (now - this.milestones.lastSponsorPromptDate < (24 * 60 * 60 * 1000)) { return false; }

        // Show after 14+ days AND significant usage
        const daysCondition = this.milestones.daysUsed >= 14;
        const usageCondition = this.milestones.totalSurahsPlayed >= 25 || this.milestones.totalDhikrCounts >= 100;

        return daysCondition && usageCondition;
    }

    private async showReviewNotification() {
        const now = Date.now();

        // Update prompt tracking
        this.milestones.lastReviewPromptDate = now;
        this.milestones.reviewPromptsShown++;
        this.saveMilestones();

        // Show notification
        const result = await vscode.window.showInformationMessage(
            '⭐ Enjoying CodeTune\'s Islamic features? Your review helps more Muslims discover this blessed tool!',
            '⭐ Write Review',
            'Maybe Later'
        );

        if (result === '⭐ Write Review') {
            vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=FreeRave.codetune&ssr=false#review-details'));
        }
    }

    private async showSponsorNotification() {
        const now = Date.now();

        // Update prompt tracking
        this.milestones.lastSponsorPromptDate = now;
        this.milestones.sponsorPromptsShown++;
        this.saveMilestones();

        // Show notification
        const result = await vscode.window.showInformationMessage(
            '💝 May Allah bless your spiritual journey! Support CodeTune\'s development to bring more Islamic tools to the Ummah.',
            '💝 Donate Now',
            'Later'
        );

        if (result === '💝 Donate Now') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/sponsors/kareem2099'));
        }
    }

    public updateSettings(newSettings: Partial<NotificationSettings>) {
        this.settings = { ...this.settings, ...newSettings };
    }

    public dispose() {
        // Clean up if needed
    }
}
