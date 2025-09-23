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

        /* Quran-specific styles */
        .quran-section {
            border-left: 4px solid #2e7d32;
        }

        .ayah-display {
            background: linear-gradient(135deg, #2e7d32, #388e3c);
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            text-align: center;
            color: white;
            box-shadow: 0 4px 20px rgba(46, 125, 50, 0.2);
        }

        .ayah-image-container {
            margin-bottom: 15px;
        }

        .ayah-image {
            max-width: 100%;
            max-height: 200px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .ayah-info {
            margin-top: 10px;
        }

        .ayah-text {
            font-size: 1.4em;
            font-weight: bold;
            margin-bottom: 8px;
            line-height: 1.6;
            direction: rtl;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }

        .ayah-reference {
            font-size: 1em;
            opacity: 0.9;
            font-style: italic;
        }

        .playback-mode-selector, .quality-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 15px 0;
            justify-content: center;
        }

        .playback-mode-selector select, .quality-selector select {
            padding: 6px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 0.9em;
        }

        .quick-access {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 8px;
            border-left: 3px solid #2e7d32;
        }

        .quick-access h4 {
            margin: 0 0 10px 0;
            color: var(--vscode-textLink-foreground);
            font-size: 1em;
        }

        .quick-surahs {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .quick-btn {
            padding: 6px 12px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 15px;
            cursor: pointer;
            font-size: 0.8em;
            transition: all 0.2s;
        }

        .quick-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: 1fr;
            }

            .quick-surahs {
                justify-content: center;
            }

            .quick-btn {
                font-size: 0.7em;
                padding: 4px 8px;
            }

            .ayah-text {
                font-size: 1.2em;
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
        <button class="service-btn" onclick="selectService('quran')">📿 Quran</button>
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

        <!-- Quran Player Section -->
        <div class="player-section quran-section" id="quranSection" style="display: none;">
            <div class="player-title">
                <span class="icon">📿</span>
                <span>Quran Player</span>
                <span id="quranStatus" class="status-indicator"></span>
            </div>

            <div class="current-playing" id="currentQuran">No Surah playing</div>

            <!-- Ayah Display Area -->
            <div class="ayah-display" id="ayahDisplay" style="display: none;">
                <div class="ayah-image-container">
                    <img id="ayahImage" class="ayah-image" alt="Current Ayah" />
                </div>
                <div class="ayah-info">
                    <div class="ayah-text" id="ayahText"></div>
                    <div class="ayah-reference" id="ayahReference"></div>
                </div>
            </div>

            <!-- Playback Mode Selector -->
            <div class="playback-mode-selector">
                <label>Playback Mode:</label>
                <select id="playbackModeSelect" onchange="setPlaybackMode(this.value)">
                    <option value="surah">Full Surah</option>
                    <option value="ayah">Ayah by Ayah</option>
                </select>
            </div>

            <!-- Quality Selector -->
            <div class="quality-selector">
                <label>Audio Quality:</label>
                <select id="qualitySelect" onchange="setAudioQuality(this.value)">
                    <option value="32">32 kbps (Low)</option>
                    <option value="48">48 kbps</option>
                    <option value="64">64 kbps</option>
                    <option value="128" selected>128 kbps (High)</option>
                    <option value="192">192 kbps (Best)</option>
                </select>
            </div>

            <div class="controls">
                <button class="btn" onclick="toggleQuran()">▶️ Play/Pause</button>
                <button class="btn" onclick="stopQuran()">⏹️ Stop</button>
                <button class="btn" onclick="selectReciter()">👤 Select Reciter</button>
                <button class="btn" onclick="showAyahImage()">🖼️ Show Image</button>
            </div>

            <div class="volume-control">
                <label>Volume:</label>
                <input type="range" class="volume-slider" id="quranVolume" min="0" max="100" value="70" onchange="setQuranVolume(this.value)">
                <span id="quranVolumeValue">70%</span>
            </div>

            <!-- Quick Access Surahs -->
            <div class="quick-access">
                <h4>Quick Access:</h4>
                <div class="quick-surahs">
                    <button class="quick-btn" onclick="playQuran('001 - Al-Fatiha (الفاتحة)')">1. الفاتحة</button>
                    <button class="quick-btn" onclick="playQuran('036 - Ya-Sin (يس)')">36. يس</button>
                    <button class="quick-btn" onclick="playQuran('055 - Ar-Rahman (الرحمن)')">55. الرحمن</button>
                    <button class="quick-btn" onclick="playQuran('067 - Al-Mulk (الملك)')">67. الملك</button>
                    <button class="quick-btn" onclick="playQuran('112 - Al-Ikhlas (الإخلاص)')">112. الإخلاص</button>
                    <button class="quick-btn" onclick="playQuran('114 - An-Nas (الناس)')">114. الناس</button>
                </div>
            </div>

            <div class="surah-list" id="surahList">
                <div class="surah-item" onclick="playQuran('001 - Al-Fatiha (الفاتحة)')">
                    <div class="track-info">
                        <div class="track-name">001 - Al-Fatiha (The Opening)</div>
                        <div class="track-artist">7 verses</div>
                    </div>
                    <div class="arabic-text">الفاتحة</div>
                </div>
                <div class="surah-item" onclick="playQuran('002 - Al-Baqarah (البقرة)')">
                    <div class="track-info">
                        <div class="track-name">002 - Al-Baqarah (The Cow)</div>
                        <div class="track-artist">286 verses</div>
                    </div>
                    <div class="arabic-text">البقرة</div>
                </div>
                <div class="surah-item" onclick="playQuran('003 - Aal-E-Imran (آل عمران)')">
                    <div class="track-info">
                        <div class="track-name">003 - Aal-E-Imran (The Family of Imran)</div>
                        <div class="track-artist">200 verses</div>
                    </div>
                    <div class="arabic-text">آل عمران</div>
                </div>
                <div class="surah-item" onclick="playQuran('036 - Ya-Sin (يس)')">
                    <div class="track-info">
                        <div class="track-name">036 - Ya-Sin (Yaseen)</div>
                        <div class="track-artist">83 verses</div>
                    </div>
                    <div class="arabic-text">يس</div>
                </div>
                <div class="surah-item" onclick="playQuran('055 - Ar-Rahman (الرحمن)')">
                    <div class="track-info">
                        <div class="track-name">055 - Ar-Rahman (The Beneficent)</div>
                        <div class="track-artist">78 verses</div>
                    </div>
                    <div class="arabic-text">الرحمن</div>
                </div>
                <div class="surah-item" onclick="playQuran('067 - Al-Mulk (الملك)')">
                    <div class="track-info">
                        <div class="track-name">067 - Al-Mulk (The Sovereignty)</div>
                        <div class="track-artist">30 verses</div>
                    </div>
                    <div class="arabic-text">الملك</div>
                </div>
                <div class="surah-item" onclick="playQuran('112 - Al-Ikhlas (الإخلاص)')">
                    <div class="track-info">
                        <div class="track-name">112 - Al-Ikhlas (The Sincerity)</div>
                        <div class="track-artist">4 verses</div>
                    </div>
                    <div class="arabic-text">الإخلاص</div>
                </div>
                <div class="surah-item" onclick="playQuran('114 - An-Nas (الناس)')">
                    <div class="track-info">
                        <div class="track-name">114 - An-Nas (The Mankind)</div>
                        <div class="track-artist">6 verses</div>
                    </div>
                    <div class="arabic-text">الناس</div>
                </div>
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
            // Hide all service sections with null checks
            const sections = ['spotifySection', 'youtubeSection', 'localSection', 'quranSection'];
            sections.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.style.display = 'none';
                }
            });

            // Remove active class from all service buttons
            const serviceButtons = document.querySelectorAll('.service-btn');
            serviceButtons.forEach(btn => {
                if (btn) {
                    btn.classList.remove('active');
                }
            });

            // Show selected service section
            switch(service) {
                case 'spotify':
                    const spotifySection = document.getElementById('spotifySection');
                    const spotifyBtn = document.querySelector('.service-btn[onclick*="spotify"]');
                    if (spotifySection) spotifySection.style.display = 'block';
                    if (spotifyBtn) spotifyBtn.classList.add('active');
                    break;
                case 'youtube_music':
                    const youtubeSection = document.getElementById('youtubeSection');
                    const youtubeBtn = document.querySelector('.service-btn[onclick*="youtube"]');
                    if (youtubeSection) youtubeSection.style.display = 'block';
                    if (youtubeBtn) youtubeBtn.classList.add('active');
                    break;
                case 'local':
                    const localSection = document.getElementById('localSection');
                    const localBtn = document.querySelector('.service-btn[onclick*="local"]');
                    if (localSection) localSection.style.display = 'block';
                    if (localBtn) localBtn.classList.add('active');
                    break;
                case 'quran':
                    const quranSection = document.getElementById('quranSection');
                    const quranBtn = document.querySelector('.service-btn[onclick*="quran"]');
                    if (quranSection) quranSection.style.display = 'block';
                    if (quranBtn) quranBtn.classList.add('active');
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
            // Update Spotify UI with null checks
            const spotifyStatusEl = document.getElementById('spotifyStatus');
            const currentSpotifyEl = document.getElementById('currentSpotify');
            const connectionStatusEl = document.getElementById('spotifyConnectionStatus');
            const connectBtn = document.getElementById('connectBtn');
            const playPauseBtn = document.getElementById('playPauseBtn');
            const nextBtn = document.getElementById('nextBtn');
            const prevBtn = document.getElementById('prevBtn');

            if (spotifyState.isConnected) {
                if (connectionStatusEl) {
                    connectionStatusEl.textContent = 'Connected';
                    connectionStatusEl.className = 'spotify-status spotify-connected';
                }
                if (connectBtn) connectBtn.textContent = '🔗 Reconnect';
                if (playPauseBtn) playPauseBtn.disabled = false;
                if (nextBtn) nextBtn.disabled = false;
                if (prevBtn) prevBtn.disabled = false;

                if (spotifyState.isPlaying) {
                    if (spotifyStatusEl) spotifyStatusEl.className = 'status-indicator status-playing';
                    if (playPauseBtn) playPauseBtn.textContent = '⏸️ Pause';
                    if (currentSpotifyEl) currentSpotifyEl.textContent = \`🎵 Playing: \${spotifyState.currentTrack}\`;
                } else {
                    if (spotifyStatusEl) spotifyStatusEl.className = 'status-indicator status-paused';
                    if (playPauseBtn) playPauseBtn.textContent = '▶️ Play';
                    if (currentSpotifyEl) currentSpotifyEl.textContent = \`⏸ Paused: \${spotifyState.currentTrack}\`;
                }
            } else {
                if (connectionStatusEl) {
                    connectionStatusEl.textContent = 'Not Connected';
                    connectionStatusEl.className = 'spotify-status spotify-disconnected';
                }
                if (connectBtn) connectBtn.textContent = '🔗 Connect';
                if (playPauseBtn) playPauseBtn.disabled = true;
                if (nextBtn) nextBtn.disabled = true;
                if (prevBtn) prevBtn.disabled = true;
                if (spotifyStatusEl) spotifyStatusEl.className = 'status-indicator';
                if (currentSpotifyEl) currentSpotifyEl.textContent = 'Connect to Spotify to start playing';
            }

            // Update music UI with null checks
            const musicStatusEl = document.getElementById('musicStatus');
            const currentMusicEl = document.getElementById('currentMusic');

            if (musicState.isPlaying) {
                if (musicStatusEl) musicStatusEl.className = 'status-indicator status-playing';
                if (currentMusicEl) currentMusicEl.textContent = \`♪ Playing: \${musicState.currentTrack}\`;
            } else if (musicState.currentTrack) {
                if (musicStatusEl) musicStatusEl.className = 'status-indicator status-paused';
                if (currentMusicEl) currentMusicEl.textContent = \`⏸ Paused: \${musicState.currentTrack}\`;
            } else {
                if (musicStatusEl) musicStatusEl.className = 'status-indicator';
                if (currentMusicEl) currentMusicEl.textContent = 'No music playing';
            }

            // Update Quran UI with null checks
            const quranStatusEl = document.getElementById('quranStatus');
            const currentQuranEl = document.getElementById('currentQuran');

            if (quranState.isPlaying) {
                if (quranStatusEl) quranStatusEl.className = 'status-indicator status-playing';
                if (currentQuranEl) currentQuranEl.textContent = \`📿 Playing: \${quranState.currentSurah}\`;
            } else if (quranState.currentSurah) {
                if (quranStatusEl) quranStatusEl.className = 'status-indicator status-paused';
                if (currentQuranEl) currentQuranEl.textContent = \`⏸ Paused: \${quranState.currentSurah}\`;
            } else {
                if (quranStatusEl) quranStatusEl.className = 'status-indicator';
                if (currentQuranEl) currentQuranEl.textContent = 'No Surah playing';
            }

            // Update YouTube Music UI with null checks
            const youtubeStatusEl = document.getElementById('youtubeStatus');
            const currentYoutubeEl = document.getElementById('currentYoutube');
            const youtubePlayBtn = document.getElementById('youtubePlayBtn');

            if (youtubeState.currentTrack) {
                if (youtubeState.isPlaying) {
                    if (youtubeStatusEl) youtubeStatusEl.className = 'status-indicator status-playing';
                    if (youtubePlayBtn) youtubePlayBtn.textContent = '⏸️ Pause';
                    if (currentYoutubeEl) currentYoutubeEl.textContent = \`🎵 Playing: \${youtubeState.currentTrack}\`;
                } else {
                    if (youtubeStatusEl) youtubeStatusEl.className = 'status-indicator status-paused';
                    if (youtubePlayBtn) youtubePlayBtn.textContent = '▶️ Play';
                    if (currentYoutubeEl) currentYoutubeEl.textContent = \`⏸ Paused: \${youtubeState.currentTrack}\`;
                }
            } else {
                if (youtubeStatusEl) youtubeStatusEl.className = 'status-indicator';
                if (youtubePlayBtn) youtubePlayBtn.textContent = '▶️ Play';
                if (currentYoutubeEl) currentYoutubeEl.textContent = 'Search for music on YouTube';
            }

            // Update volume sliders with null checks
            const musicVolumeSlider = document.getElementById('musicVolume');
            const musicVolumeValue = document.getElementById('musicVolumeValue');
            const quranVolumeSlider = document.getElementById('quranVolume');
            const quranVolumeValue = document.getElementById('quranVolumeValue');
            const spotifyVolumeSlider = document.getElementById('spotifyVolume');
            const spotifyVolumeValue = document.getElementById('spotifyVolumeValue');

            if (musicVolumeSlider) musicVolumeSlider.value = musicState.volume * 100;
            if (musicVolumeValue) musicVolumeValue.textContent = Math.round(musicState.volume * 100) + '%';
            if (quranVolumeSlider) quranVolumeSlider.value = quranState.volume * 100;
            if (quranVolumeValue) quranVolumeValue.textContent = Math.round(quranState.volume * 100) + '%';
            if (spotifyVolumeSlider) spotifyVolumeSlider.value = spotifyState.volume * 100;
            if (spotifyVolumeValue) spotifyVolumeValue.textContent = Math.round(spotifyState.volume * 100) + '%';
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
