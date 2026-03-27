import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { QuranPlayer } from '../file/quranPlayer';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { logger } from '../utils/Logger';
import { IslamicCalendar } from './islamicCalendar';
import { SpiritualTracker } from '../utils/SpiritualTracker';
import { TrackerInsights } from './trackerInsights';

// ─────────────────────────────────────────────
// Helpers (module-level)
// ─────────────────────────────────────────────

/**
 * Get user location using IP geolocation (from extension host to bypass webview restrictions)
 */
async function getUserLocation(): Promise<{ lat: number; lon: number; city: string; country: string; timezone: string } | null> {
    try {
        logger.info('Extension: Fetching user location via IP geolocation...');

        // Use ip-api.com for IP-based geolocation (free, no API key needed)
        const response = await fetch('http://ip-api.com/json/');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as any;

        if (data.status === 'fail') {
            logger.warn('Extension: IP geolocation failed:', data.message);
            return null;
        }

        logger.info('Extension: Successfully got location:', {
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
        logger.error('Extension: Location fetch error:', error);
        return null;
    }
}

/**
 * Calculate prayer times using Adhan library
 */
function calculatePrayerTimes(lat: number, lon: number): { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; next: string } {
    try {
        logger.info('Extension: Calculating prayer times for coordinates', { lat, lon });

        const coordinates = new Coordinates(lat, lon);
        const date = new Date();
        const params = CalculationMethod.Egyptian();
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

        logger.info('Extension: Prayer times calculated successfully');
        return result;
    } catch (error) {
        logger.error('Extension: Error calculating prayer times:', error);
        throw error;
    }
}

/**
 * Build the full dashboard payload to send to the Webview
 */
function buildDashboardPayload(insights: TrackerInsights): object {
    return {
        ...insights.getProgressSummary(),
        allAchievements: insights.getAllAchievements(),
        weeklyStats: insights.getWeeklyStats()
    };
}

function getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// ─────────────────────────────────────────────
// ActivityBarViewProvider
// ─────────────────────────────────────────────

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
        logger.info('Activity Bar: Provider constructor called');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        logger.info('Activity Bar: Resolving webview view...');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
                vscode.Uri.joinPath(this._extensionUri, 'src', 'media')
            ],
            enableCommandUris: false,
            enableForms: false
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        logger.info('Activity Bar: Webview HTML set');

        // Send language + localization after webview initializes
        setTimeout(() => {
            const currentLanguage = vscode.workspace.getConfiguration('codeTune').get('language', 'auto');
            const localizationData = this.loadLocalizationData(currentLanguage as string);
            webviewView.webview.postMessage({ type: 'languageChanged', language: currentLanguage, localizationData });
            logger.info('Activity Bar: Sent language to webview:', currentLanguage);
        }, 1000);

        // ── Message handler ───────────────────────────────────────────────────
        webviewView.webview.onDidReceiveMessage(async (data) => {
            logger.info('Activity Bar received message:', data);
            try {
                switch (data.type) {

                    // ── Quran playback ────────────────────────────────────────
                    case 'playQuran':
                        if (!data.surah) {
                            vscode.window.showErrorMessage('No Surah selected. Please select a Surah first.');
                            return;
                        }
                        await this.quranPlayer.play(data.surah, data.mode, data.reciter);
                        const modeName = data.mode === 'ayah-by-ayah' ? 'Ayah by Ayah' : 'Full Surah';
                        this.updateStatus('statusMessage', `Playing Surah ${data.surah} (${modeName})`);
                        setTimeout(() => this.updateStatus('statusMessage', 'Choose a Surah to begin recitation'), 3000);
                        break;

                    case 'setQuranVolume':
                        this.sendMessageToWebview({ type: 'setAudioVolume', volume: data.value });
                        break;

                    case 'updateReciter':
                        this.quranPlayer.setEdition(data.reciter);
                        break;

                    case 'ayahEnded':
                        if (data.currentSurah && typeof data.currentAyah === 'number') {
                            await this.quranPlayer.playNextAyah(data.currentSurah, data.currentAyah);
                        } else {
                            logger.warn('Invalid ayahEnded data:', data);
                        }
                        break;

                    case 'surahFinished':
                        this.handleSurahFinished(data.currentSurah, data.nextSurah);
                        break;

                    // ── Audio forwarding ──────────────────────────────────────
                    case 'playAudio':
                    case 'pauseAudio':
                    case 'resumeAudio':
                    case 'stopAudio':
                    case 'setAudioVolume':
                    case 'seekAudio':
                        this.sendMessageToWebview(data);
                        break;

                    // ── Notifications ─────────────────────────────────────────
                    case 'showNotification': {
                        const notifType = data.notifType ?? data.type ?? 'info';
                        if (notifType === 'warning') {
                            vscode.window.showWarningMessage(data.message);
                        } else if (notifType === 'error') {
                            vscode.window.showErrorMessage(data.message);
                        } else {
                            vscode.window.showInformationMessage(data.message);
                        }
                        break;
                    }

                    case 'showConfirmDialog': {
                        const userChoice = await vscode.window.showInformationMessage(
                            data.message, { modal: true }, 'Yes', 'Cancel'
                        );
                        if (userChoice === 'Yes') {
                            this.sendMessageToWebview({ type: 'confirmResult', action: data.action, confirmed: true });
                        }
                        break;
                    }

                    // ── Settings ──────────────────────────────────────────────
                    case 'openSettings':
                    case 'goBackToActivityBar':
                        logger.info(`${data.type} received`);
                        break;

                    case 'saveSettings':
                        vscode.window.showInformationMessage('Settings saved successfully!');
                        break;

                    case 'executeCommand':
                        await vscode.commands.executeCommand(data.command);
                        break;

                    case 'updateLanguageSetting': {
                        const cfg = vscode.workspace.getConfiguration('codeTune');
                        await cfg.update('language', data.language, true);
                        this.notifyLanguageChange(data.language);
                        break;
                    }

                    case 'updateIslamicReminders':
                        if (this.islamicRemindersManager) {
                            this.islamicRemindersManager.updateSettings(data.settings);
                        } else {
                            logger.warn('Islamic reminders manager not available');
                        }
                        break;

                    case 'updateReviewNotifications': {
                        const rnm = (global as any).reviewNotificationManager;
                        if (rnm) { rnm.updateSettings(data.settings); }
                        else { logger.warn('Review notification manager not available'); }
                        break;
                    }

                    // ── Usage tracking ────────────────────────────────────────
                    case 'trackDhikrIncrement': {
                        const rnm = (global as any).reviewNotificationManager;
                        rnm?.updateUsageMetrics('dhikrIncremented');
                        break;
                    }

                    case 'trackSurahPlayed': {
                        const rnm = (global as any).reviewNotificationManager;
                        rnm?.updateUsageMetrics('surahPlayed');
                        break;
                    }

                    // ── Spiritual Tracker ─────────────────────────────────────

                    case 'logQuranTime': {
                        logger.info('Logging Quran time:', data.minutes);
                        const tracker = (global as any).spiritualTracker as SpiritualTracker | undefined;
                        if (tracker) {
                            await tracker.addQuranListeningTime(data.minutes);
                            this.sendDashboardData();
                        } else {
                            logger.warn('SpiritualTracker not available');
                        }
                        break;
                    }

                    case 'incrementDhikr': {
                        logger.info('Incrementing Dhikr:', data.count);
                        const tracker = (global as any).spiritualTracker as SpiritualTracker | undefined;
                        if (tracker) {
                            await tracker.incrementDhikr(data.count);
                            this.sendDashboardData();
                            // Also track for review notifications
                            const rnm = (global as any).reviewNotificationManager;
                            rnm?.updateUsageMetrics('dhikrIncremented');
                        } else {
                            logger.warn('SpiritualTracker not available');
                        }
                        break;
                    }

                    case 'requestDashboardData': {
                        logger.info('Webview requested dashboard data');
                        this.sendDashboardData();
                        break;
                    }

                    // ── Friday Surah ──────────────────────────────────────────
                    case 'fridaySurahStarted':
                        this.islamicRemindersManager?.fridayReminders?.markFridaySurahStarted();
                        break;

                    case 'fridaySurahCompleted':
                        this.islamicRemindersManager?.fridayReminders?.markFridaySurahCompleted();
                        break;

                    case 'enforceFridaySurahKahf':
                        this.sendMessageToWebview({
                            type: 'enforceFridaySurahKahf',
                            surahNumber: data.surahNumber,
                            message: data.message
                        });
                        break;

                    case 'getFridaySurahStatus': {
                        const fridayReminders = this.islamicRemindersManager?.fridayReminders;
                        if (fridayReminders) {
                            const status = fridayReminders.getFridaySurahStatus();
                            this.sendMessageToWebview({ type: 'fridaySurahStatus', ...status });
                        } else {
                            this.sendMessageToWebview({ type: 'fridaySurahStatus', status: 'not-started', message: 'Status unavailable' });
                        }
                        break;
                    }

                    // ── Location & Prayer Times ───────────────────────────────
                    case 'requestLocation':
                        getUserLocation()
                            .then(location => this.sendMessageToWebview({ type: 'receiveLocation', payload: location }))
                            .catch(() => this.sendMessageToWebview({ type: 'receiveLocation', payload: null }));
                        break;

                    case 'requestPrayerTimes':
                        try {
                            const times = calculatePrayerTimes(data.lat, data.lon);
                            this.sendMessageToWebview({ type: 'receivePrayerTimes', payload: times });
                            
                            // Update Fajr time in SpiritualTracker for tracking
                            const tracker = (global as any).spiritualTracker as SpiritualTracker | undefined;
                            if (tracker && times.fajr) {
                                tracker.updateFajrTime(new Date(times.fajr));
                            }
                        } catch {
                            this.sendMessageToWebview({ type: 'receivePrayerTimes', payload: null });
                        }
                        break;

                    case 'requestHijriDate':
                        try {
                            const hijriDate = IslamicCalendar.getHijriDateString();
                            this.sendMessageToWebview({ type: 'receiveHijriDate', payload: hijriDate });
                        } catch {
                            this.sendMessageToWebview({ type: 'receiveHijriDate', payload: 'Error loading date' });
                        }
                        break;

                    // ── Misc ──────────────────────────────────────────────────
                    case 'testActivityBar':
                        this.updateStatus('statusMessage', 'Activity Bar is working! ✅');
                        vscode.window.showInformationMessage('Activity Bar is working! ✅');
                        break;

                    case 'webviewLoaded':
                        logger.info('Webview loaded successfully');
                        break;

                    case 'autoPlayStartup':
                        this.sendMessageToWebview({ type: 'autoPlayStartup', lastPlayback: data.lastPlayback, volume: data.volume });
                        break;

                    default:
                        logger.info('Unknown message type:', data.type);
                        break;
                }
            } catch (error) {
                logger.error('Activity Bar command failed:', error);
                vscode.window.showErrorMessage(`Command failed: ${data.type} - ${error}`);
            }
        });
    }

    // ── Public methods ────────────────────────────────────────────────────────

    public refresh(): void {
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    public notifyLanguageChange(language?: string): void {
        const currentLanguage = language ?? vscode.workspace.getConfiguration('codeTune').get('language', 'auto') as string;
        const localizationData = this.loadLocalizationData(currentLanguage);
        this.sendMessageToWebview({ type: 'languageChanged', language: currentLanguage, localizationData });
    }

    public sendMessageToWebview(message: any): void {
        this._view?.webview.postMessage(message);
    }

    // ── Private methods ───────────────────────────────────────────────────────

    /**
     * Send full dashboard data to the Webview (called after any tracker mutation)
     */
    private sendDashboardData(): void {
        const insights = (global as any).trackerInsights as TrackerInsights | undefined;
        if (!insights) {
            logger.warn('TrackerInsights not available');
            return;
        }
        this.sendMessageToWebview({ type: 'dashboardData', payload: buildDashboardPayload(insights) });
    }

    private updateStatus(elementId: string, message: string): void {
        this.sendMessageToWebview({ type: 'updateStatus', elementId, message });
    }

    private async handleSurahFinished(currentSurah: any, nextSurah: any): Promise<void> {
        try {
            const message = `📖 ${currentSurah.arabicName} (${currentSurah.name}) completed. Continue reading with ${nextSurah.arabicName} (${nextSurah.name})?`;
            const choice = await vscode.window.showInformationMessage(message, { modal: false }, 'Continue Reading', 'Stop');

            if (choice === 'Continue Reading') {
                await this.startSurahTransitionCountdown(nextSurah);
            } else {
                vscode.window.showInformationMessage('Reading session completed ✅');
            }
        } catch (error) {
            logger.error('Error handling surah finished:', error);
        }
    }

    private async startSurahTransitionCountdown(nextSurah: any): Promise<void> {
        try {
            for (let i = 3; i >= 1; i--) {
                vscode.window.showInformationMessage(`Starting next Surah ${nextSurah.arabicName} in ${i}... ⏰`);
                await this.delay(1000);
            }
            this.sendMessageToWebview({ type: 'openNextSurah', surahNumber: nextSurah.number, action: 'autoTransition' });
            vscode.window.showInformationMessage(`📖 Starting ${nextSurah.arabicName} (${nextSurah.name})`);
        } catch (error) {
            logger.error('Error in surah transition countdown:', error);
        }
    }

    private loadLocalizationData(language: string): any {
        try {
            let lang = language;
            if (lang === 'auto') {
                const locale = vscode.env.language;
                lang = locale.startsWith('ar') ? 'ar' :
                    locale.startsWith('ru') ? 'ru' :
                        locale.startsWith('fr') ? 'fr' :
                            locale.startsWith('es') ? 'es' : 'en';
            }

            const fileMap: Record<string, string> = {
                en: 'ui.nls.json', ar: 'ui.nls.ar.json',
                ru: 'ui.nls.ru.json', fr: 'ui.nls.fr.json', es: 'ui.nls.es.json'
            };

            const filePath = path.join(this._extensionUri.fsPath, 'src', 'ui', fileMap[lang] ?? 'ui.nls.json');
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }

            // Fallback to English
            const fallback = path.join(this._extensionUri.fsPath, 'src', 'ui', 'ui.nls.json');
            if (fs.existsSync(fallback)) {
                return JSON.parse(fs.readFileSync(fallback, 'utf8'));
            }
        } catch (error) {
            logger.error('Error loading localization data:', error);
        }
        return { loading: 'Loading...', error: 'Error occurred while loading localization' };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        const htmlPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.html');
        const cssPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.css');
        const jsPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'activityBar.js');
        const localizationPath = path.join(this._extensionUri.fsPath, 'src', 'ui', 'localization.js');

        const toUri = (p: string) => webview.asWebviewUri(vscode.Uri.file(p)).toString();

        // Component paths
        const componentDir = path.join(this._extensionUri.fsPath, 'src', 'ui', 'components');
        const trackerDashboardPath = path.join(componentDir, 'trackerDashboard.js');
        const errorRecoveryPath = path.join(componentDir, 'errorRecovery.js');
        const trackerDashboardCssPath = path.join(componentDir, 'trackerDashboard.css');

        let html = fs.readFileSync(htmlPath, 'utf8');

        html = html
            .replace('{{cssUri}}', toUri(cssPath))
            .replace('{{jsUri}}', toUri(jsPath))
            .replace('{{localizationUri}}', toUri(localizationPath))
            .replace('./components/counter.js', toUri(path.join(componentDir, 'counter.js')))
            .replace('./components/audioPlayer.js', toUri(path.join(componentDir, 'audioPlayer.js')))
            .replace('./components/prayerTracker.js', toUri(path.join(componentDir, 'prayerTracker.js')))
            .replace('./components/settings.js', toUri(path.join(componentDir, 'settings.js')))
            .replace('./components/trackerDashboard.js', toUri(trackerDashboardPath))
            .replace('./components/errorRecovery.js', toUri(errorRecoveryPath))
            .replace('{{trackerDashboardCssUri}}', toUri(trackerDashboardCssPath))
            .replace(/{{nonce}}/g, nonce)
            .replace('{{settingsCssUri}}', '')
            .replace('{{settingsJsUri}}', '');

        // Resolve language
        const currentLanguage = vscode.workspace.getConfiguration('codeTune').get('language', 'auto') as string;
        const urlLanguage = currentLanguage === 'auto'
            ? (vscode.env.language.startsWith('ar') ? 'ar' : 'en')
            : currentLanguage;

        // Inject new_features.txt URI for webview access
        const newFeaturesUri = toUri(path.join(this._extensionUri.fsPath, 'new_features.txt'));

        return html
            .replace('<html lang="en">', `<html lang="${urlLanguage}">`)
            .replace(/<head>/, `<head><script>window.vsCodeLanguage = "${urlLanguage}";window.newFeaturesUri = "${newFeaturesUri}";</script>`);
    }
}