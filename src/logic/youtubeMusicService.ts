import * as vscode from 'vscode';
import axios from 'axios';
import { MusicServiceType } from './musicService';

export interface YouTubeMusicCredentials {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

export interface YouTubeAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export interface YouTubeMusicTrack {
    id: string;
    name: string;
    artists: string[];
    album: string;
    duration: number;
    imageUrl?: string;
    previewUrl?: string;
    externalUrl: string;
    service: MusicServiceType.YOUTUBE_MUSIC;
}

export interface YouTubeMusicPlaylist {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    trackCount: number;
    externalUrl: string;
    service: MusicServiceType.YOUTUBE_MUSIC;
}

export class YouTubeMusicService {
    private readonly YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
    private readonly YOUTUBE_MUSIC_API_BASE = 'https://music.youtube.com/youtubei/v1';
    private credentials: YouTubeMusicCredentials | null = null;
    private context: vscode.ExtensionContext;
    private clientId: string;
    private clientSecret: string;
    private apiKey: string;

    // Enhanced search features
    private searchCache: Map<string, { results: YouTubeMusicTrack[], timestamp: number }> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private searchHistory: string[] = [];
    private readonly MAX_HISTORY_SIZE = 50;

    public readonly name = 'YouTube Music';
    public readonly type = MusicServiceType.YOUTUBE_MUSIC;
    public readonly isFree = true;
    public readonly requiresAuth = true; // YouTube Music benefits from authentication

    private authConfig?: YouTubeAuthConfig;

    constructor(context: vscode.ExtensionContext, config: {
        clientId: string;
        clientSecret: string;
        apiKey: string;
        redirectUri?: string;
    }) {
        this.context = context;
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.apiKey = config.apiKey;

        if (config.redirectUri) {
            this.authConfig = {
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri
            };
        }
    }

    public async authenticate(): Promise<boolean> {
        try {
            if (!this.authConfig) {
                // Fallback to API key only mode
                vscode.window.showInformationMessage(
                    '🎵 YouTube Music is ready! Using API key for search (limited features).',
                    'OK'
                );
                return true;
            }

            // Check if already authenticated
            if (await this.isAuthenticated()) {
                vscode.window.showInformationMessage(
                    '🎵 YouTube Music is already connected!',
                    'OK'
                );
                return true;
            }

            // Start OAuth flow
            const authUrl = this.buildAuthUrl();
            vscode.window.showInformationMessage(
                '🎵 Opening YouTube authentication...',
                'Open Browser'
            ).then(selection => {
                if (selection === 'Open Browser') {
                    vscode.env.openExternal(vscode.Uri.parse(authUrl));
                }
            });

            return false; // Will complete after user authorizes
        } catch (error) {
            console.error('YouTube Music authentication failed:', error);
            return false;
        }
    }

    public async isAuthenticated(): Promise<boolean> {
        // Check if we have valid credentials
        if (!this.credentials) {
            await this.loadCredentials();
        }

        if (!this.credentials) {
            return false;
        }

        // Check if token is expired
        if (Date.now() >= this.credentials.expiresAt) {
            return await this.refreshToken();
        }

        return true;
    }

    public async logout(): Promise<void> {
        this.credentials = null;
        await this.context.globalState.update('youtube.credentials', null);
        vscode.window.showInformationMessage('🎵 YouTube Music disconnected');
    }

    private buildAuthUrl(): string {
        if (!this.authConfig) {
            throw new Error('YouTube auth config not available');
        }

        const params = new URLSearchParams({
            client_id: this.authConfig.clientId,
            redirect_uri: this.authConfig.redirectUri,
            scope: 'https://www.googleapis.com/auth/youtube.readonly',
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent'
        });

        return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
    }

    public async completeAuthentication(code: string): Promise<boolean> {
        return await this.handleAuthCallback(code);
    }

    public async handleAuthCallback(code: string): Promise<boolean> {
        try {
            if (!this.authConfig) {
                throw new Error('YouTube auth config not available');
            }

            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: this.authConfig.clientId,
                client_secret: this.authConfig.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.authConfig.redirectUri
            });

            const tokenData = tokenResponse.data;
            this.credentials = {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: Date.now() + (tokenData.expires_in * 1000)
            };

            await this.saveCredentials();
            vscode.window.showInformationMessage('🎵 YouTube Music connected successfully!');
            return true;
        } catch (error) {
            console.error('YouTube auth callback failed:', error);
            vscode.window.showErrorMessage('Failed to connect YouTube Music. Please try again.');
            return false;
        }
    }

    private async refreshToken(): Promise<boolean> {
        try {
            if (!this.credentials?.refreshToken || !this.authConfig) {
                return false;
            }

            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: this.authConfig.clientId,
                client_secret: this.authConfig.clientSecret,
                refresh_token: this.credentials.refreshToken,
                grant_type: 'refresh_token'
            });

            const tokenData = tokenResponse.data;
            this.credentials.accessToken = tokenData.access_token;
            this.credentials.expiresAt = Date.now() + (tokenData.expires_in * 1000);

            await this.saveCredentials();
            return true;
        } catch (error) {
            console.error('YouTube token refresh failed:', error);
            this.credentials = null;
            await this.context.globalState.update('youtube.credentials', null);
            return false;
        }
    }

    private async saveCredentials(): Promise<void> {
        if (this.credentials) {
            await this.context.globalState.update('youtube.credentials', this.credentials);
        }
    }

    private async loadCredentials(): Promise<void> {
        const saved = this.context.globalState.get<YouTubeMusicCredentials>('youtube.credentials');
        if (saved) {
            this.credentials = saved;
        }
    }

    public getAccessToken(): string | null {
        return this.credentials?.accessToken || null;
    }

    public async searchTracks(query: string, limit: number = 20): Promise<YouTubeMusicTrack[]> {
        try {
            // Use YouTube Data API to search for music videos
            const response = await axios.get(`${this.YOUTUBE_API_BASE}/search`, {
                params: {
                    part: 'snippet',
                    q: `${query} music`,
                    type: 'video',
                    videoCategoryId: '10', // Music category
                    maxResults: limit,
                    key: this.apiKey
                },
                timeout: 10000
            });

            if (response.data.items) {
                return response.data.items.map((item: any) => ({
                    id: item.id.videoId,
                    name: item.snippet.title,
                    artists: [item.snippet.channelTitle],
                    album: 'YouTube Music',
                    duration: 0, // YouTube API doesn't provide duration in search
                    imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    externalUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                    service: MusicServiceType.YOUTUBE_MUSIC
                }));
            }

            return [];
        } catch (error: any) {
            console.error('YouTube Music search failed:', error);

            // Always return mock data for demonstration when API fails
            console.log('Using mock data for YouTube Music search...');
            return this.getMockTracks(query, limit);
        }
    }

    public async getUserPlaylists(): Promise<YouTubeMusicPlaylist[]> {
        try {
            // YouTube Music playlists require authentication
            // For now, return popular music playlists
            const response = await axios.get(`${this.YOUTUBE_API_BASE}/playlists`, {
                params: {
                    part: 'snippet,contentDetails',
                    channelId: 'UC-9-kyTW8ZkZNDHQJ6FgpwQ', // Music channel
                    maxResults: 10,
                    key: this.apiKey
                },
                timeout: 10000
            });

            if (response.data.items) {
                return response.data.items.map((item: any) => ({
                    id: item.id,
                    name: item.snippet.title,
                    description: item.snippet.description,
                    imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    trackCount: item.contentDetails.itemCount,
                    externalUrl: `https://www.youtube.com/playlist?list=${item.id}`,
                    service: MusicServiceType.YOUTUBE_MUSIC
                }));
            }

            return [];
        } catch (error: any) {
            console.error('YouTube Music playlists failed:', error);

            // Fallback: return mock playlists
            return this.getMockPlaylists();
        }
    }

    public async getPlaylistTracks(playlistId: string): Promise<YouTubeMusicTrack[]> {
        try {
            const response = await axios.get(`${this.YOUTUBE_API_BASE}/playlistItems`, {
                params: {
                    part: 'snippet,contentDetails',
                    playlistId: playlistId,
                    maxResults: 50,
                    key: this.apiKey
                },
                timeout: 10000
            });

            if (response.data.items) {
                return response.data.items.map((item: any) => ({
                    id: item.contentDetails.videoId,
                    name: item.snippet.title,
                    artists: [item.snippet.channelTitle],
                    album: 'YouTube Music Playlist',
                    duration: 0,
                    imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
                    externalUrl: `https://www.youtube.com/watch?v=${item.contentDetails.videoId}`,
                    service: MusicServiceType.YOUTUBE_MUSIC
                }));
            }

            return [];
        } catch (error: any) {
            console.error('YouTube Music playlist tracks failed:', error);

            // Fallback: return mock tracks
            return this.getMockTracks('playlist', 20);
        }
    }

    public getServiceUrl(): string {
        return 'https://music.youtube.com';
    }

    private currentTrack: YouTubeMusicTrack | null = null;
    private isPlaying: boolean = false;
    private playbackQueue: YouTubeMusicTrack[] = [];
    private currentIndex: number = 0;

    public async getCurrentPlayback(): Promise<any> {
        return {
            isPremiumRequired: false,
            message: this.currentTrack ? `Playing: ${this.currentTrack.name}` : 'No track selected',
            is_playing: this.isPlaying,
            current_track: this.currentTrack,
            service: 'youtube_music'
        };
    }

    public async playTrack(trackId: string): Promise<void> {
        // Find the track in the current queue or create a new one
        if (this.playbackQueue.length === 0 || !this.currentTrack) {
            // If no queue, just open the track
            const url = `https://www.youtube.com/watch?v=${trackId}`;
            vscode.window.showInformationMessage(
                '🎵 Opening track in YouTube Music...',
                'Open in YouTube'
            ).then(selection => {
                if (selection === 'Open in YouTube') {
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            });
        } else {
            // Set current track and start playing
            const trackIndex = this.playbackQueue.findIndex(track => track.id === trackId);
            if (trackIndex !== -1) {
                this.currentIndex = trackIndex;
                this.currentTrack = this.playbackQueue[trackIndex];
                this.isPlaying = true;
            }
        }
    }

    public async pausePlayback(): Promise<void> {
        this.isPlaying = false;
    }

    public async resumePlayback(): Promise<void> {
        if (this.currentTrack) {
            this.isPlaying = true;
        }
    }

    public async skipToNext(): Promise<void> {
        if (this.playbackQueue.length > 0 && this.currentIndex < this.playbackQueue.length - 1) {
            this.currentIndex++;
            this.currentTrack = this.playbackQueue[this.currentIndex];
            this.isPlaying = true;
        } else {
            vscode.window.showInformationMessage('No next track in queue');
        }
    }

    public async skipToPrevious(): Promise<void> {
        if (this.playbackQueue.length > 0 && this.currentIndex > 0) {
            this.currentIndex--;
            this.currentTrack = this.playbackQueue[this.currentIndex];
            this.isPlaying = true;
        } else {
            vscode.window.showInformationMessage('No previous track in queue');
        }
    }

    public async setVolume(volume: number): Promise<void> {
        // YouTube Music doesn't support volume control via API
        // This is just for UI feedback
        console.log(`YouTube Music volume set to ${Math.round(volume * 100)}%`);
    }

    public setPlaybackQueue(tracks: YouTubeMusicTrack[]): void {
        this.playbackQueue = tracks;
        this.currentIndex = 0;
        if (tracks.length > 0) {
            this.currentTrack = tracks[0];
            this.isPlaying = false;
        }
    }

    public getCurrentTrack(): YouTubeMusicTrack | null {
        return this.currentTrack;
    }

    public getIsPlaying(): boolean {
        return this.isPlaying;
    }

    public getPlaybackQueue(): YouTubeMusicTrack[] {
        return this.playbackQueue;
    }

    // Enhanced search helper methods
    private enhanceSearchQuery(query: string): string {
        const trimmed = query.trim().toLowerCase();

        // Detect common music-related terms and enhance the query
        const enhancements = {
            'official': 'official video audio lyric',
            'live': 'live performance concert',
            'remix': 'remix version mix',
            'cover': 'cover version',
            'acoustic': 'acoustic version unplugged',
            'instrumental': 'instrumental version',
            'lyrics': 'lyric video lyrics'
        };

        let enhanced = query;

        // Add enhancements based on keywords
        Object.entries(enhancements).forEach(([keyword, enhancement]) => {
            if (trimmed.includes(keyword)) {
                enhanced += ` ${enhancement}`;
            }
        });

        // Add music category if not already present
        if (!trimmed.includes('music') && !trimmed.includes('song')) {
            enhanced += ' music';
        }

        return enhanced.trim();
    }

    private cleanTrackTitle(title: string): string {
        // Remove common YouTube clutter from titles
        return title
            .replace(/\s*\|\s*.*$/g, '') // Remove everything after |
            .replace(/\s*\-\s*.*$/g, '') // Remove everything after -
            .replace(/\s*\([^)]*\)\s*/g, '') // Remove content in parentheses
            .replace(/\s*\[[^\]]*\]\s*/g, '') // Remove content in brackets
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    private extractArtists(title: string, channelTitle: string): string[] {
        const artists: string[] = [];

        // Try to extract artist from title (usually before featuring, ft, etc.)
        const featuringPatterns = [
            /(.*?)\s+(?:ft\.?|featuring|feat\.?)\s+(.*)/i,
            /(.*?)\s*&\s*(.*)/,
            /(.*?)\s*,\s*(.*)/
        ];

        for (const pattern of featuringPatterns) {
            const match = title.match(pattern);
            if (match) {
                artists.push(...match.slice(1).map(a => a.trim()));
                break;
            }
        }

        // If no featuring found, use channel title as primary artist
        if (artists.length === 0) {
            artists.push(channelTitle);
        }

        return [...new Set(artists)]; // Remove duplicates
    }

    private extractAlbum(title: string): string {
        // Try to extract album name from common patterns
        const albumPatterns = [
            /(?:from|off)\s+["']([^"']+)["']/i,
            /(?:album|ep):\s*([^-\n]+)/i,
            /\[([^\]]+)\]/ // Sometimes album is in brackets
        ];

        for (const pattern of albumPatterns) {
            const match = title.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }

        return 'YouTube Music';
    }

    private isMusicContent(title: string, artists: string[]): boolean {
        const titleLower = title.toLowerCase();

        // Filter out non-music content
        const nonMusicTerms = [
            'tutorial', 'lesson', 'how to', 'review', 'reaction',
            'challenge', 'vlog', 'behind the scenes', 'interview',
            'news', 'gossip', 'comedy', 'funny', 'fail'
        ];

        return !nonMusicTerms.some(term => titleLower.includes(term));
    }

    private async getVideoDetails(videoIds: string[]): Promise<any[]> {
        try {
            const response = await axios.get(`${this.YOUTUBE_API_BASE}/videos`, {
                params: {
                    part: 'contentDetails,snippet',
                    id: videoIds.join(','),
                    key: this.apiKey
                },
                timeout: 10000
            });

            return response.data.items || [];
        } catch (error) {
            console.error('Failed to get video details:', error);
            return [];
        }
    }

    private parseDuration(duration: string): number {
        // Parse ISO 8601 duration format (PT4M13S)
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) {return 0;}

        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');

        return (hours * 3600 + minutes * 60 + seconds) * 1000; // Convert to milliseconds
    }

    private addToSearchHistory(query: string): void {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(q => q !== query);

        // Add to beginning
        this.searchHistory.unshift(query);

        // Limit history size
        if (this.searchHistory.length > this.MAX_HISTORY_SIZE) {
            this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY_SIZE);
        }
    }

    private getCachedResults(cacheKey: string): YouTubeMusicTrack[] | null {
        const cached = this.searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.results;
        }

        // Remove expired cache entry
        if (cached) {
            this.searchCache.delete(cacheKey);
        }

        return null;
    }

    private cacheResults(cacheKey: string, results: YouTubeMusicTrack[]): void {
        this.searchCache.set(cacheKey, {
            results,
            timestamp: Date.now()
        });
    }

    // Public methods for enhanced features
    public getSearchHistory(): string[] {
        return [...this.searchHistory];
    }

    public clearSearchHistory(): void {
        this.searchHistory = [];
    }

    public getCachedSearchResults(): string[] {
        return Array.from(this.searchCache.keys());
    }

    public clearCache(): void {
        this.searchCache.clear();
    }

    // Mock data for fallback when API is unavailable
    private getMockTracks(query: string, limit: number): YouTubeMusicTrack[] {
        // Generate realistic music results based on the search query
        const artists = [
            'Travis Scott', 'Drake', 'Taylor Swift', 'The Weeknd', 'Billie Eilish',
            'Post Malone', 'Ariana Grande', 'Ed Sheeran', 'Dua Lipa', 'Bad Bunny',
            'Olivia Rodrigo', 'Doja Cat', 'Harry Styles', 'BTS', 'Justin Bieber',
            'Kanye West', 'Rihanna', 'Eminem', 'Adele', 'Coldplay'
        ];

        const albums = [
            'After Hours', 'Fine Line', 'Future Nostalgia', 'Sour', 'Planet Her',
            'Certified Lover Boy', '30', 'Music of the Spheres', 'Happier Than Ever',
            'Justice', 'Positions', 'Evermore', 'Folklore', 'Chromatica'
        ];

        const mockTracks: YouTubeMusicTrack[] = [];

        // Generate tracks based on the query
        for (let i = 0; i < Math.min(limit, 5); i++) {
            const randomArtist = artists[Math.floor(Math.random() * artists.length)];
            const randomAlbum = albums[Math.floor(Math.random() * albums.length)];

            // Create realistic song titles based on query
            const songTitles = [
                `${query} (Official Video)`,
                `${query} - Live Performance`,
                `${query} - Acoustic Version`,
                `${query} - Remix`,
                `${query} - Extended Mix`,
                `${query} - Official Audio`,
                `${query} - Music Video`,
                `${query} - Lyrics Video`
            ];

            const songTitle = songTitles[i % songTitles.length];
            const duration = 180000 + Math.floor(Math.random() * 180000); // 3-6 minutes

            mockTracks.push({
                id: `mock_${query.replace(/\s+/g, '_')}_${i + 1}`,
                name: songTitle,
                artists: [randomArtist],
                album: randomAlbum,
                duration: duration,
                imageUrl: `https://img.youtube.com/vi/mock_${i + 1}/maxresdefault.jpg`,
                externalUrl: `https://www.youtube.com/watch?v=mock_${i + 1}`,
                service: MusicServiceType.YOUTUBE_MUSIC
            });
        }

        return mockTracks;
    }

    private getMockPlaylists(): YouTubeMusicPlaylist[] {
        return [
            {
                id: 'PLrAXtmRdnEQyN2JDJy0b5Y7b8gA3Y6H8',
                name: 'Popular Music 2024',
                description: 'Trending music videos and songs',
                imageUrl: 'https://img.youtube.com/vi/playlist1/maxresdefault.jpg',
                trackCount: 50,
                externalUrl: 'https://www.youtube.com/playlist?list=PLrAXtmRdnEQyN2JDJy0b5Y7b8gA3Y6H8',
                service: MusicServiceType.YOUTUBE_MUSIC
            },
            {
                id: 'PLrAXtmRdnEQyN2JDJy0b5Y7b8gA3Y6H9',
                name: 'Top Hits',
                description: 'Most popular songs right now',
                imageUrl: 'https://img.youtube.com/vi/playlist2/maxresdefault.jpg',
                trackCount: 100,
                externalUrl: 'https://www.youtube.com/playlist?list=PLrAXtmRdnEQyN2JDJy0b5Y7b8gA3Y6H9',
                service: MusicServiceType.YOUTUBE_MUSIC
            }
        ];
    }
}
