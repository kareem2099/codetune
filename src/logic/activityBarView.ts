import * as vscode from 'vscode';
import { MusicPlayer } from '../file/musicPlayer';
import { QuranPlayer } from '../file/quranPlayer';
import { SpotifyService } from './spotifyService';
import { MusicServiceManager } from './musicService';

export class ActivityBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeTuneMain';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private musicPlayer: MusicPlayer,
        private quranPlayer: QuranPlayer,
        private spotifyService: SpotifyService,
        private musicServiceManager: MusicServiceManager
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
                    case 'playMusic':
                        console.log('Playing local music:', data.track);
                        await this.musicPlayer.play(data.track);
                        this.updateStatus('localStatus', `Playing: ${data.track}`);
                        break;
                    case 'playQuran':
                        console.log('Playing Quran:', data.surah);
                        await this.quranPlayer.play(data.surah);
                        this.updateStatus('quranStatus', `Playing: ${data.surah}`);
                        break;
                    case 'connectSpotify':
                        console.log('Connecting to Spotify...');
                        await this.spotifyService.authenticate();
                        this.updateStatus('spotifyStatus', 'Connected');
                        break;
                    case 'connectYouTube':
                        console.log('Connecting to YouTube...');
                        await vscode.commands.executeCommand('codeTune.connectYouTube');
                        break;
                    case 'disconnectYouTube':
                        console.log('Disconnecting from YouTube...');
                        await vscode.commands.executeCommand('codeTune.disconnectYouTube');
                        break;
                    case 'searchMusic':
                        console.log('Searching music...');
                        await vscode.commands.executeCommand('codeTune.searchMusic');
                        break;
                    case 'searchSpotify':
                        console.log('Searching Spotify...');
                        await vscode.commands.executeCommand('codeTune.searchSpotify');
                        break;
                    case 'selectMusicService':
                        console.log('Selecting music service...');
                        await vscode.commands.executeCommand('codeTune.selectMusicService');
                        break;
                    case 'openPlayer':
                        console.log('Opening player...');
                        await vscode.commands.executeCommand('codeTune.openPlayer');
                        break;
                    case 'clearYouTubeCache':
                        console.log('Clearing YouTube cache...');
                        await vscode.commands.executeCommand('codeTune.clearYouTubeCache');
                        this.updateStatus('youtubeStatus', 'Cache cleared');
                        break;
                    case 'viewYouTubeSearchHistory':
                        console.log('Viewing YouTube search history...');
                        await vscode.commands.executeCommand('codeTune.viewYouTubeSearchHistory');
                        break;
                    case 'clearYouTubeSearchHistory':
                        console.log('Clearing YouTube search history...');
                        await vscode.commands.executeCommand('codeTune.clearYouTubeSearchHistory');
                        break;
                    case 'spotifyPlayPause':
                        console.log('Spotify play/pause...');
                        await vscode.commands.executeCommand('codeTune.pause');
                        break;
                    case 'spotifyNext':
                        console.log('Spotify next track...');
                        await vscode.commands.executeCommand('codeTune.skipToNext');
                        break;
                    case 'setLocalVolume':
                        console.log(`Local volume set to ${data.value}`);
                        // Handle volume change - you might want to add a method to set volume
                        break;
                    case 'setQuranVolume':
                        console.log(`Quran volume set to ${data.value}`);
                        // Handle volume change - you might want to add a method to set volume
                        break;
                    case 'testActivityBar':
                        console.log('Testing activity bar...');
                        this.updateStatus('testStatus', 'Activity Bar is working! ✅');
                        vscode.window.showInformationMessage('Activity Bar is working! ✅');
                        break;
                    case 'openYouTubeAuth':
                        console.log('Opening YouTube auth panel...');
                        await vscode.commands.executeCommand('codeTune.openYouTubeAuth');
                        break;
                    case 'webviewLoaded':
                        console.log('DEBUG: Webview loaded successfully!');
                        vscode.window.showInformationMessage('🎵 CodeTune Activity Bar Loaded!');
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

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CodeTune</title>
            <style>
                :root {
                    --primary-color: var(--vscode-button-background);
                    --primary-hover: var(--vscode-button-hoverBackground);
                    --success-color: #4caf50;
                    --warning-color: #ff9800;
                    --error-color: #f44336;
                    --info-color: #2196f3;
                }

                body {
                    padding: 12px;
                    margin: 0;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    line-height: 1.4;
                    overflow-x: hidden;
                }

                .app-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }

                .app-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .app-version {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 2px 6px;
                    border-radius: 10px;
                }

                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-height: calc(100vh - 80px);
                    overflow-y: auto;
                    overflow-x: hidden;
                }

                .section {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    background-color: var(--vscode-editorWidget-background);
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                .section:hover {
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .section-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    background-color: var(--vscode-toolbar-background);
                    cursor: pointer;
                    user-select: none;
                }

                .section-title {
                    font-weight: 600;
                    font-size: 12px;
                    color: var(--vscode-textLink-foreground);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .section-icon {
                    font-size: 14px;
                    opacity: 0.8;
                }

                .section-toggle {
                    font-size: 12px;
                    color: var(--vscode-icon-foreground);
                    transition: transform 0.2s ease;
                }

                .section-toggle.collapsed {
                    transform: rotate(-90deg);
                }

                .section-content {
                    padding: 12px;
                    transition: all 0.2s ease;
                }

                .section-content.collapsed {
                    display: none;
                }

                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .control-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .control-button {
                    background-color: var(--primary-color);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s ease;
                    min-height: 28px;
                    justify-content: center;
                    flex: 1;
                    min-width: 80px;
                }

                .control-button:hover {
                    background-color: var(--primary-hover);
                    transform: translateY(-1px);
                }

                .control-button:active {
                    transform: translateY(0);
                }

                .control-button.success {
                    background-color: var(--success-color);
                }

                .control-button.warning {
                    background-color: var(--warning-color);
                }

                .control-button.danger {
                    background-color: var(--error-color);
                }

                .control-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .status {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                    padding: 4px 8px;
                    border-radius: 4px;
                    background-color: var(--vscode-textBlockQuote-background);
                    border-left: 3px solid var(--vscode-textBlockQuote-border);
                    margin-top: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .status.success {
                    border-left-color: var(--success-color);
                    background-color: rgba(76, 175, 80, 0.1);
                }

                .status.warning {
                    border-left-color: var(--warning-color);
                    background-color: rgba(255, 152, 0, 0.1);
                }

                .status.error {
                    border-left-color: var(--error-color);
                    background-color: rgba(244, 67, 54, 0.1);
                }

                .search-input {
                    flex: 1;
                    min-width: 120px;
                    padding: 6px 10px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 4px;
                    font-size: 11px;
                    transition: all 0.2s ease;
                }

                .search-input:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
                }

                .volume-control {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 6px;
                }

                .volume-slider {
                    flex: 1;
                    height: 4px;
                    border-radius: 2px;
                    background: var(--vscode-scrollbarSlider-background);
                    outline: none;
                    -webkit-appearance: none;
                }

                .volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--vscode-button-background);
                    cursor: pointer;
                    border: 2px solid var(--vscode-button-foreground);
                }

                .volume-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--vscode-button-background);
                    cursor: pointer;
                    border: 2px solid var(--vscode-button-foreground);
                }

                .volume-value {
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground);
                    min-width: 35px;
                    text-align: right;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                    gap: 8px;
                    margin: 8px 0;
                }

                .grid-item {
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    padding: 10px 8px;
                    border-radius: 6px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 10px;
                    border: 1px solid transparent;
                }

                .grid-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                    border-color: var(--vscode-list-hoverBackground);
                    transform: translateY(-1px);
                }

                .grid-item.active {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                    border-color: var(--vscode-list-activeSelectionBackground);
                }

                .quick-actions {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
                    gap: 6px;
                    margin-top: 8px;
                }

                .quick-action {
                    background-color: var(--vscode-toolbar-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 4px;
                    padding: 6px;
                    text-align: center;
                    cursor: pointer;
                    font-size: 10px;
                    transition: all 0.2s ease;
                }

                .quick-action:hover {
                    background-color: var(--vscode-list-hoverBackground);
                    border-color: var(--vscode-focusBorder);
                }

                .connection-status {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 10px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                }

                .connection-status.connected {
                    background-color: var(--success-color);
                    color: white;
                }

                .connection-status.disconnected {
                    background-color: var(--error-color);
                    color: white;
                }

                .connection-status.connecting {
                    background-color: var(--warning-color);
                    color: white;
                }

                .loading {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border: 2px solid var(--vscode-descriptionForeground);
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s ease-in-out infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .tooltip {
                    position: relative;
                    display: inline-block;
                }

                .tooltip .tooltip-text {
                    visibility: hidden;
                    width: 120px;
                    background-color: var(--vscode-editorHoverWidget-background);
                    color: var(--vscode-editorHoverWidget-foreground);
                    text-align: center;
                    border-radius: 4px;
                    padding: 4px 8px;
                    position: absolute;
                    z-index: 1000;
                    bottom: 125%;
                    left: 50%;
                    margin-left: -60px;
                    font-size: 10px;
                    opacity: 0;
                    transition: opacity 0.3s;
                    border: 1px solid var(--vscode-widget-border);
                }

                .tooltip .tooltip-text::after {
                    content: "";
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    margin-left: -5px;
                    border-width: 5px;
                    border-style: solid;
                    border-color: var(--vscode-editorHoverWidget-background) transparent transparent transparent;
                }

                .tooltip:hover .tooltip-text {
                    visibility: visible;
                    opacity: 1;
                }

                .surah-select {
                    flex: 1;
                    min-width: 120px;
                    padding: 6px 10px;
                    background-color: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 4px;
                    font-size: 11px;
                }

                .surah-select:focus {
                    outline: none;
                    border-color: var(--vscode-focusBorder);
                }

                .compact-mode .section-content {
                    padding: 8px;
                }

                .compact-mode .control-button {
                    padding: 6px 8px;
                    font-size: 10px;
                }

                .compact-mode .grid {
                    gap: 4px;
                }

                .compact-mode .grid-item {
                    padding: 6px 4px;
                    font-size: 9px;
                }

                /* Quran-specific styles */
                .quran-quick-access {
                    margin-bottom: 12px;
                }

                .quick-access-title {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .quick-access-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                    margin-bottom: 8px;
                }

                .quick-surah-btn {
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 8px 4px;
                    cursor: pointer;
                    font-size: 9px;
                    transition: all 0.2s ease;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2px;
                    min-height: 50px;
                }

                .quick-surah-btn:hover {
                    background-color: var(--vscode-list-hoverBackground);
                    border-color: var(--vscode-focusBorder);
                    transform: translateY(-1px);
                }

                .quick-surah-btn:active {
                    transform: translateY(0);
                }

                .surah-number {
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    font-size: 10px;
                }

                .surah-name {
                    color: var(--vscode-foreground);
                    font-size: 8px;
                    text-align: center;
                    line-height: 1.2;
                }

                .surah-list-container {
                    margin: 8px 0;
                    padding: 8px;
                    background-color: var(--vscode-editorWidget-background);
                    border-radius: 6px;
                    border: 1px solid var(--vscode-panel-border);
                }

                .now-playing {
                    background-color: var(--vscode-editorWidget-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 10px;
                    margin-top: 8px;
                }

                .now-playing-title {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 6px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .now-playing-details {
                    font-size: 9px;
                    color: var(--vscode-descriptionForeground);
                    margin-bottom: 8px;
                    line-height: 1.3;
                }

                .progress-bar {
                    width: 100%;
                    height: 4px;
                    background-color: var(--vscode-scrollbarSlider-background);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-top: 4px;
                }

                .progress-fill {
                    height: 100%;
                    background-color: var(--vscode-progressBar-background);
                    width: 0%;
                    transition: width 0.3s ease;
                }

                .playback-mode-indicator {
                    font-size: 9px;
                    padding: 2px 6px;
                    border-radius: 10px;
                    background-color: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    margin-left: 8px;
                }

                .playback-mode-indicator.full {
                    background-color: var(--info-color);
                    color: white;
                }

                .playback-mode-indicator.ayah {
                    background-color: var(--success-color);
                    color: white;
                }

                @media (max-width: 300px) {
                    .control-row {
                        flex-direction: column;
                    }

                    .control-button {
                        width: 100%;
                    }

                    .grid {
                        grid-template-columns: 1fr;
                    }

                    .quick-access-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }

                    .quick-surah-btn {
                        min-height: 45px;
                        padding: 6px 2px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="app-header">
                <div class="app-title">
                    🎵 CodeTune
                    <span class="app-version">v2.0</span>
                </div>
                <button class="control-button compact-toggle" title="Toggle compact mode">
                    📱
                </button>
            </div>

            <div class="container">
                <!-- Test Section -->
                <div class="section">
                    <div class="section-header" onclick="toggleSection('test')">
                        <div class="section-title">
                            <span class="section-icon">🧪</span>
                            Test Activity Bar
                            <span class="connection-status" id="testStatus">Ready</span>
                        </div>
                        <span class="section-toggle" id="testToggle">▼</span>
                    </div>
                    <div class="section-content" id="testContent">
                        <div class="controls">
                            <div class="control-row">
                                <button class="control-button success" onclick="testActivityBar()">
                                    ✅ Test Activity Bar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- YouTube Music Section -->
                <div class="section">
                    <div class="section-header" onclick="toggleSection('youtube')">
                        <div class="section-title">
                            <span class="section-icon">🎵</span>
                            YouTube Music
                            <span class="connection-status" id="youtubeConnectionStatus">Disconnected</span>
                        </div>
                        <span class="section-toggle" id="youtubeToggle">▼</span>
                    </div>
                    <div class="section-content" id="youtubeContent">
                        <div class="controls">
                            <div class="control-row">
                                <button class="control-button" onclick="connectYouTube()">
                                    🔗 Connect
                                </button>
                                <button class="control-button danger" onclick="disconnectYouTube()">
                                    🔌 Disconnect
                                </button>
                            </div>
                            <div class="control-row">
                                <input type="text" class="search-input" placeholder="Search music..." id="youtubeSearch" onkeypress="handleKeyPress(event, 'searchYouTube')">
                                <button class="control-button" onclick="searchYouTube()">
                                    🔍 Search
                                </button>
                            </div>
                            <div class="quick-actions">
                                <div class="quick-action" onclick="openYouTubePlayer()" title="Open full player">
                                    🎵 Player
                                </div>
                                <div class="quick-action" onclick="openYouTubeAuth()" title="Authentication panel">
                                    🔐 Auth
                                </div>
                                <div class="quick-action" onclick="clearYouTubeCache()" title="Clear cached data">
                                    🗑️ Cache
                                </div>
                            </div>
                            <div class="status" id="youtubeStatus">
                                Ready to search and play music
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Spotify Section -->
                <div class="section">
                    <div class="section-header" onclick="toggleSection('spotify')">
                        <div class="section-title">
                            <span class="section-icon">🎵</span>
                            Spotify
                            <span class="connection-status" id="spotifyConnectionStatus">Disconnected</span>
                        </div>
                        <span class="section-toggle" id="spotifyToggle">▼</span>
                    </div>
                    <div class="section-content" id="spotifyContent">
                        <div class="controls">
                            <div class="control-row">
                                <button class="control-button" onclick="connectSpotify()">
                                    🔗 Connect
                                </button>
                                <button class="control-button" onclick="searchSpotify()">
                                    🔍 Search
                                </button>
                            </div>
                            <div class="control-row">
                                <button class="control-button" onclick="spotifyPlayPause()">
                                    ⏯️ Play/Pause
                                </button>
                                <button class="control-button" onclick="spotifyNext()">
                                    ⏭️ Next
                                </button>
                            </div>
                            <div class="status" id="spotifyStatus">
                                Connect to start playing music
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Local Music Section -->
                <div class="section">
                    <div class="section-header" onclick="toggleSection('local')">
                        <div class="section-title">
                            <span class="section-icon">🎹</span>
                            Local Music
                            <span class="connection-status connected">Available</span>
                        </div>
                        <span class="section-toggle" id="localToggle">▼</span>
                    </div>
                    <div class="section-content" id="localContent">
                        <div class="controls">
                            <div class="grid">
                                <div class="grid-item" onclick="playLocal('peaceful-coding')" title="Peaceful coding music">
                                    🧘 Peaceful
                                </div>
                                <div class="grid-item" onclick="playLocal('focus-music')" title="Focus enhancing music">
                                    🎯 Focus
                                </div>
                                <div class="grid-item" onclick="playLocal('meditation')" title="Meditation sounds">
                                    🧘‍♀️ Meditation
                                </div>
                                <div class="grid-item" onclick="playLocal('nature-sounds')" title="Nature sounds">
                                    🌿 Nature
                                </div>
                            </div>
                            <div class="volume-control">
                                <span style="font-size: 10px;">🔊</span>
                                <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.5" oninput="setLocalVolume(this.value)">
                                <span class="volume-value" id="localVolume">50%</span>
                            </div>
                            <div class="status" id="localStatus">
                                Select a preset or use the main player
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quran Section -->
                <div class="section">
                    <div class="section-header" onclick="toggleSection('quran')">
                        <div class="section-title">
                            <span class="section-icon">📿</span>
                            Quran
                            <span class="connection-status connected" id="quranConnectionStatus">Available</span>
                        </div>
                        <span class="section-toggle" id="quranToggle">▼</span>
                    </div>
                    <div class="section-content" id="quranContent">
                        <div class="controls">
                            <!-- Quick Access Surahs -->
                            <div class="quran-quick-access">
                                <div class="quick-access-title">Quick Access</div>
                                <div class="quick-access-grid">
                                    <button class="quick-surah-btn" onclick="playQuickSurah('036')" title="Ya-Sin (يس)">
                                        <span class="surah-number">36</span>
                                        <span class="surah-name">يس</span>
                                    </button>
                                    <button class="quick-surah-btn" onclick="playQuickSurah('055')" title="Ar-Rahman (الرحمن)">
                                        <span class="surah-number">55</span>
                                        <span class="surah-name">الرحمن</span>
                                    </button>
                                    <button class="quick-surah-btn" onclick="playQuickSurah('067')" title="Al-Mulk (الملك)">
                                        <span class="surah-number">67</span>
                                        <span class="surah-name">الملك</span>
                                    </button>
                                    <button class="quick-surah-btn" onclick="playQuickSurah('112')" title="Al-Ikhlas (الإخلاص)">
                                        <span class="surah-number">112</span>
                                        <span class="surah-name">الإخلاص</span>
                                    </button>
                                    <button class="quick-surah-btn" onclick="playQuickSurah('001')" title="Al-Fatiha (الفاتحة)">
                                        <span class="surah-number">1</span>
                                        <span class="surah-name">الفاتحة</span>
                                    </button>
                                    <button class="quick-surah-btn" onclick="playQuickSurah('114')" title="An-Nas (الناس)">
                                        <span class="surah-number">114</span>
                                        <span class="surah-name">الناس</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Search and Selection -->
                            <div class="control-row">
                                <input type="text" class="search-input" placeholder="Search Surah..." id="quranSearch" oninput="filterSurahs()" onkeypress="handleKeyPress(event, 'searchQuran')">
                                <button class="control-button" onclick="toggleSurahList()" title="Browse all Surahs">
                                    📖 Browse
                                </button>
                            </div>

                            <!-- Surah List (Collapsible) -->
                            <div class="surah-list-container" id="surahListContainer" style="display: none;">
                                <select class="surah-select" id="surahSelect" onchange="selectSurah()">
                                    <option value="">Select Surah...</option>
                                    <option value="001 - Al-Fatiha">001 - Al-Fatiha (الفاتحة)</option>
                                    <option value="002 - Al-Baqarah">002 - Al-Baqarah (البقرة)</option>
                                    <option value="003 - Aal-E-Imran">003 - Aal-E-Imran (آل عمران)</option>
                                    <option value="004 - An-Nisa">004 - An-Nisa (النساء)</option>
                                    <option value="005 - Al-Maida">005 - Al-Maida (المائدة)</option>
                                    <option value="006 - Al-Anaam">006 - Al-Anaam (الأنعام)</option>
                                    <option value="007 - Al-Araf">007 - Al-Araf (الأعراف)</option>
                                    <option value="008 - Al-Anfal">008 - Al-Anfal (الأنفال)</option>
                                    <option value="009 - At-Tawba">009 - At-Tawba (التوبة)</option>
                                    <option value="010 - Yunus">010 - Yunus (يونس)</option>
                                    <option value="011 - Hud">011 - Hud (هود)</option>
                                    <option value="012 - Yusuf">012 - Yusuf (يوسف)</option>
                                    <option value="013 - Ar-Rad">013 - Ar-Rad (الرعد)</option>
                                    <option value="014 - Ibrahim">014 - Ibrahim (إبراهيم)</option>
                                    <option value="015 - Al-Hijr">015 - Al-Hijr (الحجر)</option>
                                    <option value="016 - An-Nahl">016 - An-Nahl (النحل)</option>
                                    <option value="017 - Al-Isra">017 - Al-Isra (الإسراء)</option>
                                    <option value="018 - Al-Kahf">018 - Al-Kahf (الكهف)</option>
                                    <option value="019 - Maryam">019 - Maryam (مريم)</option>
                                    <option value="020 - Ta-Ha">020 - Ta-Ha (طه)</option>
                                    <option value="021 - Al-Anbiya">021 - Al-Anbiya (الأنبياء)</option>
                                    <option value="022 - Al-Hajj">022 - Al-Hajj (الحج)</option>
                                    <option value="023 - Al-Muminun">023 - Al-Muminun (المؤمنون)</option>
                                    <option value="024 - An-Nur">024 - An-Nur (النور)</option>
                                    <option value="025 - Al-Furqan">025 - Al-Furqan (الفرقان)</option>
                                    <option value="026 - Ash-Shuara">026 - Ash-Shuara (الشعراء)</option>
                                    <option value="027 - An-Naml">027 - An-Naml (النمل)</option>
                                    <option value="028 - Al-Qasas">028 - Al-Qasas (القصص)</option>
                                    <option value="029 - Al-Ankabut">029 - Al-Ankabut (العنكبوت)</option>
                                    <option value="030 - Ar-Rum">030 - Ar-Rum (الروم)</option>
                                    <option value="031 - Luqman">031 - Luqman (لقمان)</option>
                                    <option value="032 - As-Sajda">032 - As-Sajda (السجدة)</option>
                                    <option value="033 - Al-Ahzab">033 - Al-Ahzab (الأحزاب)</option>
                                    <option value="034 - Saba">034 - Saba (سبأ)</option>
                                    <option value="035 - Fatir">035 - Fatir (فاطر)</option>
                                    <option value="036 - Ya-Sin">036 - Ya-Sin (يس)</option>
                                    <option value="037 - As-Saffat">037 - As-Saffat (الصافات)</option>
                                    <option value="038 - Sad">038 - Sad (ص)</option>
                                    <option value="039 - Az-Zumar">039 - Az-Zumar (الزمر)</option>
                                    <option value="040 - Ghafir">040 - Ghafir (غافر)</option>
                                    <option value="041 - Fussilat">041 - Fussilat (فصلت)</option>
                                    <option value="042 - Ash-Shura">042 - Ash-Shura (الشورى)</option>
                                    <option value="043 - Az-Zukhruf">043 - Az-Zukhruf (الزخرف)</option>
                                    <option value="044 - Ad-Dukhan">044 - Ad-Dukhan (الدخان)</option>
                                    <option value="045 - Al-Jathiya">045 - Al-Jathiya (الجاثية)</option>
                                    <option value="046 - Al-Ahqaf">046 - Al-Ahqaf (الأحقاف)</option>
                                    <option value="047 - Muhammad">047 - Muhammad (محمد)</option>
                                    <option value="048 - Al-Fath">048 - Al-Fath (الفتح)</option>
                                    <option value="049 - Al-Hujurat">049 - Al-Hujurat (الحجرات)</option>
                                    <option value="050 - Qaf">050 - Qaf (ق)</option>
                                    <option value="051 - Adh-Dhariyat">051 - Adh-Dhariyat (الذاريات)</option>
                                    <option value="052 - At-Tur">052 - At-Tur (الطور)</option>
                                    <option value="053 - An-Najm">053 - An-Najm (النجم)</option>
                                    <option value="054 - Al-Qamar">054 - Al-Qamar (القمر)</option>
                                    <option value="055 - Ar-Rahman">055 - Ar-Rahman (الرحمن)</option>
                                    <option value="056 - Al-Waqia">056 - Al-Waqia (الواقعة)</option>
                                    <option value="057 - Al-Hadid">057 - Al-Hadid (الحديد)</option>
                                    <option value="058 - Al-Mujadila">058 - Al-Mujadila (المجادلة)</option>
                                    <option value="059 - Al-Hashr">059 - Al-Hashr (الحشر)</option>
                                    <option value="060 - Al-Mumtahina">060 - Al-Mumtahina (الممتحنة)</option>
                                    <option value="061 - As-Saff">061 - As-Saff (الصف)</option>
                                    <option value="062 - Al-Jumu'a">062 - Al-Jumu'a (الجمعة)</option>
                                    <option value="063 - Al-Munafiqun">063 - Al-Munafiqun (المنافقون)</option>
                                    <option value="064 - At-Taghabun">064 - At-Taghabun (التغابن)</option>
                                    <option value="065 - At-Talaq">065 - At-Talaq (الطلاق)</option>
                                    <option value="066 - At-Tahrim">066 - At-Tahrim (التحريم)</option>
                                    <option value="067 - Al-Mulk">067 - Al-Mulk (الملك)</option>
                                    <option value="068 - Al-Qalam">068 - Al-Qalam (القلم)</option>
                                    <option value="069 - Al-Haaqqa">069 - Al-Haaqqa (الحاقة)</option>
                                    <option value="070 - Al-Maarij">070 - Al-Maarij (المعارج)</option>
                                    <option value="071 - Nuh">071 - Nuh (نوح)</option>
                                    <option value="072 - Al-Jinn">072 - Al-Jinn (الجن)</option>
                                    <option value="073 - Al-Muzzammil">073 - Al-Muzzammil (المزمل)</option>
                                    <option value="074 - Al-Muddathir">074 - Al-Muddathir (المدثر)</option>
                                    <option value="075 - Al-Qiyama">075 - Al-Qiyama (القيامة)</option>
                                    <option value="076 - Al-Insan">076 - Al-Insan (الإنسان)</option>
                                    <option value="077 - Al-Mursalat">077 - Al-Mursalat (المرسلات)</option>
                                    <option value="078 - An-Naba">078 - An-Naba (النبأ)</option>
                                    <option value="079 - An-Naziat">079 - An-Naziat (النازعات)</option>
                                    <option value="080 - Abasa">080 - Abasa (عبس)</option>
                                    <option value="081 - At-Takwir">081 - At-Takwir (التكوير)</option>
                                    <option value="082 - Al-Infitar">082 - Al-Infitar (الإنفطار)</option>
                                    <option value="083 - Al-Mutaffifin">083 - Al-Mutaffifin (المطففين)</option>
                                    <option value="084 - Al-Inshiqaq">084 - Al-Inshiqaq (الإنشقاق)</option>
                                    <option value="085 - Al-Buruj">085 - Al-Buruj (البروج)</option>
                                    <option value="086 - At-Tariq">086 - At-Tariq (الطارق)</option>
                                    <option value="087 - Al-Ala">087 - Al-Ala (الأعلى)</option>
                                    <option value="088 - Al-Ghashiya">088 - Al-Ghashiya (الغاشية)</option>
                                    <option value="089 - Al-Fajr">089 - Al-Fajr (الفجر)</option>
                                    <option value="090 - Al-Balad">090 - Al-Balad (البلد)</option>
                                    <option value="091 - Ash-Shams">091 - Ash-Shams (الشمس)</option>
                                    <option value="092 - Al-Lail">092 - Al-Lail (الليل)</option>
                                    <option value="093 - Ad-Duha">093 - Ad-Duha (الضحى)</option>
                                    <option value="094 - Ash-Sharh">094 - Ash-Sharh (الشرح)</option>
                                    <option value="095 - At-Tin">095 - At-Tin (التين)</option>
                                    <option value="096 - Al-Alaq">096 - Al-Alaq (العلق)</option>
                                    <option value="097 - Al-Qadr">097 - Al-Qadr (القدر)</option>
                                    <option value="098 - Al-Bayyina">098 - Al-Bayyina (البينة)</option>
                                    <option value="099 - Az-Zalzala">099 - Az-Zalzala (الزلزلة)</option>
                                    <option value="100 - Al-Adiyat">100 - Al-Adiyat (العاديات)</option>
                                    <option value="101 - Al-Qaria">101 - Al-Qaria (القارعة)</option>
                                    <option value="102 - At-Takathur">102 - At-Takathur (التكاثر)</option>
                                    <option value="103 - Al-Asr">103 - Al-Asr (العصر)</option>
                                    <option value="104 - Al-Humaza">104 - Al-Humaza (الهمزة)</option>
                                    <option value="105 - Al-Fil">105 - Al-Fil (الفيل)</option>
                                    <option value="106 - Quraish">106 - Quraish (قريش)</option>
                                    <option value="107 - Al-Ma'un">107 - Al-Ma'un (الماعون)</option>
                                    <option value="108 - Al-Kawthar">108 - Al-Kawthar (الكوثر)</option>
                                    <option value="109 - Al-Kafirun">109 - Al-Kafirun (الكافرون)</option>
                                    <option value="110 - An-Nasr">110 - An-Nasr (النصر)</option>
                                    <option value="111 - Al-Masad">111 - Al-Masad (المسد)</option>
                                    <option value="112 - Al-Ikhlas">112 - Al-Ikhlas (الإخلاص)</option>
                                    <option value="113 - Al-Falaq">113 - Al-Falaq (الفلق)</option>
                                    <option value="114 - An-Nas">114 - An-Nas (الناس)</option>
                                </select>
                            </div>

                            <!-- Playback Controls -->
                            <div class="control-row">
                                <button class="control-button" onclick="playQuran()" id="playQuranBtn" title="Play selected Surah">
                                    🎵 Play
                                </button>
                                <button class="control-button" onclick="pauseQuran()" id="pauseQuranBtn" title="Pause/Resume" style="display: none;">
                                    ⏸️ Pause
                                </button>
                                <button class="control-button" onclick="stopQuran()" id="stopQuranBtn" title="Stop recitation" style="display: none;">
                                    ⏹️ Stop
                                </button>
                            </div>

                            <!-- Reciter and Settings -->
                            <div class="control-row">
                                <button class="control-button" onclick="selectReciter()" title="Choose Quran reciter">
                                    🎤 Reciter
                                </button>
                                <button class="control-button" onclick="toggleStreamingMode()" id="streamingModeBtn" title="Toggle streaming mode">
                                    🌐 Stream
                                </button>
                                <button class="control-button" onclick="togglePlaybackMode()" id="playbackModeBtn" title="Toggle playback mode">
                                    📖 Mode
                                </button>
                            </div>

                            <!-- Volume Control -->
                            <div class="volume-control">
                                <span style="font-size: 10px;">🔊</span>
                                <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.7" oninput="setQuranVolume(this.value)">
                                <span class="volume-value" id="quranVolume">70%</span>
                            </div>

                            <!-- Current Status -->
                            <div class="status" id="quranStatus">
                                Choose a Surah to begin recitation
                            </div>

                            <!-- Now Playing Info -->
                            <div class="now-playing" id="nowPlayingInfo" style="display: none;">
                                <div class="now-playing-title" id="nowPlayingTitle">Now Playing</div>
                                <div class="now-playing-details" id="nowPlayingDetails"></div>
                                <div class="progress-bar">
                                    <div class="progress-fill" id="quranProgress"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();

                // Debug: Test if webview is working
                console.log('DEBUG: Webview script loaded successfully');
                vscode.postMessage({ type: 'webviewLoaded' });

                // State management
                let compactMode = false;
                let collapsedSections = new Set(['test']); // Test section collapsed by default

                // Initialize the UI
                document.addEventListener('DOMContentLoaded', function() {
                    console.log('DEBUG: DOM Content Loaded');
                    initializeSections();
                    updateConnectionStatus();
                    setupEventListeners();

                    // Test all buttons immediately
                    setTimeout(() => {
                        console.log('DEBUG: Testing all buttons...');
                        testAllButtons();
                    }, 1000);
                });

                function setupEventListeners() {
                    // Add event listeners for all buttons to replace inline onclick handlers
                    document.querySelectorAll('.section-header').forEach(header => {
                        header.addEventListener('click', function() {
                            const sectionId = this.id.replace('Header', '').replace('Toggle', '');
                            if (sectionId) {
                                toggleSection(sectionId);
                            }
                        });
                    });

                    // Compact mode toggle
                    document.querySelector('.compact-toggle')?.addEventListener('click', toggleCompactMode);

                    // Test button
                    document.querySelector('.control-button.success')?.addEventListener('click', testActivityBar);

                    // YouTube buttons
                    document.querySelectorAll('.control-button')[1]?.addEventListener('click', connectYouTube);
                    document.querySelectorAll('.control-button')[2]?.addEventListener('click', disconnectYouTube);
                    document.querySelectorAll('.control-button')[3]?.addEventListener('click', searchYouTube);

                    // Quick actions
                    document.querySelectorAll('.quick-action')[0]?.addEventListener('click', openYouTubePlayer);
                    document.querySelectorAll('.quick-action')[1]?.addEventListener('click', openYouTubeAuth);
                    document.querySelectorAll('.quick-action')[2]?.addEventListener('click', clearYouTubeCache);

                    // Spotify buttons
                    document.querySelectorAll('.control-button')[5]?.addEventListener('click', connectSpotify);
                    document.querySelectorAll('.control-button')[6]?.addEventListener('click', searchSpotify);
                    document.querySelectorAll('.control-button')[7]?.addEventListener('click', spotifyPlayPause);
                    document.querySelectorAll('.control-button')[8]?.addEventListener('click', spotifyNext);

                    // Local music grid items
                    document.querySelectorAll('.grid-item').forEach((item, index) => {
                        const tracks = ['peaceful-coding', 'focus-music', 'meditation', 'nature-sounds'];
                        item.addEventListener('click', () => playLocal(tracks[index]));
                    });

                    // Quran play button
                    document.querySelectorAll('.control-button')[9]?.addEventListener('click', playQuran);
                }

                function testAllButtons() {
                    // Test each button by simulating clicks
                    const buttons = document.querySelectorAll('.control-button');
                    buttons.forEach((button, index) => {
                        setTimeout(() => {
                            console.log('DEBUG: Testing button', index, button.textContent);
                            button.click();
                        }, index * 500);
                    });
                }

                function initializeSections() {
                    // Collapse sections that should be collapsed by default
                    collapsedSections.forEach(function(sectionId) {
                        toggleSection(sectionId, false);
                    });
                }

                function toggleSection(sectionId, animate) {
                    if (animate === void 0) { animate = true; }
                    const content = document.getElementById(sectionId + 'Content');
                    const toggle = document.getElementById(sectionId + 'Toggle');
                    if (!content || !toggle) return;
                    const isCollapsed = collapsedSections.has(sectionId);
                    if (isCollapsed) {
                        collapsedSections.delete(sectionId);
                        content.classList.remove('collapsed');
                        toggle.classList.remove('collapsed');
                        toggle.textContent = '▼';
                    } else {
                        collapsedSections.add(sectionId);
                        content.classList.add('collapsed');
                        toggle.classList.add('collapsed');
                        toggle.textContent = '▶';
                    }
                }

                function toggleCompactMode() {
                    compactMode = !compactMode;
                    document.body.classList.toggle('compact-mode', compactMode);
                    const button = event.target;
                    button.textContent = compactMode ? '📱' : '🖥️';
                    button.title = compactMode ? 'Switch to normal mode' : 'Switch to compact mode';
                    // Save preference
                    vscode.postMessage({ type: 'setCompactMode', value: compactMode });
                }

                function handleKeyPress(event, action) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        switch(action) {
                            case 'searchYouTube':
                                searchYouTube();
                                break;
                        }
                    }
                }

                function updateConnectionStatus() {
                    // Update connection status indicators
                    updateYouTubeConnectionStatus();
                    updateSpotifyConnectionStatus();
                }

                function updateYouTubeConnectionStatus() {
                    const statusElement = document.getElementById('youtubeConnectionStatus');
                    if (statusElement) {
                        // This would be updated based on actual connection state
                        statusElement.textContent = 'Disconnected';
                        statusElement.className = 'connection-status disconnected';
                    }
                }

                function updateSpotifyConnectionStatus() {
                    const statusElement = document.getElementById('spotifyConnectionStatus');
                    if (statusElement) {
                        // This would be updated based on actual connection state
                        statusElement.textContent = 'Disconnected';
                        statusElement.className = 'connection-status disconnected';
                    }
                }

                // Music service functions
                function searchYouTube() {
                    const query = document.getElementById('youtubeSearch').value.trim();
                    if (query) {
                        showLoading('youtubeStatus');
                        vscode.postMessage({ type: 'searchMusic', query: query });
                    } else {
                        updateStatus('youtubeStatus', 'Please enter a search term', 'warning');
                    }
                }

                function openYouTubePlayer() {
                    vscode.postMessage({ type: 'openPlayer' });
                }

                function clearYouTubeCache() {
                    showLoading('youtubeStatus');
                    vscode.postMessage({ type: 'clearYouTubeCache' });
                    updateStatus('youtubeStatus', 'Cache cleared successfully', 'success');
                }

                function connectYouTube() {
                    showLoading('youtubeConnectionStatus');
                    vscode.postMessage({ type: 'connectYouTube' });
                }

                function disconnectYouTube() {
                    vscode.postMessage({ type: 'disconnectYouTube' });
                    updateYouTubeConnectionStatus();
                }

                function connectSpotify() {
                    showLoading('spotifyConnectionStatus');
                    vscode.postMessage({ type: 'connectSpotify' });
                }

                function searchSpotify() {
                    vscode.postMessage({ type: 'searchSpotify' });
                }

                function spotifyPlayPause() {
                    vscode.postMessage({ type: 'spotifyPlayPause' });
                }

                function spotifyNext() {
                    vscode.postMessage({ type: 'spotifyNext' });
                }

                function playLocal(track) {
                    vscode.postMessage({ type: 'playMusic', track: track });
                    updateStatus('localStatus', 'Playing: ' + track, 'success');
                }

                function setLocalVolume(value) {
                    const percentage = Math.round(value * 100);
                    document.getElementById('localVolume').textContent = percentage + '%';
                    vscode.postMessage({ type: 'setLocalVolume', value: parseFloat(value) });
                }

                function playQuran() {
                    const surah = document.getElementById('surahSelect').value;
                    if (surah) {
                        vscode.postMessage({ type: 'playQuran', surah: surah });
                        updateStatus('quranStatus', 'Playing: ' + surah, 'success');
                    } else {
                        updateStatus('quranStatus', 'Please select a Surah first', 'warning');
                    }
                }

                function setQuranVolume(value) {
                    const percentage = Math.round(value * 100);
                    document.getElementById('quranVolume').textContent = percentage + '%';
                    vscode.postMessage({ type: 'setQuranVolume', value: parseFloat(value) });
                }

                function testActivityBar() {
                    showLoading('testStatus');
                    vscode.postMessage({ type: 'testActivityBar' });
                    setTimeout(function() {
                        updateStatus('testStatus', 'Activity Bar is working! ✅', 'success');
                    }, 500);
                }

                function openYouTubeAuth() {
                    vscode.postMessage({ type: 'openYouTubeAuth' });
                }

                function selectReciter() {
                    vscode.postMessage({ type: 'selectReciter' });
                }

                function toggleStreamingMode() {
                    vscode.postMessage({ type: 'toggleStreamingMode' });
                }

                // Quran-specific functions
                let currentQuranState = {
                    isPlaying: false,
                    currentSurah: null,
                    playbackMode: 'full', // 'full' or 'ayah'
                    currentAyah: 1
                };

                function playQuickSurah(surahNumber) {
                    const surahSelect = document.getElementById('surahSelect');
                    const options = surahSelect.options;

                    for (let i = 0; i < options.length; i++) {
                        if (options[i].value.startsWith(surahNumber.padStart(3, '0'))) {
                            surahSelect.selectedIndex = i;
                            playQuran();
                            break;
                        }
                    }
                }

                function filterSurahs() {
                    const searchInput = document.getElementById('quranSearch');
                    const filter = searchInput.value.toLowerCase();
                    const surahSelect = document.getElementById('surahSelect');
                    const options = surahSelect.options;

                    for (let i = 1; i < options.length; i++) {
                        const option = options[i];
                        const text = option.text.toLowerCase();
                        const shouldShow = text.includes(filter);
                        option.style.display = shouldShow ? 'block' : 'none';
                    }
                }

                function toggleSurahList() {
                    const container = document.getElementById('surahListContainer');
                    const isVisible = container.style.display !== 'none';

                    if (isVisible) {
                        container.style.display = 'none';
                    } else {
                        container.style.display = 'block';
                        // Focus the search input
                        document.getElementById('quranSearch').focus();
                    }
                }

                function selectSurah() {
                    const surahSelect = document.getElementById('surahSelect');
                    const selectedSurah = surahSelect.value;

                    if (selectedSurah) {
                        updateStatus('quranStatus', 'Selected: ' + selectedSurah, 'info');
                    }
                }

                function pauseQuran() {
                    if (currentQuranState.isPlaying) {
                        vscode.postMessage({ type: 'pauseQuran' });
                        currentQuranState.isPlaying = false;
                        updateQuranControls();
                        updateStatus('quranStatus', 'Quran paused', 'warning');
                    } else {
                        vscode.postMessage({ type: 'resumeQuran' });
                        currentQuranState.isPlaying = true;
                        updateQuranControls();
                        updateStatus('quranStatus', 'Quran resumed', 'success');
                    }
                }

                function stopQuran() {
                    vscode.postMessage({ type: 'stopQuran' });
                    currentQuranState.isPlaying = false;
                    currentQuranState.currentSurah = null;
                    currentQuranState.currentAyah = 1;
                    updateQuranControls();
                    updateStatus('quranStatus', 'Quran stopped', 'info');
                    hideNowPlaying();
                }

                function togglePlaybackMode() {
                    currentQuranState.playbackMode = currentQuranState.playbackMode === 'full' ? 'ayah' : 'full';
                    const modeBtn = document.getElementById('playbackModeBtn');

                    if (currentQuranState.playbackMode === 'full') {
                        modeBtn.textContent = '📖 Full';
                        modeBtn.title = 'Play full Surah';
                    } else {
                        modeBtn.textContent = '📝 Ayah';
                        modeBtn.title = 'Play Ayah by Ayah';
                    }

                    vscode.postMessage({
                        type: 'setPlaybackMode',
                        mode: currentQuranState.playbackMode
                    });
                }

                function updateQuranControls() {
                    const playBtn = document.getElementById('playQuranBtn');
                    const pauseBtn = document.getElementById('pauseQuranBtn');
                    const stopBtn = document.getElementById('stopQuranBtn');

                    if (currentQuranState.isPlaying) {
                        playBtn.style.display = 'none';
                        pauseBtn.style.display = 'inline-flex';
                        stopBtn.style.display = 'inline-flex';
                    } else {
                        playBtn.style.display = 'inline-flex';
                        pauseBtn.style.display = 'none';
                        stopBtn.style.display = 'none';
                    }
                }

                function showNowPlaying(surah, mode, progress) {
                    if (progress === void 0) { progress = 0; }
                    const nowPlayingInfo = document.getElementById('nowPlayingInfo');
                    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
                    const nowPlayingDetails = document.getElementById('nowPlayingDetails');
                    const progressFill = document.getElementById('quranProgress');

                    nowPlayingTitle.innerHTML = '🎵 Now Playing';
                    nowPlayingDetails.innerHTML =
                        '<strong>' + surah.name + '</strong> (' + surah.transliteration + ')<br>' +
                        '<small>Mode: ' + (mode === 'full' ? 'Full Surah' : 'Ayah by Ayah') + '</small>';

                    progressFill.style.width = progress + '%';
                    nowPlayingInfo.style.display = 'block';
                }

                function hideNowPlaying() {
                    const nowPlayingInfo = document.getElementById('nowPlayingInfo');
                    nowPlayingInfo.style.display = 'none';
                }

                function updateQuranProgress(progress) {
                    const progressFill = document.getElementById('quranProgress');
                    if (progressFill) {
                        progressFill.style.width = progress + '%';
                    }
                }

                // Enhanced playQuran function
                function playQuran() {
                    const surahSelect = document.getElementById('surahSelect');
                    const surah = surahSelect.value;

                    if (surah) {
                        currentQuranState.isPlaying = true;
                        currentQuranState.currentSurah = surah;
                        updateQuranControls();

                        vscode.postMessage({
                            type: 'playQuran',
                            surah: surah,
                            mode: currentQuranState.playbackMode
                        });

                        // Show loading state
                        showLoading('quranStatus');
                        updateStatus('quranStatus', 'Loading ' + surah + '...', 'info');
                    } else {
                        updateStatus('quranStatus', 'Please select a Surah first', 'warning');
                    }
                }

                // Enhanced setQuranVolume function
                function setQuranVolume(value) {
                    const percentage = Math.round(value * 100);
                    document.getElementById('quranVolume').textContent = percentage + '%';
                    vscode.postMessage({ type: 'setQuranVolume', value: parseFloat(value) });
                }

                // Utility functions
                function showLoading(elementId) {
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.innerHTML = '<span class="loading"></span> Loading...';
                    }
                }

                function updateStatus(elementId, message, type) {
                    if (type === void 0) { type = 'info'; }
                    const element = document.getElementById(elementId);
                    if (element) {
                        element.textContent = message;
                        element.className = 'status ' + type;
                    }
                }

                function showNotification(message, type) {
                    if (type === void 0) { type = 'info'; }
                    // Create a temporary notification
                    const notification = document.createElement('div');
                    notification.className = 'status ' + type;
                    notification.textContent = message;
                    notification.style.position = 'fixed';
                    notification.style.top = '10px';
                    notification.style.right = '10px';
                    notification.style.zIndex = '1000';
                    notification.style.padding = '8px 12px';
                    notification.style.borderRadius = '4px';
                    notification.style.fontSize = '11px';
                    document.body.appendChild(notification);
                    setTimeout(function() {
                        notification.remove();
                    }, 3000);
                }

                // Keyboard shortcuts
                document.addEventListener('keydown', function(event) {
                    // Global shortcuts
                    if (event.ctrlKey || event.metaKey) {
                        switch(event.key) {
                            case 'Enter':
                                // Quick search if focus is in search input
                                if (document.activeElement.id === 'youtubeSearch') {
                                    event.preventDefault();
                                    searchYouTube();
                                }
                                break;
                            case 'k':
                                // Focus search (like VSCode)
                                event.preventDefault();
                                var searchInput = document.getElementById('youtubeSearch');
                                if (searchInput) {
                                    searchInput.focus();
                                }
                                break;
                        }
                    }
                    // Escape key to clear focus
                    if (event.key === 'Escape') {
                        if (document.activeElement) {
                            document.activeElement.blur();
                        }
                    }
                });

                // Audio streaming functionality
                var currentAudio = null;
                var isStreaming = false;

                function streamQuran(url, surah, mode) {
                    console.log('DEBUG: Streaming Quran from:', url);

                    // VSCode webviews have audio restrictions, so we'll use a different approach
                    // Instead of HTML5 audio, we'll open the audio in the user's default browser

                    try {
                        // Create a temporary link element to open audio in browser
                        const link = document.createElement('a');
                        link.href = url;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                        link.style.display = 'none';

                        // Add to document and click
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        console.log('DEBUG: Opened audio in browser:', url);
                        updateStatus('quranStatus', 'Playing ' + surah.name + ' in browser', 'success');

                        // Show notification to user
                        vscode.postMessage({
                            type: 'showNotification',
                            message: '🎵 Playing ' + surah.name + ' in your browser',
                            notificationType: 'info'
                        });

                    } catch (error) {
                        console.error('DEBUG: Error opening audio in browser:', error);
                        updateStatus('quranStatus', 'Error opening audio: ' + error.message, 'error');

                        // Fallback: try to use HTML5 audio anyway
                        try {
                            // Stop any current audio
                            if (currentAudio) {
                                currentAudio.pause();
                                currentAudio = null;
                            }

                            // Create new audio element
                            currentAudio = new Audio(url);
                            isStreaming = true;

                            // Set volume from slider
                            var volumeSlider = document.getElementById('quranVolumeSlider') || document.querySelector('.volume-slider');
                            if (volumeSlider) {
                                currentAudio.volume = parseFloat(volumeSlider.value) || 0.7;
                            } else {
                                currentAudio.volume = 0.7;
                            }

                            // Add event listeners
                            currentAudio.addEventListener('loadstart', function() {
                                console.log('DEBUG: Audio loading started');
                                updateStatus('quranStatus', 'Loading ' + surah.name + '...', 'info');
                            });

                            currentAudio.addEventListener('canplay', function() {
                                console.log('DEBUG: Audio can play');
                                updateStatus('quranStatus', 'Playing ' + surah.name + ' (' + surah.transliteration + ')', 'success');
                            });

                            currentAudio.addEventListener('play', function() {
                                console.log('DEBUG: Audio playing');
                                updateStatus('quranStatus', 'Playing ' + surah.name + ' - ' + (mode === 'full' ? 'Full Surah' : 'Ayah by Ayah'), 'success');
                            });

                            currentAudio.addEventListener('ended', function() {
                                console.log('DEBUG: Audio ended');
                                if (mode === 'ayah') {
                                    updateStatus('quranStatus', 'Ayah completed', 'info');
                                } else {
                                    updateStatus('quranStatus', surah.name + ' completed', 'success');
                                    isStreaming = false;
                                }
                            });

                            currentAudio.addEventListener('error', function(e) {
                                console.error('DEBUG: Audio error:', e);
                                updateStatus('quranStatus', 'Error loading audio: ' + e.message, 'error');
                                isStreaming = false;
                            });

                            // Start playing
                            currentAudio.play().catch(function(playError) {
                                console.error('DEBUG: Error playing audio:', playError);
                                updateStatus('quranStatus', 'Audio playback failed. Try opening in browser manually.', 'warning');
                                isStreaming = false;
                            });

                        } catch (fallbackError) {
                            console.error('DEBUG: Fallback audio error:', fallbackError);
                            updateStatus('quranStatus', 'Audio not supported in VSCode. Please open URL manually: ' + url, 'warning');
                        }
                    }
                }

                function stopQuranAudio() {
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio = null;
                        isStreaming = false;
                        updateStatus('quranStatus', 'Quran playback stopped', 'info');
                    }
                }

                // Listen for messages from the extension
                window.addEventListener('message', function(event) {
                    const message = event.data;
                    switch (message.type) {
                        case 'updateStatus':
                            updateStatus(message.elementId, message.message, message.statusType || 'info');
                            break;
                        case 'updateConnectionStatus':
                            if (message.service === 'youtube') {
                                updateYouTubeConnectionStatus();
                            } else if (message.service === 'spotify') {
                                updateSpotifyConnectionStatus();
                            }
                            break;
                        case 'showNotification':
                            showNotification(message.message, message.notificationType || 'info');
                            break;
                        case 'setVolume':
                            if (message.service === 'local') {
                                document.getElementById('localVolume').textContent = Math.round(message.value * 100) + '%';
                            } else if (message.service === 'quran') {
                                document.getElementById('quranVolume').textContent = Math.round(message.value * 100) + '%';
                                if (currentAudio) {
                                    currentAudio.volume = message.value;
                                }
                            }
                            break;
                        case 'updateTrackInfo':
                            // Update current track information
                            break;
                        case 'streamQuran':
                            console.log('DEBUG: Received streamQuran message:', message);
                            streamQuran(message.url, message.surah, message.mode);
                            break;
                        case 'stopQuran':
                            stopQuranAudio();
                            break;
                    }
                });

                // Auto-save search queries
                var searchTimeout;
                var searchInput = document.getElementById('youtubeSearch');
                if (searchInput) {
                    searchInput.addEventListener('input', function() {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(function() {
                            const query = this.value.trim();
                            if (query.length > 2) {
                                vscode.postMessage({ type: 'saveSearchQuery', query: query });
                            }
                        }, 1000);
                    });
                }

                // Add smooth scrolling for better UX
                var container = document.querySelector('.container');
                if (container) {
                    container.addEventListener('wheel', function(event) {
                        if (event.deltaY !== 0) {
                            this.scrollTop += event.deltaY;
                            event.preventDefault();
                        }
                    });
                }
            </script>
        </body>
        </html>`;
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
