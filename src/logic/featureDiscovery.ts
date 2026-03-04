// src/logic/featureDiscovery.ts
import * as vscode from 'vscode';
import { logger } from '../utils/Logger';

export interface FeatureInfo {
    id: string;
    name: string;
    description: string;
    version: string;    // version in which the feature was introduced
    icon: string;
}

const SEEN_KEY = 'codeTune_seenFeatures';

// Registry of all features, in the order they were introduced
const FEATURE_REGISTRY: FeatureInfo[] = [
    // v1.0.x baseline
    { id: 'quran_player', name: 'Quran Player', description: 'Stream Quran audio directly in VS Code.', version: '1.0.0', icon: '🎵' },
    { id: 'prayer_times', name: 'Prayer Times', description: 'Live prayer times calculated locally with Adhan.', version: '1.0.0', icon: '🕌' },
    { id: 'islamic_reminders', name: 'Islamic Reminders', description: 'Hadiths, Adhkar, and Wisdom notifications while coding.', version: '1.0.0', icon: '📖' },
    { id: 'salawat_counter', name: 'Salawat Counter', description: 'Track your daily Salawat upon the Prophet ﷺ.', version: '1.0.0', icon: '✨' },
    { id: 'friday_reminders', name: 'Friday Reminders', description: 'Special Surah Al-Kahf and Salawat reminders on Fridays.', version: '1.0.0', icon: '🌟' },
    { id: 'prayer_tracker', name: 'Prayer Tracker', description: 'Track your daily prayers and maintain a streak.', version: '1.0.0', icon: '📅' },

    // v1.1.0 features
    { id: 'performance_monitoring', name: 'Performance Monitoring', description: 'Real-time load and memory metrics for the extension.', version: '1.1.0', icon: '🚀' },
    { id: 'smart_notifications', name: 'Smart Focus Mode', description: 'Reminders pause automatically while you\'re coding.', version: '1.1.0', icon: '🎯' },
    { id: 'usage_analytics', name: 'Usage Analytics', description: 'Privacy-first, opt-in local usage statistics.', version: '1.1.0', icon: '📊' },
    { id: 'backup_restore', name: 'Backup & Restore', description: 'Auto-backup all your data and restore it anytime.', version: '1.1.0', icon: '💾' },
    { id: 'theme_engine', name: 'Theme Engine', description: 'Choose from 4 color themes or build a custom one.', version: '1.1.0', icon: '🎨' },
    { id: 'advanced_settings', name: 'Advanced Settings', description: 'Import/export your config and reset to defaults.', version: '1.1.0', icon: '⚙️' },
    { id: 'error_recovery', name: 'Error Recovery', description: 'Automatic retry logic and friendly error messages.', version: '1.1.0', icon: '🛡️' },
];

export class FeatureDiscovery {
    private static _instance: FeatureDiscovery;
    private context!: vscode.ExtensionContext;

    private constructor() { }

    public static get instance(): FeatureDiscovery {
        if (!FeatureDiscovery._instance) {
            FeatureDiscovery._instance = new FeatureDiscovery();
        }
        return FeatureDiscovery._instance;
    }

    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        logger.info('[FeatureDiscovery] Initialized.');
    }

    /**
     * Returns features introduced after `lastSeenVersion`.
     * If lastSeenVersion is undefined/null, returns ALL features.
     */
    public getNewFeatures(lastSeenVersion?: string | null): FeatureInfo[] {
        if (!lastSeenVersion) { return [...FEATURE_REGISTRY]; }

        const last = this.parseVersion(lastSeenVersion);
        return FEATURE_REGISTRY.filter(f => {
            const fv = this.parseVersion(f.version);
            return this.compareVersions(fv, last) > 0;
        });
    }

    /**
     * Returns features introduced in exactly the given version.
     */
    public getFeaturesForVersion(version: string): FeatureInfo[] {
        return FEATURE_REGISTRY.filter(f => f.version === version);
    }

    /** Get all registered features. */
    public getAllFeatures(): FeatureInfo[] {
        return [...FEATURE_REGISTRY];
    }

    /** Mark a feature as seen by the user. */
    public markSeen(featureId: string): void {
        if (!this.context) { return; }
        const seen = this.getSeenIds();
        if (!seen.includes(featureId)) {
            seen.push(featureId);
            this.context.globalState.update(SEEN_KEY, seen);
        }
    }

    /** Mark a list of features as seen. */
    public markAllSeen(features: FeatureInfo[]): void {
        features.forEach(f => this.markSeen(f.id));
    }

    /** Returns features the user has not yet been shown. */
    public getUnseenFeatures(): FeatureInfo[] {
        const seen = this.getSeenIds();
        return FEATURE_REGISTRY.filter(f => !seen.includes(f.id));
    }

    /** Whether a specific feature has been seen. */
    public isSeen(featureId: string): boolean {
        return this.getSeenIds().includes(featureId);
    }

    private getSeenIds(): string[] {
        if (!this.context) { return []; }
        return this.context.globalState.get<string[]>(SEEN_KEY, []);
    }

    private parseVersion(v: string): [number, number, number] {
        const parts = v.split('.').map(Number);
        return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    }

    private compareVersions(a: [number, number, number], b: [number, number, number]): number {
        for (let i = 0; i < 3; i++) {
            if (a[i] !== b[i]) { return a[i] > b[i] ? 1 : -1; }
        }
        return 0;
    }
}
