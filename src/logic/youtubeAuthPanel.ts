import * as vscode from 'vscode';
import { MusicServiceManager, MusicServiceType } from './musicService';
import { YouTubeMusicService } from './youtubeMusicService';

export class YouTubeAuthPanel {
    private panel: vscode.WebviewPanel;
    private musicServiceManager: MusicServiceManager;
    private disposables: vscode.Disposable[] = [];

    constructor(
        context: vscode.ExtensionContext,
        musicServiceManager: MusicServiceManager
    ) {
        this.musicServiceManager = musicServiceManager;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'youtubeAuth',
            'YouTube Music Authentication',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set HTML content
        this.panel.webview.html = this.getWebviewContent();

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

        // Update UI periodically
        this.updateUI();

        // Set up periodic updates for real-time auth state
        const updateInterval = setInterval(() => {
            this.updateUI();
        }, 2000); // Update every 2 seconds

        // Clear interval when panel is disposed
        this.panel.onDidDispose(() => {
            clearInterval(updateInterval);
        }, null, this.disposables);
    }

    private async handleMessage(message: any) {
        switch (message.command) {
            case 'connectYouTube':
                await this.connectYouTube();
                break;
            case 'disconnectYouTube':
                await this.disconnectYouTube();
                break;
            case 'refreshAuth':
                this.updateUI();
                break;
        }
    }

    private async connectYouTube() {
        try {
            const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                await youtubeService.authenticate();
                vscode.window.showInformationMessage('YouTube Music connected successfully!');
                this.updateUI();
            }
        } catch (error) {
            vscode.window.showErrorMessage(`YouTube authentication failed: ${error}`);
        }
    }

    private async disconnectYouTube() {
        try {
            const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                await youtubeService.logout();
                vscode.window.showInformationMessage('YouTube Music disconnected');
                this.updateUI();
            }
        } catch (error) {
            vscode.window.showErrorMessage(`YouTube disconnection failed: ${error}`);
        }
    }

    private async updateUI() {
        let authState = {
            isConnected: false,
            userInfo: '',
            canConnect: false
        };

        try {
            const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                authState.isConnected = await youtubeService.isAuthenticated();
                authState.canConnect = true;

                if (authState.isConnected) {
                    // Get user info if available
                    authState.userInfo = 'Connected to YouTube Music';
                }
            }
        } catch (error) {
            console.log('Could not get YouTube auth state:', error);
        }

        this.panel.webview.postMessage({
            command: 'updateAuthState',
            authState: authState
        });
    }

    private getWebviewContent(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Music Authentication</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header h1 {
            margin: 0;
            font-size: 2em;
            color: #FF0000;
        }

        .auth-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            background-color: var(--vscode-editorWidget-background);
        }

        .auth-title {
            font-size: 1.4em;
            font-weight: bold;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .youtube-icon {
            font-size: 1.2em;
        }

        .auth-status {
            font-size: 1.1em;
            margin-bottom: 20px;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
        }

        .status-connected {
            background-color: #4CAF50;
            color: white;
        }

        .status-disconnected {
            background-color: var(--vscode-errorForeground);
            color: white;
        }

        .status-connecting {
            background-color: #FF9800;
            color: white;
        }

        .controls {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 1em;
            font-weight: bold;
            min-width: 120px;
        }

        .btn:hover {
            transform: translateY(-1px);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn-connect {
            background-color: #FF0000;
            color: white;
        }

        .btn-connect:hover:not(:disabled) {
            background-color: #CC0000;
        }

        .btn-disconnect {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
        }

        .btn-disconnect:hover:not(:disabled) {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .btn-refresh {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-refresh:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }

        .info-section {
            margin-top: 30px;
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 4px;
        }

        .info-title {
            font-weight: bold;
            margin-bottom: 10px;
        }

        .steps {
            margin: 15px 0;
        }

        .step {
            margin: 8px 0;
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }

        .step-number {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            font-weight: bold;
            flex-shrink: 0;
        }

        .step-text {
            flex: 1;
        }

        .warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            color: var(--vscode-inputValidation-warningForeground);
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
        }

        .loading {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 8px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="youtube-icon">🎥</span> YouTube Music</h1>
            <p style="color: var(--vscode-descriptionForeground); margin: 5px 0;">Connect your YouTube Music account</p>
        </div>

        <div class="auth-section">
            <div class="auth-title">
                <span class="youtube-icon">🎵</span>
                <span>YouTube Music Authentication</span>
            </div>

            <div id="authStatus" class="auth-status status-disconnected">
                Not connected to YouTube Music
            </div>

            <div id="userInfo" style="display: none; margin-bottom: 20px; text-align: center; color: var(--vscode-descriptionForeground);">
                <!-- User info will be populated here -->
            </div>

            <div class="controls">
                <button class="btn btn-connect" id="connectBtn" onclick="connectYouTube()">
                    🔗 Connect
                </button>
                <button class="btn btn-disconnect" id="disconnectBtn" onclick="disconnectYouTube()" style="display: none;">
                    🔌 Disconnect
                </button>
                <button class="btn btn-refresh" id="refreshBtn" onclick="refreshAuth()">
                    🔄 Refresh
                </button>
            </div>
        </div>

        <div class="info-section">
            <div class="info-title">📋 How to Connect:</div>
            <div class="steps">
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-text">Click the "Connect" button above</div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-text">Sign in to your Google/YouTube account when prompted</div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-text">Grant permissions for YouTube Music access</div>
                </div>
                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-text">Return to VSCode - you should now be connected!</div>
                </div>
            </div>

            <div class="warning">
                <strong>Note:</strong> You may need to allow popups in your browser for the authentication to work properly.
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        let authState = {
            isConnected: false,
            userInfo: '',
            canConnect: false
        };

        function connectYouTube() {
            const connectBtn = document.getElementById('connectBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            connectBtn.innerHTML = '<span class="loading"></span>Connecting...';
            connectBtn.disabled = true;

            vscode.postMessage({ command: 'connectYouTube' });
        }

        function disconnectYouTube() {
            const connectBtn = document.getElementById('connectBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            disconnectBtn.innerHTML = '<span class="loading"></span>Disconnecting...';
            disconnectBtn.disabled = true;

            vscode.postMessage({ command: 'disconnectYouTube' });
        }

        function refreshAuth() {
            const refreshBtn = document.getElementById('refreshBtn');
            refreshBtn.innerHTML = '<span class="loading"></span>Refreshing...';
            refreshBtn.disabled = true;

            vscode.postMessage({ command: 'refreshAuth' });

            // Re-enable button after 2 seconds
            setTimeout(() => {
                refreshBtn.innerHTML = '🔄 Refresh';
                refreshBtn.disabled = false;
            }, 2000);
        }

        function updateUI() {
            const authStatus = document.getElementById('authStatus');
            const userInfo = document.getElementById('userInfo');
            const connectBtn = document.getElementById('connectBtn');
            const disconnectBtn = document.getElementById('disconnectBtn');

            if (authState.isConnected) {
                authStatus.textContent = '✅ Connected to YouTube Music';
                authStatus.className = 'auth-status status-connected';
                userInfo.textContent = authState.userInfo;
                userInfo.style.display = 'block';
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-block';
            } else {
                authStatus.textContent = '❌ Not connected to YouTube Music';
                authStatus.className = 'auth-status status-disconnected';
                userInfo.style.display = 'none';
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
            }

            // Update button states
            connectBtn.disabled = false;
            disconnectBtn.disabled = false;
            connectBtn.innerHTML = '🔗 Connect';
            disconnectBtn.innerHTML = '🔌 Disconnect';
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.command === 'updateAuthState') {
                authState = message.authState;
                updateUI();
            }
        });

        // Initialize UI
        updateUI();
    </script>
</body>
</html>`;
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
