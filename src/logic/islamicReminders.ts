import * as vscode from 'vscode';

interface ReminderSettings {
    enableReminders: boolean;
    reminderInterval: number; // minutes
    showAdia: boolean;
    showAhadis: boolean;
    showWisdom: boolean;
    workingHoursOnly: boolean;
}

interface IslamicContent {
    type: 'adia' | 'hadis' | 'wisdom';
    arabic: string;
    english: string;
    source?: string;
}

export class IslamicRemindersManager {
    private intervalId: NodeJS.Timeout | null = null;
    private lastReminderTime: number = 0;
    private settings: ReminderSettings;

    // Islamic content database
    private adia: IslamicContent[] = [
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
            english: 'O Allah, I ask You for pardon and well-being in this world and in the Hereafter.',
            source: 'Sunan Ibn Majah'
        },
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
            english: 'O Allah, I seek refuge in You from worry and grief.',
            source: 'Sahih al-Bukhari'
        },
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
            english: 'O Allah, help me remember You, thank You, and worship You in the best manner.',
            source: 'Sunan an-Nasa\'i'
        },
        {
            type: 'adia',
            arabic: 'رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فُهْمًا',
            english: 'My Lord, increase me in knowledge and grant me understanding.',
            source: 'Surah Ta-Ha 20:114'
        },
        {
            type: 'adia',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ',
            english: 'O Allah, I ask You for Paradise and seek refuge in You from the Fire.',
            source: 'Sahih Muslim'
        }
    ];

    private ahadis: IslamicContent[] = [
        {
            type: 'hadis',
            arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ',
            english: 'Whoever follows a path seeking knowledge, Allah will make easy for him a path to Paradise.',
            source: 'Sahih Muslim'
        },
        {
            type: 'hadis',
            arabic: 'الْعِلْمُ نُورٌ يَجْعَلُهُ اللَّهُ فِي الْقَلْبِ مَنْ يَشَاءُ',
            english: 'Knowledge is light that Allah places in the heart of whom He wills.',
            source: 'Sunan at-Tirmidhi'
        },
        {
            type: 'hadis',
            arabic: 'مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ',
            english: 'Whoever Allah wants good for, He gives him understanding of the religion.',
            source: 'Sahih al-Bukhari'
        },
        {
            type: 'hadis',
            arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
            english: 'Seeking knowledge is obligatory upon every Muslim.',
            source: 'Sunan Ibn Majah'
        },
        {
            type: 'hadis',
            arabic: 'الصَّبْرُ مِفْتَاحُ الْفَرَجِ',
            english: 'Patience is the key to relief.',
            source: 'Sunan Ibn Majah'
        }
    ];

    private wisdom: IslamicContent[] = [
        {
            type: 'wisdom',
            arabic: 'وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا',
            english: 'And whoever fears Allah, He will make for him a way out.',
            source: 'Surah At-Talaq 65:2'
        },
        {
            type: 'wisdom',
            arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
            english: 'Indeed, with hardship comes ease.',
            source: 'Surah Ash-Sharh 94:5'
        },
        {
            type: 'wisdom',
            arabic: 'وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ',
            english: 'And be patient, for indeed Allah does not allow the reward of those who do good to be lost.',
            source: 'Surah Hud 11:115'
        },
        {
            type: 'wisdom',
            arabic: 'كُلُّ أَمْرٍ ذِي بَالٍ لَا يَبْدَأُ إِلَّا بِالْحَمْدِ لِلَّهِ',
            english: 'Every matter of importance that does not begin with praise of Allah will be cut off.',
            source: 'Hadith'
        },
        {
            type: 'wisdom',
            arabic: 'الْيَقِينُ إِيمَانٌ كُلُّهُ',
            english: 'Certainty is all faith.',
            source: 'Hadith'
        }
    ];

    constructor() {
        this.settings = {
            enableReminders: true,
            reminderInterval: 60,
            showAdia: true,
            showAhadis: true,
            showWisdom: true,
            workingHoursOnly: false
        };
        this.loadSettings();
        this.startReminders();
    }

    private loadSettings() {
        try {
            // Use VS Code's workspace configuration instead of localStorage
            const config = vscode.workspace.getConfiguration('codeTune');
            this.settings = {
                enableReminders: config.get('enableReminders', true),
                reminderInterval: config.get('reminderInterval', 60),
                showAdia: config.get('showAdia', true),
                showAhadis: config.get('showAhadis', true),
                showWisdom: config.get('showWisdom', true),
                workingHoursOnly: config.get('workingHoursOnly', false)
            };
        } catch (error) {
            console.warn('Failed to load Islamic reminder settings:', error);
        }
    }

    private isWorkingHours(): boolean {
        if (!this.settings.workingHoursOnly) {return true;}

        const now = new Date();
        const hour = now.getHours();
        // Working hours: 9 AM to 6 PM
        return hour >= 9 && hour < 18;
    }

    private getRandomContent(): IslamicContent | null {
        const availableTypes: IslamicContent[] = [];

        if (this.settings.showAdia) {availableTypes.push(...this.adia);}
        if (this.settings.showAhadis) {availableTypes.push(...this.ahadis);}
        if (this.settings.showWisdom) {availableTypes.push(...this.wisdom);}

        if (availableTypes.length === 0) {return null;}

        const randomIndex = Math.floor(Math.random() * availableTypes.length);
        return availableTypes[randomIndex];
    }

    private showReminder() {
        if (!this.settings.enableReminders) {return;}
        if (!this.isWorkingHours()) {return;}

        const content = this.getRandomContent();
        if (!content) {return;}

        const typeLabel = content.type === 'adia' ? 'Adia (Prayer)' :
                         content.type === 'hadis' ? 'Hadis (Prophet\'s Saying)' :
                         'Islamic Wisdom';

        // Show notification with Islamic content
        vscode.window.showInformationMessage(
            `🕌 ${typeLabel}\n\n${content.arabic}\n\n${content.english}${content.source ? `\n\nSource: ${content.source}` : ''}`,
            'Got it'
        ).then(() => {
            // User clicked "Got it" - could add positive reinforcement here
        });
    }

    public startReminders() {
        this.stopReminders(); // Clear any existing interval

        if (!this.settings.enableReminders) {return;}

        // Convert minutes to milliseconds
        const intervalMs = this.settings.reminderInterval * 60 * 1000;

        // Show first reminder after a short delay
        setTimeout(() => {
            this.showReminder();
            this.lastReminderTime = Date.now();
        }, 5000); // 5 seconds after start

        // Set up recurring reminders
        this.intervalId = setInterval(() => {
            this.showReminder();
            this.lastReminderTime = Date.now();
        }, intervalMs);
    }

    public stopReminders() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public updateSettings(newSettings: Partial<ReminderSettings>) {
        this.settings = { ...this.settings, ...newSettings };
        this.startReminders(); // Restart with new settings
    }

    public dispose() {
        this.stopReminders();
    }
}
