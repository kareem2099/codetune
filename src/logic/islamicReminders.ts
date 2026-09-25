import * as vscode from 'vscode';
import { IslamicCalendar } from './islamicCalendar';
import { FridayReminders, IslamicContent } from './fridayReminders';
import { logger } from '../utils/Logger';
import { SpiritualTracker } from '../utils/SpiritualTracker'; // Import tracker

export interface ReminderSettings {
    enableReminders: boolean;
    reminderInterval: number; // minutes
    showAdia: boolean;
    showAhadis: boolean;
    showWisdom: boolean;
    showMorningAzkar: boolean;
    showEveningAzkar: boolean;
    enableAyahKursiReminder?: boolean;
    workingHoursOnly: boolean;
}

export interface PrayerReminderSettings {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
}

export class IslamicRemindersManager {
    private intervalId: NodeJS.Timeout | null = null;
    private prayerCheckIntervalId: NodeJS.Timeout | null = null;
    private lastReminderTime: number = 0;
    private settings: ReminderSettings;
    private prayerReminders: PrayerReminderSettings = {
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false
    };
    private notifiedPrayersToday: Set<string> = new Set();
    private notifiedAyahKursiPrayersToday: Set<string> = new Set();
    private lastNotifiedDate: string = '';
    private fridayReminders: FridayReminders;
    private spiritualTracker?: SpiritualTracker; // Store tracker reference

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

    private dailyHadiths: IslamicContent[] = [
        // Sunday (getDay() = 0)
        {
            type: 'hadis',
            arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ',
            english: 'Whoever follows a path seeking knowledge, Allah will make easy for him a path to Paradise.',
            source: 'Sahih Muslim'
        },
        // Monday (getDay() = 1)
        {
            type: 'hadis',
            arabic: 'الْعِلْمُ نُورٌ يَجْعَلُهُ اللَّهُ فِي الْقَلْبِ مَنْ يَشَاءُ',
            english: 'Knowledge is light that Allah places in the heart of whom He wills.',
            source: 'Sunan at-Tirmidhi'
        },
        // Tuesday (getDay() = 2)
        {
            type: 'hadis',
            arabic: 'مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ',
            english: 'Whoever Allah wants good for, He gives him understanding of the religion.',
            source: 'Sahih al-Bukhari'
        },
        // Wednesday (getDay() = 3)
        {
            type: 'hadis',
            arabic: 'طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ',
            english: 'Seeking knowledge is obligatory upon every Muslim.',
            source: 'Sunan Ibn Majah'
        },
        // Thursday (getDay() = 4)
        {
            type: 'hadis',
            arabic: 'الصَّبْرُ مِفْتَاحُ الْفَرَجِ',
            english: 'Patience is the key to relief.',
            source: 'Sunan Ibn Majah'
        },
        // Friday (getDay() = 5)
        {
            type: 'hadis',
            arabic: 'عَلَيْكُمْ بِالْجُمُعَةِ فَإِنَّهَا جُمْعُكُمْ مِنَ الْأَبْوَابِ الْمَكْسُورَةِ',
            english: 'You must attend the Friday prayer, for it is the door of the broken paths of guidance.',
            source: 'Sunan Ibn Majah (Friday Special)'
        },
        // Saturday (getDay() = 6)
        {
            type: 'hadis',
            arabic: 'مَنْ عَلِمَ شَيْئًا فَكَتَمَهُ أَلْجَمَهُ اللَّهُ يَوْمَ الْقِيَامَةِ بِلِجَامٍ مِنْ نَارٍ',
            english: 'Whoever knows something and conceals it, Allah will muzzle him with a muzzle of fire on the Day of Resurrection.',
            source: 'Sunan at-Tirmidhi'
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
        },
        {
            type: 'wisdom',
            arabic: 'قُلِ الْحَقُّ مِنْ رَبِّكُمْ فَمَنْ شَاءَ فَلْيُؤْمِنْ وَمَنْ شَاءَ فَلْيَكْفُرْ',
            english: 'Say, "The truth is from your Lord, so whoever wills - let him believe; and whoever wills - let him disbelieve."',
            source: 'Surah Al-Kahf 18:29 (Friday Quranic Reading Rally)'
        }
    ];

    private morningAzkar: IslamicContent[] = [
        {
            type: 'morningAzkar',
            arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
            english: 'We have entered the morning and the whole kingdom belongs to Allah. The praise is to Allah. There is none worthy of worship but Allah alone, no partner has He.',
            source: 'Morning Azkar'
        },
        {
            type: 'morningAzkar',
            arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
            english: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the resurrection.',
            source: 'Morning Azkar'
        },
        {
            type: 'morningAzkar',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا',
            english: 'O Allah, I ask You for knowledge that is beneficial, provision that is pure, and actions that are accepted.',
            source: 'Morning Azkar'
        },
        {
            type: 'morningAzkar',
            arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
            english: 'Glory be to Allah and all praise is due to Him, glory be to Allah the Great.',
            source: 'Morning Azkar'
        },
        {
            type: 'morningAzkar',
            arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
            english: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
            source: 'Morning Azkar'
        },
        {
            type: 'morningAzkar',
            arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
            english: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.',
            source: 'Ayah Al-Kursi (Al-Baqarah 2:255)'
        },
        {
            type: 'morningAzkar',
            arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
            english: 'O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge before You Your blessing upon me, and I acknowledge before You my sin, so forgive me, for indeed none forgives sins except You.',
            source: 'Sayyid al-Istighfar (Sahih al-Bukhari)'
        }
    ];

    private eveningAzkar: IslamicContent[] = [
        {
            type: 'eveningAzkar',
            arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
            english: 'We have entered the evening and the whole kingdom belongs to Allah. The praise is to Allah. There is none worthy of worship but Allah alone, no partner has He.',
            source: 'Evening Azkar'
        },
        {
            type: 'eveningAzkar',
            arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
            english: 'O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the return.',
            source: 'Evening Azkar'
        },
        {
            type: 'eveningAzkar',
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
            english: 'O Allah, I ask You for pardon and well-being in this world and in the Hereafter.',
            source: 'Evening Azkar'
        },
        {
            type: 'eveningAzkar',
            arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ',
            english: 'In the name of Allah, with whose name nothing in the earth or heaven can cause harm.',
            source: 'Evening Azkar'
        },
        {
            type: 'eveningAzkar',
            arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
            english: 'Say, "He is Allah, the One."',
            source: 'Surah Al-Ikhlas'
        },
        {
            type: 'eveningAzkar',
            arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
            english: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.',
            source: 'Ayah Al-Kursi (Al-Baqarah 2:255)'
        },
        {
            type: 'eveningAzkar',
            arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
            english: 'O Allah, You are my Lord, there is no deity except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge before You Your blessing upon me, and I acknowledge before You my sin, so forgive me, for indeed none forgives sins except You.',
            source: 'Sayyid al-Istighfar (Sahih al-Bukhari)'
        }
    ];

    constructor(tracker?: SpiritualTracker) {
        this.spiritualTracker = tracker;
        this.settings = {
            enableReminders: true,
            reminderInterval: 60,
            showAdia: true,
            showAhadis: true,
            showWisdom: true,
            showMorningAzkar: true,
            showEveningAzkar: true,
            workingHoursOnly: false
        };
        // Create FridayReminders with initial settings
        this.fridayReminders = new FridayReminders(this.settings);
        this.loadSettings();
        
        // Sync Fajr time with tracker on startup
        this.syncFajrTimeWithTracker();
        
        this.startReminders();
    }

    // Send Fajr time to SpiritualTracker for Islamic date tracking
    private syncFajrTimeWithTracker() {
        if (!this.spiritualTracker) { return; }
        
        try {
            const prayerTimes = IslamicCalendar.calculatePrayerTimes();
            if (prayerTimes && prayerTimes.fajr) {
                this.spiritualTracker.updateFajrTime(prayerTimes.fajr);
                logger.debug('Synced Fajr time with SpiritualTracker:', prayerTimes.fajr.toLocaleTimeString());
            }
        } catch (error) {
            logger.warn('Could not sync Fajr time with Tracker:', error);
        }
    }

    private loadSettings() {
        try {
            // Load from VS Code configuration system
            const config = vscode.workspace.getConfiguration('codeTune');
            this.settings = {
                enableReminders: config.get('enableReminders', true),
                reminderInterval: config.get('reminderInterval', 60),
                showAdia: config.get('showAdia', true),
                showAhadis: config.get('showAhadis', true),
                showWisdom: config.get('showWisdom', true),
                showMorningAzkar: config.get('showMorningAzkar', true),
                showEveningAzkar: config.get('showEveningAzkar', true),
                enableAyahKursiReminder: config.get('enableAyahKursiReminder', true),
                workingHoursOnly: config.get('workingHoursOnly', false)
            };
            const savedPrayers = config.get<PrayerReminderSettings>('prayerReminders');
            if (savedPrayers) {
                this.prayerReminders = { ...this.prayerReminders, ...savedPrayers };
            }
            logger.info('Islamic reminders loaded from VSCode config:', { settings: this.settings, prayerReminders: this.prayerReminders });
        } catch (error) {
            logger.warn('Failed to load Islamic reminder settings:', error);
            // Keep default settings
        }
    }

    private isWorkingHours(): boolean {
        if (!this.settings.workingHoursOnly) { return true; }

        const now = new Date();
        const hour = now.getHours();
        // Working hours: 9 AM to 6 PM
        return hour >= 9 && hour < 18;
    }

    private checkPrayerReminders() {
        try {
            const todayStr = new Date().toDateString();
            if (this.lastNotifiedDate !== todayStr) {
                this.notifiedPrayersToday.clear();
                this.notifiedAyahKursiPrayersToday.clear();
                this.lastNotifiedDate = todayStr;
            }

            const prayerTimes = IslamicCalendar.calculatePrayerTimes();
            const now = new Date();
            const prayerNames: Array<keyof PrayerReminderSettings> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
            const prayerTitles: Record<keyof PrayerReminderSettings, { ar: string; en: string }> = {
                fajr: { ar: 'صلاة الفجر', en: 'Fajr Prayer' },
                dhuhr: { ar: 'صلاة الظهر', en: 'Dhuhr Prayer' },
                asr: { ar: 'صلاة العصر', en: 'Asr Prayer' },
                maghrib: { ar: 'صلاة المغرب', en: 'Maghrib Prayer' },
                isha: { ar: 'صلاة العشاء', en: 'Isha Prayer' }
            };

            for (const prayer of prayerNames) {
                if (!this.prayerReminders[prayer]) { continue; }

                const pTime = prayerTimes[prayer];
                if (!pTime) { continue; }

                const diffMs = now.getTime() - pTime.getTime();

                // 1) Prayer time notification (-5m to +15m)
                if (!this.notifiedPrayersToday.has(prayer)) {
                    if (diffMs >= -5 * 60 * 1000 && diffMs <= 15 * 60 * 1000) {
                        this.notifiedPrayersToday.add(prayer);
                        const title = prayerTitles[prayer];
                        vscode.window.showInformationMessage(
                            `🕌 حان الآن موعد ${title.ar} / Time for ${title.en}`,
                            'Got it'
                        );
                        break;
                    }
                }

                // 2) After-prayer Ayah Al-Kursi reminder (15m to 40m after prayer time)
                if (this.settings.enableAyahKursiReminder !== false && !this.notifiedAyahKursiPrayersToday.has(prayer)) {
                    if (diffMs >= 15 * 60 * 1000 && diffMs <= 40 * 60 * 1000) {
                        const title = prayerTitles[prayer];
                        this.showAyahKursiReminder(title.ar, prayer);
                        break;
                    }
                }
            }
        } catch (error) {
            logger.warn('Error checking prayer reminders:', error);
        }
    }

    private getRandomContent(): IslamicContent | null {
        const availableTypes: IslamicContent[] = [];
        const now = new Date();
        const todayIndex = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday

        // Handle Friday content from FridayReminders class
        if (this.fridayReminders.shouldShowFridayContent()) {
            const fridayContent = this.fridayReminders.getFridayContent();
            if (fridayContent) {
                return fridayContent;
            }
            // If no Friday content, fall through to daily hadith for Friday
        }

        // Regular days - normal logic or continuing Friday after first reminder
        // Add time-based azkar based on current time
        const prayerTimes = IslamicCalendar.calculatePrayerTimes();
        const isMorningTime = now >= prayerTimes.fajr && now < IslamicRemindersManager.calculateSunriseTime();
        const isEveningTime = now >= prayerTimes.asr && now < prayerTimes.maghrib;

        if (this.settings.showMorningAzkar && isMorningTime) {
            availableTypes.push(...this.morningAzkar);
        }
        if (this.settings.showEveningAzkar && isEveningTime) {
            availableTypes.push(...this.eveningAzkar);
        }

        // Always available content (not time-based)
        if (this.settings.showAdia) { availableTypes.push(...this.adia); }
        // Show the daily hadith for today's weekday
        if (this.settings.showAhadis) { availableTypes.push(this.dailyHadiths[todayIndex]); }
        if (this.settings.showWisdom) { availableTypes.push(...this.wisdom); }

        if (availableTypes.length === 0) { return null; }

        const randomIndex = Math.floor(Math.random() * availableTypes.length);
        return availableTypes[randomIndex];
    }

    private static calculateSunriseTime(): Date {
        // Approximate sunrise as when the sun is at 0 degrees (same as Maghrib is sunset)
        // For simplicity, we calculate it as Fajr + approximately 5 hours
        // A more accurate calculation would require astronomical data
        const prayerTimes = IslamicCalendar.calculatePrayerTimes();
        const sunriseEstimate = new Date(prayerTimes.fajr.getTime() + (5 * 60 * 60 * 1000)); // Fajr + 5 hours
        return sunriseEstimate;
    }

    private async showReminder() {
        if (!this.settings.enableReminders) { return; }
        if (!this.isWorkingHours()) { return; }

        const content = this.getRandomContent();
        if (!content) { return; }

        const isFridaySurah = content?.source?.includes('Surah Al-Kahf 18:29 (Friday Quranic Reading Rally)');

        // If this is the Friday Surah Al-Kahf reminder, enforce reading instead of just showing notification
        if (isFridaySurah && !this.fridayReminders.isFridaySurahCompleted()) {
            logger.info('Friday Surah Al-Kahf reminder triggered - enforcing reading');
            await this.fridayReminders.enforceFridaySurahReading();
            return; // Don't show the regular notification
        }

        const typeLabel = isFridaySurah ? 'Friday Remembrance: Read Surah Al-Kahf' :
            content.type === 'adia' ? 'Adia (Prayer)' :
                content.type === 'hadis' ? 'Hadis (Prophet\'s Saying)' :
                    content.type === 'morningAzkar' ? 'Morning Azkar' :
                        content.type === 'eveningAzkar' ? 'Evening Azkar' :
                            'Islamic Wisdom';

        // Show notification with Islamic content
        vscode.window.showInformationMessage(
            `🕌 ${typeLabel}\n\n${content.arabic}\n\n${content.english}${content.source ? `\n\nSource: ${content.source}` : ''}`,
            'Got it'
        ).then(() => {
            // Check if this was salawat content and increment counter
            const isSalawatContent = content.arabic?.includes('صَلِّ عَلَى') ||
                content.arabic?.includes('صلاة الله عليه وسلم') ||
                content.source?.includes('Friday Evening Salawat') ||
                content.source?.includes('Friday Prayer');

            if (isSalawatContent) {
                this.fridayReminders.incrementSalawatCounter();
            }

            // User clicked "Got it" - could add positive reinforcement here
        });
    }

    public startReminders() {
        this.stopReminders(); // Clear any existing interval

        if (!this.settings.enableReminders) { return; }

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

        // Set up recurring prayer time checks every 60 seconds
        this.checkPrayerReminders();
        this.prayerCheckIntervalId = setInterval(() => {
            this.checkPrayerReminders();
        }, 60 * 1000);
    }

    public stopReminders() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.prayerCheckIntervalId) {
            clearInterval(this.prayerCheckIntervalId);
            this.prayerCheckIntervalId = null;
        }
    }

    public updateSettings(newSettings: any) {
        if (newSettings.islamicReminders) {
            this.prayerReminders = { ...this.prayerReminders, ...newSettings.islamicReminders };
        } else if (newSettings.fajr !== undefined || newSettings.dhuhr !== undefined) {
            this.prayerReminders = { ...this.prayerReminders, ...newSettings };
        }

        this.settings = { ...this.settings, ...newSettings };
        // Update FridayReminders settings too
        this.fridayReminders.updateSettings(this.settings);

        // Persist to configuration
        try {
            const config = vscode.workspace.getConfiguration('codeTune');
            if (newSettings.enableReminders !== undefined) { config.update('enableReminders', this.settings.enableReminders, true); }
            if (newSettings.reminderInterval !== undefined) { config.update('reminderInterval', this.settings.reminderInterval, true); }
            if (newSettings.showAdia !== undefined) { config.update('showAdia', this.settings.showAdia, true); }
            if (newSettings.showAhadis !== undefined) { config.update('showAhadis', this.settings.showAhadis, true); }
            if (newSettings.showWisdom !== undefined) { config.update('showWisdom', this.settings.showWisdom, true); }
            if (newSettings.showMorningAzkar !== undefined) { config.update('showMorningAzkar', this.settings.showMorningAzkar, true); }
            if (newSettings.showEveningAzkar !== undefined) { config.update('showEveningAzkar', this.settings.showEveningAzkar, true); }
            if (newSettings.enableAyahKursiReminder !== undefined) { config.update('enableAyahKursiReminder', this.settings.enableAyahKursiReminder, true); }
            if (newSettings.workingHoursOnly !== undefined) { config.update('workingHoursOnly', this.settings.workingHoursOnly, true); }
            config.update('prayerReminders', this.prayerReminders, true);
        } catch (err) {
            logger.warn('Failed to persist Islamic reminder settings:', err);
        }

        this.startReminders(); // Restart with new settings
    }

    public async showAyahKursiReminder(prayerTitle?: string, prayerKey?: string): Promise<void> {
        if (this.settings.enableAyahKursiReminder === false) {
            return;
        }

        if (prayerKey) {
            if (this.notifiedAyahKursiPrayersToday.has(prayerKey)) {
                return;
            }
            this.notifiedAyahKursiPrayersToday.add(prayerKey);
        }

        const header = prayerTitle ? `دُبُر ${prayerTitle}` : 'دُبُر الصلاة المكتوبة';
        const hadith = 'قال رسول الله ﷺ: «مَنْ قَرَأَ آيَةَ الْكُرْسِيِّ دُبُرَ كُلِّ صَلَاةٍ مَكْتُوبَةٍ لَمْ يَمْنَعْهُ مِنْ دُخُولِ الْجَنَّةِ إِلَّا أَنْ يَمُوتَ»';

        const choice = await vscode.window.showInformationMessage(
            `🕌 ${header}\n${hadith}`,
            '📖 قراءة آية الكرسي / Read Ayah Al-Kursi',
            'تمت القراءة بحمد الله ✅'
        );

        if (choice === '📖 قراءة آية الكرسي / Read Ayah Al-Kursi') {
            vscode.window.showInformationMessage(
                '﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ﴾ [البقرة: 255]\n\n"Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great."',
                { modal: true }
            );
        }
    }

    public getSettings(): ReminderSettings {
        return { ...this.settings };
    }

    public getPrayerSettings(): PrayerReminderSettings {
        return { ...this.prayerReminders };
    }

    public dispose() {
        this.stopReminders();
    }
}
