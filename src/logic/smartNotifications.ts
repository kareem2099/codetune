import * as vscode from 'vscode';
import { IslamicRemindersManager } from './islamicReminders';
import { logger } from '../utils/Logger';

interface SmartNotificationSettings {
    pauseDuringCoding: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: number;
    quietHoursEnd: number;
    focusModeDuration: number;
}

export class SmartNotifications {
    private islamicReminders: IslamicRemindersManager;
    private isUserActiveState: boolean = false;
    private lastActivityTime: number = 0;
    private debounceTimer: NodeJS.Timeout | null = null;
    private focusModeActive: boolean = false;
    private focusModeDuration: number = 15000; // 15 seconds of no activity to exit focus mode
    private eventListeners: vscode.Disposable[] = [];
    private isThrottled: boolean = false; // To prevent rapid toggling of focus mode

    // Settings
    private pauseDuringCoding: boolean = true;
    private quietHoursEnabled: boolean = false;
    private quietHoursStart: number = 22; // 10 PM
    private quietHoursEnd: number = 7;    // 7 AM

    constructor(islamicReminders: IslamicRemindersManager) {
        this.islamicReminders = islamicReminders;
        this.loadSettings();
        this.initializeActivityMonitoring();
        logger.info('SmartNotifications initialized');
    }

    /**
     * Initialize VS Code activity monitoring
     * Watches for text document changes to detect when user is actively coding
     */
    private initializeActivityMonitoring(): void {
        const textChangeListener = vscode.workspace.onDidChangeTextDocument(() => {
            // Throttling: Ignore events if we recently recorded activity
            if (this.isThrottled) {
                return;
            }
            this.recordActivity();
            // Lock out further updates for 1 second
            this.isThrottled = true;
            setTimeout(() => {
                this.isThrottled = false;
            }, 1000);
        });

        const fileSaveListener = vscode.workspace.onDidSaveTextDocument(() => {
            this.recordActivity();
        });

        const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(() => {
            this.recordActivity();
        });

        const editorChangeListener = vscode.window.onDidChangeActiveTextEditor(() => {
            this.recordActivity();
        });

        this.eventListeners = [
            textChangeListener,
            fileSaveListener,
            selectionChangeListener,
            editorChangeListener
        ];

        logger.info('Activity monitoring initialized with debouncing');
    }

    /**
     * Record user activity and trigger focus mode detection
     * Uses debouncing to avoid triggering on every keystroke
     */
    private recordActivity(): void {
        this.lastActivityTime = Date.now();
        this.isUserActiveState = true;

        if (!this.focusModeActive) {
            this.enterFocusMode();
        }

        // Debounce: reset the inactivity timer on every activity
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.exitFocusMode();
        }, this.focusModeDuration);
    }

    /**
     * Enter focus mode - pause notifications during active coding
     */
    private enterFocusMode(): void {
        if (this.focusModeActive) {
            return;
        }

        this.focusModeActive = true;
        this.isUserActiveState = true;

        if (this.pauseDuringCoding) {
            this.islamicReminders.stopReminders();
            logger.debug('Focus mode enabled: Islamic reminders paused');
        }
    }

    /**
     * Exit focus mode - resume notifications during idle periods
     * Only called from the debounce timer, so no need for double-checking activity time
     */
    private exitFocusMode(): void {
        this.focusModeActive = false;
        this.isUserActiveState = false;
        this.debounceTimer = null;

        if (this.pauseDuringCoding && !this.isInQuietHours()) {
            this.islamicReminders.startReminders();
            logger.debug('Focus mode disabled: Islamic reminders resumed');
        }
    }

    /**
     * Check if current time is within quiet hours
     *
     * Two cases:
     *   - Cross-midnight range  e.g. 22:00 → 07:00  (start > end)  : active if hour >= 22 OR  hour < 7
     *   - Same-day range        e.g. 12:00 → 14:00  (start < end)  : active if hour >= 12 AND hour < 14
     */
    private isInQuietHours(): boolean {
        if (!this.quietHoursEnabled) {
            return false;
        }

        const currentHour = new Date().getHours();

        if (this.quietHoursStart > this.quietHoursEnd) {
            // Range crosses midnight  (e.g. 22 → 07)
            return currentHour >= this.quietHoursStart || currentHour < this.quietHoursEnd;
        } else {
            // Range within same day  (e.g. 12 → 14)
            return currentHour >= this.quietHoursStart && currentHour < this.quietHoursEnd;
        }
    }

    /**
     * Load smart notifications settings from VS Code configuration
     */
    private loadSettings(): void {
        try {
            const config = vscode.workspace.getConfiguration('codeTune.smartNotifications');
            this.pauseDuringCoding = config.get('pauseDuringCoding', true);
            this.quietHoursEnabled = config.get('quietHoursEnabled', false);
            this.quietHoursStart = config.get('quietHoursStart', 22);
            this.quietHoursEnd = config.get('quietHoursEnd', 7);
            this.focusModeDuration = config.get('focusModeDuration', 15000);

            logger.info('SmartNotifications settings loaded:', {
                pauseDuringCoding: this.pauseDuringCoding,
                quietHoursEnabled: this.quietHoursEnabled,
                quietHours: `${this.quietHoursStart}:00 - ${this.quietHoursEnd}:00`,
                focusModeDuration: `${this.focusModeDuration / 1000}s`
            });
        } catch (error) {
            logger.warn('Failed to load smart notifications settings:', error);
        }
    }

    /**
     * Update smart notifications settings at runtime
     */
    public updateSettings(settings: Partial<SmartNotificationSettings>): void {
        if (settings.pauseDuringCoding !== undefined) { this.pauseDuringCoding = settings.pauseDuringCoding; }
        if (settings.quietHoursEnabled !== undefined) { this.quietHoursEnabled = settings.quietHoursEnabled; }
        if (settings.quietHoursStart !== undefined) { this.quietHoursStart = settings.quietHoursStart; }
        if (settings.quietHoursEnd !== undefined) { this.quietHoursEnd = settings.quietHoursEnd; }
        if (settings.focusModeDuration !== undefined) { this.focusModeDuration = settings.focusModeDuration; }

        logger.info('SmartNotifications settings updated', settings);
    }

    /**
     * Get current focus mode status
     */
    public isFocusModeActive(): boolean {
        return this.focusModeActive;
    }

    /**
     * Get current user activity status
     */
    public isUserActive(): boolean {
        return this.isUserActiveState;
    }

    /**
     * Get time since last activity in milliseconds
     */
    public getTimeSinceLastActivity(): number {
        return Date.now() - this.lastActivityTime;
    }

    /**
     * Manually toggle focus mode (for testing or manual override)
     */
    public toggleFocusMode(): void {
        if (this.focusModeActive) {
            this.exitFocusMode();
        } else {
            this.enterFocusMode();
        }
    }

    /**
     * Manually toggle quiet hours
     */
    public toggleQuietHours(): void {
        this.quietHoursEnabled = !this.quietHoursEnabled;
        logger.info(`Quiet hours toggled: ${this.quietHoursEnabled}`);
    }

    /**
     * Get smart notifications status for UI display
     */
    public getStatus(): {
        focusModeActive: boolean;
        isUserActive: boolean;
        inQuietHours: boolean;
        timeSinceLastActivity: number;
        pauseDuringCoding: boolean;
        quietHoursEnabled: boolean;
    } {
        return {
            focusModeActive: this.focusModeActive,
            isUserActive: this.isUserActiveState,   // ✅ was calling method reference, now uses state directly
            inQuietHours: this.isInQuietHours(),
            timeSinceLastActivity: this.getTimeSinceLastActivity(),
            pauseDuringCoding: this.pauseDuringCoding,
            quietHoursEnabled: this.quietHoursEnabled
        };
    }

    /**
     * Cleanup and dispose of event listeners
     */
    public dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        this.eventListeners.forEach(listener => listener.dispose());
        this.eventListeners = [];
        logger.info('SmartNotifications disposed');
    }
}