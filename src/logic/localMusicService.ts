import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MusicServiceType } from './musicService';

export interface LocalMusicTrack {
    id: string;
    name: string;
    artists: string[];
    album: string;
    duration: number;
    imageUrl?: string;
    filePath: string;
    service: MusicServiceType.LOCAL;
    genre?: string;
    year?: number;
    trackNumber?: number;
    bitrate?: number;
    sampleRate?: number;
    fileSize: number;
}

export interface LocalMusicPlaylist {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    trackCount: number;
    tracks: LocalMusicTrack[];
    service: MusicServiceType.LOCAL;
    isCustom: boolean; // true for user-created playlists, false for auto-generated
    createdAt: Date;
    updatedAt: Date;
}

export class LocalMusicService {
    private context: vscode.ExtensionContext;
    private musicFolders: string[] = [];
    private customPlaylists: LocalMusicPlaylist[] = [];
    private metadataCache: Map<string, any> = new Map();

    public readonly name = 'Local Music';
    public readonly type = MusicServiceType.LOCAL;
    public readonly isFree = true;
    public readonly requiresAuth = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadMusicFolders();
        this.loadCustomPlaylists();
    }

    public async authenticate(): Promise<boolean> {
        // Local music doesn't require authentication
        vscode.window.showInformationMessage(
            '🎵 Local Music is ready! No authentication required.',
            'OK'
        );
        return true;
    }

    public async isAuthenticated(): Promise<boolean> {
        return true;
    }

    public async logout(): Promise<void> {
        // Nothing to logout for local music
        return;
    }

    public async searchTracks(query: string, limit: number = 20): Promise<LocalMusicTrack[]> {
        const allTracks = await this.getAllTracks();
        const filteredTracks = allTracks.filter(track =>
            track.name.toLowerCase().includes(query.toLowerCase()) ||
            track.artists.some(artist => artist.toLowerCase().includes(query.toLowerCase())) ||
            track.album.toLowerCase().includes(query.toLowerCase())
        );

        return filteredTracks.slice(0, limit);
    }

    public async getUserPlaylists(): Promise<LocalMusicPlaylist[]> {
        // For local music, create playlists based on folders
        const playlists: LocalMusicPlaylist[] = [];

        for (const folder of this.musicFolders) {
            const tracks = await this.getTracksFromFolder(folder);
            if (tracks.length > 0) {
                playlists.push({
                    id: this.generateId(folder),
                    name: path.basename(folder),
                    description: `Local music from ${path.basename(folder)}`,
                    trackCount: tracks.length,
                    tracks: tracks,
                    service: MusicServiceType.LOCAL,
                    isCustom: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }
        }

        // Add custom playlists
        playlists.push(...this.customPlaylists);
        return playlists;
    }

    public async getPlaylistTracks(playlistId: string): Promise<LocalMusicTrack[]> {
        // Find playlist by ID and return its tracks
        const playlists = await this.getUserPlaylists();
        const playlist = playlists.find(p => p.id === playlistId);

        return playlist ? playlist.tracks : [];
    }

    public getServiceUrl(): string {
        return 'file://';
    }

    public async getCurrentPlayback(): Promise<any> {
        return {
            isPremiumRequired: false,
            message: 'Local music playback requires external player',
            is_playing: false,
            service: MusicServiceType.LOCAL
        };
    }

    public async playTrack(trackId: string): Promise<void> {
        const tracks = await this.getAllTracks();
        const track = tracks.find(t => t.id === trackId);

        if (track) {
            vscode.window.showInformationMessage(
                `🎵 Opening "${track.name}" in system player...`,
                'Open File'
            ).then(selection => {
                if (selection === 'Open File') {
                    vscode.env.openExternal(vscode.Uri.file(track.filePath));
                }
            });
        }
    }

    public async selectMusicFolders(): Promise<void> {
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: true,
            openLabel: 'Select Music Folders',
            title: 'Choose folders containing your music files'
        });

        if (folders) {
            this.musicFolders = folders.map(f => f.fsPath);
            await this.saveMusicFolders();
            vscode.window.showInformationMessage(
                `✅ Added ${folders.length} music folder(s) to your library!`
            );
        }
    }

    public async getAllTracks(): Promise<LocalMusicTrack[]> {
        const allTracks: LocalMusicTrack[] = [];

        for (const folder of this.musicFolders) {
            const tracks = await this.getTracksFromFolder(folder);
            allTracks.push(...tracks);
        }

        return allTracks;
    }

    private async getTracksFromFolder(folderPath: string): Promise<LocalMusicTrack[]> {
        const tracks: LocalMusicTrack[] = [];

        try {
            const files = await this.getMusicFiles(folderPath);

            for (const file of files) {
                const track = await this.parseMusicFile(file);
                if (track) {
                    tracks.push(track);
                }
            }
        } catch (error) {
            console.error(`Error reading music folder ${folderPath}:`, error);
        }

        return tracks;
    }

    private async getMusicFiles(folderPath: string): Promise<string[]> {
        const musicFiles: string[] = [];
        const supportedExtensions = ['.mp3', '.m4a', '.wav', '.flac', '.aac', '.ogg', '.wma'];

        const scanDirectory = async (dir: string): Promise<void> => {
            try {
                const items = fs.readdirSync(dir);

                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        await scanDirectory(fullPath);
                    } else if (stat.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        if (supportedExtensions.includes(ext)) {
                            musicFiles.push(fullPath);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${dir}:`, error);
            }
        };

        await scanDirectory(folderPath);
        return musicFiles;
    }

    private async parseMusicFile(filePath: string): Promise<LocalMusicTrack | null> {
        try {
            // Check cache first
            if (this.metadataCache.has(filePath)) {
                return this.metadataCache.get(filePath);
            }

            const fileName = path.basename(filePath, path.extname(filePath));
            const folderName = path.basename(path.dirname(filePath));
            const fileStat = fs.statSync(filePath);

            // Use dynamic import for music-metadata to avoid module issues
            const mm = await import('music-metadata');

            // Parse metadata using music-metadata library
            const metadata = await mm.parseFile(filePath);

            // Extract metadata with fallbacks
            const title = metadata.common.title || fileName;
            const artists = metadata.common.artists || metadata.common.artist ?
                [metadata.common.artist || 'Unknown Artist'] : ['Unknown Artist'];
            const album = metadata.common.album || folderName;
            const duration = metadata.format.duration || 0;
            const genre = metadata.common.genre?.[0];
            const year = metadata.common.year;
            const trackNumber = metadata.common.track.no !== null ? metadata.common.track.no : (metadata.common.track.of || undefined);

            const track: LocalMusicTrack = {
                id: this.generateId(filePath),
                name: title,
                artists: artists,
                album: album,
                duration: Math.round(duration * 1000), // Convert to milliseconds
                filePath: filePath,
                service: MusicServiceType.LOCAL,
                genre: genre,
                year: year,
                trackNumber: trackNumber,
                bitrate: metadata.format.bitrate,
                sampleRate: metadata.format.sampleRate,
                fileSize: fileStat.size
            };

            // Cache the result
            this.metadataCache.set(filePath, track);
            return track;
        } catch (error) {
            console.error(`Error parsing music file ${filePath}:`, error);
            return null;
        }
    }

    private async loadCustomPlaylists(): Promise<void> {
        const saved = this.context.globalState.get<LocalMusicPlaylist[]>('local.customPlaylists');
        if (saved) {
            this.customPlaylists = saved.map(p => ({
                ...p,
                createdAt: new Date(p.createdAt),
                updatedAt: new Date(p.updatedAt)
            }));
        }
    }

    private async saveCustomPlaylists(): Promise<void> {
        await this.context.globalState.update('local.customPlaylists', this.customPlaylists);
    }

    private generateId(input: string): string {
        // Simple ID generation - in production, use a proper hash
        return Buffer.from(input).toString('base64').replace(/[\/+=]/g, '').substring(0, 22);
    }

    private async loadMusicFolders(): Promise<void> {
        const saved = this.context.globalState.get<string[]>('local.musicFolders');
        if (saved) {
            this.musicFolders = saved;
        }
    }

    private async saveMusicFolders(): Promise<void> {
        await this.context.globalState.update('local.musicFolders', this.musicFolders);
    }

    public getMusicFolders(): string[] {
        return [...this.musicFolders];
    }

    // Enhanced playlist management
    public async createCustomPlaylist(name: string, description?: string): Promise<LocalMusicPlaylist> {
        const playlist: LocalMusicPlaylist = {
            id: this.generateId(`playlist_${name}_${Date.now()}`),
            name: name,
            description: description,
            trackCount: 0,
            tracks: [],
            service: MusicServiceType.LOCAL,
            isCustom: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.customPlaylists.push(playlist);
        await this.saveCustomPlaylists();
        return playlist;
    }

    public async addTrackToPlaylist(playlistId: string, trackId: string): Promise<boolean> {
        const playlist = this.customPlaylists.find(p => p.id === playlistId);
        if (!playlist) {
            return false;
        }

        const allTracks = await this.getAllTracks();
        const track = allTracks.find(t => t.id === trackId);
        if (!track){ 
            return false;
        }

        // Check if track already exists in playlist
        if (playlist.tracks.some(t => t.id === trackId)) {
            return false;
        }

        playlist.tracks.push(track);
        playlist.trackCount = playlist.tracks.length;
        playlist.updatedAt = new Date();

        await this.saveCustomPlaylists();
        return true;
    }

    public async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
        const playlist = this.customPlaylists.find(p => p.id === playlistId);
        if (!playlist) {return false;}

        const initialLength = playlist.tracks.length;
        playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
        playlist.trackCount = playlist.tracks.length;
        playlist.updatedAt = new Date();

        const changed = initialLength !== playlist.tracks.length;
        if (changed) {
            await this.saveCustomPlaylists();
        }
        return changed;
    }

    public async deleteCustomPlaylist(playlistId: string): Promise<boolean> {
        const initialLength = this.customPlaylists.length;
        this.customPlaylists = this.customPlaylists.filter(p => p.id !== playlistId);

        const changed = initialLength !== this.customPlaylists.length;
        if (changed) {
            await this.saveCustomPlaylists();
        }
        return changed;
    }

    public async getCustomPlaylists(): Promise<LocalMusicPlaylist[]> {
        return [...this.customPlaylists];
    }

    public async getAllPlaylists(): Promise<LocalMusicPlaylist[]> {
        const folderPlaylists = await this.getUserPlaylists();
        const customPlaylists = await this.getCustomPlaylists();
        return [...folderPlaylists, ...customPlaylists];
    }

    // Enhanced search with more filters
    public async searchTracksAdvanced(query: string, limit: number = 20, filters?: {
        genre?: string;
        year?: number;
        minDuration?: number;
        maxDuration?: number;
    }): Promise<LocalMusicTrack[]> {
        const allTracks = await this.getAllTracks();

        let filteredTracks = allTracks.filter(track => {
            const matchesQuery =
                track.name.toLowerCase().includes(query.toLowerCase()) ||
                track.artists.some(artist => artist.toLowerCase().includes(query.toLowerCase())) ||
                track.album.toLowerCase().includes(query.toLowerCase()) ||
                (track.genre && track.genre.toLowerCase().includes(query.toLowerCase()));

            if (!matchesQuery) {return false;}

            // Apply additional filters
            if (filters) {
                if (filters.genre && track.genre !== filters.genre) {return false;}
                if (filters.year && track.year !== filters.year) {return false;}
                if (filters.minDuration && track.duration < filters.minDuration) {return false;}
                if (filters.maxDuration && track.duration > filters.maxDuration) {return false;}
            }

            return true;
        });

        // Sort by relevance (tracks with matching title first, then artist, then album)
        filteredTracks.sort((a, b) => {
            const aTitleMatch = a.name.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
            const bTitleMatch = b.name.toLowerCase().includes(query.toLowerCase()) ? 2 : 0;
            const aArtistMatch = a.artists.some(artist => artist.toLowerCase().includes(query.toLowerCase())) ? 1 : 0;
            const bArtistMatch = b.artists.some(artist => artist.toLowerCase().includes(query.toLowerCase())) ? 1 : 0;

            return (bTitleMatch + bArtistMatch) - (aTitleMatch + aArtistMatch);
        });

        return filteredTracks.slice(0, limit);
    }

    // File organization helpers
    public async organizeMusicByArtist(): Promise<void> {
        const tracks = await this.getAllTracks();
        const artistMap = new Map<string, LocalMusicTrack[]>();

        // Group tracks by artist
        tracks.forEach(track => {
            const primaryArtist = track.artists[0] || 'Unknown Artist';
            if (!artistMap.has(primaryArtist)) {
                artistMap.set(primaryArtist, []);
            }
            artistMap.get(primaryArtist)!.push(track);
        });

        // Create organized folder structure
        const musicRoot = this.musicFolders[0] || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!musicRoot) {
            vscode.window.showErrorMessage('No music folder configured');
            return;
        }

        const organizedPath = path.join(musicRoot, 'Organized by Artist');
        if (!fs.existsSync(organizedPath)) {
            fs.mkdirSync(organizedPath, { recursive: true });
        }

        for (const [artist, artistTracks] of artistMap.entries()) {
            const artistPath = path.join(organizedPath, this.sanitizeFolderName(artist));
            if (!fs.existsSync(artistPath)) {
                fs.mkdirSync(artistPath, { recursive: true });
            }

            // Group by album within artist folder
            const albumMap = new Map<string, LocalMusicTrack[]>();
            artistTracks.forEach(track => {
                if (!albumMap.has(track.album)) {
                    albumMap.set(track.album, []);
                }
                albumMap.get(track.album)!.push(track);
            });

            for (const [album, albumTracks] of albumMap.entries()) {
                const albumPath = path.join(artistPath, this.sanitizeFolderName(album));
                if (!fs.existsSync(albumPath)) {
                    fs.mkdirSync(albumPath, { recursive: true });
                }

                // Copy files to organized structure (or create symlinks)
                for (const track of albumTracks) {
                    const targetPath = path.join(albumPath, path.basename(track.filePath));
                    if (!fs.existsSync(targetPath)) {
                        fs.copyFileSync(track.filePath, targetPath);
                    }
                }
            }
        }

        vscode.window.showInformationMessage(
            `✅ Organized ${tracks.length} tracks into artist folders`,
            'Open Folder'
        ).then(selection => {
            if (selection === 'Open Folder') {
                vscode.env.openExternal(vscode.Uri.file(organizedPath));
            }
        });
    }

    private sanitizeFolderName(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '').trim();
    }

    // Get tracks by genre, year, etc.
    public async getTracksByGenre(genre: string): Promise<LocalMusicTrack[]> {
        const allTracks = await this.getAllTracks();
        return allTracks.filter(track => track.genre === genre);
    }

    public async getTracksByYear(year: number): Promise<LocalMusicTrack[]> {
        const allTracks = await this.getAllTracks();
        return allTracks.filter(track => track.year === year);
    }

    public async getTracksByDuration(minDuration: number, maxDuration: number): Promise<LocalMusicTrack[]> {
        const allTracks = await this.getAllTracks();
        return allTracks.filter(track =>
            track.duration >= minDuration && track.duration <= maxDuration
        );
    }

    // Get music statistics
    public async getMusicStatistics(): Promise<{
        totalTracks: number;
        totalDuration: number;
        totalSize: number;
        genres: string[];
        years: number[];
        artists: string[];
        albums: string[];
    }> {
        const tracks = await this.getAllTracks();

        const genres = [...new Set(tracks.map(t => t.genre).filter(g => g !== undefined))];
        const years = [...new Set(tracks.map(t => t.year).filter(y => y !== undefined))].sort();
        const artists = [...new Set(tracks.flatMap(t => t.artists))];
        const albums = [...new Set(tracks.map(t => t.album))];

        const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);
        const totalSize = tracks.reduce((sum, track) => sum + track.fileSize, 0);

        return {
            totalTracks: tracks.length,
            totalDuration,
            totalSize,
            genres,
            years,
            artists,
            albums
        };
    }

    // Clear metadata cache
    public clearMetadataCache(): void {
        this.metadataCache.clear();
    }

    // Get cache statistics
    public getCacheStatistics(): { size: number; hitRate: number } {
        return {
            size: this.metadataCache.size,
            hitRate: 0 // Would need to track hits/misses for accurate rate
        };
    }
}
