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
            localResourceRoots: [this._extensionUri]
        };

        // Add debug message listener
        webviewView.webview.onDidReceiveMessage((message) => {
            console.log('DEBUG: Webview sent message:', message);
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log('Activity Bar: Webview HTML set');

        // Send current language to webview
        const config = vscode.workspace.getConfiguration('codeTune');
        const currentLanguage = config.get('language', 'auto');
        webviewView.webview.postMessage({
            type: 'languageChanged',
            language: currentLanguage
        });
        console.log('Activity Bar: Sent current language to webview:', currentLanguage);

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
                        if (data.currentSurah && data.currentAyah) {
                            await this.quranPlayer.playNextAyah(data.currentSurah, data.currentAyah);
                        }
                        break;
                    case 'updateLanguageSetting':
                        console.log('Updating language setting:', data.language);
                        // Update the global VS Code configuration
                        const config = vscode.workspace.getConfiguration('codeTune');
                        config.update('language', data.language, true);
                        console.log('Language setting updated to:', data.language);
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
        if (this._view) {
            console.log('ActivityBarView: Sending languageChanged message to webview');
            this._view.webview.postMessage({
                type: 'languageChanged',
                language: language
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

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        // Read the unified HTML file
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.html');
        const cssPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.css');
        const jsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.js');
        const localizationPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'localization.js');

        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Replace placeholders with actual webview URIs
        const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath));
        const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        const localizationUri = webview.asWebviewUri(vscode.Uri.file(localizationPath));

        htmlContent = htmlContent
            .replace('{{cssUri}}', cssUri.toString())
            .replace('{{jsUri}}', jsUri.toString())
            .replace('{{localizationUri}}', localizationUri.toString())
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
