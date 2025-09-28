import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QuranPlayer } from '../file/quranPlayer';
import { SettingsWebviewPanel } from './settingsView';

export class ActivityBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeTuneMain';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private quranPlayer: QuranPlayer
    ) {
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

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('Activity Bar received message:', data);
            try {
                switch (data.type) {
                    case 'playQuran':
                        console.log('Playing Quran:', data.surah);
                        await this.quranPlayer.play(data.surah);
                        this.updateStatus('statusMessage', `Playing: ${data.surah}`);
                        break;
                    case 'setQuranVolume':
                        console.log(`Quran volume set to ${data.value}`);
                        // Handle volume change - you might want to add a method to set volume
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
                        const settingsPanel = new SettingsWebviewPanel(this._extensionUri);
                        settingsPanel.reveal();
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

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        // Read the separate files
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.html');
        const cssPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.css');
        const jsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.js');
        const localizationPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'localization.js');

        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        let cssContent = fs.readFileSync(cssPath, 'utf8');
        let jsContent = fs.readFileSync(jsPath, 'utf8');
        let localizationContent = fs.readFileSync(localizationPath, 'utf8');

        // Replace placeholders with actual content
        const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath));
        const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        const localizationUri = webview.asWebviewUri(vscode.Uri.file(localizationPath));

        htmlContent = htmlContent
            .replace('{{cssUri}}', cssUri.toString())
            .replace('{{jsUri}}', jsUri.toString())
            .replace('{{localizationUri}}', localizationUri.toString())
            .replace('{{nonce}}', nonce);

        return htmlContent;
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
