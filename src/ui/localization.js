// Localization utility for webviews
class LocalizationManager {
    constructor() {
        this.locale = this.getLocale();
        this.strings = {}; // Will be set when localization data is received
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
        } else if (vsCodeLocale.startsWith('ru')) {
            console.log('LocalizationManager: detected Russian locale, returning: ru');
            return 'ru';
        } else if (vsCodeLocale.startsWith('fr')) {
            console.log('LocalizationManager: detected French locale, returning: fr');
            return 'fr';
        } else if (vsCodeLocale.startsWith('es')) {
            console.log('LocalizationManager: detected Spanish locale, returning: es');
            return 'es';
        } else {
            console.log('LocalizationManager: detected non-mapped locale, returning: en');
            return 'en';
        }
    }

    // Set localization data received from the extension backend
    setLocalizationData(data) {
        console.log('LocalizationManager: Setting localization data for locale:', this.locale);
        this.strings = data || {};
        this.localizeElements();
        console.log('LocalizationManager: Localization data set and elements updated');
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

    // Refresh localization when language changes (called by extension)
    refreshLocalization(language, localizationData) {
        console.log('LocalizationManager: refreshLocalization called with language:', language);
        this.locale = language || this.getLocale();
        if (localizationData) {
            this.setLocalizationData(localizationData);
        }
        console.log('LocalizationManager: new locale:', this.locale);
    }
}

// Global localization instance
window.localization = new LocalizationManager();
