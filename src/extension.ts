import * as vscode from 'vscode';
import * as path from 'path';
import * as nls from 'vscode-nls';
import { logger } from './utils/Logger';
import { QuranPlayer } from './file/quranPlayer';
import { ActivityBarViewProvider } from './logic/activityBarView';
import { IslamicRemindersManager } from './logic/islamicReminders';
import { SmartNotifications } from './logic/smartNotifications';
import { WelcomeMessageManager } from './logic/welcomeMessage';
import { ReviewNotificationManager } from './logic/reviewNotifications';
import { SpiritualTracker } from './utils/SpiritualTracker';
import { TrackerInsights } from './logic/trackerInsights';

// Initialize localization
const localize = nls.loadMessageBundle();

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─────────────────────────────────────────────
// Module-level instances
// ─────────────────────────────────────────────

let quranPlayer: QuranPlayer;
let islamicRemindersManager: IslamicRemindersManager;
let smartNotifications: SmartNotifications;
let reviewNotificationManager: ReviewNotificationManager;
let spiritualTracker: SpiritualTracker;
let trackerInsights: TrackerInsights;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface LastPlaybackPosition {
    surahNumber: number;
    surahName: string;
    currentTime: number;
    duration: number;
    reciter: string;
    lastPlayed: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getCurrentVolume(): number {
    try {
        return vscode.workspace.getConfiguration('codeTune').get('volume', 70);
    } catch (error) {
        logger.warn('Error getting volume setting:', error);
        return 70;
    }
}

function getLastPlaybackPosition(): LastPlaybackPosition | null {
    try {
        return null; // Webview handles this via localStorage
    } catch (error) {
        logger.error('Error getting last playback position:', error);
        return null;
    }
}

// ─────────────────────────────────────────────
// Auto-play on startup
// ─────────────────────────────────────────────

async function checkAutoPlayOnStartup(context: vscode.ExtensionContext): Promise<void> {
    try {
        const config = vscode.workspace.getConfiguration('codeTune');
        const autoPlayEnabled = config.get('autoPlayStartup', false);

        if (!autoPlayEnabled) {
            logger.info('Auto-play on startup is disabled');
            return;
        }

        logger.info('Auto-play on startup is enabled, checking for last playback position...');

        setTimeout(async () => {
            try {
                const lastPlayback = getLastPlaybackPosition();
                if (!lastPlayback) {
                    logger.info('No last playback position found');
                    return;
                }

                logger.info('Found last playback position:', lastPlayback);

                const volume = getCurrentVolume();
                if (volume >= 100) {
                    vscode.window.showWarningMessage(
                        '⚠️ Auto-play enabled but volume is at 100%. Temporarily reducing volume to 70% to avoid startling you.',
                        'OK'
                    );
                }

                setTimeout(async () => {
                    try {
                        const activityBarProvider = (global as any).activityBarProvider;
                        if (activityBarProvider?.sendMessageToWebview) {
                            activityBarProvider.sendMessageToWebview({
                                type: 'autoPlayStartup',
                                lastPlayback,
                                volume: Math.min(volume, 70)
                            });
                            vscode.window.showInformationMessage(
                                `🎵 Auto-playing ${lastPlayback.surahName} from ${formatTime(lastPlayback.currentTime)}`
                            );
                        }
                    } catch (error) {
                        logger.error('Error triggering auto-play:', error);
                    }
                }, 2000);

            } catch (error) {
                logger.error('Error in auto-play startup check:', error);
            }
        }, 1000);

    } catch (error) {
        logger.error('Error checking auto-play on startup:', error);
    }
}

// ─────────────────────────────────────────────
// Activate
// ─────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    logger.info('CodeTune extension is now active!');

    // Initialize core services
    quranPlayer = new QuranPlayer(context);
    islamicRemindersManager = new IslamicRemindersManager();
    smartNotifications = new SmartNotifications(islamicRemindersManager);
    reviewNotificationManager = new ReviewNotificationManager(context);

    // Spiritual Tracker & Insights
    spiritualTracker = new SpiritualTracker(context);
    trackerInsights = new TrackerInsights(spiritualTracker);

    // Make services globally accessible for Webview message handlers
    (global as any).islamicRemindersManager = islamicRemindersManager;
    (global as any).smartNotifications = smartNotifications;
    (global as any).reviewNotificationManager = reviewNotificationManager;
    (global as any).spiritualTracker = spiritualTracker;
    (global as any).trackerInsights = trackerInsights;

    // Show welcome message (first 3 days, max 3 times)
    WelcomeMessageManager.showWelcomeMessage(context);

    // Check for auto-play on startup
    checkAutoPlayOnStartup(context);

    // Initialize Activity Bar webview provider
    logger.info('Extension: Creating Activity Bar provider...');
    const activityBarProvider = new ActivityBarViewProvider(
        context.extensionUri,
        quranPlayer,
        islamicRemindersManager
    );

    (global as any).activityBarProvider = activityBarProvider;

    logger.info('Extension: Registering Activity Bar provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ActivityBarViewProvider.viewType, activityBarProvider)
    );
    logger.info('Extension: Activity Bar provider registered successfully');

    // ── Commands ──────────────────────────────

    const playQuranCommand = vscode.commands.registerCommand(
        'codeTune.playQuran',
        async () => {
            const surahList = await vscode.window.showQuickPick(
                quranPlayer.getSurahList(),
                { placeHolder: 'Select a Surah' }
            );

            if (surahList) {
                const surahNumberMatch = surahList.match(/^(\d+)/);
                if (surahNumberMatch) {
                    const surahNumber = surahNumberMatch[1];
                    await quranPlayer.play(surahNumber);
                    vscode.window.showInformationMessage(`Playing Quran: ${surahList}`);
                    reviewNotificationManager?.updateUsageMetrics('surahPlayed');
                } else {
                    vscode.window.showErrorMessage('Invalid Surah selection');
                }
            }
        }
    );

    const stopCommand = vscode.commands.registerCommand(
        'codeTune.stop',
        async () => {
            quranPlayer.stop();
            vscode.window.showInformationMessage('Stopped');
        }
    );

    const openSettingsCommand = vscode.commands.registerCommand(
        'codeTune.openSettings',
        async () => {
            await vscode.commands.executeCommand('workbench.action.focusActivityBar');
            await vscode.commands.executeCommand('codeTuneMain.focus');
            vscode.window.showInformationMessage(
                'CodeTune settings are in the Activity Bar. Expand the CodeTune section if needed.',
                'Got it'
            );
        }
    );

    const testActivityBarCommand = vscode.commands.registerCommand(
        'codeTune.testActivityBar',
        () => {
            vscode.window.showInformationMessage('Activity Bar is working! ✅');
        }
    );

    context.subscriptions.push(
        playQuranCommand,
        stopCommand,
        openSettingsCommand,
        testActivityBarCommand
    );
}

// ─────────────────────────────────────────────
// Deactivate
// ─────────────────────────────────────────────

export function deactivate(): void {
    logger.info('CodeTune extension is deactivating...');

    quranPlayer?.dispose();
    smartNotifications?.dispose();
    islamicRemindersManager?.dispose();
    reviewNotificationManager?.dispose();
    // SpiritualTracker has no dispose() - data is persisted in globalState automatically

    const activityBarProvider = (global as any).activityBarProvider;
    if (activityBarProvider?.dispose) {
        activityBarProvider.dispose();
    }

    logger.info('CodeTune extension deactivated successfully');
}