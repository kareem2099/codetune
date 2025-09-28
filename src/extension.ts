import * as vscode from 'vscode';
import * as path from 'path';
import * as nls from 'vscode-nls';
import { QuranPlayer } from './file/quranPlayer';
import { ActivityBarViewProvider } from './logic/activityBarView';
import { SettingsWebviewPanel } from './logic/settingsView';
import { IslamicRemindersManager } from './logic/islamicReminders';
import { WelcomeMessageManager } from './logic/welcomeMessage';

// Initialize localization
const localize = nls.loadMessageBundle();

// Load environment variables
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let quranPlayer: QuranPlayer;
let islamicRemindersManager: IslamicRemindersManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeTune extension is now active!');

    // Initialize players and services
    quranPlayer = new QuranPlayer(context);

    // Initialize Islamic Reminders Manager
    islamicRemindersManager = new IslamicRemindersManager();

    // Make Islamic reminders manager globally accessible for settings webview
    (global as any).islamicRemindersManager = islamicRemindersManager;

    // Show welcome message (only for first 3 days and max 3 times)
    WelcomeMessageManager.showWelcomeMessage(context);

    // Initialize Activity Bar webview
    console.log('Extension: Creating Activity Bar provider...');
    const activityBarProvider = new ActivityBarViewProvider(
        context.extensionUri,
        quranPlayer
    );

    // Make Activity Bar provider globally accessible for settings webview
    (global as any).activityBarProvider = activityBarProvider;

    console.log('Extension: Registering Activity Bar provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ActivityBarViewProvider.viewType, activityBarProvider)
    );
    console.log('Extension: Activity Bar provider registered successfully');

    // Register commands
    const playQuranCommand = vscode.commands.registerCommand(
        'codeTune.playQuran',
        async () => {
            const surahList = await vscode.window.showQuickPick(
                quranPlayer.getSurahList(),
                { placeHolder: 'Select a Surah' }
            );

            if (surahList) {
                await quranPlayer.play(surahList);
                vscode.window.showInformationMessage(`Playing Quran: ${surahList}`);
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

    // Settings command
    const openSettingsCommand = vscode.commands.registerCommand(
        'codeTune.openSettings',
        () => {
            const settingsPanel = new SettingsWebviewPanel(context.extensionUri);
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
    if (quranPlayer) {
        quranPlayer.dispose();
    }
    if (islamicRemindersManager) {
        islamicRemindersManager.dispose();
    }
}
