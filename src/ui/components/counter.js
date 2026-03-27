/**
 * Dhikr Counter Component - Manages all tasbih, istighfar, and adhkar counters
 */
import { logger } from '../utils/Logger.js';
class CounterComponent {
    constructor() {
        // Salawat Counter properties
        this.salawatCounter = {
            currentCount: 0,
            dailyTarget: 11,
            lastResetDate: null,
            userSetTarget: false
        };

        // Tasbih Counter properties
        this.tasbihCounters = {
            subhanallah: 0,
            alhamdulillah: 0,
            laIlahaIllaAllah: 0,
            allahuAkbar: 0
        };

        // Istighfar Counter properties
        this.istighfarCounters = {
            astaghfirullah: 0,
            subhanakallahumma: 0
        };

        // Popular Adhkar Counter properties
        this.adhkarCounters = {
            auzubillahi: 0,
            rabbiGhifir: 0,
            hasbiyallah: 0,
            laHawla: 0
        };

        // Prayer Goals - Prayer completion tracking
        this.prayerGoals = {
            fajr: false,
            dhuhr: false,
            asr: false,
            maghrib: false,
            isha: false
        };

        this.loadAllCounters();
        this.setupEventListeners();
    }

    loadAllCounters() {
        this.loadSalawatCounter();
        this.loadTasbihCounters();
        this.loadIstighfarCounters();
        this.loadAdhkarCounters();
        this.loadPrayerGoals();
    }

    setupEventListeners() {
        // Salawat Counter Increment Button
        const salawatIncrementBtn = document.getElementById('salawatIncrementBtn');
        if (salawatIncrementBtn) {
            salawatIncrementBtn.addEventListener('click', () => {
                this.incrementSalawatCounter();
            });
        }

        // Tasbih Counter Increment Buttons
        document.querySelectorAll('.dhikr-increment').forEach(button => {
            button.addEventListener('click', (e) => {
                const dhikrType = e.currentTarget.dataset.dhikr;
                this.incrementTasbihCounter(dhikrType);
                // Track dhikr increment for review notifications
                this.postMessage('trackDhikrIncrement');
            });
        });

        // Istighfar Counter Increment Buttons
        document.querySelectorAll('[data-dhikr^="istighfar-"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const dhikrType = e.currentTarget.dataset.dhikr;
                this.incrementIstighfarCounter(dhikrType.replace('istighfar-', ''));
                // Track dhikr increment for review notifications
                this.postMessage('trackDhikrIncrement');
            });
        });

        // Adhkar Counter Increment Buttons
        document.querySelectorAll('[data-dhikr^="adhkar-"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const dhikrType = e.currentTarget.dataset.dhikr;
                this.incrementAdhkarCounter(dhikrType.replace('adhkar-', ''));
                // Track dhikr increment for review notifications
                this.postMessage('trackDhikrIncrement');
            });
        });
    }

    postMessage(type, data = {}) {
        vscode.postMessage({ type, ...data });
    }

    // Salawat Counter Methods
    loadSalawatCounter() {
        try {
            const saved = localStorage.getItem('salawatCounter');
            if (saved) {
                this.salawatCounter = { ...this.salawatCounter, ...JSON.parse(saved) };
            }
            this.updateSalawatCounterUI();
        } catch (error) {
            logger.warn('Failed to load salawat counter:', error);
        }
    }

    saveSalawatCounter() {
        try {
            localStorage.setItem('salawatCounter', JSON.stringify(this.salawatCounter));
        } catch (error) {
            logger.warn('Failed to save salawat counter:', error);
        }
    }

    updateSalawatCounterUI() {
        const currentEl = document.getElementById('currentSalawatCount');
        const targetEl = document.getElementById('salawatTarget');
        const statusEl = document.getElementById('salawatStatus');
        const counterEl = document.getElementById('salawatCounter');

        if (!currentEl || !targetEl || !statusEl || !counterEl) {
            return; // Elements not found
        }

        if (this.salawatCounter.currentCount >= this.salawatCounter.dailyTarget) {
            // Completed target
            counterEl.classList.add('salawat-completed');
            statusEl.textContent = window.localization.getString('salawatCompleted');
        } else {
            // In progress
            counterEl.classList.remove('salawat-completed');
            const remaining = this.salawatCounter.dailyTarget - this.salawatCounter.currentCount;
            statusEl.textContent = window.localization.getString('salawatRemaining', { remaining: remaining });
        }

        // Update display
        currentEl.textContent = this.salawatCounter.currentCount;
        targetEl.textContent = this.salawatCounter.dailyTarget;
    }

    incrementSalawatCounter() {
        // Check date reset first
        this.checkSalawatCounterReset();

        this.salawatCounter.currentCount++;
        this.saveSalawatCounter();
        this.updateSalawatCounterUI();

        // Update SpiritualTracker with total dhikr count
        this.postMessage('incrementDhikr', { count: 1 });

        logger.debug(`Salawat counter incremented: ${this.salawatCounter.currentCount}/${this.salawatCounter.dailyTarget}`);
    }

    checkSalawatCounterReset() {
        const today = new Date().toDateString();
        if (this.salawatCounter.lastResetDate !== today) {
            this.salawatCounter.currentCount = 0;
            this.salawatCounter.lastResetDate = today;

            // Check if Ramadan and update target
            const isRamadan = this.isRamadanInIslamicCalendar();
            const isFriday = new Date().getDay() === 5;

            if (isRamadan) {
                this.salawatCounter.dailyTarget = 100; // Higher target for Ramadan
            } else if (isFriday) {
                this.salawatCounter.dailyTarget = 24; // Friday target
            } else {
                this.salawatCounter.dailyTarget = 11; // Regular target
            }

            this.saveSalawatCounter();
        }
    }

    isRamadanInIslamicCalendar() {
        // Simple Ramadan detection - adjust for your location
        const now = new Date();
        const year = now.getFullYear();
        // Approximate Ramadan timing (this should be calculated properly)
        // Adjust these dates based on actual Islamic calendar
        const ramadanStart = new Date(year, 2, 1); // March 1 (approximate)
        const ramadanEnd = new Date(year, 2, 31);   // March 31 (approximate)

        if (now >= ramadanStart && now <= ramadanEnd) {
            return true;
        }

        // If not found in March, check April (Ramadan shifts annually)
        const altStart = new Date(year, 3, 1);
        const altEnd = new Date(year, 3, 30);
        return now >= altStart && now <= altEnd;
    }

    // Tasbih Counter Methods
    loadTasbihCounters() {
        try {
            const saved = localStorage.getItem('tasbihCounters');
            if (saved) {
                this.tasbihCounters = { ...this.tasbihCounters, ...JSON.parse(saved) };
            }
            this.updateTasbihCountersUI();
        } catch (error) {
            logger.warn('Failed to load tasbih counters:', error);
        }
    }

    saveTasbihCounters() {
        try {
            localStorage.setItem('tasbihCounters', JSON.stringify(this.tasbihCounters));
        } catch (error) {
            logger.warn('Failed to save tasbih counters:', error);
        }
    }

    incrementTasbihCounter(dhikrType) {
        if (!this.tasbihCounters[dhikrType]) {
            this.tasbihCounters[dhikrType] = 0;
        }

        this.tasbihCounters[dhikrType]++;
        this.saveTasbihCounters();
        this.updateTasbihCountersUI();

        // Update SpiritualTracker with total dhikr count
        this.postMessage('incrementDhikr', { count: 1 });

        logger.debug(`${dhikrType} counter incremented to: ${this.tasbihCounters[dhikrType]}`);
    }

    updateTasbihCountersUI() {
        // Update each dhikr counter display
        ['subhanallah', 'alhamdulillah', 'la-ilaha', 'allahu-akbar'].forEach(dhikrType => {
            const elementId = this.mapDhikrTypeToElementId(dhikrType);
            const countElement = elementId ? document.querySelector(`#${elementId} .dhikr-count`) : null;

            if (countElement) {
                countElement.textContent = this.tasbihCounters[dhikrType] || 0;
            }
        });
    }

    mapDhikrTypeToElementId(dhikrType) {
        const mapping = {
            'subhanallah': 'dhikr-subhanallah',
            'alhamdulillah': 'dhikr-alhamdulillah',
            'la-ilaha': 'dhikr-la-ilaha',
            'allahu-akbar': 'dhikr-allahu-akbar'
        };
        return mapping[dhikrType];
    }

    resetTasbihCounters() {
        // Send message to VS Code to show confirmation dialog
        this.postMessage('showConfirmDialog', {
            message: window.localization.getString('counterResetConfirm'),
            action: 'resetTasbihCounters'
        });
    }

    confirmResetTasbihCounters() {
        // Actually perform the reset after user confirmation
        this.tasbihCounters = {
            subhanallah: 0,
            alhamdulillah: 0,
            laIlahaIllaAllah: 0,
            allahuAkbar: 0
        };
        this.saveTasbihCounters();
        this.updateTasbihCountersUI();
        this.showNotification('Tasbih counters reset successfully', 'success');
    }

    // Istighfar Counter Methods
    loadIstighfarCounters() {
        try {
            const saved = localStorage.getItem('istighfarCounters');
            if (saved) {
                this.istighfarCounters = { ...this.istighfarCounters, ...JSON.parse(saved) };
            }
            this.updateIstighfarCountersUI();
        } catch (error) {
            logger.warn('Failed to load istighfar counters:', error);
        }
    }

    saveIstighfarCounters() {
        try {
            localStorage.setItem('istighfarCounters', JSON.stringify(this.istighfarCounters));
        } catch (error) {
            logger.warn('Failed to save istighfar counters:', error);
        }
    }

    incrementIstighfarCounter(dhikrType) {
        if (!this.istighfarCounters[dhikrType]) {
            this.istighfarCounters[dhikrType] = 0;
        }

        this.istighfarCounters[dhikrType]++;
        this.saveIstighfarCounters();
        this.updateIstighfarCountersUI();

        // Update SpiritualTracker with total dhikr count
        this.postMessage('incrementDhikr', { count: 1 });

        logger.debug(`${dhikrType} istighfar counter incremented to: ${this.istighfarCounters[dhikrType]}`);
    }

    updateIstighfarCountersUI() {
        // Update each istighfar counter display
        ['astaghfirullah', 'subhanakallahumma'].forEach(dhikrType => {
            const elementId = this.mapIstighfarTypeToElementId(dhikrType);
            const countElement = elementId ? document.querySelector(`#${elementId} .dhikr-count`) : null;

            if (countElement) {
                countElement.textContent = this.istighfarCounters[dhikrType] || 0;
            }
        });
    }

    mapIstighfarTypeToElementId(dhikrType) {
        const mapping = {
            'astaghfirullah': 'dhikr-istighfar-astaghfirullah',
            'subhanakallahumma': 'dhikr-istighfar-subhanakallahumma'
        };
        return mapping[dhikrType];
    }

    // Adhkar Counter Methods
    loadAdhkarCounters() {
        try {
            const saved = localStorage.getItem('adhkarCounters');
            if (saved) {
                this.adhkarCounters = { ...this.adhkarCounters, ...JSON.parse(saved) };
            }
            this.updateAdhkarCountersUI();
        } catch (error) {
            logger.warn('Failed to load adhkar counters:', error);
        }
    }

    saveAdhkarCounters() {
        try {
            localStorage.setItem('adhkarCounters', JSON.stringify(this.adhkarCounters));
        } catch (error) {
            logger.warn('Failed to save adhkar counters:', error);
        }
    }

    incrementAdhkarCounter(dhikrType) {
        // Convert hyphenated format (rabbi-ghifir) to camelCase (rabbiGhifir)
        const camelCaseType = dhikrType.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
        
        if (!this.adhkarCounters[camelCaseType]) {
            this.adhkarCounters[camelCaseType] = 0;
        }

        this.adhkarCounters[camelCaseType]++;
        this.saveAdhkarCounters();
        this.updateAdhkarCountersUI();

        // Update SpiritualTracker with total dhikr count
        this.postMessage('incrementDhikr', { count: 1 });

        logger.debug(`${camelCaseType} adhkar counter incremented to: ${this.adhkarCounters[camelCaseType]}`);
    }

    updateAdhkarCountersUI() {
        // Update each adhkar counter display
        ['auzubillahi', 'rabbiGhifir', 'hasbiyallah', 'laHawla'].forEach(dhikrType => {
            const elementId = this.mapAdhkarTypeToElementId(dhikrType);
            const countElement = elementId ? document.querySelector(`#${elementId} .dhikr-count`) : null;

            if (countElement) {
                countElement.textContent = this.adhkarCounters[dhikrType] || 0;
            }
        });
    }

    mapAdhkarTypeToElementId(dhikrType) {
        const mapping = {
            'auzubillahi': 'dhikr-adhkar-auzubillahi',
            'rabbiGhifir': 'dhikr-adhkar-rabbi-ghifir',
            'hasbiyallah': 'dhikr-adhkar-hasbiyallah',
            'laHawla': 'dhikr-adhkar-la-hawla'
        };
        return mapping[dhikrType];
    }

    // Prayer Goals Methods - Enhanced with Daily Reset Logic
    loadPrayerGoals() {
        try {
            // Use new key to ensure clean migration for existing users
            const savedData = JSON.parse(localStorage.getItem('prayerGoals_v2') || 'null');
            const today = new Date().toDateString(); // "Sat Jan 17 2026"

            // Smart logic: if data exists and matches today's date, load it
            if (savedData && savedData.date === today) {
                this.prayerGoals = savedData.goals;
                logger.debug("Loaded today's prayer goals ✅");
            } else {
                // If old date or no data, reset for new day
                logger.debug("New day detected! Resetting prayer goals 🔄");
                this.resetPrayerGoals();
            }

            this.updatePrayerGoalsUI();
        } catch (error) {
            logger.warn('Failed to load prayer goals:', error);
            this.resetPrayerGoals(); // Reset on error as fallback
        }
    }

    savePrayerGoals() {
        try {
            // Always save date with goals for daily reset logic
            const data = {
                date: new Date().toDateString(), // Current day's fingerprint
                goals: this.prayerGoals
            };
            localStorage.setItem('prayerGoals_v2', JSON.stringify(data));
            logger.debug('Prayer goals saved with date:', data.date);
        } catch (error) {
            logger.warn('Failed to save prayer goals:', error);
        }
    }

    resetPrayerGoals() {
        // Reset all goals to false for daily fresh start
        this.prayerGoals = {
            fajr: false,
            dhuhr: false,
            asr: false,
            maghrib: false,
            isha: false
        };
        this.savePrayerGoals(); // Save empty state immediately
        logger.debug('Prayer goals reset for new day');
    }

    updatePrayerGoal(prayer, completed) {
        this.prayerGoals[prayer] = completed;
        this.savePrayerGoals();
        this.updatePrayerGoalsUI();

        logger.debug(`${prayer} goal updated to: ${completed}`);
    }

    updatePrayerGoalsUI() {
        // Update goal display percentage
        const completedCount = Object.values(this.prayerGoals).filter(Boolean).length;
        const goalsCompletedDisplay = document.getElementById('goalsCompletedDisplay');
        if (goalsCompletedDisplay) {
            const percentage = Math.round((completedCount / 5) * 100);
            goalsCompletedDisplay.textContent = `${completedCount}/5 (${percentage}%)`;
        }

        // Update individual goal checkboxes
        Object.keys(this.prayerGoals).forEach(prayer => {
            const checkbox = document.getElementById(`${prayer}Goal`);
            if (checkbox) {
                checkbox.checked = this.prayerGoals[prayer] || false;
            }
        });
    }

    // Utility method for notifications (will be connected to main component)
    showNotification(message, type = 'info') {
        // This will delegate to the main component
        if (window.quranActivityBar && window.quranActivityBar.showNotification) {
            window.quranActivityBar.showNotification(message, type);
        }
    }
}

// Export for use in main activity bar
window.CounterComponent = CounterComponent;
