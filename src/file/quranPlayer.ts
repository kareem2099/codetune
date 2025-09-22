import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Surah {
    number: number;
    name: string;
    transliteration: string;
    verses: number;
}

export class QuranPlayer {
    private context: vscode.ExtensionContext;
    private isPlaying: boolean = false;
    private currentSurah: string = '';
    private volume: number;
    private surahs!: Surah[];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.volume = vscode.workspace.getConfiguration('musicQuranPlayer').get('quranVolume', 0.7);
        this.initializeSurahs();
    }

    private initializeSurahs(): void {
        // First 10 Surahs for example - you can extend this
        this.surahs = [
            { number: 1, name: "الفاتحة", transliteration: "Al-Fatiha", verses: 7 },
            { number: 2, name: "البقرة", transliteration: "Al-Baqara", verses: 286 },
            { number: 3, name: "آل عمران", transliteration: "Aal-E-Imran", verses: 200 },
            { number: 4, name: "النساء", transliteration: "An-Nisa", verses: 176 },
            { number: 5, name: "المائدة", transliteration: "Al-Maida", verses: 120 },
            { number: 6, name: "الأنعام", transliteration: "Al-Anaam", verses: 165 },
            { number: 7, name: "الأعراف", transliteration: "Al-Araf", verses: 206 },
            { number: 8, name: "الأنفال", transliteration: "Al-Anfal", verses: 75 },
            { number: 9, name: "التوبة", transliteration: "At-Tawba", verses: 129 },
            { number: 10, name: "يونس", transliteration: "Yunus", verses: 109 }
        ];
    }

    getSurahList(): string[] {
        return this.surahs.map(surah =>
            `${surah.number.toString().padStart(3, '0')} - ${surah.name} (${surah.transliteration})`
        );
    }

    getAvailableReciters(): string[] {
        return [
            'Abdul Basit Abdul Samad',
            'Mishary Rashid Alafasy',
            'Saad Al Ghamidi',
            'Maher Al Mueaqly',
            'Ahmed Ali Al Ajmy'
        ];
    }

    async play(surahSelection: string): Promise<void> {
        try {
            this.stop(); // Stop current recitation if playing

            // Parse surah number from selection
            const surahNumber = parseInt(surahSelection.split(' - ')[0]);
            const surah = this.surahs.find(s => s.number === surahNumber);

            if (!surah) {
                vscode.window.showErrorMessage('Invalid Surah selection');
                return;
            }

            // Check for local audio files
            const quranPath = path.join(this.context.extensionPath, 'media', 'quran');
            const audioFile = path.join(quranPath, `${surah.number.toString().padStart(3, '0')}.mp3`);

            if (fs.existsSync(audioFile)) {
                this.currentSurah = surah.name;
                this.isPlaying = true;
                vscode.window.showInformationMessage(
                    `Playing Surah: ${surah.name} (${surah.transliteration})`
                );
            } else {
                // Offer to download or provide online streaming option
                const choice = await vscode.window.showInformationMessage(
                    `Audio file for ${surah.name} not found locally. Would you like to stream online?`,
                    'Stream Online',
                    'Cancel'
                );

                if (choice === 'Stream Online') {
                    await this.streamOnline(surah);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error playing Quran: ${error}`);
        }
    }

    private async streamOnline(surah: Surah): Promise<void> {
        // This would implement online streaming from sites like everyayah.com
        // For now, we'll show a placeholder
        this.currentSurah = surah.name;
        this.isPlaying = true;

        vscode.window.showInformationMessage(
            `Streaming Surah: ${surah.name} online (${surah.verses} verses)`
        );

        // In real implementation, you would:
        // 1. Construct URL to online Quran audio API
        // 2. Stream the audio through webview
        // 3. Handle playback controls
    }

    async selectReciter(): Promise<void> {
        const reciter = await vscode.window.showQuickPick(
            this.getAvailableReciters(),
            { placeHolder: 'Select a Quran Reciter' }
        );

        if (reciter) {
            vscode.window.showInformationMessage(`Selected Reciter: ${reciter}`);
            // Store selected reciter for future playback
        }
    }

    pause(): void {
        this.isPlaying = false;
        // Implementation would pause the actual audio
    }

    stop(): void {
        this.isPlaying = false;
        this.currentSurah = '';
        // Implementation would stop the actual audio
    }

    resume(): void {
        if (this.currentSurah) {
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

    getCurrentSurah(): string {
        return this.currentSurah;
    }

    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    // Method to get Surah info for display
    getSurahInfo(surahNumber: number): Surah | undefined {
        return this.surahs.find(s => s.number === surahNumber);
    }

    dispose(): void {
        this.stop();
    }
}
