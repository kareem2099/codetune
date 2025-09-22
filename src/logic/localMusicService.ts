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
}

export interface LocalMusicPlaylist {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    trackCount: number;
    tracks: LocalMusicTrack[];
    service: MusicServiceType.LOCAL;
}

export class LocalMusicService {
    private context: vscode.ExtensionContext;
    private musicFolders: string[] = [];

    public readonly name = 'Local Music';
    public readonly type = MusicServiceType.LOCAL;
    public readonly isFree = true;
    public readonly requiresAuth = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadMusicFolders();
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
                    service: MusicServiceType.LOCAL
                });
            }
        }

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

    private async getAllTracks(): Promise<LocalMusicTrack[]> {
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
            const fileName = path.basename(filePath, path.extname(filePath));
            const folderName = path.basename(path.dirname(filePath));

            // Simple parsing - in a real implementation, you'd use a library like musicmetadata
            const parts = fileName.split(' - ');

            let name = fileName;
            let artists: string[] = ['Unknown Artist'];
            let album = folderName;

            if (parts.length >= 2) {
                artists = [parts[0].trim()];
                name = parts[1].trim();
            }

            return {
                id: this.generateId(filePath),
                name: name,
                artists: artists,
                album: album,
                duration: 0, // Would need metadata parsing
                filePath: filePath,
                service: MusicServiceType.LOCAL
            };
        } catch (error) {
            console.error(`Error parsing music file ${filePath}:`, error);
            return null;
        }
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
}
