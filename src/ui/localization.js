// Localization utility for webviews
class LocalizationManager {
    constructor() {
        this.locale = this.getLocale();
        this.strings = this.getLocalizedStrings();
    }

    getLocale() {
        console.log('LocalizationManager: getLocale() called');

        // First check localStorage for user language setting (for webview persistence)
        try {
            const savedSettings = localStorage.getItem('codeTuneSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                console.log('LocalizationManager: localStorage settings:', settings);
                if (settings.language && settings.language !== 'auto') {
                    console.log('LocalizationManager: returning from localStorage:', settings.language);
                    return settings.language;
                }
            }
        } catch (error) {
            console.log('LocalizationManager: error reading localStorage:', error);
        }

        // Check for language in URL parameters (set by extension)
        const urlParams = new URLSearchParams(window.location.search);
        const urlLanguage = urlParams.get('language');
        console.log('LocalizationManager: URL language param:', urlLanguage);
        if (urlLanguage && urlLanguage !== 'auto') {
            console.log('LocalizationManager: returning from URL param:', urlLanguage);
            return urlLanguage;
        }

        // Check for language in global variable set by extension (during language change)
        if (typeof window !== 'undefined' && window.currentLanguage && window.currentLanguage !== 'auto') {
            console.log('LocalizationManager: returning from window.currentLanguage:', window.currentLanguage);
            return window.currentLanguage;
        }

        // Check for VS Code language set by extension in the HTML head
        if (typeof window !== 'undefined' && window.vsCodeLanguage) {
            console.log('LocalizationManager: returning from window.vsCodeLanguage (set by extension):', window.vsCodeLanguage);
            return window.vsCodeLanguage;
        }

        // When auto-detecting, check VS Code's locale via navigator.language
        const vsCodeLocale = navigator.language || 'en';
        console.log('LocalizationManager: auto-detecting, navigator.language:', vsCodeLocale);

        // Map common locales to supported languages
        if (vsCodeLocale.startsWith('ar')) {
            console.log('LocalizationManager: detected Arabic locale, returning: ar');
            return 'ar';
        } else {
            console.log('LocalizationManager: detected non-Arabic locale, returning: en');
            return 'en';
        }
    }

    getLocalizedStrings() {
        const strings = {
            en: {
                // Welcome page
                welcomeTitle: "Assalamu Alaikum! مرحباً!",
                welcomeSubtitle: "Welcome to CodeTune with Islamic Reminders",
                newFeature: "New Feature: Islamic Reminders & Prayer Times",
                enhanceExperience: "Enhance your coding experience with spiritual reminders and Islamic wisdom",
                hijriDateDisplay: "Hijri Date Display",
                hijriDateDisplayDesc: "View the Islamic calendar date in your activity bar",
                prayerTimeCountdown: "Prayer Time Countdown",
                prayerTimeCountdownDesc: "Real-time countdown to the next prayer time",
                islamicReminders: "Islamic Reminders",
                islamicRemindersDesc: "Receive periodic wisdom from Quran and Hadith",
                fullCustomization: "Full Customization",
                fullCustomizationDesc: "Control reminder frequency and content types",
                sampleReminder: "Sample Reminder",
                prayerType: "Adia (Prayer)",
                openSettings: "Open Settings",
                learnMore: "Learn More",
                gotIt: "Got it!",
                footerText: "May Allah bless your coding journey with peace and productivity",
                footerNote: "This welcome message will only appear for the first 3 days after installation",

                // Settings page
                settingsTitle: "CodeTune Settings",
                customizeExperience: "Customize your CodeTune experience",
                audioSettings: "Audio Settings",
                defaultQuranVolume: "Default Quran Volume",
                volumeDescription: "Set the default volume for Quran recitation (0-100%)",
                defaultReciter: "Default Reciter",
                chooseReciter: "Choose your preferred Quran reciter",
                defaultReciterOption: "Default Reciter",
                abdulrahman: "Abdul Rahman Al-Sudais",
                mishary: "Mishary Rashid Alafasy",
                saud: "Saad Al-Ghamidi",
                audioQuality: "Audio Quality",
                selectQuality: "Select preferred audio quality for streaming",
                lowQuality: "32 kbps (Low)",
                mediumQuality: "64 kbps (Medium)",
                highQuality: "128 kbps (High)",
                bestQuality: "192 kbps (Best)",
                playbackSettings: "Playback Settings",
                defaultPlaybackMode: "Default Playback Mode",
                choosePlayback: "Choose how to play Quran recitations",
                fullSurah: "Full Surah",
                ayahByAyah: "Ayah by Ayah",
                autoPlay: "Auto-play on Startup",
                autoPlayDesc: "Automatically start playing when VS Code opens",
                enableAutoPlay: "Enable auto-play",
                continueLast: "Continue from Last Position",
                continueDesc: "Resume playback from where you left off",
                enableResumePlayback: "Enable resume playback",
                appearanceSettings: "Appearance Settings",
                theme: "Theme",
                chooseTheme: "Choose the visual theme for CodeTune",
                autoFollow: "Auto (Follow VS Code)",
                lightTheme: "Light Theme",
                darkTheme: "Dark Theme",
                compactMode: "Compact Mode",
                compactDesc: "Use a more compact layout to save space",
                showNotifications: "Show Notifications",
                notificationsDesc: "Display notifications for playback events",
                language: "Language",
                chooseLanguage: "Choose the display language for CodeTune",
                languageAuto: "🌐",
                languageEnglish: "EN",
                languageArabic: "العربية",
                islamicRemindersTitle: "Islamic Reminders",
                enableReminders: "Enable Reminders",
                remindersDesc: "Receive Islamic reminders and wisdom notifications",
                reminderInterval: "Reminder Interval",
                reminderIntervalDesc: "How often to show Islamic reminders",
                every5Minutes: "Every 5 minutes",
                every15Minutes: "Every 15 minutes",
                every30Minutes: "Every 30 minutes",
                every1Hour: "Every 1 hour",
                every2Hours: "Every 2 hours",
                every4Hours: "Every 4 hours",
                reminderTypes: "Reminder Types",
                reminderTypesDesc: "Choose which types of Islamic content to receive",
                adiaPrayers: "Adia (Islamic Prayers)",
                ahadisSayings: "Ahadis (Prophet's Sayings)",
                islamicWisdom: "Islamic Wisdom",
                morningAzkar: "Morning Azkar (أذكار الصباح)",
                eveningAzkar: "Evening Azkar (أذكار المساء)",
                workingHoursOnly: "Working Hours Only",
                workingHoursDesc: "Only show reminders during typical working hours (9 AM - 6 PM)",
                advancedSettings: "Advanced Settings",
                cacheSize: "Cache Size",
                cacheSizeDesc: "Maximum cache size for downloaded audio (MB)",
                downloadTimeout: "Download Timeout",
                downloadTimeoutDesc: "Timeout for audio downloads (seconds)",
                retryAttempts: "Retry Attempts",
                retryAttemptsDesc: "Number of retry attempts for failed downloads",
                settingsSaved: "Settings are automatically saved when you change them. No need to manually save!",
                tipText: "You can also use keyboard shortcuts: Ctrl+Shift+Q to play Quran, and use the activity bar for quick access to your favorite Surahs.",
                saveSettings: "Save Settings",
                resetDefault: "Reset to Default",
                close: "Close",

                // Activity Bar
                codeTune: "CodeTune",
                islamicInformation: "Islamic Information",
                hijriDate: "Hijri Date",
                nextPrayer: "Next Prayer",
                quranPlayer: "Quran Player",
                available: "Available",
                quickAccess: "Quick Access",
                searchSurah: "Search Surah...",
                volume: "Volume",
                chooseSurah: "Choose a Surah to begin recitation",
                browseAll: "Browse All",
                browseAllSurahs: "Browse All Surahs",
                playingSurah: "Playing {surahName} ({arabicName})",
                reciterChanged: "Reciter changed to {reciter}",
                audioQualitySet: "Audio quality set to {quality} kbps",
                welcomeMessage: "Welcome to CodeTune Quran Player! 🎵",
                switchedToLightTheme: "Switched to light theme",
                switchedToDarkTheme: "Switched to dark theme",
                startedPlaying: "Started playing {surahName}",
                playbackError: "Playback error occurred",

                // Common
                loading: "Loading...",
                error: "Error",
                success: "Success",

                // Prayer Names - for localized dynamic display
                prayerFajr: "Fajr",
                prayerDhuhr: "Dhuhr",
                prayerAsr: "Asr",
                prayerMaghrib: "Maghrib",
                prayerIsha: "Isha"
            },
            ar: {
                // Welcome page
                welcomeTitle: "السلام عليكم! مرحباً!",
                welcomeSubtitle: "مرحباً بك في كود تيون مع التذكيرات الإسلامية",
                newFeature: "ميزة جديدة: التذكيرات الإسلامية وأوقات الصلاة",
                enhanceExperience: "حسّن تجربة البرمجة الخاصة بك مع التذكيرات الروحية والحكم الإسلامية",
                hijriDateDisplay: "عرض تاريخ التقويم الهجري في شريط النشاط",
                prayerTimeCountdown: "العد التنازلي في الوقت الفعلي للصلاة التالية",
                islamicReminders: "تلقي الحكم الدورية من القرآن والحديث",
                fullCustomization: "التحكم في تردد التذكيرات وأنواع المحتوى",
                sampleReminder: "تذكير عينة",
                prayerType: "أدعية (الصلاة)",
                openSettings: "فتح الإعدادات",
                learnMore: "معرفة المزيد",
                gotIt: "فهمت!",
                footerText: "اللهم بارك رحلتك في البرمجة بالسلام والإنتاجية",
                footerNote: "سيظهر هذا الرسالة الترحيبية فقط لأول 3 أيام بعد التثبيت",

                // Settings page
                settingsTitle: "إعدادات كود تيون",
                customizeExperience: "تخصيص تجربتك مع كود تيون",
                audioSettings: "إعدادات الصوت",
                defaultQuranVolume: "مستوى صوت القرآن الافتراضي",
                volumeDescription: "تعيين مستوى الصوت الافتراضي لتلاوة القرآن (0-100%)",
                defaultReciter: "القارئ الافتراضي",
                chooseReciter: "اختر قارئ القرآن المفضل لديك",
                defaultReciterOption: "القارئ الافتراضي",
                abdulrahman: "عبدالرحمن السديس",
                mishary: "مشاري راشد العفاسي",
                saud: "سعد الغامدي",
                audioQuality: "جودة الصوت",
                selectQuality: "اختر جودة الصوت المفضلة للبث",
                lowQuality: "32 كيلوبت في الثانية (منخفض)",
                mediumQuality: "64 كيلوبت في الثانية (متوسط)",
                highQuality: "128 كيلوبت في الثانية (عالي)",
                bestQuality: "192 كيلوبت في الثانية (أفضل)",
                playbackSettings: "إعدادات التشغيل",
                defaultPlaybackMode: "وضع التشغيل الافتراضي",
                choosePlayback: "اختر كيفية تشغيل تلاوات القرآن",
                fullSurah: "سورة كاملة",
                ayahByAyah: "آية آية",
                autoPlay: "التشغيل التلقائي عند البدء",
                autoPlayDesc: "بدء التشغيل تلقائياً عند فتح VS Code",
                enableAutoPlay: "تفعيل التشغيل التلقائي",
                continueLast: "المتابعة من آخر موضع",
                continueDesc: "استئناف التشغيل من حيث توقفت",
                enableResumePlayback: "تفعيل استئناف التشغيل",
                appearanceSettings: "إعدادات المظهر",
                theme: "الموضوع",
                chooseTheme: "اختر المظهر البصري لكود تيون",
                autoFollow: "تلقائي (اتبع VS Code)",
                lightTheme: "موضوع فاتح",
                darkTheme: "موضوع داكن",
                compactMode: "الوضع المدمج",
                compactDesc: "استخدم تخطيط أكثر إحكاماً لتوفير المساحة",
                showNotifications: "عرض الإشعارات",
                notificationsDesc: "عرض الإشعارات لحدث التشغيل",
                language: "اللغة",
                chooseLanguage: "اختر لغة العرض لكود تيون",
                languageAuto: "🌐",
                languageEnglish: "EN",
                languageArabic: "العربية",
                islamicRemindersTitle: "التذكيرات الإسلامية",
                enableReminders: "تفعيل التذكيرات",
                remindersDesc: "تلقي التذكيرات الإسلامية وإشعارات الحكم",
                reminderInterval: "فترة التذكير",
                reminderIntervalDesc: "كم مرة تظهر التذكيرات الإسلامية",
                every5Minutes: "كل 5 دقائق",
                every15Minutes: "كل 15 دقيقة",
                every30Minutes: "كل 30 دقيقة",
                every1Hour: "كل ساعة",
                every2Hours: "كل ساعتين",
                every4Hours: "كل 4 ساعات",
                reminderTypes: "أنواع التذكيرات",
                reminderTypesDesc: "اختر أنواع المحتوى الإسلامي التي تريد تلقيها",
                adiaPrayers: "الأدعية (الصلوات الإسلامية)",
                ahadisSayings: "الأحاديث (أقوال النبي)",
                islamicWisdom: "الحكم الإسلامية",
                morningAzkar: "أذكار الصباح (أذكار الصباح)",
                eveningAzkar: "أذكار المساء (أذكار المساء)",
                workingHoursOnly: "ساعات العمل فقط",
                workingHoursDesc: "عرض التذكيرات فقط خلال ساعات العمل المعتادة (9 صباحاً - 6 مساءً)",
                advancedSettings: "الإعدادات المتقدمة",
                cacheSize: "حجم الذاكرة المؤقتة",
                cacheSizeDesc: "الحد الأقصى لحجم الذاكرة المؤقتة للصوت المُنزّل (ميجابايت)",
                downloadTimeout: "مهلة التنزيل",
                downloadTimeoutDesc: "مهلة تنزيل الصوت (ثواني)",
                retryAttempts: "محاولات إعادة المحاولة",
                retryAttemptsDesc: "عدد محاولات إعادة المحاولة للتنزيلات الفاشلة",
                settingsSaved: "يتم حفظ الإعدادات تلقائياً عند تغييرها. لا حاجة لحفظها يدوياً!",
                tipText: "يمكنك أيضاً استخدام اختصارات لوحة المفاتيح: Ctrl+Shift+Q لتشغيل القرآن، واستخدم شريط النشاط للوصول السريع إلى السور المفضلة لديك.",
                saveSettings: "حفظ الإعدادات",
                resetDefault: "إعادة تعيين إلى الافتراضي",
                close: "إغلاق",

                // Activity Bar
                codeTune: "كود تيون",
                islamicInformation: "المعلومات الإسلامية",
                hijriDate: "التاريخ الهجري",
                nextPrayer: "الصلاة التالية",
                quranPlayer: "مشغل القرآن",
                available: "متاح",
                quickAccess: "الوصول السريع",
                searchSurah: "البحث عن سورة...",
                volume: "الصوت",
                chooseSurah: "اختر سورة لبدء التلاوة",
                browseAll: "تصفح الكل",
                browseAllSurahs: "تصفح جميع السور",
                playingSurah: "جارٍ تشغيل {surahName} ({arabicName})",
                reciterChanged: "تم تغيير القارئ إلى {reciter}",
                audioQualitySet: "تم تعيين جودة الصوت إلى {quality} كيلوبت في الثانية",
                welcomeMessage: "مرحباً بك في مشغل القرآن كود تيون! 🎵",
                switchedToLightTheme: "تم التبديل إلى الموضوع الفاتح",
                switchedToDarkTheme: "تم التبديل إلى الموضوع الداكن",
                startedPlaying: "بدأ التشغيل {surahName}",
                playbackError: "حدث خطأ في التشغيل",

                // Common
                loading: "جارٍ التحميل...",
                error: "خطأ",
                success: "نجح",

                // Prayer Names - for localized dynamic display
                prayerFajr: "الفجر",
                prayerDhuhr: "الظهر",
                prayerAsr: "العصر",
                prayerMaghrib: "المغرب",
                prayerIsha: "العشاء"
            }
        };

        return strings[this.locale] || strings['en'];
    }

    getString(key, replacements = {}) {
        let string = this.strings[key] || key;
        // Replace placeholders like {surahName} with actual values
        Object.keys(replacements).forEach(placeholder => {
            string = string.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
        });
        return string;
    }

    // Helper method to localize all elements with data-localize attribute
    localizeElements() {
        const elements = document.querySelectorAll('[data-localize]');
        elements.forEach(element => {
            const key = element.getAttribute('data-localize');
            if (key && this.strings[key]) {
                if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                    element.setAttribute('placeholder', this.strings[key]);
                } else if (element.tagName === 'OPTION') {
                    element.textContent = this.strings[key];
                } else {
                    element.textContent = this.strings[key];
                }
            }
        });
    }

    // Refresh localization when language changes
    refreshLocalization() {
        console.log('LocalizationManager: refreshLocalization called');
        this.locale = this.getLocale();
        this.strings = this.getLocalizedStrings();
        console.log('LocalizationManager: new locale:', this.locale);
        this.localizeElements();
        console.log('LocalizationManager: localization elements updated');
    }
}

// Global localization instance
window.localization = new LocalizationManager();
