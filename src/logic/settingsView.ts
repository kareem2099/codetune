import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class SettingsWebviewPanel {
    private panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) {
        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'codeTuneSettings',
            'CodeTune Settings',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set HTML content
        this.panel.webview.html = this._getHtmlForWebview(this.panel.webview);

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => this.dispose(),
            null,
            this.disposables
        );
    }

    private handleMessage(message: any) {
        switch (message.type || message.command) {
            case 'updateLanguageSetting':
                // Save language to VSCode configuration
                if (message.language) {
                    const config = vscode.workspace.getConfiguration('codeTune');
                    config.update('language', message.language, true);
                    console.log('SettingsView: Language saved to configuration:', message.language);
                }
                break;
            case 'saveSettings':
                // Handle saving settings
                vscode.window.showInformationMessage('Settings saved successfully!');
                break;
            case 'resetSettings':
                // Handle resetting settings
                vscode.window.showInformationMessage('Settings reset to default!');
                break;
            case 'closeSettings':
                this.panel.dispose();
                break;
            case 'showNotification':
                // Handle notifications from settings webview
                const type = message.type || 'info';
                switch (type) {
                    case 'info':
                        vscode.window.showInformationMessage(message.message);
                        break;
                    case 'warning':
                        vscode.window.showWarningMessage(message.message);
                        break;
                    case 'error':
                        vscode.window.showErrorMessage(message.message);
                        break;
                    default:
                        vscode.window.showInformationMessage(message.message);
                        break;
                }
                break;
            case 'updateIslamicReminders':
                // Handle Islamic reminder settings updates
                if (message.settings) {
                    // Update the Islamic reminders manager with new settings
                    const islamicRemindersManager = (global as any).islamicRemindersManager;
                    if (islamicRemindersManager) {
                        islamicRemindersManager.updateSettings(message.settings);
                    }
                }
                break;
            case 'languageChanged':
                // Handle language change - notify activity bar to re-localize
                console.log('SettingsView: Received languageChanged message with language:', message.language);
                const activityBarProvider = (global as any).activityBarProvider;
                if (activityBarProvider) {
                    console.log('SettingsView: Activity bar provider found, notifying language change');
                    activityBarProvider.notifyLanguageChange(message.language);
                } else {
                    console.log('SettingsView: Activity bar provider not found!');
                }
                break;
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        // Read the separate files
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'settings.html');
        const cssPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'settings.css');
        const jsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'settings.js');
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

    public reveal() {
        this.panel.reveal(vscode.ViewColumn.One);
    }

    public dispose() {
        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
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
