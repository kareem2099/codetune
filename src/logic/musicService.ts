import * as vscode from 'vscode';

export interface MusicTrack {
    id: string;
    name: string;
    artists: string[];
    album: string;
    duration: number;
    imageUrl?: string;
    previewUrl?: string;
    externalUrl?: string;
    service: MusicServiceType;
}

export interface MusicPlaylist {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    trackCount: number;
    externalUrl?: string;
    service: MusicServiceType;
}

export interface MusicService {
    name: string;
    type: MusicServiceType;
    isFree: boolean;
    requiresAuth: boolean;

    // Core methods
    authenticate(): Promise<boolean>;
    searchTracks(query: string, limit?: number): Promise<MusicTrack[]>;
    getUserPlaylists(): Promise<MusicPlaylist[]>;
    getPlaylistTracks(playlistId: string): Promise<MusicTrack[]>;

    // Optional methods (may require Premium)
    getCurrentPlayback?(): Promise<any>;
    playTrack?(trackId: string): Promise<void>;
    pausePlayback?(): Promise<void>;
    resumePlayback?(): Promise<void>;
    skipToNext?(): Promise<void>;
    skipToPrevious?(): Promise<void>;
    setVolume?(volume: number): Promise<void>;

    // Service-specific methods
    getServiceUrl?(): string;
    isAuthenticated(): Promise<boolean>;
    logout(): Promise<void>;
}

export enum MusicServiceType {
    SPOTIFY = 'spotify',
    YOUTUBE_MUSIC = 'youtube_music',
    SOUNDCLOUD = 'soundcloud',
    LOCAL = 'local'
}

export interface MusicServiceConfig {
    name: string;
    type: MusicServiceType;
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    redirectUri?: string;
    isFree: boolean;
    requiresAuth: boolean;
}

export class MusicServiceManager {
    private services: Map<MusicServiceType, MusicService> = new Map();
    private activeService: MusicServiceType = MusicServiceType.SPOTIFY;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public registerService(service: MusicService): void {
        this.services.set(service.type, service);
    }

    public getService(type: MusicServiceType): MusicService | undefined {
        return this.services.get(type);
    }

    public getActiveService(): MusicService | undefined {
        return this.services.get(this.activeService);
    }

    public setActiveService(type: MusicServiceType): void {
        if (this.services.has(type)) {
            this.activeService = type;
            this.saveActiveService();
        }
    }

    public getAvailableServices(): MusicService[] {
        return Array.from(this.services.values());
    }

    public async selectService(): Promise<MusicServiceType | undefined> {
        const services = this.getAvailableServices();
        const items = services.map(service => ({
            label: `${service.name}${service.isFree ? ' (Free)' : ' (Premium)'}`,
            description: service.requiresAuth ? 'Requires authentication' : 'No authentication needed',
            service: service.type
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Choose your preferred music service',
            matchOnDescription: true
        });

        if (selected) {
            this.setActiveService(selected.service);
            return selected.service;
        }

        return undefined;
    }

    public async initializeServices(): Promise<void> {
        // Load saved active service
        await this.loadActiveService();

        // Initialize all registered services
        for (const service of this.services.values()) {
            if (service.requiresAuth) {
                await service.isAuthenticated();
            }
        }
    }

    private async saveActiveService(): Promise<void> {
        await this.context.globalState.update('music.activeService', this.activeService);
    }

    private async loadActiveService(): Promise<void> {
        const saved = this.context.globalState.get<MusicServiceType>('music.activeService');
        if (saved && this.services.has(saved)) {
            this.activeService = saved;
        }
    }

    // Delegate methods to active service
    public async searchTracks(query: string, limit?: number): Promise<MusicTrack[]> {
        const service = this.getActiveService();
        if (!service) {
            throw new Error('No active music service selected');
        }
        return await service.searchTracks(query, limit);
    }

    public async getUserPlaylists(): Promise<MusicPlaylist[]> {
        const service = this.getActiveService();
        if (!service) {
            throw new Error('No active music service selected');
        }
        return await service.getUserPlaylists();
    }

    public async getPlaylistTracks(playlistId: string): Promise<MusicTrack[]> {
        const service = this.getActiveService();
        if (!service) {
            throw new Error('No active music service selected');
        }
        return await service.getPlaylistTracks(playlistId);
    }

    public async getCurrentPlayback(): Promise<any> {
        const service = this.getActiveService();
        if (!service || !service.getCurrentPlayback) {
            return {
                isPremiumRequired: true,
                message: 'Playback features require Premium or different service',
                is_playing: false
            };
        }
        return await service.getCurrentPlayback();
    }

    public async playTrack(trackId: string): Promise<void> {
        const service = this.getActiveService();
        if (!service || !service.playTrack) {
            vscode.window.showInformationMessage(
                '🎵 This service doesn\'t support playback. Try switching to a different service.',
                'Switch Service'
            ).then(selection => {
                if (selection === 'Switch Service') {
                    this.selectService();
                }
            });
            return;
        }
        return await service.playTrack(trackId);
    }

    public getContext(): vscode.ExtensionContext {
        return this.context;
    }
}
