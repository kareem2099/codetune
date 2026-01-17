import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QuranPlayer } from '../file/quranPlayer';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { Logger } from '../utils/Logger';
import { IslamicCalendar } from './islamicCalendar';

/**
 * Get user location using IP geolocation (from extension host to bypass webview restrictions)
 */
async function getUserLocation(): Promise<{ lat: number; lon: number; city: string; country: string; timezone: string } | null> {
    try {
        Logger.instance.info('Extension: Fetching user location via IP geolocation...');

        // Use ip-api.com for IP-based geolocation (free, no API key needed)
        const response = await fetch('http://ip-api.com/json/');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;

        if (data.status === 'fail') {
            Logger.instance.warn('Extension: IP geolocation failed:', data.message);
            return null;
        }

        Logger.instance.info('Extension: Successfully got location:', {
            city: data.city,
            country: data.country,
            lat: data.lat,
            lon: data.lon,
            timezone: data.timezone
        });

        return {
            lat: data.lat,
            lon: data.lon,
            city: data.city,
            country: data.country,
            timezone: data.timezone
        };
    } catch (error) {
        Logger.instance.error('Extension: Location fetch error:', error);
        return null; // Return null on any error
    }
}

/**
 * Calculate prayer times using Adhan library
 */
function calculatePrayerTimes(lat: number, lon: number): { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; next: string } {
    try {
        Logger.instance.info('Extension: Calculating prayer times for coordinates', { lat, lon });

        const coordinates = new Coordinates(lat, lon);
        const date = new Date();
        const params = CalculationMethod.Egyptian(); // Using Egyptian method as requested

        const prayerTimes = new PrayerTimes(coordinates, date, params);

        // Get next prayer time (it returns the Date object for the next prayer)
        const nextPrayerTime = prayerTimes.timeForPrayer(prayerTimes.nextPrayer());

        // Return prayer times as ISO strings for easy transport
        const result = {
            fajr: prayerTimes.fajr.toISOString(),
            dhuhr: prayerTimes.dhuhr.toISOString(),
            asr: prayerTimes.asr.toISOString(),
            maghrib: prayerTimes.maghrib.toISOString(),
            isha: prayerTimes.isha.toISOString(),
            next: nextPrayerTime ? nextPrayerTime.toISOString() : ''
        };

        Logger.instance.info('Extension: Prayer times calculated successfully');
        return result;
    } catch (error) {
        Logger.instance.error('Extension: Error calculating prayer times:', error);
        throw error;
    }
}

export class ActivityBarViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeTuneMain';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private quranPlayer: QuranPlayer,
        private islamicRemindersManager?: any
    ) {
        // Set up bidirectional communication with QuranPlayer
        this.quranPlayer.setMessageSender((message: any) => {
            this.sendMessageToWebview(message);
        });
        Logger.instance.info('Activity Bar: Provider constructor called');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        Logger.instance.info('Activity Bar: Resolving webview view...');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
            // Disable sandbox to prevent warnings while maintaining functionality
            enableCommandUris: false,
            enableForms: false
        };

        // Add debug message listener
        webviewView.webview.onDidReceiveMessage((message) => {
            Logger.instance.info('DEBUG: Webview sent message:', message);
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        Logger.instance.info('Activity Bar: Webview HTML set');

        // Send current language and localization data to webview after a short delay to ensure it's ready
        setTimeout(() => {
            const config = vscode.workspace.getConfiguration('codeTune');
            const currentLanguage = config.get('language', 'auto');

            // Load localization data
            const localizationData = this.loadLocalizationData(currentLanguage);

            webviewView.webview.postMessage({
                type: 'languageChanged',
                language: currentLanguage,
                localizationData: localizationData
            });
            Logger.instance.info('Activity Bar: Sent current language and localization data to webview:', currentLanguage);
        }, 1000); // Wait 1 second for webview to initialize

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            Logger.instance.info('Activity Bar received message:', data);
            try {
                switch (data.type) {
                    case 'playQuran':
                        Logger.instance.info('Playing Quran', { surah: data.surah, mode: data.mode, reciter: data.reciter });
                        if (!data.surah || data.surah === null || data.surah === undefined) {
                            vscode.window.showErrorMessage('No Surah selected. Please select a Surah first.');
                            return;
                        }
                        await this.quranPlayer.play(data.surah, data.mode, data.reciter);
                        const modeName = data.mode === 'ayah-by-ayah' ? 'Ayah by Ayah' : 'Full Surah';
                        // Show brief success message for 3 seconds, then return to default
                        this.updateStatus('statusMessage', `Playing Surah ${data.surah} (${modeName})`);
                        setTimeout(() => {
                            this.updateStatus('statusMessage', 'Choose a Surah to begin recitation');
                        }, 3000);
                        break;
                    case 'setQuranVolume':
                        Logger.instance.info(`Quran volume set to ${data.value}`);
                        // Forward volume change to webview to apply to currently playing audio
                        this.sendMessageToWebview({
                            type: 'setAudioVolume',
                            volume: data.value
                        });
                        break;
                    case 'updateReciter':
                        Logger.instance.info('Updating reciter to:', data.reciter);
                        this.quranPlayer.setEdition(data.reciter);
                        break;
                    case 'testActivityBar':
                        Logger.instance.info('Testing activity bar...');
                        this.updateStatus('statusMessage', 'Activity Bar is working! ✅');
                        vscode.window.showInformationMessage('Activity Bar is working! ✅');
                        break;
                    case 'webviewLoaded':
                        Logger.instance.info('DEBUG: Webview loaded successfully!');
                        vscode.window.showInformationMessage('🎵 CodeTune Activity Bar Loaded!');
                        break;
                    case 'showNotification':
                        Logger.instance.info('Activity Bar: Showing notification:', data.message);
                        const type = data.type || 'info';
                        switch (type) {
                            case 'info':
                                vscode.window.showInformationMessage(data.message);
                                break;
                            case 'warning':
                                vscode.window.showWarningMessage(data.message);
                                break;
                            case 'error':
                                vscode.window.showErrorMessage(data.message);
                                break;
                            default:
                                vscode.window.showInformationMessage(data.message);
                                break;
                        }
                        break;
                    case 'openSettings':
                        // Settings are now handled within the activity bar itself
                        Logger.instance.info('Settings opened within activity bar');
                        break;
                    case 'goBackToActivityBar':
                        // Go back to main activity bar (could be used for navigation)
                        Logger.instance.info('Going back to activity bar');
                        break;
                    // Audio control messages from QuranPlayer
                    case 'playAudio':
                        Logger.instance.info('Forwarding playAudio to webview:', data);
                        this.sendMessageToWebview(data);
                        break;
                    case 'pauseAudio':
                        Logger.instance.info('Forwarding pauseAudio to webview');
                        this.sendMessageToWebview(data);
                        break;
                    case 'resumeAudio':
                        Logger.instance.info('Forwarding resumeAudio to webview');
                        this.sendMessageToWebview(data);
                        break;
                    case 'stopAudio':
                        Logger.instance.info('Forwarding stopAudio to webview');
                        this.sendMessageToWebview(data);
                        break;
                    case 'setAudioVolume':
                        Logger.instance.info('Forwarding setAudioVolume to webview:', data.volume);
                        this.sendMessageToWebview(data);
                        break;
                    case 'seekAudio':
                        Logger.instance.info('Forwarding seekAudio to webview:', data.position);
                        this.sendMessageToWebview(data);
                        break;
                    // Settings-related messages
                    case 'saveSettings':
                        Logger.instance.info('Saving settings:', data);
                        vscode.window.showInformationMessage('Settings saved successfully!');
                        break;
                    case 'executeCommand':
                        Logger.instance.info('Executing VS Code command:', data.command);
                        await vscode.commands.executeCommand(data.command);
                        break;
                    case 'updateIslamicReminders':
                        Logger.instance.info('Updating Islamic reminders:', data.settings);
                        // Update Islamic reminders manager with new settings
                        if (this.islamicRemindersManager) {
                            this.islamicRemindersManager.updateSettings(data.settings);
                            Logger.instance.info('Islamic reminders updated successfully');
                        } else {
                            Logger.instance.warn('Islamic reminders manager not available');
                        }
                        break;
                    case 'ayahEnded':
                        Logger.instance.info('Ayah ended, advancing to next ayah:', data);
                        // Play next ayah in ayah-by-ayah mode
                        if (data.currentSurah && typeof data.currentAyah === 'number') {
                            await this.quranPlayer.playNextAyah(data.currentSurah, data.currentAyah);
                        } else {
                            Logger.instance.warn('Invalid ayahEnded data:', data);
                        }
                        break;
                    case 'updateLanguageSetting':
                        Logger.instance.info('Updating language setting:', data.language);
                        // Update the global VS Code configuration
                        const config = vscode.workspace.getConfiguration('codeTune');
                        config.update('language', data.language, true);
                        Logger.instance.info('Language setting updated to:', data.language);
                        // Notify the webview to refresh localization with new language
                        this.notifyLanguageChange(data.language);
                        break;
                    case 'updateReviewNotifications':
                        Logger.instance.info('Updating review notification settings:', data.settings);
                        // Update review notification manager with new settings
                        const reviewNotificationManager = (global as any).reviewNotificationManager;
                        if (reviewNotificationManager) {
                            reviewNotificationManager.updateSettings(data.settings);
                            Logger.instance.info('Review notification settings updated successfully');
                        } else {
                            Logger.instance.warn('Review notification manager not available');
                        }
                        break;
                    case 'trackDhikrIncrement':
                        Logger.instance.info('Tracking dhikr increment for review notifications');
                        // Track dhikr increment for review notifications
                        const rnManager = (global as any).reviewNotificationManager;
                        if (rnManager) {
                            rnManager.updateUsageMetrics('dhikrIncremented');
                        }
                        break;
                    case 'trackSurahPlayed':
                        Logger.instance.info('Tracking surah played for review notifications');
                        // Track surah played for review notifications
                        const rnManager2 = (global as any).reviewNotificationManager;
                        if (rnManager2) {
                            rnManager2.updateUsageMetrics('surahPlayed');
                        }
                        break;
                    case 'autoPlayStartup':
                        Logger.instance.info('Auto-play startup triggered:', data);
                        // Handle auto-play on startup - send to webview
                        this.sendMessageToWebview({
                            type: 'autoPlayStartup',
                            lastPlayback: data.lastPlayback,
                            volume: data.volume
                        });
                        break;
                    case 'surahFinished':
                        Logger.instance.info('Surah finished, asking user about next surah', { currentSurah: data.currentSurah, nextSurah: data.nextSurah });
                        // Show VS Code notification asking if user wants to continue reading
                        this.handleSurahFinished(data.currentSurah, data.nextSurah);
                        break;
                    case 'showConfirmDialog':
                        Logger.instance.info('Showing confirmation dialog:', data.message);
                        // Show VS Code confirmation dialog
                        const userChoice = await vscode.window.showInformationMessage(
                            data.message,
                            { modal: true },
                            'Yes',
                            'Cancel'
                        );

                        // Send back the result to the webview
                        if (userChoice === 'Yes') {
                            // Hide the current webview to avoid focus issues during modal
                            if (this._view) {
                                this._view.webview.postMessage({
                                    type: 'confirmResult',
                                    action: data.action,
                                    confirmed: true
                                });
                            }
                        }
                        break;
                    case 'fridaySurahStarted':
                        Logger.instance.info('Friday Surah Al-Kahf reading started:', data.surahNumber);
                        // Mark Friday Surah as started in the Islamic reminders manager
                        if (this.islamicRemindersManager && this.islamicRemindersManager.fridayReminders) {
                            this.islamicRemindersManager.fridayReminders.markFridaySurahStarted();
                        }
                        break;
                    case 'fridaySurahCompleted':
                        Logger.instance.info('Friday Surah Al-Kahf reading completed:', data.surahNumber);
                        // Mark Friday Surah as completed in the Islamic reminders manager
                        if (this.islamicRemindersManager && this.islamicRemindersManager.fridayReminders) {
                            this.islamicRemindersManager.fridayReminders.markFridaySurahCompleted();
                        }
                        break;
                    case 'enforceFridaySurahKahf':
                        Logger.instance.info('Enforcing Friday Surah Al-Kahf reading:', data);
                        // Forward the message to the webview to trigger the Quran reader
                        this.sendMessageToWebview({
                            type: 'enforceFridaySurahKahf',
                            surahNumber: data.surahNumber,
                            message: data.message
                        });
                        break;
                    case 'getFridaySurahStatus':
                        Logger.instance.info('Getting Friday Surah status');
                        // Get current Friday Surah status from the Islamic reminders manager
                        if (this.islamicRemindersManager && this.islamicRemindersManager.fridayReminders) {
                            const status = this.islamicRemindersManager.fridayReminders.getFridaySurahStatus();
                            Logger.instance.info('Friday Surah status:', status);
                            // Send status back to webview
                            this.sendMessageToWebview({
                                type: 'fridaySurahStatus',
                                status: status.status,
                                message: status.message
                            });
                        } else {
                            Logger.instance.warn('Islamic reminders manager not available for Friday Surah status');
                            this.sendMessageToWebview({
                                type: 'fridaySurahStatus',
                                status: 'not-started',
                                message: 'Status unavailable'
                            });
                        }
                        break;
                    case 'requestLocation':
                        Logger.instance.info('Webview requested user location via IP geolocation');
                        // Get user location using IP geolocation
                        getUserLocation().then((location) => {
                            Logger.instance.info('Sending location data back to webview:', location);
                            this.sendMessageToWebview({
                                type: 'receiveLocation',
                                payload: location
                            });
                        }).catch((error) => {
                            Logger.instance.error('Failed to get location for webview:', error);
                            this.sendMessageToWebview({
                                type: 'receiveLocation',
                                payload: null
                            });
                        });
                        break;
                    case 'requestPrayerTimes':
                        Logger.instance.info('Webview requested prayer times calculation', { lat: data.lat, lon: data.lon });
                        try {
                            const times = calculatePrayerTimes(data.lat, data.lon);
                            Logger.instance.info('Sending prayer times back to webview');
                            this.sendMessageToWebview({
                                type: 'receivePrayerTimes',
                                payload: times
                            });
                        } catch (error) {
                            Logger.instance.error('Failed to calculate prayer times:', error);
                            this.sendMessageToWebview({
                                type: 'receivePrayerTimes',
                                payload: null
                            });
                        }
                        break;
                    case 'requestHijriDate':
                        Logger.instance.info('Webview requested Hijri date calculation');
                        try {
                            const hijriDate = IslamicCalendar.getHijriDateString();
                            Logger.instance.info('Sending Hijri date back to webview:', hijriDate);
                            this.sendMessageToWebview({
                                type: 'receiveHijriDate',
                                payload: hijriDate
                            });
                        } catch (error) {
                            Logger.instance.error('Failed to calculate Hijri date:', error);
                            this.sendMessageToWebview({
                                type: 'receiveHijriDate',
                                payload: 'Error loading date'
                            });
                        }
                        break;
                    default:
                        Logger.instance.info('Unknown message type:', data.type);
                        break;
                }
            } catch (error) {
                Logger.instance.error('Activity Bar command failed:', error);
                vscode.window.showErrorMessage(`Command failed: ${data.type} - ${error}`);
            }
        });
    }

    public refresh() {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    public notifyLanguageChange(language?: string) {
        Logger.instance.info('ActivityBarView: notifyLanguageChange called with language:', language);

        // If no language provided, get current language from config
        const currentLanguage = language || vscode.workspace.getConfiguration('codeTune').get('language', 'auto');
        const localizationData = this.loadLocalizationData(currentLanguage);

        if (this._view) {
            Logger.instance.info('ActivityBarView: Sending languageChanged message to webview with language:', currentLanguage);
            this._view.webview.postMessage({
                type: 'languageChanged',
                language: currentLanguage,
                localizationData: localizationData
            });
        } else {
            Logger.instance.info('ActivityBarView: No webview available to notify');
        }
    }

    private updateStatus(elementId: string, message: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateStatus',
                elementId: elementId,
                message: message
            });
        }
    }

    private sendMessageToWebview(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    /**
     * Handle when a Surah finishes reading, show notification asking to continue
     */
    private async handleSurahFinished(currentSurah: any, nextSurah: any): Promise<void> {
        try {
            const message = `📖 ${currentSurah.arabicName} (${currentSurah.name}) completed. Continue reading with ${nextSurah.arabicName} (${nextSurah.name})?`;

            const userChoice = await vscode.window.showInformationMessage(
                message,
                { modal: false }, // Not modal so user can continue working
                'Continue Reading',
                'Stop'
            );

            if (userChoice === 'Continue Reading') {
                // Start countdown timer (3-2-1) and then auto-advance to next surah
                await this.startSurahTransitionCountdown(nextSurah);
            } else {
                // Show a completion message
                vscode.window.showInformationMessage('Reading session completed ✅');
            }
        } catch (error) {
            Logger.instance.error('Error handling surah finished:', error);
            vscode.window.showErrorMessage('Error handling surah transition');
        }
    }

    /**
     * Start countdown timer and auto-advance to next surah
     */
    private async startSurahTransitionCountdown(nextSurah: any): Promise<void> {
        try {
            // Show countdown notifications
            for (let i = 3; i >= 1; i--) {
                vscode.window.showInformationMessage(`Starting next Surah ${nextSurah.arabicName} in ${i}... ⏰`);
                await this.delay(1000); // 1 second delay
            }

            // Send message to webview to open the next surah
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'openNextSurah',
                    surahNumber: nextSurah.number,
                    action: 'autoTransition'
                });
            }

            vscode.window.showInformationMessage(`📖 Starting ${nextSurah.arabicName} (${nextSurah.name})`);
        } catch (error) {
            Logger.instance.error('Error in surah transition countdown:', error);
            vscode.window.showErrorMessage('Error transitioning to next Surah');
        }
    }

    /**
     * Load localization data for the specified language
     */
    private loadLocalizationData(language: string): any {
        try {
            let resolvedLanguage = language;

            // Resolve 'auto' to actual language
            if (resolvedLanguage === 'auto') {
                resolvedLanguage = vscode.env.language.startsWith('ar') ? 'ar' :
                                  vscode.env.language.startsWith('ru') ? 'ru' :
                                  vscode.env.language.startsWith('fr') ? 'fr' :
                                  vscode.env.language.startsWith('es') ? 'es' : 'en';
            }

            // Map language codes to file names
            const fileMap: { [key: string]: string } = {
                'en': 'ui.nls.json',
                'ar': 'ui.nls.ar.json',
                'ru': 'ui.nls.ru.json',
                'fr': 'ui.nls.fr.json',
                'es': 'ui.nls.es.json'
            };

            const fileName = fileMap[resolvedLanguage] || 'ui.nls.json';
            const filePath = path.join(this._extensionUri.fsPath, 'src', 'ui', fileName);

            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(fileContent);
            } else {
                Logger.instance.warn(`Localization file not found: ${filePath}, falling back to English`);
                // Fallback to English
                const fallbackPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'ui.nls.json');
                if (fs.existsSync(fallbackPath)) {
                    const fallbackContent = fs.readFileSync(fallbackPath, 'utf8');
                    return JSON.parse(fallbackContent);
                }
            }
        } catch (error) {
            Logger.instance.error('Error loading localization data:', error);
        }

        // Ultimate fallback - minimal English strings
        return {
            loading: "Loading...",
            error: "Error occurred while loading localization"
        };
    }

    /**
     * Utility method for delays
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        // Read the unified HTML file
        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.html');
        const cssPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.css');
        const jsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.js');
        const localizationPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'localization.js');

        // Component paths
        const counterPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'counter.js');
        const audioPlayerPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'audioPlayer.js');
        const prayerTrackerPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'prayerTracker.js');
        const settingsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'settings.js');
        const statisticsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components', 'statistics.js');

        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Replace placeholders with actual webview URIs
        const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath));
        const jsUri = webview.asWebviewUri(vscode.Uri.file(jsPath));
        const localizationUri = webview.asWebviewUri(vscode.Uri.file(localizationPath));

        // Component URIs
        const counterUri = webview.asWebviewUri(vscode.Uri.file(counterPath));
        const audioPlayerUri = webview.asWebviewUri(vscode.Uri.file(audioPlayerPath));
        const prayerTrackerUri = webview.asWebviewUri(vscode.Uri.file(prayerTrackerPath));
        const settingsUri = webview.asWebviewUri(vscode.Uri.file(settingsPath));
        const statisticsUri = webview.asWebviewUri(vscode.Uri.file(statisticsPath));

        htmlContent = htmlContent
            .replace('{{cssUri}}', cssUri.toString())
            .replace('{{jsUri}}', jsUri.toString())
            .replace('{{localizationUri}}', localizationUri.toString())
            .replace('./components/counter.js', counterUri.toString())
            .replace('./components/audioPlayer.js', audioPlayerUri.toString())
            .replace('./components/prayerTracker.js', prayerTrackerUri.toString())
            .replace('./components/settings.js', settingsUri.toString())
            .replace('./components/statistics.js', statisticsUri.toString())
            .replace(/{{nonce}}/g, nonce)
            .replace('{{settingsCssUri}}', '') // Remove settings references
            .replace('{{settingsJsUri}}', ''); // Remove settings references

        // Add VS Code locale as URL parameter for proper initialization
        const config = vscode.workspace.getConfiguration('codeTune');
        const currentLanguage = config.get('language', 'auto');
        let urlLanguage = currentLanguage;

        // If auto, resolve to actual VS Code locale
        if (urlLanguage === 'auto') {
            urlLanguage = vscode.env.language.startsWith('ar') ? 'ar' : 'en';
        }

        Logger.instance.info('ActivityBar: Resolved language for URL', { urlLanguage, currentLanguage, vscodeLocale: vscode.env.language });

        // Pass the language as URL parameter
        const finalUri = webview.asWebviewUri(vscode.Uri.file(htmlPath));
        const htmlWithLanguage = htmlContent.replace(
            '<html lang="en">',
            `<html lang="${urlLanguage}">`
        ).replace(
            /<head>/,
            `<head><script>window.vsCodeLanguage = "${urlLanguage}";</script>`
        );

        return htmlWithLanguage;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
