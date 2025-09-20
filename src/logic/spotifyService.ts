import * as vscode from 'vscode';
import SpotifyWebApi = require('spotify-web-api-node');
import axios from 'axios';

export interface SpotifyCredentials {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: string[];
    album: string;
    duration: number;
    imageUrl?: string;
    previewUrl?: string;
}

export interface SpotifyPlaylist {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    trackCount: number;
}

export class SpotifyService {
    private spotifyApi: SpotifyWebApi;
    private context: vscode.ExtensionContext;
    private credentials: SpotifyCredentials | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        // Get redirect URI from configuration or use default
        const redirectUri = vscode.workspace.getConfiguration('codeTune').get('spotifyRedirectUri', 'https://server-5198m68fj-freerave.vercel.app/callback');

        this.spotifyApi = new SpotifyWebApi({
            clientId: vscode.workspace.getConfiguration('codeTune').get('spotifyClientId', ''),
            clientSecret: vscode.workspace.getConfiguration('codeTune').get('spotifyClientSecret', ''),
            redirectUri: redirectUri
        });

        // Load saved credentials
        this.loadCredentials();
    }

    private async loadCredentials(): Promise<void> {
        const stored = this.context.globalState.get<SpotifyCredentials>('spotify.credentials');
        if (stored && stored.expiresAt > Date.now()) {
            this.credentials = stored;
            this.spotifyApi.setAccessToken(stored.accessToken);
            this.spotifyApi.setRefreshToken(stored.refreshToken);
        }
    }

    private async saveCredentials(credentials: SpotifyCredentials): Promise<void> {
        this.credentials = credentials;
        await this.context.globalState.update('spotify.credentials', credentials);
        this.spotifyApi.setAccessToken(credentials.accessToken);
        this.spotifyApi.setRefreshToken(credentials.refreshToken);
    }

    public async isAuthenticated(): Promise<boolean> {
        if (!this.credentials) {
            return false;
        }

        // Check if token is expired and refresh if needed
        if (this.credentials.expiresAt <= Date.now()) {
            return await this.refreshAccessToken();
        }

        return true;
    }

    public async refreshAccessToken(): Promise<boolean> {
        if (!this.credentials?.refreshToken) {
            return false;
        }

        try {
            this.spotifyApi.setRefreshToken(this.credentials.refreshToken);
            const data = await this.spotifyApi.refreshAccessToken();

            const newCredentials: SpotifyCredentials = {
                accessToken: data.body.access_token,
                refreshToken: this.credentials.refreshToken,
                expiresAt: Date.now() + (data.body.expires_in * 1000)
            };

            await this.saveCredentials(newCredentials);
            return true;
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            return false;
        }
    }

    public async authenticate(): Promise<boolean> {
        const clientId = vscode.workspace.getConfiguration('codeTune').get('spotifyClientId', '');

        if (!clientId) {
            vscode.window.showErrorMessage(
                'Spotify Client ID not configured. Please set codeTune.spotifyClientId in your settings.'
            );
            return false;
        }

        try {
            // Generate authorization URL
            const scopes = [
                'user-read-private',
                'user-read-email',
                'user-read-playback-state',
                'user-modify-playback-state',
                'user-read-currently-playing',
                'user-library-read',
                'playlist-read-private',
                'playlist-read-collaborative',
                'streaming',
                'user-read-playback-position'
            ];

            const authUrl = this.spotifyApi.createAuthorizeURL(scopes, 'state');

            // Open browser for authentication
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));

            // Start local server to handle callback
            const credentials = await this.waitForCallback();

            if (credentials) {
                await this.saveCredentials(credentials);
                vscode.window.showInformationMessage('Successfully connected to Spotify!');
                return true;
            }

            return false;
        } catch (error) {
            console.error('Authentication failed:', error);
            vscode.window.showErrorMessage('Failed to authenticate with Spotify');
            return false;
        }
    }

    private async waitForCallback(): Promise<SpotifyCredentials | null> {
        return new Promise((resolve) => {
            // Use the Vercel server for callback handling
            const checkServer = async () => {
                try {
                    // Check if the Vercel server is accessible
                    const response = await axios.get('https://server-5198m68fj-freerave.vercel.app/health', { timeout: 5000 });
                    if (response.status === 200) {
                        // Server is running, use automated flow
                        await this.handleAutomatedCallback();
                        resolve(null);
                        return;
                    }
                } catch (error) {
                    console.log('Vercel callback server not available, falling back to manual input');
                }

                // Fallback: Ask user to paste the callback URL manually
                vscode.window.showInformationMessage(
                    'Please complete the authentication in your browser and paste the redirected URL here.',
                    'Paste URL'
                ).then(selection => {
                    if (selection === 'Paste URL') {
                        vscode.window.showInputBox({
                            prompt: 'Paste the redirected URL from your browser',
                            placeHolder: 'https://server-5198m68fj-freerave.vercel.app/callback?code=...'
                        }).then(url => {
                            if (url) {
                                this.handleCallback(url).then(resolve).catch(() => resolve(null));
                            } else {
                                resolve(null);
                            }
                        });
                    } else {
                        resolve(null);
                    }
                });
            };

            checkServer();
        });
    }

    private async handleAutomatedCallback(): Promise<void> {
        const sessionId = Math.random().toString(36).substring(2, 15);
        let attempts = 0;
        const maxAttempts = 120; // 2 minutes timeout

        vscode.window.showInformationMessage(
            '🎵 Opening Spotify authentication... Please complete the authentication in your browser.',
            'OK'
        );

        const pollServer = async () => {
            try {
                // For Vercel deployment, we'll use a simpler approach
                // Since Vercel doesn't support session-based polling easily,
                // we'll fall back to manual URL input for now
                vscode.window.showInformationMessage(
                    '🎵 Authentication started! Please complete it in your browser and paste the callback URL.',
                    'OK'
                );

                // Fallback to manual input since Vercel doesn't support session polling
                vscode.window.showInformationMessage(
                    'Please complete the authentication in your browser and paste the redirected URL here.',
                    'Paste URL'
                ).then(selection => {
                    if (selection === 'Paste URL') {
                        vscode.window.showInputBox({
                            prompt: 'Paste the redirected URL from your browser',
                            placeHolder: 'https://server-5198m68fj-freerave.vercel.app/callback?code=...'
                        }).then(async (url) => {
                            if (url) {
                                try {
                                    const credentials = await this.handleCallback(url);
                                    if (credentials) {
                                        await this.saveCredentials(credentials);
                                        vscode.window.showInformationMessage('✅ Successfully connected to Spotify!');
                                    }
                                } catch (error) {
                                    vscode.window.showErrorMessage('Failed to process authentication callback');
                                }
                            }
                        });
                    }
                });

                return;
            } catch (error) {
                console.error('Error with automated callback:', error);
                // Fallback to manual input
                vscode.window.showInformationMessage(
                    'Please complete the authentication in your browser and paste the redirected URL here.',
                    'Paste URL'
                ).then(selection => {
                    if (selection === 'Paste URL') {
                        vscode.window.showInputBox({
                            prompt: 'Paste the redirected URL from your browser',
                            placeHolder: 'https://server-5198m68fj-freerave.vercel.app/callback?code=...'
                        }).then(async (url) => {
                            if (url) {
                                try {
                                    const credentials = await this.handleCallback(url);
                                    if (credentials) {
                                        await this.saveCredentials(credentials);
                                        vscode.window.showInformationMessage('✅ Successfully connected to Spotify!');
                                    }
                                } catch (error) {
                                    vscode.window.showErrorMessage('Failed to process authentication callback');
                                }
                            }
                        });
                    }
                });
            }
        };

        // Start polling
        setTimeout(pollServer, 2000); // Start polling after 2 seconds
    }

    private async handleCallback(url: string): Promise<SpotifyCredentials | null> {
        try {
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');

            if (!code) {
                throw new Error('No authorization code found in URL');
            }

            const data = await this.spotifyApi.authorizationCodeGrant(code);

            return {
                accessToken: data.body.access_token,
                refreshToken: data.body.refresh_token,
                expiresAt: Date.now() + (data.body.expires_in * 1000)
            };
        } catch (error) {
            console.error('Failed to handle callback:', error);
            throw error;
        }
    }

    public async getCurrentUser(): Promise<any> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            const data = await this.spotifyApi.getMe();
            return data.body;
        } catch (error) {
            console.error('Failed to get current user:', error);
            throw error;
        }
    }

    public async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            const data = await this.spotifyApi.getUserPlaylists();
            return data.body.items.map((playlist: any) => ({
                id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                imageUrl: playlist.images?.[0]?.url,
                trackCount: playlist.tracks.total
            }));
        } catch (error) {
            console.error('Failed to get user playlists:', error);
            throw error;
        }
    }

    public async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            const data = await this.spotifyApi.getPlaylistTracks(playlistId);
            return data.body.items.map((item: any) => ({
                id: item.track.id,
                name: item.track.name,
                artists: item.track.artists.map((artist: any) => artist.name),
                album: item.track.album.name,
                duration: item.track.duration_ms,
                imageUrl: item.track.album.images?.[0]?.url,
                previewUrl: item.track.preview_url
            }));
        } catch (error) {
            console.error('Failed to get playlist tracks:', error);
            throw error;
        }
    }

    public async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            const data = await this.spotifyApi.searchTracks(query, { limit });
            return data.body.tracks?.items.map((track: any) => ({
                id: track.id,
                name: track.name,
                artists: track.artists.map((artist: any) => artist.name),
                album: track.album.name,
                duration: track.duration_ms,
                imageUrl: track.album.images?.[0]?.url,
                previewUrl: track.preview_url
            })) || [];
        } catch (error) {
            console.error('Failed to search tracks:', error);
            throw error;
        }
    }

    public async getCurrentPlayback(): Promise<any> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            const data = await this.spotifyApi.getMyCurrentPlaybackState();
            return data.body;
        } catch (error) {
            console.error('Failed to get current playback:', error);
            throw error;
        }
    }

    public async playTrack(trackId: string): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            await this.spotifyApi.play({
                uris: [`spotify:track:${trackId}`]
            });
        } catch (error) {
            console.error('Failed to play track:', error);
            throw error;
        }
    }

    public async pausePlayback(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            await this.spotifyApi.pause();
        } catch (error) {
            console.error('Failed to pause playback:', error);
            throw error;
        }
    }

    public async resumePlayback(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            await this.spotifyApi.play();
        } catch (error) {
            console.error('Failed to resume playback:', error);
            throw error;
        }
    }

    public async skipToNext(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            await this.spotifyApi.skipToNext();
        } catch (error) {
            console.error('Failed to skip to next:', error);
            throw error;
        }
    }

    public async skipToPrevious(): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            await this.spotifyApi.skipToPrevious();
        } catch (error) {
            console.error('Failed to skip to previous:', error);
            throw error;
        }
    }

    public async setVolume(volume: number): Promise<void> {
        if (!(await this.isAuthenticated())) {
            throw new Error('Not authenticated with Spotify');
        }

        try {
            await this.spotifyApi.setVolume(Math.round(volume * 100));
        } catch (error) {
            console.error('Failed to set volume:', error);
            throw error;
        }
    }

    public async logout(): Promise<void> {
        this.credentials = null;
        this.spotifyApi.resetAccessToken();
        this.spotifyApi.resetRefreshToken();
        await this.context.globalState.update('spotify.credentials', undefined);
    }

    public getCredentials(): SpotifyCredentials | null {
        return this.credentials;
    }
}
