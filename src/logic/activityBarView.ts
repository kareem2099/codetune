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
                        await vscode.commands.executeCommand('codeTune.testActivityBar');
                        this.updateStatus('testStatus', 'Activity Bar is working! ✅');
                        break;
                    case 'openYouTubeAuth':
                        console.log('Opening YouTube auth panel...');
                        await vscode.commands.executeCommand('codeTune.openYouTubeAuth');
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
                body {
                    padding: 10px;
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                }
                .container {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .section {
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 6px;
                    padding: 12px;
                    background-color: var(--vscode-editorWidget-background);
                }
                .section-title {
                    font-weight: bold;
                    margin-bottom: 8px;
                    color: var(--vscode-textLink-foreground);
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                .controls {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .control-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .control-button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .control-button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .control-button:active {
                    background-color: var(--vscode-button-secondaryBackground);
                }
                .status {
                    font-size: 11px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                .search-input {
                    width: 100%;
                    padding: 4px 8px;
                    background-color: var(--vscode-input-background);
                    color: var(--vscode-input-foreground);
                    border: 1px solid var(--vscode-input-border);
                    border-radius: 3px;
                    font-size: 12px;
                }
                .search-input:focus {
                    outline: 1px solid var(--vscode-focusBorder);
                }
                .volume-slider {
                    width: 100%;
                    margin: 4px 0;
                }
                .grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                .grid-item {
                    background-color: var(--vscode-list-inactiveSelectionBackground);
                    padding: 8px;
                    border-radius: 4px;
                    text-align: center;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                .grid-item:hover {
                    background-color: var(--vscode-list-hoverBackground);
                }
                .grid-item.active {
                    background-color: var(--vscode-list-activeSelectionBackground);
                    color: var(--vscode-list-activeSelectionForeground);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <!-- Test Section -->
                <div class="section">
                    <div class="section-title">🧪 Test Activity Bar</div>
                    <div class="controls">
                        <div class="control-row">
                            <button class="control-button" onclick="testActivityBar()">
                                ✅ Test Activity Bar
                            </button>
                        </div>
                        <div class="status" id="testStatus">Click the test button to verify activity bar is working</div>
                    </div>
                </div>

                <!-- YouTube Music Section -->
                <div class="section">
                    <div class="section-title">🎵 YouTube Music</div>
                    <div class="controls">
                        <div class="control-row">
                            <button class="control-button" onclick="connectYouTube()">
                                � Connect
                            </button>
                            <button class="control-button" onclick="disconnectYouTube()">
                                🔌 Disconnect
                            </button>
                        </div>
                        <div class="control-row">
                            <input type="text" class="search-input" placeholder="Search music..." id="youtubeSearch">
                            <button class="control-button" onclick="searchYouTube()">
                                �🔍 Search
                            </button>
                        </div>
                        <div class="control-row">
                            <button class="control-button" onclick="openYouTubePlayer()">
                                🎵 Open Player
                            </button>
                            <button class="control-button" onclick="openYouTubeAuth()">
                                🔐 Auth Panel
                            </button>
                        </div>
                        <div class="control-row">
                            <button class="control-button" onclick="clearYouTubeCache()">
                                🗑️ Clear Cache
                            </button>
                        </div>
                        <div class="status" id="youtubeStatus">Ready to search</div>
                    </div>
                </div>

                <!-- Spotify Section -->
                <div class="section">
                    <div class="section-title">🎵 Spotify</div>
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
                        <div class="status" id="spotifyStatus">Not connected</div>
                    </div>
                </div>

                <!-- Local Music Section -->
                <div class="section">
                    <div class="section-title">🎹 Local Music</div>
                    <div class="controls">
                        <div class="grid">
                            <div class="grid-item" onclick="playLocal('peaceful-coding')">Peaceful</div>
                            <div class="grid-item" onclick="playLocal('focus-music')">Focus</div>
                            <div class="grid-item" onclick="playLocal('meditation')">Meditation</div>
                            <div class="grid-item" onclick="playLocal('nature-sounds')">Nature</div>
                        </div>
                        <div class="control-row">
                            <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.5" oninput="setLocalVolume(this.value)">
                            <span id="localVolume">50%</span>
                        </div>
                        <div class="status" id="localStatus">Select a track to play</div>
                    </div>
                </div>

                <!-- Quran Section -->
                <div class="section">
                    <div class="section-title">📿 Quran</div>
                    <div class="controls">
                        <div class="control-row">
                            <select class="search-input" id="surahSelect">
                                <option value="">Select Surah...</option>
                                <option value="Al-Fatiha">Al-Fatiha (1)</option>
                                <option value="Al-Baqarah">Al-Baqarah (2)</option>
                                <option value="Al-Imran">Al-Imran (3)</option>
                                <option value="An-Nisa">An-Nisa (4)</option>
                                <option value="Al-Maidah">Al-Maidah (5)</option>
                            </select>
                            <button class="control-button" onclick="playQuran()">
                                🎵 Play
                            </button>
                        </div>
                        <div class="control-row">
                            <input type="range" class="volume-slider" min="0" max="1" step="0.1" value="0.7" oninput="setQuranVolume(this.value)">
                            <span id="quranVolume">70%</span>
                        </div>
                        <div class="status" id="quranStatus">Select a Surah to begin</div>
                    </div>
                </div>
            </div>

            <script nonce="${nonce}">
                const vscode = acquireVsCodeApi();

                function searchYouTube() {
                    const query = document.getElementById('youtubeSearch').value;
                    if (query) {
                        vscode.postMessage({ type: 'searchMusic' });
                    }
                }

                function openYouTubePlayer() {
                    vscode.postMessage({ type: 'openPlayer' });
                }

                function clearYouTubeCache() {
                    vscode.postMessage({ type: 'clearYouTubeCache' });
                    document.getElementById('youtubeStatus').textContent = 'Cache cleared';
                }

                function connectYouTube() {
                    vscode.postMessage({ type: 'connectYouTube' });
                }

                function disconnectYouTube() {
                    vscode.postMessage({ type: 'disconnectYouTube' });
                }

                function connectSpotify() {
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
                    document.getElementById('localStatus').textContent = 'Playing: ' + track;
                }

                function setLocalVolume(value) {
                    document.getElementById('localVolume').textContent = Math.round(value * 100) + '%';
                    vscode.postMessage({ type: 'setLocalVolume', value: parseFloat(value) });
                }

                function playQuran() {
                    const surah = document.getElementById('surahSelect').value;
                    if (surah) {
                        vscode.postMessage({ type: 'playQuran', surah: surah });
                        document.getElementById('quranStatus').textContent = 'Playing: ' + surah;
                    }
                }

                function setQuranVolume(value) {
                    document.getElementById('quranVolume').textContent = Math.round(value * 100) + '%';
                    vscode.postMessage({ type: 'setQuranVolume', value: parseFloat(value) });
                }

                function testActivityBar() {
                    vscode.postMessage({ type: 'testActivityBar' });
                    document.getElementById('testStatus').textContent = 'Testing...';
                }

                function openYouTubeAuth() {
                    vscode.postMessage({ type: 'openYouTubeAuth' });
                }

                // Handle Enter key in search input
                document.getElementById('youtubeSearch').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        searchYouTube();
                    }
                });

                // Listen for messages from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'updateStatus') {
                        const element = document.getElementById(message.elementId);
                        if (element) {
                            element.textContent = message.message;
                        }
                    }
                });
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
