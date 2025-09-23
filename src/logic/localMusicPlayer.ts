import * as vscode from 'vscode';
import * as path from 'path';
import { LocalMusicService, LocalMusicTrack } from './localMusicService';

export class LocalMusicPlayer {
    private context: vscode.ExtensionContext;
    private localMusicService: LocalMusicService;
    private currentTrack: LocalMusicTrack | null = null;
    private isPlaying: boolean = false;
    private volume: number = 0.7;
    private playbackPosition: number = 0;
    private playlist: LocalMusicTrack[] = [];
    private currentIndex: number = -1;
    private playbackInterval: NodeJS.Timeout | null = null;

    constructor(context: vscode.ExtensionContext, localMusicService: LocalMusicService) {
        this.context = context;
        this.localMusicService = localMusicService;
        this.loadSettings();
    }

    private loadSettings(): void {
        this.volume = vscode.workspace.getConfiguration('codeTune.localMusic').get('defaultVolume', 0.7);
        this.playbackPosition = 0;
    }

    private saveSettings(): void {
        vscode.workspace.getConfiguration('codeTune.localMusic').update('defaultVolume', this.volume, true);
    }

    public async playTrack(track: LocalMusicTrack): Promise<void> {
        this.currentTrack = track;
        this.isPlaying = true;
        this.playbackPosition = 0;

        // Use VS Code's webview to play audio
        await this.playAudioInWebview(track);

        // Start position tracking
        this.startPositionTracking();

        vscode.window.showInformationMessage(`🎵 Playing: ${track.name} by ${track.artists.join(', ')}`);
    }

    public async playPlaylist(playlist: LocalMusicTrack[], startIndex: number = 0): Promise<void> {
        this.playlist = playlist;
        this.currentIndex = startIndex;

        if (playlist.length > 0) {
            await this.playTrack(playlist[startIndex]);
        }
    }

    public async playNext(): Promise<void> {
        if (this.playlist.length === 0) {return;}

        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        await this.playTrack(this.playlist[this.currentIndex]);
    }

    public async playPrevious(): Promise<void> {
        if (this.playlist.length === 0) {return;}

        this.currentIndex = this.currentIndex <= 0 ? this.playlist.length - 1 : this.currentIndex - 1;
        await this.playTrack(this.playlist[this.currentIndex]);
    }

    public pause(): void {
        this.isPlaying = false;
        this.stopPositionTracking();

        // Pause audio in webview
        this.sendToWebview('pause');
    }

    public resume(): void {
        if (this.currentTrack) {
            this.isPlaying = true;
            this.startPositionTracking();

            // Resume audio in webview
            this.sendToWebview('resume');
        }
    }

    public stop(): void {
        this.isPlaying = false;
        this.currentTrack = null;
        this.playbackPosition = 0;
        this.stopPositionTracking();

        // Stop audio in webview
        this.sendToWebview('stop');
    }

    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.saveSettings();

        // Update volume in webview
        this.sendToWebview('setVolume', { volume: this.volume });
    }

    public seek(position: number): void {
        this.playbackPosition = Math.max(0, Math.min(this.currentTrack?.duration || 0, position));

        // Seek in webview
        this.sendToWebview('seek', { position: this.playbackPosition });
    }

    public getCurrentTrack(): LocalMusicTrack | null {
        return this.currentTrack;
    }

    public getIsPlaying(): boolean {
        return this.isPlaying;
    }

    public getVolume(): number {
        return this.volume;
    }

    public getCurrentPosition(): number {
        return this.playbackPosition;
    }

    public getCurrentPlaylist(): LocalMusicTrack[] {
        return [...this.playlist];
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    private async playAudioInWebview(track: LocalMusicTrack): Promise<void> {
        // Create or update webview for audio playback
        const webviewPanel = vscode.window.createWebviewPanel(
            'localMusicPlayer',
            'Local Music Player',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        webviewPanel.webview.html = this.getWebviewContent(track);

        // Handle messages from webview
        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'audioEnded':
                    await this.playNext();
                    break;
                case 'audioError':
                    vscode.window.showErrorMessage(`Audio playback error: ${message.error}`);
                    break;
                case 'positionUpdate':
                    this.playbackPosition = message.position;
                    break;
            }
        });

        this.context.subscriptions.push(webviewPanel);
    }

    private getWebviewContent(track: LocalMusicTrack): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Local Music Player</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        padding: 20px;
                        margin: 0;
                    }
                    .player {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 20px;
                    }
                    .track-info {
                        text-align: center;
                    }
                    .track-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .track-artist {
                        font-size: 14px;
                        opacity: 0.8;
                    }
                    .controls {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 15px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .progress-container {
                        width: 100%;
                        max-width: 400px;
                    }
                    .progress-bar {
                        width: 100%;
                        height: 6px;
                        background: var(--vscode-input-background);
                        border-radius: 3px;
                        overflow: hidden;
                    }
                    .progress-fill {
                        height: 100%;
                        background: var(--vscode-progressBar-background);
                        width: 0%;
                        transition: width 0.1s;
                    }
                    .time-display {
                        display: flex;
                        justify-content: space-between;
                        font-size: 12px;
                        margin-top: 5px;
                        opacity: 0.7;
                    }
                    audio {
                        display: none;
                    }
                </style>
            </head>
            <body>
                <div class="player">
                    <div class="track-info">
                        <div class="track-title">${track.name}</div>
                        <div class="track-artist">${track.artists.join(', ')}</div>
                        <div class="track-album">${track.album}</div>
                    </div>

                    <audio id="audioPlayer" controls>
                        <source src="file://${track.filePath}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>

                    <div class="progress-container">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <div class="time-display">
                            <span id="currentTime">0:00</span>
                            <span id="totalTime">${this.formatTime(track.duration)}</span>
                        </div>
                    </div>

                    <div class="controls">
                        <button onclick="sendMessage('previous')">⏮️</button>
                        <button onclick="sendMessage('playPause')" id="playPauseBtn">⏸️</button>
                        <button onclick="sendMessage('next')">⏭️</button>
                        <button onclick="sendMessage('stop')">⏹️</button>
                    </div>

                    <div class="volume-control">
                        <label>Volume: </label>
                        <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="${this.volume}">
                    </div>
                </div>

                <script>
                    const audio = document.getElementById('audioPlayer');
                    const progressFill = document.getElementById('progressFill');
                    const currentTime = document.getElementById('currentTime');
                    const playPauseBtn = document.getElementById('playPauseBtn');
                    const volumeSlider = document.getElementById('volumeSlider');

                    let isPlaying = true;

                    audio.volume = ${this.volume};

                    audio.addEventListener('loadedmetadata', () => {
                        currentTime.textContent = '0:00';
                        document.getElementById('totalTime').textContent = formatTime(audio.duration);
                    });

                    audio.addEventListener('timeupdate', () => {
                        const progress = (audio.currentTime / audio.duration) * 100;
                        progressFill.style.width = progress + '%';
                        currentTime.textContent = formatTime(audio.currentTime);

                        // Send position update to extension
                        vscode.postMessage({
                            command: 'positionUpdate',
                            position: audio.currentTime * 1000
                        });
                    });

                    audio.addEventListener('ended', () => {
                        vscode.postMessage({
                            command: 'audioEnded'
                        });
                    });

                    audio.addEventListener('error', (e) => {
                        vscode.postMessage({
                            command: 'audioError',
                            error: audio.error.message
                        });
                    });

                    volumeSlider.addEventListener('input', (e) => {
                        audio.volume = e.target.value;
                        vscode.postMessage({
                            command: 'volumeChange',
                            volume: e.target.value
                        });
                    });

                    function sendMessage(action, data = {}) {
                        vscode.postMessage({
                            command: action,
                            ...data
                        });
                    }

                    function formatTime(seconds) {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return mins + ':' + (secs < 10 ? '0' : '') + secs;
                    }

                    // Listen for messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'pause':
                                audio.pause();
                                playPauseBtn.textContent = '▶️';
                                isPlaying = false;
                                break;
                            case 'resume':
                                audio.play();
                                playPauseBtn.textContent = '⏸️';
                                isPlaying = true;
                                break;
                            case 'stop':
                                audio.pause();
                                audio.currentTime = 0;
                                playPauseBtn.textContent = '▶️';
                                isPlaying = false;
                                break;
                            case 'setVolume':
                                audio.volume = message.volume;
                                volumeSlider.value = message.volume;
                                break;
                            case 'seek':
                                audio.currentTime = message.position / 1000;
                                break;
                        }
                    });

                    // Auto-play
                    audio.play().then(() => {
                        playPauseBtn.textContent = '⏸️';
                    }).catch(error => {
                        console.error('Auto-play failed:', error);
                        playPauseBtn.textContent = '▶️';
                        isPlaying = false;
                    });

                    const vscode = acquireVsCodeApi();
                </script>
            </body>
            </html>
        `;
    }

    private sendToWebview(command: string, data?: any): void {
        // Find the webview panel and send message
        const panels = vscode.window.tabGroups.all.flatMap(tg => tg.tabs)
            .filter(tab => tab.label === 'Local Music Player')
            .map(tab => (tab as any).input?.webviewPanel)
            .filter(panel => panel);

        panels.forEach(panel => {
            panel.webview.postMessage({ command, ...data });
        });
    }

    private startPositionTracking(): void {
        this.stopPositionTracking();

        this.playbackInterval = setInterval(() => {
            if (this.isPlaying && this.currentTrack) {
                this.playbackPosition += 1000; // Increment by 1 second

                // Stop if we've exceeded track duration
                if (this.playbackPosition >= this.currentTrack.duration) {
                    this.playbackPosition = this.currentTrack.duration;
                    this.stop();
                    // Auto-advance to next track
                    setTimeout(() => this.playNext(), 500);
                }
            }
        }, 1000);
    }

    private stopPositionTracking(): void {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }

    private formatTime(milliseconds: number): string {
        const seconds = Math.floor(milliseconds / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    public dispose(): void {
        this.stop();
        this.stopPositionTracking();
    }
}
