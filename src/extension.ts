import * as vscode from 'vscode';
import { MusicPlayer } from './file/musicPlayer';
import { QuranPlayer } from './file/quranPlayer';
import { PlayerWebviewPanel } from './logic/webviewPanel';
import { SpotifyService } from './logic/spotifyService';

let musicPlayer: MusicPlayer;
let quranPlayer: QuranPlayer;
let spotifyService: SpotifyService;
let webviewPanel: PlayerWebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeTune extension is now active!');

    // Initialize players and services
    musicPlayer = new MusicPlayer(context);
    quranPlayer = new QuranPlayer(context);
    spotifyService = new SpotifyService(context);

    // Register commands
    const openPlayerCommand = vscode.commands.registerCommand(
        'codeTune.openPlayer',
        () => {
            if (webviewPanel) {
                webviewPanel.reveal();
            } else {
                webviewPanel = new PlayerWebviewPanel(context, musicPlayer, quranPlayer, spotifyService);
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
        pauseCommand,
        stopCommand
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
