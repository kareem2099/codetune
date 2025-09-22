import * as vscode from 'vscode';
import { MusicPlayer } from '../file/musicPlayer';
import { QuranPlayer } from '../file/quranPlayer';
import { SpotifyService } from './spotifyService';
import { MusicServiceManager, MusicServiceType } from './musicService';
import { YouTubeMusicService } from './youtubeMusicService';
import { LocalMusicService } from './localMusicService';
import { MusicTrack } from './musicService';
import { YouTubeAuthPanel } from './youtubeAuthPanel';

export class PlayerWebviewPanel {
    private panel: vscode.WebviewPanel;
    private musicPlayer: MusicPlayer;
    private quranPlayer: QuranPlayer;
    private spotifyService: SpotifyService;
    private musicServiceManager: MusicServiceManager;
    private disposables: vscode.Disposable[] = [];

    constructor(
        context: vscode.ExtensionContext,
        musicPlayer: MusicPlayer,
        quranPlayer: QuranPlayer,
        spotifyService: SpotifyService,
        musicServiceManager: MusicServiceManager
    ) {
        this.musicPlayer = musicPlayer;
        this.quranPlayer = quranPlayer;
        this.spotifyService = spotifyService;
        this.musicServiceManager = musicServiceManager;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'musicQuranPlayer',
            'Music & Quran Player',
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

        // Set up periodic updates for real-time Spotify state
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
            case 'playMusic':
                await this.musicPlayer.play(message.track);
                this.updateUI();
                break;
            case 'playQuran':
                await this.quranPlayer.play(message.surah);
                this.updateUI();
                break;
            case 'pause':
                this.musicPlayer.pause();
                this.quranPlayer.pause();
                this.updateUI();
                break;
            case 'stop':
                this.musicPlayer.stop();
                this.quranPlayer.stop();
                this.updateUI();
                break;
            case 'setMusicVolume':
                this.musicPlayer.setVolume(message.volume);
                break;
            case 'setQuranVolume':
                this.quranPlayer.setVolume(message.volume);
                break;
            case 'selectReciter':
                await this.quranPlayer.selectReciter();
                break;
            case 'connectSpotify':
                await this.spotifyService.authenticate();
                this.updateUI();
                break;
            case 'pauseSpotify':
                await this.spotifyService.pausePlayback();
                this.updateUI();
                break;
            case 'resumeSpotify':
                await this.spotifyService.resumePlayback();
                this.updateUI();
                break;
            case 'skipToNext':
                await this.spotifyService.skipToNext();
                this.updateUI();
                break;
            case 'skipToPrevious':
                await this.spotifyService.skipToPrevious();
                this.updateUI();
                break;
            case 'setSpotifyVolume':
                await this.spotifyService.setVolume(message.volume);
                break;
            case 'searchSpotify':
                try {
                    const tracks = await this.spotifyService.searchTracks(message.query);
                    const trackNames = tracks.map(track =>
                        `${track.name} - ${track.artists.join(', ')}`
                    );

                    const selected = await vscode.window.showQuickPick(trackNames, {
                        placeHolder: 'Select a track to play'
                    });

                    if (selected) {
                        const track = tracks[trackNames.indexOf(selected)];
                        await this.spotifyService.playTrack(track.id);
                        this.updateUI();
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Search failed: ${error}`);
                }
                break;
            case 'loadPlaylist':
                try {
                    if (message.playlistId === 'liked') {
                        vscode.window.showInformationMessage('Loading your liked songs...');
                    } else {
                        const tracks = await this.spotifyService.getPlaylistTracks(message.playlistId);
                        vscode.window.showInformationMessage(`Loaded playlist with ${tracks.length} tracks`);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to load playlist: ${error}`);
                }
                break;
            case 'searchYoutube':
                try {
                    // Get YouTube Music service from the music service manager
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    const tracks = await youtubeService.searchTracks(message.query);
                    if (tracks.length === 0) {
                        vscode.window.showInformationMessage('No tracks found on YouTube Music. Try a different search term.');
                        return;
                    }

                    const trackNames = tracks.map(track =>
                        `${track.name} - ${track.artists.join(', ')}`
                    );

                    const selected = await vscode.window.showQuickPick(trackNames, {
                        placeHolder: 'Select a track to play'
                    });

                    if (selected) {
                        const track: MusicTrack = tracks[trackNames.indexOf(selected)];
                        // Set the search results as the playback queue
                        if (youtubeService && typeof (youtubeService as any).setPlaybackQueue === 'function') {
                            (youtubeService as any).setPlaybackQueue(tracks);
                        }
                        // Play the selected track
                        if (youtubeService.playTrack) {
                            await youtubeService.playTrack(track.id);
                        }
                        this.updateUI();
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube search failed: ${error}`);
                }
                break;
            case 'toggleYoutube':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    const currentTrack = (youtubeService as any).getCurrentTrack();
                    if (!currentTrack) {
                        vscode.window.showInformationMessage('No track selected. Search for music first.');
                        return;
                    }

                    const isPlaying = (youtubeService as any).getIsPlaying();
                    if (isPlaying) {
                        (youtubeService as any).pausePlayback();
                        vscode.window.showInformationMessage('⏸️ YouTube Music paused');
                    } else {
                        (youtubeService as any).resumePlayback();
                        vscode.window.showInformationMessage('▶️ YouTube Music resumed');
                    }
                    this.updateUI();
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube playback failed: ${error}`);
                }
                break;
            case 'youtubeNext':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    (youtubeService as any).skipToNext();
                    const nextTrack = (youtubeService as any).getCurrentTrack();
                    if (nextTrack) {
                        vscode.window.showInformationMessage(`⏭️ Playing: ${nextTrack.name}`);
                    }
                    this.updateUI();
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube next track failed: ${error}`);
                }
                break;
            case 'youtubePrevious':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    (youtubeService as any).skipToPrevious();
                    const prevTrack = (youtubeService as any).getCurrentTrack();
                    if (prevTrack) {
                        vscode.window.showInformationMessage(`⏮️ Playing: ${prevTrack.name}`);
                    }
                    this.updateUI();
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube previous track failed: ${error}`);
                }
                break;
            case 'setYoutubeVolume':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    (youtubeService as any).setVolume(message.volume);
                    vscode.window.showInformationMessage(`🔊 YouTube Music volume set to ${Math.round(message.volume * 100)}%`);
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube volume control failed: ${error}`);
                }
                break;
            case 'loadYoutubePlaylist':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    const tracks = await youtubeService.getPlaylistTracks(message.playlistId);
                    if (tracks.length === 0) {
                        vscode.window.showInformationMessage('No tracks found in this playlist');
                        return;
                    }

                    const trackNames = tracks.map(track =>
                        `${track.name} - ${track.artists.join(', ')}`
                    );

                    const selected = await vscode.window.showQuickPick(trackNames, {
                        placeHolder: 'Select a track to play'
                    });

                    if (selected) {
                        const track = tracks[trackNames.indexOf(selected)];
                        if (youtubeService.playTrack) {
                            await youtubeService.playTrack(track.id);
                        } else {
                            vscode.window.showInformationMessage(
                                '🎵 Opening track in YouTube Music...',
                                'Open in YouTube'
                            ).then(selection => {
                                if (selection === 'Open in YouTube') {
                                    vscode.env.openExternal(vscode.Uri.parse(track.externalUrl || ''));
                                }
                            });
                        }
                        this.updateUI();
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to load YouTube playlist: ${error}`);
                }
                break;
            case 'connectYouTube':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    const success = await youtubeService.authenticate();
                    if (success) {
                        vscode.window.showInformationMessage('🎵 YouTube Music connected successfully!');
                    } else {
                        vscode.window.showInformationMessage('YouTube Music connection initiated. Please check your browser and complete the authentication.');
                    }
                    this.updateUI();
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube authentication failed: ${error}`);
                }
                break;
            case 'disconnectYouTube':
                try {
                    const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
                    if (!youtubeService) {
                        vscode.window.showErrorMessage('YouTube Music service not available');
                        return;
                    }

                    await youtubeService.logout();
                    vscode.window.showInformationMessage('🎵 YouTube Music disconnected');
                    this.updateUI();
                } catch (error) {
                    vscode.window.showErrorMessage(`YouTube disconnection failed: ${error}`);
                }
                break;
            case 'openYouTubeAuth':
                try {
                    const youtubeAuthPanel = new YouTubeAuthPanel(this.musicServiceManager.getContext(), this.musicServiceManager);
                    youtubeAuthPanel.reveal();
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to open YouTube authentication: ${error}`);
                }
                break;
        }
    }

    private async updateUI() {
        // Get current Spotify state
        let spotifyState = {
            isConnected: false,
            isPlaying: false,
            currentTrack: '',
            volume: 0.5
        };

        try {
            const isAuthenticated = await this.spotifyService.isAuthenticated();
            if (isAuthenticated) {
                spotifyState.isConnected = true;
                try {
                    const playback = await this.spotifyService.getCurrentPlayback();
                    if (playback && playback.item) {
                        spotifyState.isPlaying = playback.is_playing;
                        spotifyState.currentTrack = `${playback.item.name} - ${playback.item.artists.map((artist: any) => artist.name).join(', ')}`;
                        spotifyState.volume = (playback.device?.volume_percent || 50) / 100;
                    }
                } catch (error) {
                    // Ignore errors when getting playback state
                    console.log('Could not get current playback state:', error);
                }
            }
        } catch (error) {
            // Ignore authentication errors
            console.log('Could not check authentication:', error);
        }

        // Get current YouTube Music state
        let youtubeState = {
            isPlaying: false,
            currentTrack: '',
            volume: 0.5
        };

        try {
            const youtubeService = this.musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService) {
                const currentTrack = (youtubeService as any).getCurrentTrack();
                const isPlaying = (youtubeService as any).getIsPlaying();
                youtubeState.isPlaying = isPlaying;
                youtubeState.currentTrack = currentTrack ? `${currentTrack.name} - ${currentTrack.artists.join(', ')}` : '';
                youtubeState.volume = 0.5; // Default volume since YouTube doesn't provide volume via API
            }
        } catch (error) {
            // Ignore YouTube Music errors
            console.log('Could not get YouTube Music state:', error);
        }

        this.panel.webview.postMessage({
            command: 'updateState',
            musicState: {
                isPlaying: this.musicPlayer.getIsPlaying(),
                currentTrack: this.musicPlayer.getCurrentTrack(),
                volume: this.musicPlayer.getVolume()
            },
            quranState: {
                isPlaying: this.quranPlayer.getIsPlaying(),
                currentSurah: this.quranPlayer.getCurrentSurah(),
                volume: this.quranPlayer.getVolume()
            },
            spotifyState: spotifyState,
            youtubeState: youtubeState
        });
    }

    private getWebviewContent(): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeTune - Relaxing Music & Quran</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
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
            background: linear-gradient(45deg, #1db954, #1ed760);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .player-section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            background-color: var(--vscode-editorWidget-background);
        }

        .player-title {
            font-size: 1.4em;
            font-weight: bold;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .player-title .icon {
            margin-right: 10px;
            font-size: 1.2em;
        }

        .spotify-status {
            font-size: 0.9em;
            padding: 4px 8px;
            border-radius: 12px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .spotify-connected {
            background-color: #1db954;
            color: white;
        }

        .spotify-disconnected {
            background-color: var(--vscode-errorForeground);
            color: white;
        }

        .controls {
            display: flex;
            gap: 10px;
            margin: 15px 0;
            flex-wrap: wrap;
            justify-content: center;
        }

        .btn {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9em;
            min-width: 80px;
        }

        .btn:hover {
            background-color: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn-primary {
            background-color: #1db954;
            color: white;
            font-weight: bold;
        }

        .btn-primary:hover {
            background-color: #1ed760;
        }

        .volume-control {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 15px 0;
            justify-content: center;
        }

        .volume-slider {
            width: 150px;
        }

        .current-playing {
            font-style: italic;
            color: var(--vscode-textPreformat-foreground);
            margin: 10px 0;
            min-height: 20px;
            text-align: center;
            padding: 10px;
            background-color: var(--vscode-input-background);
            border-radius: 6px;
        }

        .track-list, .surah-list, .playlist-list {
            max-height: 250px;
            overflow-y: auto;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            margin-top: 10px;
        }

        .track-item, .surah-item, .playlist-item {
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-panel-border);
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .track-item:hover, .surah-item:hover, .playlist-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .track-item:last-child, .surah-item:last-child, .playlist-item:last-child {
            border-bottom: none;
        }

        .track-info {
            flex: 1;
        }

        .track-name {
            font-weight: 500;
        }

        .track-artist {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
        }

        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-left: 10px;
        }

        .status-playing {
            background-color: #4CAF50;
            animation: pulse 1.5s infinite;
        }

        .status-paused {
            background-color: #FF9800;
        }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .arabic-text {
            font-size: 1.2em;
            direction: rtl;
            text-align: right;
        }

        .search-section {
            margin: 15px 0;
            display: flex;
            gap: 10px;
        }

        .search-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
        }

        .search-btn {
            padding: 8px 16px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
        }

        .search-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .playlist-image {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            object-fit: cover;
        }

        .spotify-section {
            border-left: 4px solid #1db954;
        }

        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .service-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            justify-content: center;
        }

        .service-btn {
            padding: 8px 16px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9em;
        }

        .service-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .service-btn.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎵 CodeTune</h1>
        <p style="color: var(--vscode-descriptionForeground); margin: 5px 0;">Relaxing music and Quran while you code</p>
    </div>

    <!-- Service Selection -->
    <div class="service-selector">
        <button class="service-btn active" onclick="selectService('spotify')">🎧 Spotify</button>
        <button class="service-btn" onclick="selectService('youtube_music')">🎥 YouTube</button>
        <button class="service-btn" onclick="selectService('local')">💾 Local</button>
    </div>

    <div class="grid">
        <!-- Spotify Player Section -->
        <div class="player-section spotify-section" id="spotifySection">
            <div class="player-title">
                <div style="display: flex; align-items: center;">
                    <span class="icon">🎵</span>
                    <span>Spotify Player</span>
                    <span id="spotifyStatus" class="status-indicator"></span>
                </div>
                <div id="spotifyConnectionStatus" class="spotify-status spotify-disconnected">Not Connected</div>
            </div>

            <div class="current-playing" id="currentSpotify">Connect to Spotify to start playing</div>

            <div class="controls">
                <button class="btn" onclick="connectSpotify()" id="connectBtn">🔗 Connect</button>
                <button class="btn" onclick="toggleSpotify()" id="playPauseBtn" disabled>▶️ Play</button>
                <button class="btn" onclick="skipToNext()" id="nextBtn" disabled>⏭️ Next</button>
                <button class="btn" onclick="skipToPrevious()" id="prevBtn" disabled>⏮️ Previous</button>
            </div>

            <div class="search-section">
                <input type="text" class="search-input" id="spotifySearch" placeholder="Search Spotify..." onkeypress="handleSearchKey(event)">
                <button class="search-btn" onclick="searchSpotify()">🔍</button>
            </div>

            <div class="volume-control">
                <label>Volume:</label>
                <input type="range" class="volume-slider" id="spotifyVolume" min="0" max="100" value="50" onchange="setSpotifyVolume(this.value)">
                <span id="spotifyVolumeValue">50%</span>
            </div>

            <div class="playlist-list" id="spotifyPlaylists" style="display: none;">
                <div class="playlist-item" onclick="loadPlaylist('liked')">
                    <div style="width: 40px; height: 40px; background: linear-gradient(45deg, #ff6b6b, #feca57); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white;">❤️</div>
                    <div class="track-info">
                        <div class="track-name">Liked Songs</div>
                        <div class="track-artist">Your favorite tracks</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- YouTube Music Player Section -->
        <div class="player-section youtube-section" id="youtubeSection" style="display: none;">
            <div class="player-title">
                <div style="display: flex; align-items: center;">
                    <span class="icon">🎥</span>
                    <span>YouTube Music</span>
                    <span id="youtubeStatus" class="status-indicator"></span>
                </div>
                <div id="youtubeStatusText" class="spotify-status spotify-disconnected">Ready</div>
            </div>

            <div class="current-playing" id="currentYoutube">Search for music on YouTube</div>

            <!-- YouTube Authentication Section -->
            <div class="auth-section" style="margin-bottom: 20px; padding: 15px; background-color: var(--vscode-textBlockQuote-background); border-left: 4px solid #FF0000; border-radius: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="youtube-icon">🎵</span>
                        <span style="font-weight: bold;">YouTube Authentication</span>
                    </div>
                    <div id="youtubeAuthStatus" class="spotify-status spotify-disconnected" style="font-size: 0.8em;">Not Connected</div>
                </div>

                <div class="controls" style="justify-content: center; margin-bottom: 10px;">
                    <button class="btn" onclick="connectYouTube()" id="youtubeConnectBtn" style="background-color: #FF0000; color: white;">🔗 Connect YouTube</button>
                    <button class="btn" onclick="disconnectYouTube()" id="youtubeDisconnectBtn" style="display: none;">🔌 Disconnect</button>
                    <button class="btn" onclick="openYouTubeAuth()" id="youtubeAuthBtn">⚙️ Auth Panel</button>
                </div>

                <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); text-align: center;">
                    Connect your YouTube account for enhanced search and personalized recommendations
                </div>
            </div>

            <div class="controls">
                <button class="btn" onclick="toggleYoutube()" id="youtubePlayBtn">▶️ Play</button>
                <button class="btn" onclick="youtubeNext()" id="youtubeNextBtn">⏭️ Next</button>
                <button class="btn" onclick="youtubePrevious()" id="youtubePrevBtn">⏮️ Previous</button>
            </div>

            <div class="search-section">
                <input type="text" class="search-input" id="youtubeSearch" placeholder="Search YouTube Music..." onkeypress="handleYoutubeSearchKey(event)">
                <button class="search-btn" onclick="searchYoutube()">🔍</button>
            </div>

            <div class="volume-control">
                <label>Volume:</label>
                <input type="range" class="volume-slider" id="youtubeVolume" min="0" max="100" value="50" onchange="setYoutubeVolume(this.value)">
                <span id="youtubeVolumeValue">50%</span>
            </div>

            <div class="playlist-list" id="youtubePlaylists">
                <div class="playlist-item" onclick="loadYoutubePlaylist('PLrAXtmRdnEQyN2JDJy0b5Y7b8gA3Y6H8')">
                    <div style="width: 40px; height: 40px; background: linear-gradient(45deg, #ff0000, #ff6b6b); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white;">▶️</div>
                    <div class="track-info">
                        <div class="track-name">Popular Music 2024</div>
                        <div class="track-artist">Trending hits</div>
                    </div>
                </div>
                <div class="playlist-item" onclick="loadYoutubePlaylist('PLrAXtmRdnEQyN2JDJy0b5Y7b8gA3Y6H9')">
                    <div style="width: 40px; height: 40px; background: linear-gradient(45deg, #ff6b6b, #feca57); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white;">🎵</div>
                    <div class="track-info">
                        <div class="track-name">Top Hits</div>
                        <div class="track-artist">Most popular songs</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Local Music Player Section -->
        <div class="player-section local-section" id="localSection" style="display: none;">
            <div class="player-title">
                <span class="icon">💾</span>
                <span>Local Music</span>
                <span id="musicStatus" class="status-indicator"></span>
            </div>

            <div class="current-playing" id="currentMusic">No music playing</div>

            <div class="controls">
                <button class="btn" onclick="toggleMusic()">▶️ Play/Pause</button>
                <button class="btn" onclick="stopMusic()">⏹️ Stop</button>
                <button class="btn" onclick="setupLocalMusic()">📁 Setup Folders</button>
            </div>

            <div class="volume-control">
                <label>Volume:</label>
                <input type="range" class="volume-slider" id="musicVolume" min="0" max="100" value="50" onchange="setMusicVolume(this.value)">
                <span id="musicVolumeValue">50%</span>
            </div>

            <div class="track-list" id="musicTracks">
                <div class="track-item" onclick="playMusic('Relaxing Piano')">
                    <div class="track-info">
                        <div class="track-name">🎹 Relaxing Piano</div>
                        <div class="track-artist">Peaceful melodies</div>
                    </div>
                </div>
                <div class="track-item" onclick="playMusic('Nature Sounds')">
                    <div class="track-info">
                        <div class="track-name">🌿 Nature Sounds</div>
                        <div class="track-artist">Forest ambiance</div>
                    </div>
                </div>
                <div class="track-item" onclick="playMusic('Focus Music')">
                    <div class="track-info">
                        <div class="track-name">🧘 Focus Music</div>
                        <div class="track-artist">Deep concentration</div>
                    </div>
                </div>
                <div class="track-item" onclick="playMusic('Ambient Meditation')">
                    <div class="track-info">
                        <div class="track-name">🔮 Ambient Meditation</div>
                        <div class="track-artist">Mindful sounds</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Quran Player Section -->
    <div class="player-section">
        <div class="player-title">
            <span class="icon">📿</span>
            <span>Quran Player</span>
            <span id="quranStatus" class="status-indicator"></span>
        </div>

        <div class="current-playing" id="currentQuran">No Surah playing</div>

        <div class="controls">
            <button class="btn" onclick="toggleQuran()">▶️ Play/Pause</button>
            <button class="btn" onclick="stopQuran()">⏹️ Stop</button>
            <button class="btn" onclick="selectReciter()">👤 Select Reciter</button>
        </div>

        <div class="volume-control">
            <label>Volume:</label>
            <input type="range" class="volume-slider" id="quranVolume" min="0" max="100" value="70" onchange="setQuranVolume(this.value)">
            <span id="quranVolumeValue">70%</span>
        </div>

        <div class="surah-list" id="surahList">
            <div class="surah-item" onclick="playQuran('001 - الفاتحة (Al-Fatiha)')">
                <div class="track-info">
                    <div class="track-name">001 - Al-Fatiha (The Opening)</div>
                    <div class="track-artist">7 verses</div>
                </div>
                <div class="arabic-text">الفاتحة</div>
            </div>
            <div class="surah-item" onclick="playQuran('002 - البقرة (Al-Baqara)')">
                <div class="track-info">
                    <div class="track-name">002 - Al-Baqara (The Cow)</div>
                    <div class="track-artist">286 verses</div>
                </div>
                <div class="arabic-text">البقرة</div>
            </div>
            <div class="surah-item" onclick="playQuran('003 - آل عمران (Aal-E-Imran)')">
                <div class="track-info">
                    <div class="track-name">003 - Aal-E-Imran (The Family of Imran)</div>
                    <div class="track-artist">200 verses</div>
                </div>
                <div class="arabic-text">آل عمران</div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        let musicState = { isPlaying: false, currentTrack: '', volume: 0.5 };
        let quranState = { isPlaying: false, currentSurah: '', volume: 0.7 };
        let spotifyState = { isConnected: false, isPlaying: false, currentTrack: '', volume: 0.5 };
        let youtubeState = { isPlaying: false, currentTrack: '', volume: 0.5 };

        // Spotify controls
        function connectSpotify() {
            vscode.postMessage({ command: 'connectSpotify' });
        }

        function toggleSpotify() {
            if (spotifyState.isPlaying) {
                vscode.postMessage({ command: 'pauseSpotify' });
            } else {
                vscode.postMessage({ command: 'resumeSpotify' });
            }
        }

        function skipToNext() {
            vscode.postMessage({ command: 'skipToNext' });
        }

        function skipToPrevious() {
            vscode.postMessage({ command: 'skipToPrevious' });
        }

        function searchSpotify() {
            const query = document.getElementById('spotifySearch').value;
            if (query.trim()) {
                vscode.postMessage({ command: 'searchSpotify', query: query });
            }
        }

        function handleSearchKey(event) {
            if (event.key === 'Enter') {
                searchSpotify();
            }
        }

        function setSpotifyVolume(value) {
            const volume = value / 100;
            vscode.postMessage({ command: 'setSpotifyVolume', volume: volume });
            document.getElementById('spotifyVolumeValue').textContent = value + '%';
        }

        function loadPlaylist(playlistId) {
            vscode.postMessage({ command: 'loadPlaylist', playlistId: playlistId });
        }

        // Music controls
        function playMusic(track) {
            vscode.postMessage({ command: 'playMusic', track: track });
        }

        function toggleMusic() {
            if (musicState.isPlaying) {
                vscode.postMessage({ command: 'pause' });
            } else if (musicState.currentTrack) {
                vscode.postMessage({ command: 'playMusic', track: musicState.currentTrack });
            } else {
                playMusic('Relaxing Piano');
            }
        }

        function stopMusic() {
            vscode.postMessage({ command: 'stop' });
        }

        function setMusicVolume(value) {
            const volume = value / 100;
            vscode.postMessage({ command: 'setMusicVolume', volume: volume });
            document.getElementById('musicVolumeValue').textContent = value + '%';
        }

        // Quran controls
        function playQuran(surah) {
            vscode.postMessage({ command: 'playQuran', surah: surah });
        }

        function toggleQuran() {
            if (quranState.isPlaying) {
                vscode.postMessage({ command: 'pause' });
            } else if (quranState.currentSurah) {
                vscode.postMessage({ command: 'playQuran', surah: quranState.currentSurah });
            } else {
                playQuran('001 - الفاتحة (Al-Fatiha)');
            }
        }

        function stopQuran() {
            vscode.postMessage({ command: 'stop' });
        }

        function selectReciter() {
            vscode.postMessage({ command: 'selectReciter' });
        }

        function setQuranVolume(value) {
            const volume = value / 100;
            vscode.postMessage({ command: 'setQuranVolume', volume: volume });
            document.getElementById('quranVolumeValue').textContent = value + '%';
        }

        // Service switching functionality
        function selectService(service) {
            // Hide all service sections
            document.getElementById('spotifySection').style.display = 'none';
            document.getElementById('youtubeSection').style.display = 'none';
            document.getElementById('localSection').style.display = 'none';

            // Remove active class from all service buttons
            document.querySelectorAll('.service-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Show selected service section
            switch(service) {
                case 'spotify':
                    document.getElementById('spotifySection').style.display = 'block';
                    document.querySelector('.service-btn[onclick*="spotify"]').classList.add('active');
                    break;
                case 'youtube_music':
                    document.getElementById('youtubeSection').style.display = 'block';
                    document.querySelector('.service-btn[onclick*="youtube"]').classList.add('active');
                    break;
                case 'local':
                    document.getElementById('localSection').style.display = 'block';
                    document.querySelector('.service-btn[onclick*="local"]').classList.add('active');
                    break;
            }
        }

        // YouTube Music controls
        function searchYoutube() {
            const query = document.getElementById('youtubeSearch').value;
            if (query.trim()) {
                vscode.postMessage({ command: 'searchYoutube', query: query });
            }
        }

        function handleYoutubeSearchKey(event) {
            if (event.key === 'Enter') {
                searchYoutube();
            }
        }

        function toggleYoutube() {
            vscode.postMessage({ command: 'toggleYoutube' });
        }

        function youtubeNext() {
            vscode.postMessage({ command: 'youtubeNext' });
        }

        function youtubePrevious() {
            vscode.postMessage({ command: 'youtubePrevious' });
        }

        function setYoutubeVolume(value) {
            const volume = value / 100;
            vscode.postMessage({ command: 'setYoutubeVolume', volume: volume });
            document.getElementById('youtubeVolumeValue').textContent = value + '%';
        }

        function loadYoutubePlaylist(playlistId) {
            vscode.postMessage({ command: 'loadYoutubePlaylist', playlistId: playlistId });
        }

        // YouTube Authentication controls
        function connectYouTube() {
            vscode.postMessage({ command: 'connectYouTube' });
        }

        function disconnectYouTube() {
            vscode.postMessage({ command: 'disconnectYouTube' });
        }

        function openYouTubeAuth() {
            vscode.postMessage({ command: 'openYouTubeAuth' });
        }

        // Local Music controls
        function setupLocalMusic() {
            vscode.postMessage({ command: 'setupLocalMusic' });
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.command === 'updateState') {
                musicState = message.musicState;
                quranState = message.quranState;
                spotifyState = message.spotifyState || spotifyState;
                youtubeState = message.youtubeState || youtubeState;
                updateUI();
            }
        });

        function updateUI() {
            // Update Spotify UI
            const spotifyStatusEl = document.getElementById('spotifyStatus');
            const currentSpotifyEl = document.getElementById('currentSpotify');
            const connectionStatusEl = document.getElementById('spotifyConnectionStatus');
            const connectBtn = document.getElementById('connectBtn');
            const playPauseBtn = document.getElementById('playPauseBtn');
            const nextBtn = document.getElementById('nextBtn');
            const prevBtn = document.getElementById('prevBtn');

            if (spotifyState.isConnected) {
                connectionStatusEl.textContent = 'Connected';
                connectionStatusEl.className = 'spotify-status spotify-connected';
                connectBtn.textContent = '🔗 Reconnect';
                playPauseBtn.disabled = false;
                nextBtn.disabled = false;
                prevBtn.disabled = false;

                if (spotifyState.isPlaying) {
                    spotifyStatusEl.className = 'status-indicator status-playing';
                    playPauseBtn.textContent = '⏸️ Pause';
                    currentSpotifyEl.textContent = \`🎵 Playing: \${spotifyState.currentTrack}\`;
                } else {
                    spotifyStatusEl.className = 'status-indicator status-paused';
                    playPauseBtn.textContent = '▶️ Play';
                    currentSpotifyEl.textContent = \`⏸ Paused: \${spotifyState.currentTrack}\`;
                }
            } else {
                connectionStatusEl.textContent = 'Not Connected';
                connectionStatusEl.className = 'spotify-status spotify-disconnected';
                connectBtn.textContent = '🔗 Connect';
                playPauseBtn.disabled = true;
                nextBtn.disabled = true;
                prevBtn.disabled = true;
                spotifyStatusEl.className = 'status-indicator';
                currentSpotifyEl.textContent = 'Connect to Spotify to start playing';
            }

            // Update music UI
            const musicStatusEl = document.getElementById('musicStatus');
            const currentMusicEl = document.getElementById('currentMusic');

            if (musicState.isPlaying) {
                musicStatusEl.className = 'status-indicator status-playing';
                currentMusicEl.textContent = \`♪ Playing: \${musicState.currentTrack}\`;
            } else if (musicState.currentTrack) {
                musicStatusEl.className = 'status-indicator status-paused';
                currentMusicEl.textContent = \`⏸ Paused: \${musicState.currentTrack}\`;
            } else {
                musicStatusEl.className = 'status-indicator';
                currentMusicEl.textContent = 'No music playing';
            }

            // Update Quran UI
            const quranStatusEl = document.getElementById('quranStatus');
            const currentQuranEl = document.getElementById('currentQuran');

            if (quranState.isPlaying) {
                quranStatusEl.className = 'status-indicator status-playing';
                currentQuranEl.textContent = \`📿 Playing: \${quranState.currentSurah}\`;
            } else if (quranState.currentSurah) {
                quranStatusEl.className = 'status-indicator status-paused';
                currentQuranEl.textContent = \`⏸ Paused: \${quranState.currentSurah}\`;
            } else {
                quranStatusEl.className = 'status-indicator';
                currentQuranEl.textContent = 'No Surah playing';
            }

            // Update YouTube Music UI
            const youtubeStatusEl = document.getElementById('youtubeStatus');
            const currentYoutubeEl = document.getElementById('currentYoutube');
            const youtubePlayBtn = document.getElementById('youtubePlayBtn');

            if (youtubeState.currentTrack) {
                if (youtubeState.isPlaying) {
                    youtubeStatusEl.className = 'status-indicator status-playing';
                    youtubePlayBtn.textContent = '⏸️ Pause';
                    currentYoutubeEl.textContent = \`🎵 Playing: \${youtubeState.currentTrack}\`;
                } else {
                    youtubeStatusEl.className = 'status-indicator status-paused';
                    youtubePlayBtn.textContent = '▶️ Play';
                    currentYoutubeEl.textContent = \`⏸ Paused: \${youtubeState.currentTrack}\`;
                }
            } else {
                youtubeStatusEl.className = 'status-indicator';
                youtubePlayBtn.textContent = '▶️ Play';
                currentYoutubeEl.textContent = 'Search for music on YouTube';
            }

            // Update volume sliders
            document.getElementById('musicVolume').value = musicState.volume * 100;
            document.getElementById('musicVolumeValue').textContent = Math.round(musicState.volume * 100) + '%';
            document.getElementById('quranVolume').value = quranState.volume * 100;
            document.getElementById('quranVolumeValue').textContent = Math.round(quranState.volume * 100) + '%';
            document.getElementById('spotifyVolume').value = spotifyState.volume * 100;
            document.getElementById('spotifyVolumeValue').textContent = Math.round(spotifyState.volume * 100) + '%';
        }

        // Initialize UI
        updateUI();
    </script>
</body>
</html>`;
    }

    public reveal() {
        this.panel.reveal(vscode.ViewColumn.One);
    }

    public onDispose(callback: () => void) {
        this.panel.onDidDispose(callback, null, this.disposables);
    }

    public refresh() {
        this.panel.webview.html = this.getWebviewContent();
        this.updateUI();
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
