import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class WelcomeMessageManager {
    private static readonly WELCOME_MESSAGE_KEY = 'codeTune.welcomeMessageShown';
    private static readonly MAX_DAYS = 3;
    private static readonly MAX_SHOWS = 3;

    /**
     * Show welcome message if it hasn't been shown before or if less than 3 days have passed
     */
    public static async showWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
        try {
            const globalState = context.globalState;
            const welcomeData = globalState.get(this.WELCOME_MESSAGE_KEY) as { firstShown: number; timesShown: number } | undefined;

            const now = Date.now();
            const threeDaysInMs = this.MAX_DAYS * 24 * 60 * 60 * 1000;

            // If never shown before, show it
            if (!welcomeData) {
                await this.showWelcomePanel(context);
                return;
            }

            // If shown more than 3 times, don't show again
            if (welcomeData.timesShown >= this.MAX_SHOWS) {
                return;
            }

            // If more than 3 days have passed since first shown, don't show again
            if (now - welcomeData.firstShown > threeDaysInMs) {
                return;
            }

            // Show the welcome panel
            await this.showWelcomePanel(context, welcomeData);
        } catch (error) {
            console.warn('Failed to show welcome message:', error);
        }
    }

    private static async showWelcomePanel(
        context: vscode.ExtensionContext,
        existingData?: { firstShown: number; timesShown: number }
    ): Promise<void> {
        const now = Date.now();
        const firstShown = existingData?.firstShown || now;
        const timesShown = (existingData?.timesShown || 0) + 1;

        // Store updated data
        await context.globalState.update(this.WELCOME_MESSAGE_KEY, {
            firstShown,
            timesShown
        });

        // Create and show the welcome webview panel
        const panel = vscode.window.createWebviewPanel(
            'codeTuneWelcome',
            'Welcome to CodeTune - Islamic Reminders',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: false,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'src', 'ui')
                ]
            }
        );

        // Set the HTML content
        panel.webview.html = this.getWelcomeHtml(panel.webview, context.extensionUri);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'openSettings':
                        vscode.commands.executeCommand('codeTune.openSettings');
                        panel.dispose();
                        break;
                    case 'openExternal':
                        if (message.url) {
                            vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        panel.dispose();
                        break;
                    case 'closeWelcome':
                        panel.dispose();
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Auto-focus the panel
        panel.reveal(vscode.ViewColumn.One);
    }

    private static getWelcomeHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const nonce = this.getNonce();

        // Read the welcome files
        const htmlPath = path.join(extensionUri.fsPath, 'src', 'ui', 'welcome.html');
        const cssPath = path.join(extensionUri.fsPath, 'src', 'ui', 'welcome.css');
        const jsPath = path.join(extensionUri.fsPath, 'src', 'ui', 'welcome.js');
        const localizationPath = path.join(extensionUri.fsPath, 'src', 'ui', 'localization.js');

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

    private static getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Reset welcome message state (for testing purposes)
     */
    public static async resetWelcomeMessage(context: vscode.ExtensionContext): Promise<void> {
        await context.globalState.update(this.WELCOME_MESSAGE_KEY, undefined);
        vscode.window.showInformationMessage('Welcome message state has been reset.');
    }

    /**
     * Get welcome message statistics (for debugging)
     */
    public static getWelcomeStats(context: vscode.ExtensionContext): { firstShown: number; timesShown: number } | null {
        return context.globalState.get(this.WELCOME_MESSAGE_KEY) as { firstShown: number; timesShown: number } | null;
    }
}
