import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

// DOM types for webview audio
declare const HTMLAudioElement: any;

interface Surah {
    number: number;
    name: string;
    transliteration: string;
    verses: number;
    type: 'meccan' | 'medinan';
}

interface QuranEdition {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
}

interface AyahInfo {
    number: number;
    text: string;
    numberInSurah: number;
    juz: number;
    manzil: number;
    page: number;
    ruku: number;
    hizbQuarter: number;
    sajda: boolean;
}

export class QuranPlayer {
    private context: vscode.ExtensionContext;
    private isPlaying: boolean = false;
    private currentSurah: string = '';
    private currentAyah: number = 1;
    private volume: number;
    private surahs!: Surah[];
    private editions: QuranEdition[] = [];
    private currentEdition: string = 'ar.alafasy';
    private audioElement: any = null;
    private currentSurahNumber: number = 1;
    private isStreaming: boolean = false;
    private playbackMode: 'surah' | 'ayah' = 'surah'; // 'surah' for full Surah, 'ayah' for individual verses
    private currentGlobalAyah: number = 1; // Global ayah number across entire Quran
    private bitrate: number = 128; // Audio quality (32, 48, 64, 128, 192)
    private availableBitrates: number[] = [32, 48, 64, 128, 192];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.volume = vscode.workspace.getConfiguration('codeTune').get('quranVolume', 0.7);
        this.initializeSurahs();
        this.initializeEditions();
        this.loadAvailableEditions();
    }

    // Load all available audio editions from the API
    private async loadAvailableEditions(): Promise<void> {
        try {
            const response = await axios.get('https://api.alquran.cloud/v1/edition/format/audio');
            if (response.data && response.data.data) {
                this.editions = response.data.data.map((edition: any) => ({
                    identifier: edition.identifier,
                    language: edition.language,
                    name: edition.name,
                    englishName: edition.englishName,
                    format: edition.format,
                    type: edition.type
                }));
            }
        } catch (error) {
            console.error('Error loading audio editions:', error);
            // Keep default editions if API fails
        }
    }

    private initializeSurahs(): void {
        // All 114 Surahs of the Quran
        this.surahs = [
            { number: 1, name: "الفاتحة", transliteration: "Al-Fatiha", verses: 7, type: "meccan" },
            { number: 2, name: "البقرة", transliteration: "Al-Baqara", verses: 286, type: "medinan" },
            { number: 3, name: "آل عمران", transliteration: "Aal-E-Imran", verses: 200, type: "medinan" },
            { number: 4, name: "النساء", transliteration: "An-Nisa", verses: 176, type: "medinan" },
            { number: 5, name: "المائدة", transliteration: "Al-Maida", verses: 120, type: "medinan" },
            { number: 6, name: "الأنعام", transliteration: "Al-Anaam", verses: 165, type: "meccan" },
            { number: 7, name: "الأعراف", transliteration: "Al-Araf", verses: 206, type: "meccan" },
            { number: 8, name: "الأنفال", transliteration: "Al-Anfal", verses: 75, type: "medinan" },
            { number: 9, name: "التوبة", transliteration: "At-Tawba", verses: 129, type: "medinan" },
            { number: 10, name: "يونس", transliteration: "Yunus", verses: 109, type: "meccan" },
            { number: 11, name: "هود", transliteration: "Hud", verses: 123, type: "meccan" },
            { number: 12, name: "يوسف", transliteration: "Yusuf", verses: 111, type: "meccan" },
            { number: 13, name: "الرعد", transliteration: "Ar-Rad", verses: 43, type: "medinan" },
            { number: 14, name: "إبراهيم", transliteration: "Ibrahim", verses: 52, type: "meccan" },
            { number: 15, name: "الحجر", transliteration: "Al-Hijr", verses: 99, type: "meccan" },
            { number: 16, name: "النحل", transliteration: "An-Nahl", verses: 128, type: "meccan" },
            { number: 17, name: "الإسراء", transliteration: "Al-Isra", verses: 111, type: "meccan" },
            { number: 18, name: "الكهف", transliteration: "Al-Kahf", verses: 110, type: "meccan" },
            { number: 19, name: "مريم", transliteration: "Maryam", verses: 98, type: "meccan" },
            { number: 20, name: "طه", transliteration: "Ta-Ha", verses: 135, type: "meccan" },
            { number: 21, name: "الأنبياء", transliteration: "Al-Anbiya", verses: 112, type: "meccan" },
            { number: 22, name: "الحج", transliteration: "Al-Hajj", verses: 78, type: "medinan" },
            { number: 23, name: "المؤمنون", transliteration: "Al-Muminun", verses: 118, type: "meccan" },
            { number: 24, name: "النور", transliteration: "An-Nur", verses: 64, type: "medinan" },
            { number: 25, name: "الفرقان", transliteration: "Al-Furqan", verses: 77, type: "meccan" },
            { number: 26, name: "الشعراء", transliteration: "Ash-Shuara", verses: 227, type: "meccan" },
            { number: 27, name: "النمل", transliteration: "An-Naml", verses: 93, type: "meccan" },
            { number: 28, name: "القصص", transliteration: "Al-Qasas", verses: 88, type: "meccan" },
            { number: 29, name: "العنكبوت", transliteration: "Al-Ankabut", verses: 69, type: "meccan" },
            { number: 30, name: "الروم", transliteration: "Ar-Rum", verses: 60, type: "meccan" },
            { number: 31, name: "لقمان", transliteration: "Luqman", verses: 34, type: "meccan" },
            { number: 32, name: "السجدة", transliteration: "As-Sajda", verses: 30, type: "meccan" },
            { number: 33, name: "الأحزاب", transliteration: "Al-Ahzab", verses: 73, type: "medinan" },
            { number: 34, name: "سبأ", transliteration: "Saba", verses: 54, type: "meccan" },
            { number: 35, name: "فاطر", transliteration: "Fatir", verses: 45, type: "meccan" },
            { number: 36, name: "يس", transliteration: "Ya-Sin", verses: 83, type: "meccan" },
            { number: 37, name: "الصافات", transliteration: "As-Saffat", verses: 182, type: "meccan" },
            { number: 38, name: "ص", transliteration: "Sad", verses: 88, type: "meccan" },
            { number: 39, name: "الزمر", transliteration: "Az-Zumar", verses: 75, type: "meccan" },
            { number: 40, name: "غافر", transliteration: "Ghafir", verses: 85, type: "meccan" },
            { number: 41, name: "فصلت", transliteration: "Fussilat", verses: 54, type: "meccan" },
            { number: 42, name: "الشورى", transliteration: "Ash-Shura", verses: 53, type: "meccan" },
            { number: 43, name: "الزخرف", transliteration: "Az-Zukhruf", verses: 89, type: "meccan" },
            { number: 44, name: "الدخان", transliteration: "Ad-Dukhan", verses: 59, type: "meccan" },
            { number: 45, name: "الجاثية", transliteration: "Al-Jathiya", verses: 37, type: "meccan" },
            { number: 46, name: "الأحقاف", transliteration: "Al-Ahqaf", verses: 35, type: "meccan" },
            { number: 47, name: "محمد", transliteration: "Muhammad", verses: 38, type: "medinan" },
            { number: 48, name: "الفتح", transliteration: "Al-Fath", verses: 29, type: "medinan" },
            { number: 49, name: "الحجرات", transliteration: "Al-Hujurat", verses: 18, type: "medinan" },
            { number: 50, name: "ق", transliteration: "Qaf", verses: 45, type: "meccan" },
            { number: 51, name: "الذاريات", transliteration: "Adh-Dhariyat", verses: 60, type: "meccan" },
            { number: 52, name: "الطور", transliteration: "At-Tur", verses: 49, type: "meccan" },
            { number: 53, name: "النجم", transliteration: "An-Najm", verses: 62, type: "meccan" },
            { number: 54, name: "القمر", transliteration: "Al-Qamar", verses: 55, type: "meccan" },
            { number: 55, name: "الرحمن", transliteration: "Ar-Rahman", verses: 78, type: "medinan" },
            { number: 56, name: "الواقعة", transliteration: "Al-Waqia", verses: 96, type: "meccan" },
            { number: 57, name: "الحديد", transliteration: "Al-Hadid", verses: 29, type: "medinan" },
            { number: 58, name: "المجادلة", transliteration: "Al-Mujadila", verses: 22, type: "medinan" },
            { number: 59, name: "الحشر", transliteration: "Al-Hashr", verses: 24, type: "medinan" },
            { number: 60, name: "الممتحنة", transliteration: "Al-Mumtahina", verses: 13, type: "medinan" },
            { number: 61, name: "الصف", transliteration: "As-Saff", verses: 14, type: "medinan" },
            { number: 62, name: "الجمعة", transliteration: "Al-Jumu'a", verses: 11, type: "medinan" },
            { number: 63, name: "المنافقون", transliteration: "Al-Munafiqun", verses: 11, type: "medinan" },
            { number: 64, name: "التغابن", transliteration: "At-Taghabun", verses: 18, type: "medinan" },
            { number: 65, name: "الطلاق", transliteration: "At-Talaq", verses: 12, type: "medinan" },
            { number: 66, name: "التحريم", transliteration: "At-Tahrim", verses: 12, type: "medinan" },
            { number: 67, name: "الملك", transliteration: "Al-Mulk", verses: 30, type: "meccan" },
            { number: 68, name: "القلم", transliteration: "Al-Qalam", verses: 52, type: "meccan" },
            { number: 69, name: "الحاقة", transliteration: "Al-Haaqqa", verses: 52, type: "meccan" },
            { number: 70, name: "المعارج", transliteration: "Al-Maarij", verses: 44, type: "meccan" },
            { number: 71, name: "نوح", transliteration: "Nuh", verses: 28, type: "meccan" },
            { number: 72, name: "الجن", transliteration: "Al-Jinn", verses: 28, type: "meccan" },
            { number: 73, name: "المزمل", transliteration: "Al-Muzzammil", verses: 20, type: "meccan" },
            { number: 74, name: "المدثر", transliteration: "Al-Muddathir", verses: 56, type: "meccan" },
            { number: 75, name: "القيامة", transliteration: "Al-Qiyama", verses: 40, type: "meccan" },
            { number: 76, name: "الإنسان", transliteration: "Al-Insan", verses: 31, type: "medinan" },
            { number: 77, name: "المرسلات", transliteration: "Al-Mursalat", verses: 50, type: "meccan" },
            { number: 78, name: "النبأ", transliteration: "An-Naba", verses: 40, type: "meccan" },
            { number: 79, name: "النازعات", transliteration: "An-Naziat", verses: 46, type: "meccan" },
            { number: 80, name: "عبس", transliteration: "Abasa", verses: 42, type: "meccan" },
            { number: 81, name: "التكوير", transliteration: "At-Takwir", verses: 29, type: "meccan" },
            { number: 82, name: "الإنفطار", transliteration: "Al-Infitar", verses: 19, type: "meccan" },
            { number: 83, name: "المطففين", transliteration: "Al-Mutaffifin", verses: 36, type: "meccan" },
            { number: 84, name: "الإنشقاق", transliteration: "Al-Inshiqaq", verses: 25, type: "meccan" },
            { number: 85, name: "البروج", transliteration: "Al-Buruj", verses: 22, type: "meccan" },
            { number: 86, name: "الطارق", transliteration: "At-Tariq", verses: 17, type: "meccan" },
            { number: 87, name: "الأعلى", transliteration: "Al-Ala", verses: 19, type: "meccan" },
            { number: 88, name: "الغاشية", transliteration: "Al-Ghashiya", verses: 26, type: "meccan" },
            { number: 89, name: "الفجر", transliteration: "Al-Fajr", verses: 30, type: "meccan" },
            { number: 90, name: "البلد", transliteration: "Al-Balad", verses: 20, type: "meccan" },
            { number: 91, name: "الشمس", transliteration: "Ash-Shams", verses: 15, type: "meccan" },
            { number: 92, name: "الليل", transliteration: "Al-Lail", verses: 21, type: "meccan" },
            { number: 93, name: "الضحى", transliteration: "Ad-Duha", verses: 11, type: "meccan" },
            { number: 94, name: "الشرح", transliteration: "Ash-Sharh", verses: 8, type: "meccan" },
            { number: 95, name: "التين", transliteration: "At-Tin", verses: 8, type: "meccan" },
            { number: 96, name: "العلق", transliteration: "Al-Alaq", verses: 19, type: "meccan" },
            { number: 97, name: "القدر", transliteration: "Al-Qadr", verses: 5, type: "meccan" },
            { number: 98, name: "البينة", transliteration: "Al-Bayyina", verses: 8, type: "medinan" },
            { number: 99, name: "الزلزلة", transliteration: "Az-Zalzala", verses: 8, type: "medinan" },
            { number: 100, name: "العاديات", transliteration: "Al-Adiyat", verses: 11, type: "meccan" },
            { number: 101, name: "القارعة", transliteration: "Al-Qaria", verses: 11, type: "meccan" },
            { number: 102, name: "التكاثر", transliteration: "At-Takathur", verses: 8, type: "meccan" },
            { number: 103, name: "العصر", transliteration: "Al-Asr", verses: 3, type: "meccan" },
            { number: 104, name: "الهمزة", transliteration: "Al-Humaza", verses: 9, type: "meccan" },
            { number: 105, name: "الفيل", transliteration: "Al-Fil", verses: 5, type: "meccan" },
            { number: 106, name: "قريش", transliteration: "Quraish", verses: 4, type: "meccan" },
            { number: 107, name: "الماعون", transliteration: "Al-Ma'un", verses: 7, type: "meccan" },
            { number: 108, name: "الكوثر", transliteration: "Al-Kawthar", verses: 3, type: "meccan" },
            { number: 109, name: "الكافرون", transliteration: "Al-Kafirun", verses: 6, type: "meccan" },
            { number: 110, name: "النصر", transliteration: "An-Nasr", verses: 3, type: "medinan" },
            { number: 111, name: "المسد", transliteration: "Al-Masad", verses: 5, type: "meccan" },
            { number: 112, name: "الإخلاص", transliteration: "Al-Ikhlas", verses: 4, type: "meccan" },
            { number: 113, name: "الفلق", transliteration: "Al-Falaq", verses: 5, type: "meccan" },
            { number: 114, name: "الناس", transliteration: "An-Nas", verses: 6, type: "meccan" }
        ];
    }

    private initializeEditions(): void {
        // Popular Quran reciters available on the CDN
        this.editions = [
            { identifier: 'ar.alafasy', language: 'ar', name: 'مشاري راشد العفاسي', englishName: 'Mishary Rashid Alafasy', format: 'audio', type: 'versebyverse' },
            { identifier: 'ar.alsudais', language: 'ar', name: 'عبد الرحمن السديس', englishName: 'Abdul Rahman Al-Sudais', format: 'audio', type: 'versebyverse' },
            { identifier: 'ar.alghamidi', language: 'ar', name: 'سعود الشريم', englishName: 'Saad Al-Ghamidi', format: 'audio', type: 'versebyverse' },
            { identifier: 'ar.almaeaqly', language: 'ar', name: 'ماهر المعيقلي', englishName: 'Maher Al-Mueaqly', format: 'audio', type: 'versebyverse' },
            { identifier: 'ar.alajamy', language: 'ar', name: 'أحمد علي العجمي', englishName: 'Ahmed Ali Al-Ajmy', format: 'audio', type: 'versebyverse' },
            { identifier: 'ar.bassit', language: 'ar', name: 'عبد الباسط عبد الصمد', englishName: 'Abdul Basit Abdul Samad', format: 'audio', type: 'versebyverse' }
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

            // Stream online by default (CDN streaming)
            await this.streamOnline(surah);

        } catch (error) {
            vscode.window.showErrorMessage(`Error playing Quran: ${error}`);
        }
    }

    private async streamOnline(surah: Surah): Promise<void> {
        try {
            this.currentSurah = surah.name;
            this.currentSurahNumber = surah.number;
            this.isStreaming = true;
            this.isPlaying = true;

            // Show streaming options
            const streamType = await vscode.window.showQuickPick([
                { label: 'Stream Full Surah', description: 'Play entire Surah at once' },
                { label: 'Stream Ayah by Ayah', description: 'Play each verse individually' }
            ], {
                placeHolder: 'Choose streaming method'
            });

            if (streamType?.label === 'Stream Full Surah') {
                await this.streamFullSurah(surah);
            } else if (streamType?.label === 'Stream Ayah by Ayah') {
                await this.streamAyahByAyah(surah);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error streaming Quran: ${error}`);
        }
    }

    private async streamFullSurah(surah: Surah): Promise<void> {
        try {
            // Use the Islamic Network CDN for full Surah streaming
            const bitrate = this.bitrate.toString();
            const edition = this.currentEdition;
            const surahUrl = `https://cdn.islamic.network/quran/audio-surah/${bitrate}/${edition}/${surah.number}.mp3`;

            vscode.window.showInformationMessage(
                `🎵 Streaming Surah: ${surah.name} (${surah.transliteration}) - ${surah.verses} verses`
            );

            // VSCode webviews cannot play audio directly, so we open in browser
            try {
                await vscode.env.openExternal(vscode.Uri.parse(surahUrl));
                vscode.window.showInformationMessage(
                    `🎵 Opened ${surah.name} in your browser for audio playback`
                );
            } catch (error) {
                // Fallback: try to use system audio player
                vscode.window.showInformationMessage(
                    `🎵 Please open this URL in your browser to listen: ${surahUrl}`,
                    'Copy URL'
                ).then(selection => {
                    if (selection === 'Copy URL') {
                        vscode.env.clipboard.writeText(surahUrl);
                        vscode.window.showInformationMessage('URL copied to clipboard!');
                    }
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error streaming full Surah: ${error}`);
        }
    }

    private async streamAyahByAyah(surah: Surah): Promise<void> {
        try {
            this.currentAyah = 1;

            vscode.window.showInformationMessage(
                `📖 Streaming Ayah by Ayah: ${surah.name} (${surah.verses} verses)`
            );

            // Start streaming first ayah
            await this.playNextAyah(surah);
        } catch (error) {
            vscode.window.showErrorMessage(`Error streaming Ayah by Ayah: ${error}`);
        }
    }

    private async playNextAyah(surah: Surah): Promise<void> {
        if (this.currentAyah > surah.verses) {
            vscode.window.showInformationMessage(
                `✅ Completed Surah: ${surah.name} (${surah.verses} verses)`
            );
            this.stop();
            return;
        }

        try {
            // Calculate global ayah number for CDN
            const globalAyahNumber = this.getGlobalAyahNumber(surah.number, this.currentAyah);
            const bitrate = this.bitrate.toString();
            const edition = this.currentEdition;
            const ayahUrl = `https://cdn.islamic.network/quran/audio/${bitrate}/${edition}/${globalAyahNumber}.mp3`;

            vscode.window.showInformationMessage(
                `🎵 Playing Ayah ${this.currentAyah}/${surah.verses} from ${surah.name}`
            );

            // VSCode webviews cannot play audio directly, so we open in browser
            try {
                await vscode.env.openExternal(vscode.Uri.parse(ayahUrl));
                vscode.window.showInformationMessage(
                    `🎵 Opened Ayah ${this.currentAyah} from ${surah.name} in your browser`
                );
            } catch (error) {
                // Fallback: copy URL to clipboard
                vscode.window.showInformationMessage(
                    `🎵 Please open this URL in your browser to listen: ${ayahUrl}`,
                    'Copy URL'
                ).then(selection => {
                    if (selection === 'Copy URL') {
                        vscode.env.clipboard.writeText(ayahUrl);
                        vscode.window.showInformationMessage('URL copied to clipboard!');
                    }
                });
            }

            this.currentAyah++;

            // Auto-advance to next ayah after a delay
            setTimeout(() => {
                if (this.isPlaying) {
                    this.playNextAyah(surah);
                }
            }, 6000); // 6 second delay between ayahs

        } catch (error) {
            vscode.window.showErrorMessage(`Error playing Ayah ${this.currentAyah}: ${error}`);
        }
    }

    private getGlobalAyahNumber(surahNumber: number, ayahInSurah: number): number {
        // Calculate the global ayah number across the entire Quran
        let globalAyah = 0;

        for (let i = 1; i < surahNumber; i++) {
            const surah = this.surahs.find(s => s.number === i);
            if (surah) {
                globalAyah += surah.verses;
            }
        }

        globalAyah += ayahInSurah;
        return globalAyah;
    }

    async selectReciter(): Promise<void> {
        const reciters = this.editions.map(edition => ({
            label: edition.englishName,
            description: edition.name,
            edition: edition.identifier
        }));

        const selected = await vscode.window.showQuickPick(reciters, {
            placeHolder: 'Select a Quran Reciter'
        });

        if (selected) {
            this.currentEdition = selected.edition;
            vscode.window.showInformationMessage(
                `📖 Selected Reciter: ${selected.label} (${selected.description})`
            );
        }
    }

    async getAyahText(surahNumber: number, ayahNumber: number): Promise<string> {
        try {
            // Get ayah text from Al Quran Cloud API
            const response = await axios.get(
                `https://api.alquran.cloud/v1/ayah/${this.getGlobalAyahNumber(surahNumber, ayahNumber)}/ar.alafasy`
            );

            if (response.data && response.data.data) {
                return response.data.data.text;
            }
        } catch (error) {
            console.error('Error fetching ayah text:', error);
        }

        return '';
    }

    getAvailableEditions(): QuranEdition[] {
        return this.editions;
    }

    getCurrentEdition(): string {
        return this.currentEdition;
    }

    setEdition(edition: string): void {
        this.currentEdition = edition;
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

    // ===== COMPREHENSIVE QURAN FUNCTIONALITY =====

    /**
     * Set the audio bitrate quality
     */
    setBitrate(bitrate: number): void {
        if (this.availableBitrates.includes(bitrate)) {
            this.bitrate = bitrate;
        } else {
            throw new Error(`Invalid bitrate. Available options: ${this.availableBitrates.join(', ')}`);
        }
    }

    /**
     * Get available bitrates
     */
    getAvailableBitrates(): number[] {
        return this.availableBitrates;
    }

    /**
     * Set playback mode (surah or ayah)
     */
    setPlaybackMode(mode: 'surah' | 'ayah'): void {
        this.playbackMode = mode;
    }

    /**
     * Get current playback mode
     */
    getPlaybackMode(): 'surah' | 'ayah' {
        return this.playbackMode;
    }

    /**
     * Get Ayah audio URL
     * @param globalAyahNumber - Global ayah number (1-6236)
     * @returns Audio URL for the specific ayah
     */
    getAyahAudioUrl(globalAyahNumber: number): string {
        if (globalAyahNumber < 1 || globalAyahNumber > 6236) {
            throw new Error('Invalid ayah number. Must be between 1 and 6236.');
        }
        return `https://cdn.islamic.network/quran/audio/${this.bitrate}/${this.currentEdition}/${globalAyahNumber}.mp3`;
    }

    /**
     * Get Surah audio URL
     * @param surahNumber - Surah number (1-114)
     * @returns Audio URL for the complete surah
     */
    getSurahAudioUrl(surahNumber: number): string {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new Error('Invalid surah number. Must be between 1 and 114.');
        }
        return `https://cdn.islamic.network/quran/audio-surah/${this.bitrate}/${this.currentEdition}/${surahNumber}.mp3`;
    }

    /**
     * Get Ayah image URL
     * @param surahNumber - Surah number (1-114)
     * @param ayahNumber - Ayah number within the surah
     * @param highResolution - Whether to use high resolution image
     * @returns Image URL for the specific ayah
     */
    getAyahImageUrl(surahNumber: number, ayahNumber: number, highResolution: boolean = false): string {
        if (surahNumber < 1 || surahNumber > 114) {
            throw new Error('Invalid surah number. Must be between 1 and 114.');
        }

        const surah = this.surahs.find(s => s.number === surahNumber);
        if (!surah) {
            throw new Error('Surah not found.');
        }

        if (ayahNumber < 1 || ayahNumber > surah.verses) {
            throw new Error(`Invalid ayah number for Surah ${surahNumber}. Must be between 1 and ${surah.verses}.`);
        }

        const resolution = highResolution ? 'high-resolution' : '';
        return `https://cdn.islamic.network/quran/images/${resolution}/${surahNumber}_${ayahNumber}.png`;
    }

    /**
     * Get all audio editions from the API
     */
    async refreshEditions(): Promise<QuranEdition[]> {
        await this.loadAvailableEditions();
        return this.editions;
    }

    /**
     * Stream a specific ayah
     * @param globalAyahNumber - Global ayah number (1-6236)
     */
    async streamAyah(globalAyahNumber: number): Promise<void> {
        try {
            if (globalAyahNumber < 1 || globalAyahNumber > 6236) {
                throw new Error('Invalid ayah number. Must be between 1 and 6236.');
            }

            const ayahUrl = this.getAyahAudioUrl(globalAyahNumber);
            const surahInfo = this.getSurahInfoFromGlobalAyah(globalAyahNumber);

            if (!surahInfo) {
                throw new Error('Could not determine Surah for ayah number.');
            }

            this.currentGlobalAyah = globalAyahNumber;
            this.currentSurahNumber = surahInfo.surahNumber;
            this.currentSurah = surahInfo.surahName;
            this.currentAyah = surahInfo.ayahInSurah;
            this.isPlaying = true;
            this.isStreaming = true;

            vscode.window.showInformationMessage(
                `🎵 Streaming Ayah ${this.currentAyah} from ${this.currentSurah} (${surahInfo.surahTransliteration})`
            );

            // Send to webview for streaming
            const webviewMessage = {
                type: 'streamQuran',
                url: ayahUrl,
                surah: {
                    number: this.currentSurahNumber,
                    name: this.currentSurah,
                    transliteration: surahInfo.surahTransliteration,
                    verses: surahInfo.surahVerses
                },
                ayah: this.currentAyah,
                globalAyah: globalAyahNumber,
                edition: this.currentEdition,
                mode: 'single-ayah'
            };

        } catch (error) {
            vscode.window.showErrorMessage(`Error streaming Ayah: ${error}`);
        }
    }

    /**
     * Stream a complete Surah
     * @param surahNumber - Surah number (1-114)
     */
    async streamSurah(surahNumber: number): Promise<void> {
        try {
            if (surahNumber < 1 || surahNumber > 114) {
                throw new Error('Invalid surah number. Must be between 1 and 114.');
            }

            const surahUrl = this.getSurahAudioUrl(surahNumber);
            const surah = this.surahs.find(s => s.number === surahNumber);

            if (!surah) {
                throw new Error('Surah not found.');
            }

            this.currentSurahNumber = surahNumber;
            this.currentSurah = surah.name;
            this.currentAyah = 1;
            this.isPlaying = true;
            this.isStreaming = true;

            vscode.window.showInformationMessage(
                `🎵 Streaming Surah: ${surah.name} (${surah.transliteration}) - ${surah.verses} verses`
            );

            // Send to webview for streaming
            const webviewMessage = {
                type: 'streamQuran',
                url: surahUrl,
                surah: surah,
                edition: this.currentEdition,
                mode: 'full-surah'
            };

        } catch (error) {
            vscode.window.showErrorMessage(`Error streaming Surah: ${error}`);
        }
    }

    /**
     * Stream multiple ayahs sequentially
     * @param startAyah - Starting global ayah number
     * @param endAyah - Ending global ayah number
     */
    async streamAyahRange(startAyah: number, endAyah: number): Promise<void> {
        try {
            if (startAyah < 1 || startAyah > 6236 || endAyah < 1 || endAyah > 6236) {
                throw new Error('Invalid ayah range. Must be between 1 and 6236.');
            }

            if (startAyah > endAyah) {
                throw new Error('Start ayah must be less than or equal to end ayah.');
            }

            this.currentGlobalAyah = startAyah;
            this.isPlaying = true;
            this.isStreaming = true;

            await this.playNextAyahInRange(startAyah, endAyah);

        } catch (error) {
            vscode.window.showErrorMessage(`Error streaming Ayah range: ${error}`);
        }
    }

    private async playNextAyahInRange(startAyah: number, endAyah: number): Promise<void> {
        if (this.currentGlobalAyah > endAyah) {
            vscode.window.showInformationMessage(
                `✅ Completed Ayah range: ${startAyah} - ${endAyah}`
            );
            this.stop();
            return;
        }

        try {
            const ayahUrl = this.getAyahAudioUrl(this.currentGlobalAyah);
            const surahInfo = this.getSurahInfoFromGlobalAyah(this.currentGlobalAyah);

            if (!surahInfo) {
                throw new Error('Could not determine Surah for ayah number.');
            }

            vscode.window.showInformationMessage(
                `🎵 Playing Ayah ${this.currentGlobalAyah}/${endAyah} from ${surahInfo.surahName}`
            );

            // Send to webview for streaming
            const webviewMessage = {
                type: 'streamQuran',
                url: ayahUrl,
                surah: {
                    number: surahInfo.surahNumber,
                    name: surahInfo.surahName,
                    transliteration: surahInfo.surahTransliteration,
                    verses: surahInfo.surahVerses
                },
                ayah: surahInfo.ayahInSurah,
                globalAyah: this.currentGlobalAyah,
                edition: this.currentEdition,
                mode: 'ayah-range'
            };

            this.currentGlobalAyah++;

            // Auto-advance to next ayah after a delay
            setTimeout(() => {
                if (this.isPlaying) {
                    this.playNextAyahInRange(startAyah, endAyah);
                }
            }, 4000); // 4 second delay between ayahs

        } catch (error) {
            vscode.window.showErrorMessage(`Error playing Ayah ${this.currentGlobalAyah}: ${error}`);
        }
    }

    /**
     * Get Surah information from global ayah number
     * @param globalAyahNumber - Global ayah number (1-6236)
     * @returns Surah info including surah number, name, and ayah within surah
     */
    private getSurahInfoFromGlobalAyah(globalAyahNumber: number): { surahNumber: number; surahName: string; surahTransliteration: string; surahVerses: number; ayahInSurah: number } | null {
        let currentAyahCount = 0;

        for (const surah of this.surahs) {
            const nextAyahCount = currentAyahCount + surah.verses;

            if (globalAyahNumber <= nextAyahCount) {
                const ayahInSurah = globalAyahNumber - currentAyahCount;
                return {
                    surahNumber: surah.number,
                    surahName: surah.name,
                    surahTransliteration: surah.transliteration,
                    surahVerses: surah.verses,
                    ayahInSurah: ayahInSurah
                };
            }

            currentAyahCount = nextAyahCount;
        }

        return null; // Ayah number out of range
    }

    /**
     * Get comprehensive information about a specific ayah
     * @param globalAyahNumber - Global ayah number (1-6236)
     */
    async getAyahInfo(globalAyahNumber: number): Promise<any> {
        try {
            const response = await axios.get(`https://api.alquran.cloud/v1/ayah/${globalAyahNumber}`);
            if (response.data && response.data.data) {
                return response.data.data;
            }
        } catch (error) {
            console.error('Error fetching ayah info:', error);
        }
        return null;
    }

    /**
     * Get all ayahs from a specific Surah
     * @param surahNumber - Surah number (1-114)
     */
    async getSurahAyahs(surahNumber: number): Promise<any[]> {
        try {
            const response = await axios.get(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
            if (response.data && response.data.data && response.data.data.ayahs) {
                return response.data.data.ayahs;
            }
        } catch (error) {
            console.error('Error fetching surah ayahs:', error);
        }
        return [];
    }

    /**
     * Search for ayahs by text content
     * @param searchText - Text to search for
     * @param limit - Maximum number of results
     */
    async searchAyahs(searchText: string, limit: number = 20): Promise<any[]> {
        const results: any[] = [];

        try {
            // This is a simplified search - in a real implementation,
            // you might want to search through all ayahs
            for (let i = 1; i <= Math.min(114, limit); i++) {
                const ayahs = await this.getSurahAyahs(i);
                for (const ayah of ayahs) {
                    if (ayah.text && ayah.text.includes(searchText)) {
                        results.push(ayah);
                        if (results.length >= limit) {
                            break;
                        }
                    }
                }
                if (results.length >= limit) {
                    break;
                }
            }
        } catch (error) {
            console.error('Error searching ayahs:', error);
        }

        return results;
    }

    /**
     * Get random ayah
     */
    async getRandomAyah(): Promise<number> {
        return Math.floor(Math.random() * 6236) + 1;
    }

    /**
     * Get ayahs by Juz (para)
     * @param juzNumber - Juz number (1-30)
     */
    async getAyahsByJuz(juzNumber: number): Promise<any[]> {
        try {
            const response = await axios.get(`https://api.alquran.cloud/v1/juz/${juzNumber}`);
            if (response.data && response.data.data && response.data.data.ayahs) {
                return response.data.data.ayahs;
            }
        } catch (error) {
            console.error('Error fetching juz ayahs:', error);
        }
        return [];
    }

    /**
     * Get ayahs by page
     * @param pageNumber - Page number (1-604)
     */
    async getAyahsByPage(pageNumber: number): Promise<any[]> {
        try {
            const response = await axios.get(`https://api.alquran.cloud/v1/page/${pageNumber}`);
            if (response.data && response.data.data && response.data.data.ayahs) {
                return response.data.data.ayahs;
            }
        } catch (error) {
            console.error('Error fetching page ayahs:', error);
        }
        return [];
    }

    /**
     * Get current playing ayah information
     */
    getCurrentAyahInfo(): { globalAyah: number; surahNumber: number; ayahInSurah: number; surahName: string } | null {
        if (!this.isPlaying || !this.currentSurah) {
            return null;
        }

        const surahInfo = this.getSurahInfoFromGlobalAyah(this.currentGlobalAyah);
        if (!surahInfo) {
            return null;
        }

        return {
            globalAyah: this.currentGlobalAyah,
            surahNumber: surahInfo.surahNumber,
            ayahInSurah: surahInfo.ayahInSurah,
            surahName: surahInfo.surahName
        };
    }
}
