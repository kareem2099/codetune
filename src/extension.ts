import * as vscode from 'vscode';
import * as path from 'path';
import * as nls from 'vscode-nls';
import { Logger } from './utils/Logger';
import { QuranPlayer } from './file/quranPlayer';
import { ActivityBarViewProvider } from './logic/activityBarView';
import { IslamicRemindersManager } from './logic/islamicReminders';
import { WelcomeMessageManager } from './logic/welcomeMessage';
import { ReviewNotificationManager } from './logic/reviewNotifications';

// Initialize localization
const localize = nls.loadMessageBundle();

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let quranPlayer: QuranPlayer;
let islamicRemindersManager: IslamicRemindersManager;
let reviewNotificationManager: ReviewNotificationManager;

/**
 * Check if auto-play on startup is enabled and resume last played surah
 */
async function checkAutoPlayOnStartup(context: vscode.ExtensionContext) {
    try {
        // Check if auto-play is enabled in settings
        const config = vscode.workspace.getConfiguration('codeTune');
        const autoPlayEnabled = config.get('autoPlayStartup', false);

        if (!autoPlayEnabled) {
            Logger.instance.info('Auto-play on startup is disabled');
            return;
        }

        Logger.instance.info('Auto-play on startup is enabled, checking for last playback position...');

        // Get last playback position from global state (will be set by webview)
        // For now, we'll wait a bit for the webview to load and then check
        setTimeout(async () => {
            try {
                // Check if we have a last playback position stored
                const lastPlayback = getLastPlaybackPosition();
                if (!lastPlayback) {
                    Logger.instance.info('No last playback position found');
                    return;
                }

                Logger.instance.info('Found last playback position:', lastPlayback);

                // Check volume setting - warn if it's 100%
                const volume = getCurrentVolume();
                if (volume >= 100) {
                    // Show warning and temporarily reduce volume
                    vscode.window.showWarningMessage(
                        '⚠️ Auto-play enabled but volume is at 100%. Temporarily reducing volume to 70% to avoid startling you.',
                        'OK'
                    );

                    // We'll set volume to 70% when the webview loads
                    // For now, just show the warning
                }

                // Wait a bit more for webview to be ready, then trigger auto-play
                setTimeout(async () => {
                    try {
                        // Send message to webview to start auto-play
                        const activityBarProvider = (global as any).activityBarProvider;
                        if (activityBarProvider && activityBarProvider.sendMessageToWebview) {
                            activityBarProvider.sendMessageToWebview({
                                type: 'autoPlayStartup',
                                lastPlayback: lastPlayback,
                                volume: Math.min(volume, 70) // Cap at 70% for safety
                            });

                            vscode.window.showInformationMessage(
                                `🎵 Auto-playing ${lastPlayback.surahName} from ${formatTime(lastPlayback.currentTime)}`
                            );
                        }
                    } catch (error) {
                        Logger.instance.error('Error triggering auto-play:', error);
                    }
                }, 2000); // Wait 2 seconds for webview to be fully ready

            } catch (error) {
                Logger.instance.error('Error in auto-play startup check:', error);
            }
        }, 1000); // Initial delay to let extension finish loading

    } catch (error) {
        Logger.instance.error('Error checking auto-play on startup:', error);
    }
}

/**
 * Get last playback position from localStorage (called from webview)
 */
function getLastPlaybackPosition(): { surahNumber: number; surahName: string; currentTime: number; duration: number; reciter: string; lastPlayed: string } | null {
    try {
        // This will be called from the webview context
        // For now, return null - the webview will handle this
        return null;
    } catch (error) {
        Logger.instance.error('Error getting last playback position:', error);
        return null;
    }
}

/**
 * Get current volume setting
 */
function getCurrentVolume(): number {
    try {
        // Try to get from VS Code config first
        const config = vscode.workspace.getConfiguration('codeTune');
        return config.get('volume', 70);
    } catch (error) {
        Logger.instance.warn('Error getting volume setting:', error);
        return 70; // Default
    }
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function activate(context: vscode.ExtensionContext) {
    Logger.instance.info('CodeTune extension is now active!');

    // Initialize players and services
    quranPlayer = new QuranPlayer(context);

    // Initialize Islamic Reminders Manager
    islamicRemindersManager = new IslamicRemindersManager();

    // Initialize Review Notification Manager
    reviewNotificationManager = new ReviewNotificationManager(context);

    // Make managers globally accessible for settings webview
    (global as any).islamicRemindersManager = islamicRemindersManager;
    (global as any).reviewNotificationManager = reviewNotificationManager;

    // Show welcome message (only for first 3 days and max 3 times)
    WelcomeMessageManager.showWelcomeMessage(context);

    // Check for auto-play on startup
    checkAutoPlayOnStartup(context);

    // Initialize Activity Bar webview
    Logger.instance.info('Extension: Creating Activity Bar provider...');
    const activityBarProvider = new ActivityBarViewProvider(
        context.extensionUri,
        quranPlayer,
        islamicRemindersManager
    );

    // Make Activity Bar provider globally accessible for settings webview
    (global as any).activityBarProvider = activityBarProvider;

    Logger.instance.info('Extension: Registering Activity Bar provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ActivityBarViewProvider.viewType, activityBarProvider)
    );
    Logger.instance.info('Extension: Activity Bar provider registered successfully');

    // Register commands
    const playQuranCommand = vscode.commands.registerCommand(
        'codeTune.playQuran',
        async () => {
            const surahList = await vscode.window.showQuickPick(
                quranPlayer.getSurahList(),
                { placeHolder: 'Select a Surah' }
            );

            if (surahList) {
                // Extract surah number from the formatted string (e.g., "001 - الفاتحة (Al-Fatiha)" -> "001")
                const surahNumberMatch = surahList.match(/^(\d+)/);
                if (surahNumberMatch) {
                    const surahNumber = surahNumberMatch[1];
                    await quranPlayer.play(surahNumber);
                    vscode.window.showInformationMessage(`Playing Quran: ${surahList}`);

                    // Track surah play for review notifications
                    if (reviewNotificationManager) {
                        reviewNotificationManager.updateUsageMetrics('surahPlayed');
                    }
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

    // Open settings command - focuses the CodeTune activity bar
    const openSettingsCommand = vscode.commands.registerCommand(
        'codeTune.openSettings',
        async () => {
            // Try to open the CodeTune activity bar if it's not already open
            await vscode.commands.executeCommand('workbench.action.focusActivityBar');
            await vscode.commands.executeCommand('codeTuneMain.focus');

            // If the activity bar view is collapsed, it's better to let the user know
            vscode.window.showInformationMessage('CodeTune settings are in the Activity Bar. Expand the CodeTune section if needed.', 'Got it');
        }
    );

    // Test command to verify activity bar is working
    const testActivityBarCommand = vscode.commands.registerCommand(
        'codeTune.testActivityBar',
        () => {
            vscode.window.showInformationMessage('Activity Bar is working! ✅');
        }
    );

    // Add to subscriptions
    context.subscriptions.push(
        playQuranCommand,
        stopCommand,
        openSettingsCommand,
        testActivityBarCommand
    );
}

export function deactivate() {
    Logger.instance.info('CodeTune extension is deactivating...');

    if (quranPlayer) {
        quranPlayer.dispose();
    }
    if (islamicRemindersManager) {
        islamicRemindersManager.dispose();
    }
    if (reviewNotificationManager) {
        reviewNotificationManager.dispose();
    }

    // Dispose activity bar provider if it exists
    if (global && (global as any).activityBarProvider) {
        const activityBarProvider = (global as any).activityBarProvider;
        if (activityBarProvider.dispose) {
            activityBarProvider.dispose();
        }
    }

    Logger.instance.info('CodeTune extension deactivated successfully');
}
