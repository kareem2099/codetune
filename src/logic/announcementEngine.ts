// src/logic/announcementEngine.ts
import * as vscode from 'vscode';
import { FeatureDiscovery } from './featureDiscovery';
import { logger } from '../utils/Logger';

const LAST_VERSION_KEY = 'codeTune_lastSeenVersion';
const LAST_TIP_DAY_KEY = 'codeTune_lastTipDay';

const TIPS: string[] = [
    '🎵 Press Ctrl+Shift+Q to quickly launch the Quran player from anywhere in VS Code.',
    '📖 Enable specific content types in Settings — show only Hadiths, or only Adhkar.',
    '🕌 Prayer times are calculated offline using the Adhan library — no internet needed.',
    '🎯 Focus Mode automatically pauses reminders while you\'re actively coding.',
    '💾 Use Backup & Restore to never lose your prayer streaks or Dhikr history.',
    '🔥 Maintain your spiritual streak by recording at least one activity per day.',
    '🌙 Switch to the Gold theme for a warm, Ramadan-inspired feel.',
    '📊 Enable Analytics (opt-in) to see which features you use most.',
    '⚙️ You can export and import your settings — useful when switching machines.',
    '🌍 CodeTune supports 5 languages: English, Arabic, Russian, French, and Spanish.',
    '✨ Every Salawat upon the Prophet ﷺ you send is counted and stored locally.',
    '📅 Track your prayers every day to build a streak and earn achievements!'
];

export class AnnouncementEngine {
    private static _instance: AnnouncementEngine;
    private context!: vscode.ExtensionContext;

    private constructor() { }

    public static get instance(): AnnouncementEngine {
        if (!AnnouncementEngine._instance) {
            AnnouncementEngine._instance = new AnnouncementEngine();
        }
        return AnnouncementEngine._instance;
    }

    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        logger.info('[AnnouncementEngine] Initialized.');
    }

    /**
     * Call this on every extension activation.
     * Checks for version updates and shows a "What's New" notification if needed.
     * Then, if it's a new day, shows a tip of the day.
     */
    public async runStartupChecks(): Promise<void> {
        if (!this.context) { return; }

        const newFeaturesShown = await this.checkVersionUpdate();
        if (!newFeaturesShown) {
            await this.checkDailyTip();
        }
    }

    /**
     * Check if the extension was just updated and show a "What's New" notification.
     * Returns true if a notification was shown.
     */
    public async checkVersionUpdate(): Promise<boolean> {
        if (!this.context) { return false; }

        const currentVersion = vscode.extensions.getExtension('FreeRave.codetune')?.packageJSON?.version ?? '1.2.0';
        const lastVersion = this.context.globalState.get<string | null>(LAST_VERSION_KEY, null);

        if (lastVersion === currentVersion) { return false; }

        // Update stored version
        await this.context.globalState.update(LAST_VERSION_KEY, currentVersion);

        const newFeatures = FeatureDiscovery.instance.getNewFeatures(lastVersion);
        FeatureDiscovery.instance.markAllSeen(newFeatures);

        if (newFeatures.length === 0) { return false; }

        const featureList = newFeatures.slice(0, 4).map(f => `${f.icon} ${f.name}`).join(', ');
        const moreCount = newFeatures.length > 4 ? ` +${newFeatures.length - 4} more` : '';

        const action = await vscode.window.showInformationMessage(
            `🎉 CodeTune v${currentVersion} is here! New: ${featureList}${moreCount}`,
            'View Details',
            'Dismiss'
        );

        if (action === 'View Details') {
            vscode.commands.executeCommand('codeTuneMain.focus');
        }

        logger.info(`[AnnouncementEngine] Shown "What's New" for v${currentVersion}`);
        return true;
    }

    /**
     * Show a Tip of the Day — at most once per calendar day.
     * Suppressed if it's already been shown today.
     */
    public async checkDailyTip(): Promise<void> {
        if (!this.context) { return; }

        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastTip = this.context.globalState.get<string | null>(LAST_TIP_DAY_KEY, null);

        if (lastTip === todayStr) { return; } // Already shown today

        const tip = this.pickTip();
        await this.context.globalState.update(LAST_TIP_DAY_KEY, todayStr);

        vscode.window.showInformationMessage(`💡 CodeTune Tip: ${tip}`, 'Got it');
        logger.info(`[AnnouncementEngine] Daily tip shown: ${tip}`);
    }

    /**
     * Manually trigger the "What's New" announcement (e.g., from the UI).
     */
    public async showWhatsNew(): Promise<void> {
        if (!this.context) { return; }
        const version = vscode.extensions.getExtension('FreeRave.codetune')?.packageJSON?.version ?? '1.2.0';
        const allFeatures = FeatureDiscovery.instance.getFeaturesForVersion(version);
        const list = allFeatures.map(f => `${f.icon} **${f.name}** — ${f.description}`).join('\n\n');

        const msg = allFeatures.length > 0
            ? `✨ What's new in CodeTune v${version}:\n\n${list}`
            : `You are on CodeTune v${version} — up to date!`;

        vscode.window.showInformationMessage(msg, 'Nice!');
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private pickTip(): string {
        const idx = Math.floor(Math.random() * TIPS.length);
        return TIPS[idx];
    }

    /** Check if tips have been shown today (for UI status display). */
    public hasTipShownToday(): boolean {
        if (!this.context) { return false; }
        const todayStr = new Date().toISOString().split('T')[0];
        return this.context.globalState.get<string | null>(LAST_TIP_DAY_KEY, null) === todayStr;
    }

    /** Check if the current version is "new" (not yet seen). */
    public isNewVersion(): boolean {
        if (!this.context) { return false; }
        const current = vscode.extensions.getExtension('FreeRave.codetune')?.packageJSON?.version ?? '1.2.0';
        return this.context.globalState.get<string | null>(LAST_VERSION_KEY, null) !== current;
    }
}
