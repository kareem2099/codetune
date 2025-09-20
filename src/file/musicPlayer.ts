import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class MusicPlayer {
    private context: vscode.ExtensionContext;
    private isPlaying: boolean = false;
    private currentTrack: string = '';
    private volume: number;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.volume = vscode.workspace.getConfiguration('musicQuranPlayer').get('musicVolume', 0.5);
    }

    getMusicList(): string[] {
        const musicPath = path.join(this.context.extensionPath, 'media', 'music');
        
        try {
            if (fs.existsSync(musicPath)) {
                return fs.readdirSync(musicPath)
                    .filter(file => file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg'))
                    .map(file => path.parse(file).name);
            }
        } catch (error) {
            console.error('Error reading music directory:', error);
        }

        // Return sample music list if directory doesn't exist
        return [
            'Relaxing Piano',
            'Nature Sounds',
            'Focus Music',
            'Ambient Meditation'
        ];
    }

    async play(trackName: string): Promise<void> {
        try {
            this.stop(); // Stop current track if playing

            const musicPath = path.join(this.context.extensionPath, 'media', 'music');
            const trackFiles = fs.readdirSync(musicPath)
                .filter(file => path.parse(file).name === trackName);

            if (trackFiles.length > 0) {
                const trackPath = path.join(musicPath, trackFiles[0]);
                
                // For VS Code extensions, we need to use webview to play audio
                // This is a simplified version - actual implementation would use webview
                this.currentTrack = trackName;
                this.isPlaying = true;
                
                vscode.window.showInformationMessage(`Playing: ${trackName}`);
            } else {
                vscode.window.showErrorMessage(`Music track "${trackName}" not found`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error playing music: ${error}`);
        }
    }

    pause(): void {
        this.isPlaying = false;
        // Implementation would pause the actual audio
    }

    stop(): void {
        this.isPlaying = false;
        this.currentTrack = '';
        // Implementation would stop the actual audio
    }

    resume(): void {
        if (this.currentTrack) {
            this.isPlaying = true;
            // Implementation would resume the actual audio
        }
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        // Update audio volume if playing
    }

    getVolume(): number {
        return this.volume;
    }

    getCurrentTrack(): string {
        return this.currentTrack;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    dispose(): void {
        this.stop();
    }
}
