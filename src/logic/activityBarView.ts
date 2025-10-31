import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QuranPlayer } from '../file/quranPlayer';

export class ActivityBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeTuneMain';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private quranPlayer: QuranPlayer,
        private islamicRemindersManager?: any
    ) {
        // Set up bidirectional communication with QuranPlayer
        this.quranPlayer.setMessageSender((message: any) => {
            this.sendMessageToWebview(message);
        });
        console.log('Activity Bar: Provider constructor called');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Activity Bar: Resolving webview view...');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
            // Disable sandbox to prevent warnings while maintaining functionality
            enableCommandUris: false,
            enableForms: false
        };

        // Add debug message listener
        webviewView.webview.onDidReceiveMessage((message) => {
            console.log('DEBUG: Webview sent message:', message);
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log('Activity Bar: Webview HTML set');

        // Send current language and localization data to webview
        const config = vscode.workspace.getConfiguration('codeTune');
        const currentLanguage = config.get('language', 'auto');

        // Load localization data
        const localizationData = this.loadLocalizationData(currentLanguage);

        webviewView.webview.postMessage({
            type: 'languageChanged',
            language: currentLanguage,
            localizationData: localizationData
        });
        console.log('Activity Bar: Sent current language and localization data to webview:', currentLanguage);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('Activity Bar received message:', data);
            try {
                switch (data.type) {
                    case 'playQuran':
                        console.log('Playing Quran:', data.surah, 'Mode:', data.mode, 'Reciter:', data.reciter);
                        if (!data.surah || data.surah === null || data.surah === undefined) {
                            vscode.window.showErrorMessage('No Surah selected. Please select a Surah first.');
                            return;
                        }
                        await this.quranPlayer.play(data.surah, data.mode, data.reciter);
                        const modeName = data.mode === 'ayah-by-ayah' ? 'Ayah by Ayah' : 'Full Surah';
                        // Show brief success message for 3 seconds, then return to default
                        this.updateStatus('statusMessage', `Playing Surah ${data.surah} (${modeName})`);
                        setTimeout(() => {
                            this.updateStatus('statusMessage', 'Choose a Surah to begin recitation');
                        }, 3000);
                        break;
                    case 'setQuranVolume':
                        console.log(`Quran volume set to ${data.value}`);
                        // Forward volume change to webview to apply to currently playing audio
                        this.sendMessageToWebview({
                            type: 'setAudioVolume',
                            volume: data.value
                        });
                        break;
                    case 'updateReciter':
                        console.log('Updating reciter to:', data.reciter);
                        this.quranPlayer.setEdition(data.reciter);
                        break;
                    case 'testActivityBar':
                        console.log('Testing activity bar...');
                        this.updateStatus('statusMessage', 'Activity Bar is working! ✅');
                        vscode.window.showInformationMessage('Activity Bar is working! ✅');
                        break;
                    case 'webviewLoaded':
                        console.log('DEBUG: Webview loaded successfully!');
                        vscode.window.showInformationMessage('🎵 CodeTune Activity Bar Loaded!');
                        break;
                    case 'showNotification':
                        console.log('Activity Bar: Showing notification:', data.message);
                        const type = data.type || 'info';
                        switch (type) {
                            case 'info':
                                vscode.window.showInformationMessage(data.message);
                                break;
                            case 'warning':
                                vscode.window.showWarningMessage(data.message);
                                break;
                            case 'error':
                                vscode.window.showErrorMessage(data.message);
                                break;
                            default:
                                vscode.window.showInformationMessage(data.message);
                                break;
                        }
                        break;
                    case 'openSettings':
                        // Settings are now handled within the activity bar itself
                        console.log('Settings opened within activity bar');
                        break;
                    case 'goBackToActivityBar':
                        // Go back to main activity bar (could be used for navigation)
                        console.log('Going back to activity bar');
                        break;
                    // Audio control messages from QuranPlayer
                    case 'playAudio':
                        console.log('Forwarding playAudio to webview:', data);
                        this.sendMessageToWebview(data);
                        break;
                    case 'pauseAudio':
                        console.log('Forwarding pauseAudio to webview');
                        this.sendMessageToWebview(data);
                        break;
                    case 'resumeAudio':
                        console.log('Forwarding resumeAudio to webview');
                        this.sendMessageToWebview(data);
                        break;
                    case 'stopAudio':
                        console.log('Forwarding stopAudio to webview');
                        this.sendMessageToWebview(data);
                        break;
                    case 'setAudioVolume':
                        console.log('Forwarding setAudioVolume to webview:', data.volume);
                        this.sendMessageToWebview(data);
                        break;
                    case 'seekAudio':
                        console.log('Forwarding seekAudio to webview:', data.position);
                        this.sendMessageToWebview(data);
                        break;
                    // Settings-related messages
                    case 'saveSettings':
                        console.log('Saving settings:', data);
                        vscode.window.showInformationMessage('Settings saved successfully!');
                        break;
                    case 'executeCommand':
                        console.log('Executing VS Code command:', data.command);
                        await vscode.commands.executeCommand(data.command);
                        break;
                    case 'updateIslamicReminders':
                        console.log('Updating Islamic reminders:', data.settings);
                        // Update Islamic reminders manager with new settings
                        if (this.islamicRemindersManager) {
                            this.islamicRemindersManager.updateSettings(data.settings);
                            console.log('Islamic reminders updated successfully');
                        } else {
                            console.warn('Islamic reminders manager not available');
                        }
                        break;
                    case 'ayahEnded':
                        console.log('Ayah ended, advancing to next ayah:', data);
                        // Play next ayah in ayah-by-ayah mode
                        if (data.currentSurah && typeof data.currentAyah === 'number') {
                            await this.quranPlayer.playNextAyah(data.currentSurah, data.currentAyah);
                        } else {
                            console.warn('Invalid ayahEnded data:', data);
                        }
                        break;
                    case 'updateLanguageSetting':
                        console.log('Updating language setting:', data.language);
                        // Update the global VS Code configuration
                        const config = vscode.workspace.getConfiguration('codeTune');
                        config.update('language', data.language, true);
                        console.log('Language setting updated to:', data.language);

                        // Notify the webview to refresh localization with new language
                        this.notifyLanguageChange(data.language);
                        break;
                    case 'updateReviewNotifications':
                        console.log('Updating review notification settings:', data.settings);
                        // Update review notification manager with new settings
                        const reviewNotificationManager = (global as any).reviewNotificationManager;
                        if (reviewNotificationManager) {
                            reviewNotificationManager.updateSettings(data.settings);
                            console.log('Review notification settings updated successfully');
                        } else {
                            console.warn('Review notification manager not available');
                        }
                        break;
                    case 'trackDhikrIncrement':
                        console.log('Tracking dhikr increment for review notifications');
                        // Track dhikr increment for review notifications
                        const rnManager = (global as any).reviewNotificationManager;
                        if (rnManager) {
                            rnManager.updateUsageMetrics('dhikrIncremented');
                        }
                        break;
                    case 'trackSurahPlayed':
                        console.log('Tracking surah played for review notifications');
                        // Track surah played for review notifications
                        const rnManager2 = (global as any).reviewNotificationManager;
                        if (rnManager2) {
                            rnManager2.updateUsageMetrics('surahPlayed');
                        }
                        break;
                    case 'autoPlayStartup':
                        console.log('Auto-play startup triggered:', data);
                        // Handle auto-play on startup - send to webview
                        this.sendMessageToWebview({
                            type: 'autoPlayStartup',
                            lastPlayback: data.lastPlayback,
                            volume: data.volume
                        });
                        break;
                    case 'surahFinished':
                        console.log('Surah finished, asking user about next surah:', data.currentSurah, data.nextSurah);
                        // Show VS Code notification asking if user wants to continue reading
                        this.handleSurahFinished(data.currentSurah, data.nextSurah);
                        break;
                    case 'showConfirmDialog':
                        console.log('Showing confirmation dialog:', data.message);
                        // Show VS Code confirmation dialog
                        const userChoice = await vscode.window.showInformationMessage(
                            data.message,
                            { modal: true },
                            'Yes',
                            'Cancel'
                        );

                        // Send back the result to the webview
                        if (userChoice === 'Yes') {
                            // Hide the current webview to avoid focus issues during modal
                            if (this._view) {
                                this._view.webview.postMessage({
                                    type: 'confirmResult',
                                    action: data.action,
                                    confirmed: true
                                });
                            }
                        }
                        break;
                    case 'fridaySurahStarted':
                        console.log('Friday Surah Al-Kahf reading started:', data.surahNumber);
                        // Mark Friday Surah as started in the Islamic reminders manager
                        if (this.islamicRemindersManager && this.islamicRemindersManager.fridayReminders) {
                            this.islamicRemindersManager.fridayReminders.markFridaySurahStarted();
                        }
                        break;
                    case 'fridaySurahCompleted':
                        console.log('Friday Surah Al-Kahf reading completed:', data.surahNumber);
                        // Mark Friday Surah as completed in the Islamic reminders manager
                        if (this.islamicRemindersManager && this.islamicRemindersManager.fridayReminders) {
                            this.islamicRemindersManager.fridayReminders.markFridaySurahCompleted();
                        }
                        break;
                    case 'enforceFridaySurahKahf':
                        console.log('Enforcing Friday Surah Al-Kahf reading:', data);
                        // Forward the message to the webview to trigger the Quran reader
                        this.sendMessageToWebview({
                            type: 'enforceFridaySurahKahf',
                            surahNumber: data.surahNumber,
                            message: data.message
                        });
                        break;
                    case 'getFridaySurahStatus':
                        console.log('Getting Friday Surah status');
                        // Get current Friday Surah status from the Islamic reminders manager
                        if (this.islamicRemindersManager && this.islamicRemindersManager.fridayReminders) {
                            const status = this.islamicRemindersManager.fridayReminders.getFridaySurahStatus();
                            console.log('Friday Surah status:', status);
                            // Send status back to webview
                            this.sendMessageToWebview({
                                type: 'fridaySurahStatus',
                                status: status.status,
                                message: status.message
                            });
                        } else {
                            console.warn('Islamic reminders manager not available for Friday Surah status');
                            this.sendMessageToWebview({
                                type: 'fridaySurahStatus',
                                status: 'not-started',
                                message: 'Status unavailable'
                            });
                        }
                        break;
                    default:
                        console.log('Unknown message type:', data.type);
                        break;
                }
            } catch (error) {
                console.error('Activity Bar command failed:', error);
                vscode.window.showErrorMessage(`Command failed: ${data.type} - ${error}`);
            }
        });
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    public notifyLanguageChange(language?: string) {
        console.log('ActivityBarView: notifyLanguageChange called with language:', language);

        // If no language provided, get current language from config
        const currentLanguage = language || vscode.workspace.getConfiguration('codeTune').get('language', 'auto');
        const localizationData = this.loadLocalizationData(currentLanguage);

        if (this._view) {
            console.log('ActivityBarView: Sending languageChanged message to webview with language:', currentLanguage);
            this._view.webview.postMessage({
                type: 'languageChanged',
                language: currentLanguage,
                localizationData: localizationData
            });
        } else {
            console.log('ActivityBarView: No webview available to notify');
        }
    }

    private updateStatus(elementId: string, message: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateStatus',
                elementId: elementId,
                message: message
            });
        }
    }

    private sendMessageToWebview(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    /**
     * Handle when a Surah finishes reading, show notification asking to continue
     */
    private async handleSurahFinished(currentSurah: any, nextSurah: any): Promise<void> {
        try {
            const message = `📖 ${currentSurah.arabicName} (${currentSurah.name}) completed. Continue reading with ${nextSurah.arabicName} (${nextSurah.name})?`;

            const userChoice = await vscode.window.showInformationMessage(
                message,
                { modal: false }, // Not modal so user can continue working
                'Continue Reading',
                'Stop'
            );

            if (userChoice === 'Continue Reading') {
                // Start countdown timer (3-2-1) and then auto-advance to next surah
                await this.startSurahTransitionCountdown(nextSurah);
            } else {
                // Show a completion message
                vscode.window.showInformationMessage('Reading session completed ✅');
            }
        } catch (error) {
            console.error('Error handling surah finished:', error);
            vscode.window.showErrorMessage('Error handling surah transition');
        }
    }

    /**
     * Start countdown timer and auto-advance to next surah
     */
    private async startSurahTransitionCountdown(nextSurah: any): Promise<void> {
        try {
            // Show countdown notifications
            for (let i = 3; i >= 1; i--) {
                vscode.window.showInformationMessage(`Starting next Surah ${nextSurah.arabicName} in ${i}... ⏰`);
                await this.delay(1000); // 1 second delay
            }

            // Send message to webview to open the next surah
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'openNextSurah',
                    surahNumber: nextSurah.number,
                    action: 'autoTransition'
                });
            }

            vscode.window.showInformationMessage(`📖 Starting ${nextSurah.arabicName} (${nextSurah.name})`);
        } catch (error) {
            console.error('Error in surah transition countdown:', error);
            vscode.window.showErrorMessage('Error transitioning to next Surah');
        }
    }

    /**
     * Load localization data for the specified language
     */
    private loadLocalizationData(language: string): any {
        try {
            let resolvedLanguage = language;

            // Resolve 'auto' to actual language
            if (resolvedLanguage === 'auto') {
                resolvedLanguage = vscode.env.language.startsWith('ar') ? 'ar' :
                                  vscode.env.language.startsWith('ru') ? 'ru' :
                                  vscode.env.language.startsWith('fr') ? 'fr' :
                                  vscode.env.language.startsWith('es') ? 'es' : 'en';
            }

            // Map language codes to file names
            const fileMap: { [key: string]: string } = {
                'en': 'ui.nls.json',
                'ar': 'ui.nls.ar.json',
                'ru': 'ui.nls.ru.json',
                'fr': 'ui.nls.fr.json',
                'es': 'ui.nls.es.json'
            };

            const fileName = fileMap[resolvedLanguage] || 'ui.nls.json';
            const filePath = path.join(this._extensionUri.fsPath, 'src', 'ui', fileName);

            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(fileContent);
            } else {
                console.warn(`Localization file not found: ${filePath}, falling back to English`);
                // Fallback to English
                const fallbackPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'ui.nls.json');
                if (fs.existsSync(fallbackPath)) {
                    const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
                    return JSON.parse(fallbackContent);
                }
            }
        } catch (error) {
            console.error('Error loading localization data:', error);
        }

        // Ultimate fallback - minimal English strings
        return {
            loading: "Loading...",
            error: "Error occurred while loading localization"
        };
    }

    /**
     * Utility method for delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        // Read the unified HTML file
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.html');
        const cssPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.css');
        const jsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.js');
        const localizationPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'localization.js');

        // Component paths
        const counterPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'counter.js');
        const audioPlayerPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'audioPlayer.js');
        const prayerTrackerPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'prayerTracker.js');
        const settingsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'settings.js');
        const statisticsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'statistics.js');

        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Replace placeholders with actual webview URIs
        const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath));
        const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        const localizationUri = webview.asWebviewUri(vscode.Uri.file(localizationPath));

        // Component URIs
        const counterUri = webview.asWebviewUri(vscode.Uri.file(counterPath));
        const audioPlayerUri = webview.asWebviewUri(vscode.Uri.file(audioPlayerPath));
        const prayerTrackerUri = webview.asWebviewUri(vscode.Uri.file(prayerTrackerPath));
        const settingsUri = webview.asWebviewUri(vscode.Uri.file(settingsPath));
        const statisticsUri = webview.asWebviewUri(vscode.Uri.file(statisticsPath));

        htmlContent = htmlContent
            .replace('{{cssUri}}', cssUri.toString())
            .replace('{{jsUri}}', jsUri.toString())
            .replace('{{localizationUri}}', localizationUri.toString())
            .replace('./components/counter.js', counterUri.toString())
            .replace('./components/audioPlayer.js', audioPlayerUri.toString())
            .replace('./components/prayerTracker.js', prayerTrackerUri.toString())
            .replace('./components/settings.js', settingsUri.toString())
            .replace('./components/statistics.js', statisticsUri.toString())
            .replace(/{{nonce}}/g, nonce)
            .replace('{{settingsCssUri}}', '') // Remove settings references
            .replace('{{settingsJsUri}}', ''); // Remove settings references

        // Add VS Code locale as URL parameter for proper initialization
        const config = vscode.workspace.getConfiguration('codeTune');
        const currentLanguage = config.get('language', 'auto');
        let urlLanguage = currentLanguage;

        // If auto, resolve to actual VS Code locale
        if (urlLanguage === 'auto') {
            urlLanguage = vscode.env.language.startsWith('ar') ? 'ar' : 'en';
        }

        console.log('ActivityBar: Resolved language for URL:', urlLanguage, 'from config:', currentLanguage, 'VS Code locale:', vscode.env.language);

        // Pass the language as URL parameter
        const finalUri = webview.asWebviewUri(vscode.Uri.file(htmlPath));
        const htmlWithLanguage = htmlContent.replace(
            '<html lang="en">',
            `<html lang="${urlLanguage}">`
        ).replace(
            /<head>/,
            `<head><script>window.vsCodeLanguage = "${urlLanguage}";</script>`
        );

        return htmlWithLanguage;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
