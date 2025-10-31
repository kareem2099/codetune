import * as vscode from 'vscode';
import { IslamicCalendar } from './islamicCalendar';

export interface IslamicContent {
    type: 'adia' | 'hadis' | 'wisdom' | 'morningAzkar' | 'eveningAzkar';
    arabic: string;
    english: string;
    source?: string;
}

export interface ReminderSettings {
    enableReminders: boolean;
    reminderInterval: number;
    showAhadis: boolean;
    workingHoursOnly: boolean;
}

export class FridayReminders {
    private fridaySurahShown: Date | null = null;
    private fridayHadithCount: number = 0;
    private settings: ReminderSettings;
    private fridaySurahCompleted: boolean = false;
    private fridaySurahReadingStarted: boolean = false;

    // Salawat Counter State
    private salawatCounter = {
        currentCount: 0,
        dailyTarget: 11,
        lastResetDate: null as string | null,
        weekCompleted: 0,
        monthlyCompleted: 0,
        userSetTarget: false,
        customTargets: {
            regular: 11,
            friday: 24,
            ramadan: 100
        }
    };

    // Friday prayer time content
    private fridayPrayers: IslamicContent[] = [
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ',
            english: 'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim.',
            source: 'Friday Prayer Opening Takbir'
        },
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ وَرَحْمَتِكَ الْعَظِيمَةِ',
            english: 'O Allah, I ask You from Your great bounty and mercy.',
            source: 'Friday Dua After Prayer'
        },
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ اجْعَلْنِي فِي هَذِهِ السَّاعَةِ مِمَّنْ تُحِبُّ وَتَعْفُو عَنْهُ',
            english: 'O Allah, make me in this hour among those whom You love and forgive.',
            source: 'Friday Dua After Jumu\'ah'
        }
    ];

    // Friday afternoon duas
    private fridayAfternoonDuas: IslamicContent[] = [
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبَخِيلِ وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَأَعُوذُ بِكَ مِنَ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الدُّنْيَا وَعَذَابِ الْقَبْرِ',
            english: 'O Allah, I seek refuge in You from miserliness, cowardice, incapacity, and from being brought back to senility, and I seek refuge in You from the trials of this world and the punishment of the grave.',
            source: 'Recommended Friday Dua'
        },
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
            english: 'O Allah, I ask You for well-being in this world and in the Hereafter.',
            source: 'Friday Afternoon Dua'
        }
    ];

    // Friday evening salawat
    private fridayEveningSalawat: IslamicContent[] = [
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
            english: 'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. Indeed, You are the Praiseworthy, the Glorious.',
            source: 'Friday Evening Salawat'
        },
        {
            type: 'adia',
            arabic: 'صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ تَسْلِيمًا كَثِيرًا حَتَّى رِضْوَانَ الرَّحْمَنِ',
            english: 'May Allah send prayers and peace upon him abundantly until the pleasure of the Most Merciful.',
            source: 'Friday Evening Blessing'
        }
    ];

    // Quran verses for Friday
    private fridayQuranicVerses: IslamicContent[] = [
        {
            type: 'wisdom',
            arabic: 'يَوْمَ تُبَدَّلُ الْأَرْضُ غَيْرَ الْأَرْضِ وَالسَّمَوَاتُ وَبَرَزُوا لِلَّهِ الْوَاحِدِ الْقَهَّارِ',
            english: 'On the Day the earth will be changed into another earth and so will be the heavens, and they will come forth before Allah, the One, the Prevailing.',
            source: 'Surah Ibrahim 14:48'
        },
        {
            type: 'wisdom',
            arabic: 'إِنَّ يَوْمَ الْجُمُعَةِ رَأْسُ الْأَيَّامِ وَأَعْظَمُهَا عِنْدَ اللَّهِ',
            english: 'Indeed, Friday is the leader of days and the greatest of them in the sight of Allah.',
            source: 'Sahih Muslim (Friday Special Day)'
        },
        {
            type: 'wisdom',
            arabic: 'وَاذْكُرْ رَبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً وَدُونَ الْجَهْرِ مِنَ الْقَوْلِ بِالْغُدُوِّ وَالْآصَالِ وَلَا تَكُنْ مِنَ الْغَافِلِينَ',
            english: 'And remember your Lord within yourself with humility and in fear without being apparent in speech - in the mornings and the evenings. And do not be among the heedless.',
            source: 'Surah Al-A\'raf 7:205'
        }
    ];

    // Islamic wisdom about Friday
    private fridayWisdom: IslamicContent[] = [
        {
            type: 'wisdom',
            arabic: 'الْجُمُعَةُ رَأْسُ كُلِّ شَيْءٍ وَخَيْرُهَا فِي الدُّنْيَا وَالْآخِرَةِ',
            english: 'Friday is the head of everything, and it is good in this world and the Hereafter.',
            source: 'The Prophet\'s ﷺ Wisdom'
        },
        {
            type: 'wisdom',
            arabic: 'إِنَّ يَوْمَ الْجُمُعَةِ يُغْفَرُ فِيهِ لِلْعَبْدِ مَا كَانَ بَيْنَهُ وَبَيْنَ آخِرِهِ إِلَّا الْكبَائِرَ',
            english: 'Indeed, on the day of Friday, sins are forgiven for the servant except the major sins.',
            source: 'Islamic Tradition'
        },
        {
            type: 'wisdom',
            arabic: 'أُمَّتِي خُطَّتْ لَهَا الْجُمُعَةُ وَالْأَحَادُ',
            english: 'My Ummah was decreed Friday and Monday.',
            source: 'Hadith - Special Days for Muslims'
        }
    ];

    constructor(settings: ReminderSettings) {
        this.settings = settings;
        this.loadSalawatCounter();
        this.checkDailyReset();
    }

    private isNewDay(someDate: Date | null): boolean {
        if (!someDate) {return true;}
        const today = new Date();
        return today.getDate() !== someDate.getDate() ||
               today.getMonth() !== someDate.getMonth() ||
               today.getFullYear() !== someDate.getFullYear();
    }

    private isWorkingHours(): boolean {
        if (!this.settings.workingHoursOnly) {return true;}
        const now = new Date();
        const hour = now.getHours();
        return hour >= 9 && hour < 18; // 9 AM to 6 PM
    }

    public isFriday(): boolean {
        const today = new Date();
        return today.getDay() === 5; // 5 = Friday
    }

    public getFridayHadith(): IslamicContent {
        return {
            type: 'hadis',
            arabic: 'عَلَيْكُمْ بِالْجُمُعَةِ فَإِنَّهَا جُمْعُكُمْ مِنَ الْأَبْوَابِ الْمَكْسُورَةِ',
            english: 'You must attend the Friday prayer, for it is the door of the broken paths of guidance.',
            source: 'Sunan Ibn Majah (Friday Special)'
        };
    }

    public getSurahKahfReminder(): IslamicContent {
        return {
            type: 'wisdom',
            arabic: 'قُلِ الْحَقُّ مِنْ رَبِّكُمْ فَمَنْ شَاءَ فَلْيُؤْمِنْ وَمَنْ شَاءَ فَلْيَكْفُرْ﴾\n\n🕌 Ya Mubarak! It\'s time to read Surah Al-Kahf\n📖 Read Surah Al-Kahf today for protection from trials and Dajjal',
            english: 'Say, "The truth is from your Lord, so whoever wills - let him believe; and whoever wills - let him disbelieve."',
            source: 'Surah Al-Kahf 18:29 (Friday Quranic Reading Ritual)'
        };
    }

    public getFridayContent(): IslamicContent | null {
        const now = new Date();
        const hour = now.getHours();

        // Reset surah reminder if new day
        if (this.isNewDay(this.fridaySurahShown)) {
            this.fridaySurahShown = new Date();
            this.fridayHadithCount = 0;
        }

        // Time-based Friday content
        // 1. Friday Prayer Time (around Jumu'ah prayer time) - typically 12-3 PM depending on location
        if (hour >= 12 && hour < 16) { // 12 PM - 4 PM (flexible window for different prayer times)
            return this.getRandomFromArray(this.fridayPrayers, 'Friday Prayer Dua');
        }

        // 2. Friday Afternoon (after prayer) - 2 PM - 6 PM
        else if (hour >= 14 && hour < 18) { // 2 PM - 6 PM
            // Reset for the day if it's a new day
            if (this.isNewDay(this.fridaySurahShown)) {
                return this.getSurahKahfReminder();
            }
            return this.getRandomFromArray(this.fridayAfternoonDuas, 'Friday Afternoon Dua');
        }

        // 3. Friday Evening (after sunset) - 6 PM - 10 PM
        else if (hour >= 18 && hour < 22) { // 6 PM - 10 PM
            return this.getRandomFromArray(this.fridayEveningSalawat, 'Friday Evening Salawat');
        }

        // 4. Morning and other times - cycle through Quranic wisdom and Friday wisdom
        else {
            // Alternate between Quran verses and Islamic wisdom + fallbacks
            const contentTypeArrays = [this.fridayQuranicVerses, this.fridayWisdom];
            const selectedArray = contentTypeArrays[Math.floor(Math.random() * contentTypeArrays.length)];
            const content = this.getRandomFromArray(selectedArray, 'Friday Wisdom');

            // Fallback to Friday hadith if no content available
            return content || (this.settings.showAhadis ? this.getFridayHadith() : null);
        }

        return null;
    }

    private getRandomFromArray(array: IslamicContent[], fallbackType?: string): IslamicContent | null {
        if (!array || array.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * array.length);
        return array[randomIndex];
    }

    public shouldShowFridayContent(): boolean {
        if (!this.settings.enableReminders || !this.isWorkingHours()) {return false;}
        return this.isFriday();
    }

    public updateSettings(newSettings: Partial<ReminderSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    // Salawat Counter Methods
    private loadSalawatCounter(): void {
        try {
            const saved = vscode.workspace.getConfiguration('codeTune').get('salawatCounter');
            if (saved) {
                this.salawatCounter = { ...this.salawatCounter, ...saved };
            }
        } catch (error) {
            console.warn('Failed to load salawat counter:', error);
        }
    }

    private saveSalawatCounter(): void {
        try {
            vscode.workspace.getConfiguration('codeTune').update('salawatCounter', this.salawatCounter, true);
        } catch (error) {
            console.warn('Failed to save salawat counter:', error);
        }
    }

    private checkDailyReset(): void {
        const today = new Date().toDateString();
        if (this.salawatCounter.lastResetDate !== today) {
            // Reset daily counter but keep history
            if (this.salawatCounter.currentCount >= this.salawatCounter.dailyTarget) {
                this.salawatCounter.weekCompleted++;
                this.salawatCounter.monthlyCompleted++;
            }

            this.salawatCounter.currentCount = 0;
            this.salawatCounter.lastResetDate = today;
            this.updateDailyTarget();
            this.saveSalawatCounter();
        }
    }

    private updateDailyTarget(): void {
        // Update target based on day type (unless user set custom)
        if (this.salawatCounter.userSetTarget) {return;}

        const isRamadan = IslamicCalendar.isRamadan();
        const isFriday = this.isFriday();

        if (isRamadan) {
            this.salawatCounter.dailyTarget = this.salawatCounter.customTargets.ramadan;
        } else if (isFriday) {
            this.salawatCounter.dailyTarget = this.salawatCounter.customTargets.friday;
        } else {
            this.salawatCounter.dailyTarget = this.salawatCounter.customTargets.regular;
        }
    }

    public incrementSalawatCounter(): void {
        this.checkDailyReset(); // Ensure we're working with current day
        this.salawatCounter.currentCount++;
        this.saveSalawatCounter();
        console.log(`Salawat counter incremented to: ${this.salawatCounter.currentCount}/${this.salawatCounter.dailyTarget}`);
    }

    public setCustomTarget(target: number, type?: 'regular' | 'friday' | 'ramadan'): void {
        if (type) {
            this.salawatCounter.customTargets[type] = target;
        } else {
            this.salawatCounter.dailyTarget = target;
            this.salawatCounter.userSetTarget = true;
        }
        this.saveSalawatCounter();
    }

    public getSalawatCounterData(): typeof this.salawatCounter {
        this.checkDailyReset(); // Ensure fresh data
        return { ...this.salawatCounter };
    }

    public resetCounter(): void {
        this.salawatCounter.currentCount = 0;
        this.salawatCounter.weekCompleted = 0;
        this.salawatCounter.monthlyCompleted = 0;
        this.salawatCounter.lastResetDate = new Date().toDateString();
        this.saveSalawatCounter();
    }

    // ===== FRIDAY SURAH AL-KAHF ENFORCEMENT METHODS =====

    /**
     * Check if Friday Surah Al-Kahf reading has been completed today
     */
    public isFridaySurahCompleted(): boolean {
        this.checkFridaySurahReset(); // Ensure we reset if it's a new day
        return this.fridaySurahCompleted;
    }

    /**
     * Check if Friday Surah Al-Kahf reading has been started today
     */
    public isFridaySurahStarted(): boolean {
        this.checkFridaySurahReset(); // Ensure we reset if it's a new day
        return this.fridaySurahReadingStarted;
    }

    /**
     * Mark Friday Surah Al-Kahf reading as started
     */
    public markFridaySurahStarted(): void {
        this.fridaySurahReadingStarted = true;
        this.saveFridaySurahState();
    }

    /**
     * Mark Friday Surah Al-Kahf reading as completed
     */
    public markFridaySurahCompleted(): void {
        this.fridaySurahCompleted = true;
        this.fridaySurahReadingStarted = true;
        this.saveFridaySurahState();

        // Show completion notification
        vscode.window.showInformationMessage(
            '🎉 Friday Surah Al-Kahf Reading Completed! May Allah protect you from trials and Dajjal. آمين',
            'Alhamdulillah'
        );
    }

    /**
     * Force reading and listening to Surah Al-Kahf for Friday
     * This method will be called to enforce the Friday ritual
     */
    public async enforceFridaySurahReading(): Promise<void> {
        if (!this.isFriday()) {
            console.log('Not Friday - skipping Surah Al-Kahf enforcement');
            return;
        }

        if (this.isFridaySurahCompleted()) {
            console.log('Friday Surah Al-Kahf already completed today');
            return;
        }

        try {
            // Mark as started
            this.markFridaySurahStarted();

            // Send message to UI to open Quran reader and start Surah Al-Kahf
            const activityBarProvider = (global as any).activityBarProvider;
            if (activityBarProvider && activityBarProvider.sendMessageToWebview) {
                activityBarProvider.sendMessageToWebview({
                    type: 'enforceFridaySurahKahf',
                    surahNumber: 18, // Surah Al-Kahf
                    message: '🕌 Friday Surah Al-Kahf Reading Time!\n\nIt is Sunnah to read Surah Al-Kahf every Friday for protection from trials and Dajjal.'
                });

                console.log('Enforced Friday Surah Al-Kahf reading session');
            } else {
                console.warn('Activity bar provider not available for Friday Surah enforcement');
                // Fallback to showing notification
                vscode.window.showInformationMessage(
                    '🕌 Friday Reminder: Please read Surah Al-Kahf today for protection from trials and Dajjal',
                    'Open Quran Reader'
                ).then(selection => {
                    if (selection === 'Open Quran Reader') {
                        // Try to trigger Quran reader opening through commands
                        vscode.commands.executeCommand('codeTune.playQuran');
                    }
                });
            }

        } catch (error) {
            console.error('Error enforcing Friday Surah Al-Kahf reading:', error);
            vscode.window.showErrorMessage('Failed to start Friday Surah Al-Kahf reading session');
        }
    }

    /**
     * Check and reset Friday Surah state if it's a new day
     */
    private checkFridaySurahReset(): void {
        const today = new Date().toDateString();
        const lastResetKey = 'fridaySurahLastReset';

        try {
            const stored = vscode.workspace.getConfiguration('codeTune').get(lastResetKey);
            if (stored !== today) {
                // New day - reset Friday Surah state
                this.fridaySurahCompleted = false;
                this.fridaySurahReadingStarted = false;
                this.fridaySurahShown = null;
                this.fridayHadithCount = 0;

                // Save the reset
                vscode.workspace.getConfiguration('codeTune').update(lastResetKey, today, true);
                console.log('Reset Friday Surah Al-Kahf state for new day');
            }
        } catch (error) {
            console.warn('Error checking Friday Surah reset:', error);
        }
    }

    /**
     * Save Friday Surah state to VS Code configuration
     */
    private saveFridaySurahState(): void {
        try {
            const state = {
                completed: this.fridaySurahCompleted,
                started: this.fridaySurahReadingStarted,
                lastUpdated: new Date().toISOString()
            };
            vscode.workspace.getConfiguration('codeTune').update('fridaySurahState', state, true);
        } catch (error) {
            console.warn('Error saving Friday Surah state:', error);
        }
    }

    /**
     * Load Friday Surah state from VS Code configuration
     */
    private loadFridaySurahState(): void {
        try {
            const saved = vscode.workspace.getConfiguration('codeTune').get('fridaySurahState') as any;
            if (saved && typeof saved === 'object') {
                this.fridaySurahCompleted = saved.completed || false;
                this.fridaySurahReadingStarted = saved.started || false;
            }
        } catch (error) {
            console.warn('Error loading Friday Surah state:', error);
        }
    }

    /**
     * Get Friday Surah reading progress info
     */
    public getFridaySurahProgress(): { completed: boolean; started: boolean; isFriday: boolean } {
        this.checkFridaySurahReset(); // Ensure fresh state
        return {
            completed: this.fridaySurahCompleted,
            started: this.fridaySurahReadingStarted,
            isFriday: this.isFriday()
        };
    }

    /**
     * Get Friday Surah status for UI display
     */
    public getFridaySurahStatus(): { status: string; message: string } {
        this.checkFridaySurahReset(); // Ensure fresh state

        if (!this.isFriday()) {
            return {
                status: 'not-friday',
                message: 'Not Friday - Surah Al-Kahf reading is recommended every Friday'
            };
        }

        if (this.fridaySurahCompleted) {
            return {
                status: 'completed',
                message: 'Completed today! Alhamdulillah'
            };
        }

        if (this.fridaySurahReadingStarted) {
            return {
                status: 'started',
                message: 'Reading in progress...'
            };
        }

        return {
            status: 'not-started',
            message: 'Not started today'
        };
    }
}
