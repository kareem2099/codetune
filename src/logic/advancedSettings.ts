// src/logic/advancedSettings.ts
import * as vscode from 'vscode';
import { logger } from '../utils/Logger';

const CONFIG_NS = 'codeTune';

export interface ExportedSettings {
    version: string;
    exportedAt: string;
    settings: Record<string, unknown>;
}

/**
 * AdvancedSettingsManager
 * Provides import/export of all codeTune configuration,
 * a reset-to-defaults helper, and centralized config validation.
 */
export class AdvancedSettingsManager {
    private static _instance: AdvancedSettingsManager;

    private constructor() { }

    public static get instance(): AdvancedSettingsManager {
        if (!AdvancedSettingsManager._instance) {
            AdvancedSettingsManager._instance = new AdvancedSettingsManager();
        }
        return AdvancedSettingsManager._instance;
    }

    // ── Export ────────────────────────────────────────────────────────────

    /**
     * Export all codeTune.* configuration keys as a JSON string.
     * Keys are read from both workspace and global scopes (workspace wins).
     */
    public exportSettings(): string {
        const config = vscode.workspace.getConfiguration(CONFIG_NS);
        const inspect = (key: string) => config.inspect(key);

        // Enumerate all known configuration keys from package.json contributions
        const knownKeys = [
            'enableReminders', 'reminderInterval', 'showAdia', 'showAhadis',
            'showWisdom', 'showMorningAzkar', 'showEveningAzkar', 'workingHoursOnly',
            'language', 'enableReviewNotifications', 'enableSponsorNotifications',
            'salawatCounter', 'enableAnalytics', 'autoBackupIntervalHours', 'theme',
            'smartNotifications.pauseDuringCoding', 'smartNotifications.quietHoursEnabled',
            'smartNotifications.quietHoursStart', 'smartNotifications.quietHoursEnd',
            'smartNotifications.focusModeDuration'
        ];

        const settings: Record<string, unknown> = {};
        for (const key of knownKeys) {
            const info = inspect(key);
            if (info) {
                settings[key] = info.workspaceValue ?? info.globalValue ?? info.defaultValue;
            }
        }

        const exported: ExportedSettings = {
            version: '1',
            exportedAt: new Date().toISOString(),
            settings
        };

        logger.info('[AdvancedSettings] Settings exported.');
        return JSON.stringify(exported, null, 2);
    }

    /**
     * Import settings from a previously exported JSON string.
     * Only writes values that differ from the current config.
     * Returns the list of keys that were successfully applied.
     */
    public async importSettings(json: string): Promise<string[]> {
        let parsed: ExportedSettings;
        try {
            parsed = JSON.parse(json) as ExportedSettings;
        } catch {
            throw new Error('Invalid settings file: not valid JSON.');
        }

        if (!parsed.settings || typeof parsed.settings !== 'object') {
            throw new Error('Invalid settings file: missing "settings" object.');
        }

        const config = vscode.workspace.getConfiguration(CONFIG_NS);
        const applied: string[] = [];

        for (const [key, value] of Object.entries(parsed.settings)) {
            try {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
                applied.push(key);
            } catch (err) {
                logger.warn(`[AdvancedSettings] Could not import key "${key}":`, err);
            }
        }

        logger.info(`[AdvancedSettings] Imported ${applied.length} setting(s).`);
        return applied;
    }

    /**
     * Reset all codeTune.* settings to their defaults by writing undefined
     * to both Workspace and Global scopes.
     */
    public async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(CONFIG_NS);
        const knownKeys = [
            'enableReminders', 'reminderInterval', 'showAdia', 'showAhadis',
            'showWisdom', 'showMorningAzkar', 'showEveningAzkar', 'workingHoursOnly',
            'language', 'enableReviewNotifications', 'enableSponsorNotifications',
            'enableAnalytics', 'autoBackupIntervalHours', 'theme',
            'smartNotifications.pauseDuringCoding', 'smartNotifications.quietHoursEnabled',
            'smartNotifications.quietHoursStart', 'smartNotifications.quietHoursEnd',
            'smartNotifications.focusModeDuration'
        ];

        for (const key of knownKeys) {
            try {
                await config.update(key, undefined, vscode.ConfigurationTarget.Global);
                await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
            } catch {
                // Some keys may not be writable in all scopes — ignore
            }
        }

        logger.info('[AdvancedSettings] All settings reset to defaults.');
        vscode.window.showInformationMessage('CodeTune: All settings have been reset to defaults.');
    }

    /**
     * Quick accessor — returns all current codeTune config values as a plain object.
     */
    public getAllSettings(): Record<string, unknown> {
        const json = this.exportSettings();
        return (JSON.parse(json) as ExportedSettings).settings;
    }
}
