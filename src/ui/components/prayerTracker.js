/**
 * Prayer Tracker Component - Manages Islamic prayer times, goals, and notifications
 */
class PrayerTrackerComponent {
    constructor() {
        // Islamic prayer times approximation (adjust for your location)
        this.prayerTimes = {
            fajr: { hour: 4, minute: 45, key: 'prayerFajr' },      // Fajr: ~4:45 AM
            dhuhr: { hour: 12, minute: 15, key: 'prayerDhuhr' },    // Dhuhr: ~12:15 PM
            asr: { hour: 15, minute: 45, key: 'prayerAsr' },      // Asr: ~3:45 PM
            maghrib: { hour: 18, minute: 15, key: 'prayerMaghrib' },  // Maghrib: ~6:15 PM
            isha: { hour: 19, minute: 45, key: 'prayerIsha' }      // Isha: ~7:45 PM
        };

        this.nextPrayerTime = null;
        this.hijriDate = null;

        this.setupEventListeners();
        this.startPrayerTicker();
    }

    setupEventListeners() {
        // Prayer goal checkboxes
        Object.keys(this.prayerTimes).forEach(prayer => {
            const checkbox = document.getElementById(`${prayer}Goal`);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.updatePrayerGoal(prayer, e.target.checked);
                });
            }
        });

        // Prayer Confirmation Modal
        const prayerYesBtn = document.getElementById('prayerYesBtn');
        const prayerNoBtn = document.getElementById('prayerNoBtn');

        if (prayerYesBtn) {
            prayerYesBtn.addEventListener('click', () => {
                this.confirmPrayerCompleted();
            });
        }

        if (prayerNoBtn) {
            prayerNoBtn.addEventListener('click', () => {
                this.dismissPrayerConfirmation();
            });
        }
    }

    startPrayerTicker() {
        // Update Islamic information every minute
        setInterval(() => {
            this.updateIslamicInfo();
        }, 60000); // Update every minute

        // Update prayer countdown every second
        setInterval(() => {
            this.updatePrayerCountdown();
        }, 1000); // Update every second

        // Initial update
        this.updateIslamicInfo();
    }

    updateIslamicInfo() {
        try {
            // Update Hijri date
            this.hijriDate = this.getHijriDate();
            const hijriElement = document.getElementById('hijriDate');
            if (hijriElement) {
                hijriElement.textContent = this.hijriDate;
                console.log('Updated Hijri date:', this.hijriDate);
            } else {
                console.warn('Hijri date element not found');
            }

            // Update next prayer info
            this.updateNextPrayer();
        } catch (error) {
            console.warn('Failed to update Islamic information:', error);
            this.setErrorState();
        }
    }

    getHijriDate() {
        // Simplified Hijri calculation (for webview compatibility)
        const now = new Date();

        // Approximate conversion (Hijri calendar is lunar)
        const gregorianYear = now.getFullYear();
        const gregorianMonth = now.getMonth() + 1;
        const gregorianDay = now.getDate();

        // Approximate conversion
        const hijriEpoch = 1948440; // Approximate Julian day
        const gregorianEpoch = new Date(622, 6, 16);

        const daysSinceEpoch = Math.floor((now.getTime() - gregorianEpoch.getTime()) / (1000 * 60 * 60 * 24));
        const hijriYear = Math.floor(daysSinceEpoch / 354.367) + 1;
        const yearStart = Math.floor((hijriYear - 1) * 354.367);
        const daysInYear = daysSinceEpoch - yearStart;

        const hijriMonths = [
            'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
            'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
            'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
        ];

        let month = 1;
        let day = daysInYear + 1;
        const monthLengths = [30, 29, 30, 29, 30, 29, 30, 29, 30, 29, 30, 29];

        for (let i = 0; i < monthLengths.length; i++) {
            if (day <= monthLengths[i]) {
                month = i + 1;
                break;
            }
            day -= monthLengths[i];
        }

        return `${day} ${hijriMonths[month - 1]} ${hijriYear} AH`;
    }

    updateNextPrayer() {
        const now = new Date();

        // Get localized prayer names
        const prayers = Object.entries(this.prayerTimes).map(([key, data]) => ({
            name: window.localization ? window.localization.getString(data.key) : key,
            time: data,
            key: key
        }));

        // Find next prayer
        let nextPrayer = null;
        this.nextPrayerTime = null;

        for (const prayer of prayers) {
            const prayerTime = new Date();
            prayerTime.setHours(prayer.time.hour, prayer.time.minute, 0, 0);

            if (prayerTime > now) {
                nextPrayer = prayer.name;
                this.nextPrayerTime = prayerTime;
                break;
            }
        }

        // If all prayers have passed today, next prayer is tomorrow's Fajr
        if (!nextPrayer) {
            nextPrayer = window.localization ? window.localization.getString(this.prayerTimes.fajr.key) : 'Fajr';
            this.nextPrayerTime = new Date(now);
            this.nextPrayerTime.setDate(this.nextPrayerTime.getDate() + 1);
            this.nextPrayerTime.setHours(this.prayerTimes.fajr.hour, this.prayerTimes.fajr.minute, 0, 0);
        }

        const prayerElement = document.getElementById('nextPrayer');
        if (prayerElement) {
            prayerElement.textContent = nextPrayer;
        }

        this.updatePrayerCountdown();
    }

    updatePrayerCountdown() {
        if (!this.nextPrayerTime) {return;}

        const now = new Date();
        const timeDiff = this.nextPrayerTime.getTime() - now.getTime();

        if (timeDiff <= 0) {
            // Prayer time has arrived!
            this.showPrayerNotification();
            // Update to next prayer
            this.updateNextPrayer();
            return;
        }

        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        const countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const countdownElement = document.getElementById('prayerCountdown');
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
    }

    // Prayer Notification and Modal Methods
    showPrayerNotification() {
        const nextPrayerElement = document.getElementById('nextPrayer');
        const currentPrayer = nextPrayerElement ? nextPrayerElement.textContent : '';

        // Show the prayer confirmation modal
        this.showPrayerConfirmModal(currentPrayer);
    }

    showPrayerConfirmModal(prayerName) {
        const modal = document.getElementById('prayerConfirmModal');
        const questionText = document.getElementById('prayerQuestionText');
        const timeNote = document.getElementById('prayerTimeNote');

        // Map prayer names for localization
        const prayerKeyMap = {
            'Fajr': 'prayerFajr',
            'الفجر': 'prayerFajr',
            'Dhuhr': 'prayerDhuhr',
            'الظهر': 'prayerDhuhr',
            'Asr': 'prayerAsr',
            'العصر': 'prayerAsr',
            'Maghrib': 'prayerMaghrib',
            'المغرب': 'prayerMaghrib',
            'Isha': 'prayerIsha',
            'العشاء': 'prayerIsha'
        };

        const localizedPrayerName = prayerKeyMap[prayerName] ? window.localization.getString(prayerKeyMap[prayerName]) : prayerName;

        if (questionText) {
            questionText.textContent = window.localization.getString('prayerCompletedQuestion', { prayerName: localizedPrayerName });
        }
        if (timeNote) {
            timeNote.textContent = window.localization.getString('prayerTimeNotification', { prayerName: localizedPrayerName });
        }

        // Store current prayer info for confirmation
        this.pendingPrayerConfirmation = prayerName;

        if (modal) {
            modal.style.display = 'flex';
            modal.style.animation = 'fadeIn 0.3s ease-out';
        }

        // Localize the buttons
        if (window.localization) {
            window.localization.localizeElements();
        }
    }

    confirmPrayerCompleted() {
        if (!this.pendingPrayerConfirmation) {
            console.warn('No pending prayer confirmation');
            return;
        }

        const prayerName = this.pendingPrayerConfirmation;

        // Map English prayer names to goal keys
        const prayerGoalMap = {
            'Fajr': 'fajr',
            'الفجر': 'fajr',
            'Dhuhr': 'dhuhr',
            'الظهر': 'dhuhr',
            'Asr': 'asr',
            'العصر': 'asr',
            'Maghrib': 'maghrib',
            'المغرب': 'maghrib',
            'Isha': 'isha',
            'العشاء': 'isha'
        };

        const goalKey = prayerGoalMap[prayerName];
        if (goalKey) {
            // Mark this prayer as completed in goals
            this.updatePrayerGoal(goalKey, true);

            // Show success message
            const localizedPrayerName = prayerGoalMap[prayerName] ? window.localization.getString(`prayer${prayerName.charAt(0).toUpperCase() + prayerName.slice(1).toLowerCase()}`) : prayerName;
            this.showNotification(window.localization.getString('prayerMarkedCompleted', { prayerName: localizedPrayerName }), 'success');
        }

        // Close the modal
        this.closePrayerConfirmModal();
    }

    dismissPrayerConfirmation() {
        // User dismissed the prayer check, just close modal
        this.closePrayerConfirmModal();
        this.showNotification('Prayer check dismissed', 'info');
    }

    closePrayerConfirmModal() {
        const modal = document.getElementById('prayerConfirmModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        this.pendingPrayerConfirmation = null;
    }

    updatePrayerGoal(prayer, completed) {
        // This will delegate to the counter component to handle goal updates
        if (window.counterComponent && window.counterComponent.updatePrayerGoal) {
            window.counterComponent.updatePrayerGoal(prayer, completed);
        } else {
            console.warn('Counter component not available for prayer goal update');
        }
    }

    setErrorState() {
        const hijriElement = document.getElementById('hijriDate');
        const prayerElement = document.getElementById('nextPrayer');
        const countdownElement = document.getElementById('prayerCountdown');

        if (hijriElement) {
            hijriElement.textContent = 'Error loading date';
        }
        if (prayerElement) {
            prayerElement.textContent = 'Error';
        }
        if (countdownElement) {
            countdownElement.textContent = 'Error';
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        // This will delegate to the main component
        if (window.quranActivityBar && window.quranActivityBar.showNotification) {
            window.quranActivityBar.showNotification(message, type);
        }
    }
}

// Export for use in main activity bar
window.PrayerTrackerComponent = PrayerTrackerComponent;
