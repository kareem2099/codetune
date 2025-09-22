import * as vscode from 'vscode';
import { MusicPlayer } from './file/musicPlayer';
import { QuranPlayer } from './file/quranPlayer';
import { PlayerWebviewPanel } from './logic/webviewPanel';
import { SpotifyService } from './logic/spotifyService';
import { MusicServiceManager, MusicServiceType } from './logic/musicService';
import { YouTubeMusicService } from './logic/youtubeMusicService';
import { LocalMusicService } from './logic/localMusicService';
import { ActivityBarViewProvider } from './logic/activityBarView';
import { YouTubeAuthPanel } from './logic/youtubeAuthPanel';

let musicPlayer: MusicPlayer;
let quranPlayer: QuranPlayer;
let spotifyService: SpotifyService;
let musicServiceManager: MusicServiceManager;
let webviewPanel: PlayerWebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeTune extension is now active!');

    // Initialize players and services
    musicPlayer = new MusicPlayer(context);
    quranPlayer = new QuranPlayer(context);
    spotifyService = new SpotifyService(context);

    // Initialize service manager
    musicServiceManager = new MusicServiceManager(context);

    // Register music services
    const youtubeMusicService = new YouTubeMusicService(context, {
        clientId: process.env.YOUTUBE_CLIENT_ID || '',
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
        apiKey: process.env.YOUTUBE_API_KEY || '',
        redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8888/youtube-callback'
    });

    const localMusicService = new LocalMusicService(context);

    musicServiceManager.registerService(spotifyService);
    musicServiceManager.registerService(youtubeMusicService);
    musicServiceManager.registerService(localMusicService);

    // Initialize all services
    musicServiceManager.initializeServices();

    // Initialize Activity Bar webview
    console.log('Extension: Creating Activity Bar provider...');
    const activityBarProvider = new ActivityBarViewProvider(
        context.extensionUri,
        musicPlayer,
        quranPlayer,
        spotifyService,
        musicServiceManager
    );

    console.log('Extension: Registering Activity Bar provider...');
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ActivityBarViewProvider.viewType, activityBarProvider)
    );
    console.log('Extension: Activity Bar provider registered successfully');

    // Service selection commands
    const selectMusicServiceCommand = vscode.commands.registerCommand(
        'codeTune.selectMusicService',
        async () => {
            const selectedService = await musicServiceManager.selectService();
            if (selectedService) {
                vscode.window.showInformationMessage(
                    `🎵 Switched to ${musicServiceManager.getService(selectedService)?.name}`
                );
            }
        }
    );

    const searchMusicCommand = vscode.commands.registerCommand(
        'codeTune.searchMusic',
        async () => {
            const youtubeService = musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            const searchHistory = youtubeService instanceof YouTubeMusicService ?
                youtubeService.getSearchHistory() : [];

            // Show search history as quick pick items if available
            let query: string | undefined;
            if (searchHistory.length > 0) {
                const historyItems = searchHistory.slice(0, 5).map((item, index) => ({
                    label: item,
                    description: `Recent search #${index + 1}`,
                    alwaysShow: true
                }));

                const selected = await vscode.window.showQuickPick(
                    [
                        { label: 'Enter new search...', description: 'Type your own query' },
                        ...historyItems
                    ],
                    {
                        placeHolder: 'Search music or select from recent searches...',
                        matchOnDescription: true
                    }
                );

                if (selected) {
                    if (selected.label === 'Enter new search...') {
                        query = await vscode.window.showInputBox({
                            prompt: 'Search Music',
                            placeHolder: 'Enter song, artist, or album name...'
                        });
                    } else {
                        query = selected.label;
                    }
                }
            } else {
                query = await vscode.window.showInputBox({
                    prompt: 'Search Music',
                    placeHolder: 'Enter song, artist, or album name...'
                });
            }

            if (query) {
                try {
                    const tracks = await musicServiceManager.searchTracks(query);

                    if (tracks.length === 0) {
                        vscode.window.showInformationMessage('No tracks found. Try a different search term.');
                        return;
                    }

                    const trackNames = tracks.map(track =>
                        `${track.name} - ${track.artists.join(', ')} (${Math.floor(track.duration / 60000)}:${Math.floor((track.duration % 60000) / 1000).toString().padStart(2, '0')})`
                    );

                    const selected = await vscode.window.showQuickPick(trackNames, {
                        placeHolder: 'Select a track to play'
                    });

                    if (selected) {
                        const track = tracks[trackNames.indexOf(selected)];
                        await musicServiceManager.playTrack(track.id);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Search failed: ${error}`);
                }
            }
        }
    );

    const browsePlaylistsCommand = vscode.commands.registerCommand(
        'codeTune.browsePlaylists',
        async () => {
            try {
                const playlists = await musicServiceManager.getUserPlaylists();
                if (playlists.length === 0) {
                    vscode.window.showInformationMessage('No playlists found. Try switching to a different service.');
                    return;
                }

                const playlistNames = playlists.map(playlist =>
                    `${playlist.name} (${playlist.trackCount} tracks) - ${playlist.service}`
                );

                const selected = await vscode.window.showQuickPick(playlistNames, {
                    placeHolder: 'Select a playlist to browse'
                });

                if (selected) {
                    const playlist = playlists[playlistNames.indexOf(selected)];
                    const tracks = await musicServiceManager.getPlaylistTracks(playlist.id);

                    const trackNames = tracks.map(track =>
                        `${track.name} - ${track.artists.join(', ')}`
                    );

                    const trackSelected = await vscode.window.showQuickPick(trackNames, {
                        placeHolder: 'Select a track to play'
                    });

                    if (trackSelected) {
                        const track = tracks[trackNames.indexOf(trackSelected)];
                        await musicServiceManager.playTrack(track.id);
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to browse playlists: ${error}`);
            }
        }
    );

    const setupLocalMusicCommand = vscode.commands.registerCommand(
        'codeTune.setupLocalMusic',
        async () => {
            const localService = musicServiceManager.getService(MusicServiceType.LOCAL);
            if (localService && localService instanceof LocalMusicService) {
                await localService.selectMusicFolders();
            }
        }
    );

    // YouTube Music enhanced features commands
    const connectYouTubeCommand = vscode.commands.registerCommand(
        'codeTune.connectYouTube',
        async () => {
            const youtubeService = musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                await youtubeService.authenticate();
            }
        }
    );

    const disconnectYouTubeCommand = vscode.commands.registerCommand(
        'codeTune.disconnectYouTube',
        async () => {
            const youtubeService = musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                await youtubeService.logout();
            }
        }
    );

    const clearYouTubeCacheCommand = vscode.commands.registerCommand(
        'codeTune.clearYouTubeCache',
        async () => {
            const youtubeService = musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                youtubeService.clearCache();
                vscode.window.showInformationMessage('YouTube Music cache cleared');
            }
        }
    );

    const viewYouTubeSearchHistoryCommand = vscode.commands.registerCommand(
        'codeTune.viewYouTubeSearchHistory',
        async () => {
            const youtubeService = musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                const history = youtubeService.getSearchHistory();
                if (history.length === 0) {
                    vscode.window.showInformationMessage('No search history available');
                    return;
                }

                const selected = await vscode.window.showQuickPick(
                    history.map((query, index) => ({
                        label: query,
                        description: `Search #${index + 1}`
                    })),
                    {
                        placeHolder: 'Select a previous search to repeat'
                    }
                );

                if (selected) {
                    // Trigger search with selected query
                    vscode.commands.executeCommand('codeTune.searchMusic');
                }
            }
        }
    );

    const clearYouTubeSearchHistoryCommand = vscode.commands.registerCommand(
        'codeTune.clearYouTubeSearchHistory',
        async () => {
            const youtubeService = musicServiceManager.getService(MusicServiceType.YOUTUBE_MUSIC);
            if (youtubeService && youtubeService instanceof YouTubeMusicService) {
                youtubeService.clearSearchHistory();
                vscode.window.showInformationMessage('YouTube Music search history cleared');
            }
        }
    );

    const playTrackCommand = vscode.commands.registerCommand(
        'codeTune.playTrack',
        async (trackId: string) => {
            try {
                await musicServiceManager.playTrack(trackId);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to play track: ${error}`);
            }
        }
    );

    // Register commands
    const openPlayerCommand = vscode.commands.registerCommand(
        'codeTune.openPlayer',
        () => {
            if (webviewPanel) {
                webviewPanel.reveal();
            } else {
                webviewPanel = new PlayerWebviewPanel(context, musicPlayer, quranPlayer, spotifyService, musicServiceManager);
                webviewPanel.onDispose(() => {
                    webviewPanel = undefined;
                });
            }
        }
    );

    const playMusicCommand = vscode.commands.registerCommand(
        'codeTune.playMusic',
        async () => {
            const musicFiles = await vscode.window.showQuickPick(
                musicPlayer.getMusicList(),
                { placeHolder: 'Select a music track' }
            );

            if (musicFiles) {
                await musicPlayer.play(musicFiles);
                vscode.window.showInformationMessage(`Playing: ${musicFiles}`);
            }
        }
    );

    const playQuranCommand = vscode.commands.registerCommand(
        'codeTune.playQuran',
        async () => {
            const surahList = await vscode.window.showQuickPick(
                quranPlayer.getSurahList(),
                { placeHolder: 'Select a Surah' }
            );

            if (surahList) {
                await quranPlayer.play(surahList);
                vscode.window.showInformationMessage(`Playing Quran: ${surahList}`);
            }
        }
    );

    const connectSpotifyCommand = vscode.commands.registerCommand(
        'codeTune.connectSpotify',
        async () => {
            const success = await spotifyService.authenticate();
            if (success) {
                // Refresh the webview if it's open
                if (webviewPanel) {
                    webviewPanel.refresh();
                }
            }
        }
    );

    const searchSpotifyCommand = vscode.commands.registerCommand(
        'codeTune.searchSpotify',
        async () => {
            if (!(await spotifyService.isAuthenticated())) {
                vscode.window.showErrorMessage('Please connect to Spotify first using "Connect to Spotify" command');
                return;
            }

            const query = await vscode.window.showInputBox({
                prompt: 'Search Spotify',
                placeHolder: 'Enter song, artist, or album name...'
            });

            if (query) {
                try {
                    const tracks = await spotifyService.searchTracks(query);
                    const trackNames = tracks.map(track =>
                        `${track.name} - ${track.artists.join(', ')}`
                    );

                    const selected = await vscode.window.showQuickPick(trackNames, {
                        placeHolder: 'Select a track to play'
                    });

                    if (selected) {
                        const track = tracks[trackNames.indexOf(selected)];
                        await spotifyService.playTrack(track.id);
                        vscode.window.showInformationMessage(`Playing: ${selected}`);
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Search failed: ${error}`);
                }
            }
        }
    );

    // Spotify playback commands
    const pauseSpotifyCommand = vscode.commands.registerCommand(
        'codeTune.pauseSpotify',
        async () => {
            try {
                await spotifyService.pausePlayback();
                vscode.window.showInformationMessage('Spotify paused');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to pause Spotify: ${error}`);
            }
        }
    );

    const resumeSpotifyCommand = vscode.commands.registerCommand(
        'codeTune.resumeSpotify',
        async () => {
            try {
                await spotifyService.resumePlayback();
                vscode.window.showInformationMessage('Spotify resumed');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to resume Spotify: ${error}`);
            }
        }
    );

    const skipToNextCommand = vscode.commands.registerCommand(
        'codeTune.skipToNext',
        async () => {
            try {
                await spotifyService.skipToNext();
                vscode.window.showInformationMessage('Skipped to next track');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to skip to next: ${error}`);
            }
        }
    );

    const skipToPreviousCommand = vscode.commands.registerCommand(
        'codeTune.skipToPrevious',
        async () => {
            try {
                await spotifyService.skipToPrevious();
                vscode.window.showInformationMessage('Skipped to previous track');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to skip to previous: ${error}`);
            }
        }
    );

    const setSpotifyVolumeCommand = vscode.commands.registerCommand(
        'codeTune.setSpotifyVolume',
        async (volume: number) => {
            try {
                await spotifyService.setVolume(volume);
            } catch (error) {
                console.error('Failed to set Spotify volume:', error);
            }
        }
    );

    const loadPlaylistCommand = vscode.commands.registerCommand(
        'codeTune.loadPlaylist',
        async (playlistId: string) => {
            try {
                if (playlistId === 'liked') {
                    // Handle liked songs
                    vscode.window.showInformationMessage('Loading your liked songs...');
                } else {
                    // Handle other playlists
                    const tracks = await spotifyService.getPlaylistTracks(playlistId);
                    vscode.window.showInformationMessage(`Loaded playlist with ${tracks.length} tracks`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load playlist: ${error}`);
            }
        }
    );

    const pauseCommand = vscode.commands.registerCommand(
        'codeTune.pause',
        async () => {
            try {
                await spotifyService.pausePlayback();
                musicPlayer.pause();
                quranPlayer.pause();
                vscode.window.showInformationMessage('Paused');
            } catch (error) {
                // Fallback to local players if Spotify fails
                musicPlayer.pause();
                quranPlayer.pause();
                vscode.window.showInformationMessage('Paused');
            }
        }
    );

    // Test command to verify activity bar is working
    const testActivityBarCommand = vscode.commands.registerCommand(
        'codeTune.testActivityBar',
        () => {
            vscode.window.showInformationMessage('Activity Bar is working! ✅');
        }
    );

    // YouTube Authentication Webview
    const openYouTubeAuthCommand = vscode.commands.registerCommand(
        'codeTune.openYouTubeAuth',
        () => {
            const youtubeAuthPanel = new YouTubeAuthPanel(context, musicServiceManager);
            youtubeAuthPanel.reveal();
        }
    );

    const stopCommand = vscode.commands.registerCommand(
        'codeTune.stop',
        async () => {
            try {
                await spotifyService.pausePlayback();
            } catch (error) {
                // Ignore Spotify errors
            }
            musicPlayer.stop();
            quranPlayer.stop();
            vscode.window.showInformationMessage('Stopped');
        }
    );

    // Add to subscriptions
    context.subscriptions.push(
        openPlayerCommand,
        playMusicCommand,
        playQuranCommand,
        connectSpotifyCommand,
        searchSpotifyCommand,
        selectMusicServiceCommand,
        searchMusicCommand,
        browsePlaylistsCommand,
        setupLocalMusicCommand,
        connectYouTubeCommand,
        disconnectYouTubeCommand,
        clearYouTubeCacheCommand,
        viewYouTubeSearchHistoryCommand,
        clearYouTubeSearchHistoryCommand,
        playTrackCommand,
        pauseCommand,
        stopCommand,
        testActivityBarCommand,
        openYouTubeAuthCommand
    );

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(play) CodeTune";
    statusBarItem.command = 'codeTune.openPlayer';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    if (musicPlayer) {
        musicPlayer.dispose();
    }
    if (quranPlayer) {
        quranPlayer.dispose();
    }
}
