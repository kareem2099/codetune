/**
 * Prayer Tracker Component - Manages Islamic prayer times, goals, and notifications
 */
import { logger } from '../utils/Logger.js';

class PrayerTrackerComponent {
    constructor(vscodeInstance = null) {
        // Use provided vscode instance or try to acquire it (for backward compatibility)
        this.vscode = vscodeInstance || (window.acquireVsCodeApi ? window.acquireVsCodeApi() : null);
        // Default prayer times as fallback (adjust for your location)
        this.prayerTimes = {
            fajr: { hour: 4, minute: 45, key: 'prayerFajr' },      // Fajr: ~4:45 AM
            dhuhr: { hour: 12, minute: 15, key: 'prayerDhuhr' },    // Dhuhr: ~12:15 PM
            asr: { hour: 15, minute: 45, key: 'prayerAsr' },      // Asr: ~3:45 PM
            maghrib: { hour: 18, minute: 15, key: 'prayerMaghrib' },  // Maghrib: ~6:15 PM
            isha: { hour: 19, minute: 45, key: 'prayerIsha' }      // Isha: ~7:45 PM
        };

        this.nextPrayerTime = null;
        this.hijriDate = null;
        this.apiPrayerTimes = null; // Store fetched prayer times
        this.serverUrl = 'http://localhost:3000'; // Local server URL

        // Location detection properties
        this.userLocation = null; // {lat, lon, timezone}
        this.locationDetectionAttempted = false;

        this.setupEventListeners();
        this.startPrayerTicker();
        this.detectUserLocation(); // Detect location first
        this.fetchPrayerTimes(); // Fetch real prayer times on initialization
        this.requestHijriDate(); // Fetch Hijri date on initialization

        // Make component globally accessible for modal callbacks
        window.prayerTrackerComponent = this;
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

        // Set up message listener for location data from extension host
        this.setupMessageListener();
    }

    setupMessageListener() {
        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.type) {
                case 'receiveLocation':
                    const location = message.payload;
                    if (location) {
                        logger.info('Received location from extension host:', location);

                        // Update location properties
                        this.userLocation = {
                            lat: location.lat,
                            lon: location.lon,
                            timezone: location.timezone,
                            cityName: location.city
                        };

                        // Save the location
                        this.saveLocation(this.userLocation);
                        this.updateLocationDisplay();

                        // Fetch prayer times with the new location
                        this.fetchPrayerTimes();

                        this.showNotification(`Location detected: ${location.city}, ${location.country}`, 'success');
                    } else {
                        logger.warn('Location detection failed, using fallback');
                        this.showNotification('Could not detect location automatically. Using Cairo as default.', 'warning');
                        this.useFallbackLocation();
                    }
                    break;
                case 'receivePrayerTimes':
                    const times = message.payload;
                    if (times) {
                        logger.info('Received prayer times from extension host:', times);

                        // Store the calculated prayer times
                        this.apiPrayerTimes = {
                            fajr: new Date(times.fajr),
                            dhuhr: new Date(times.dhuhr),
                            asr: new Date(times.asr),
                            maghrib: new Date(times.maghrib),
                            isha: new Date(times.isha)
                        };

                        logger.info('Successfully updated prayer times from extension calculation');
                        // Update the display immediately
                        this.updateNextPrayer();
                        this.showNotification('Prayer times updated', 'success');
                    } else {
                        logger.warn('Prayer times calculation failed');
                        this.showNotification('Failed to calculate prayer times', 'error');
                        // Keep using hardcoded times as fallback
                        this.apiPrayerTimes = null;
                    }
                    break;
                case 'receiveHijriDate':
                    const hijriDate = message.payload;
                    if (hijriDate) {
                        logger.info('Received Hijri date from extension host:', hijriDate);
                        this.hijriDate = hijriDate;

                        // Update the display
                        const hijriElement = document.getElementById('hijriDate');
                        if (hijriElement) {
                            hijriElement.textContent = this.hijriDate;
                            logger.info('Updated Hijri date display:', this.hijriDate);
                        } else {
                            logger.warn('Hijri date element not found');
                        }
                    } else {
                        logger.warn('Hijri date calculation failed');
                        const hijriElement = document.getElementById('hijriDate');
                        if (hijriElement) {
                            hijriElement.textContent = 'Error loading date';
                        }
                    }
                    break;
            }
        });
    }

    useFallbackLocation() {
        // Fallback to Cairo when location detection fails
        this.userLocation = {
            lat: 30.0444,
            lon: 31.2357,
            timezone: 'Africa/Cairo'
        };
        this.updateLocationDisplay();
        this.fetchPrayerTimes();
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

        // Fetch fresh prayer times every hour
        setInterval(() => {
            this.fetchPrayerTimes();
        }, 3600000); // Update every hour

        // Initial updates
        this.updateIslamicInfo();
    }

    async detectUserLocation() {
        if (this.locationDetectionAttempted) {
            return; // Already attempted
        }

        this.locationDetectionAttempted = true;

        try {
            // First try to get from localStorage
            const savedLocation = this.getSavedLocation();
            if (savedLocation) {
                this.userLocation = savedLocation;
                logger.info('Using saved location:', this.userLocation);
                this.updateLocationDisplay();
                return;
            }

            // If no saved location, request location from extension host via IP geolocation
            logger.info('Requesting location from extension host via IP geolocation...');

            // Send message to extension host to get location
            if (this.vscode) {
                this.vscode.postMessage({
                    type: 'requestLocation'
                });
            } else {
                throw new Error('VS Code API not available');
            }

        } catch (error) {
            logger.warn('❌ Location detection failed:', error);
            this.showNotification('Location detection failed. Using Cairo as default. You can manually set your location.', 'info');

            // Fall back to Cairo as default
            this.useFallbackLocation();
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            });
        });
    }

    getSavedLocation() {
        try {
            const saved = localStorage.getItem('prayerLocation');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            logger.warn('Failed to load saved location:', error);
            return null;
        }
    }

    saveLocation(location) {
        try {
            localStorage.setItem('prayerLocation', JSON.stringify(location));
        } catch (error) {
            logger.warn('Failed to save location:', error);
        }
    }

    setUserLocation(lat, lon, timezone, cityName = null) {
        this.userLocation = { lat, lon, timezone, cityName };
        this.saveLocation(this.userLocation);
        logger.info('Location updated:', this.userLocation);
        // Refetch prayer times with new location
        this.fetchPrayerTimes();
    }

    fetchPrayerTimes() {
        // Use detected location or fallback to Cairo
        const location = this.userLocation || {
            lat: 30.0444,
            lon: 31.2357
        };

        logger.info('Requesting prayer times calculation from extension host for location:', location);

        // Send message to extension host to calculate prayer times
        if (this.vscode) {
            this.vscode.postMessage({
                type: 'requestPrayerTimes',
                lat: location.lat,
                lon: location.lon
            });
        } else {
            logger.error('VS Code API not available for prayer times request');
        }
    }

    requestHijriDate() {
        logger.info('Requesting Hijri date calculation from extension host');

        // Send message to extension host to calculate Hijri date
        if (this.vscode) {
            this.vscode.postMessage({
                type: 'requestHijriDate'
            });
        } else {
            logger.error('VS Code API not available for Hijri date request');
        }
    }

    updateIslamicInfo() {
        try {
            // Request fresh Hijri date from extension host
            this.requestHijriDate();

            // Update next prayer info
            this.updateNextPrayer();
        } catch (error) {
            logger.warn('Failed to update Islamic information:', error);
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

        // Use API prayer times if available, otherwise fall back to hardcoded times
        let prayerData;
        if (this.apiPrayerTimes) {
            // Use API data
            prayerData = [
                { name: 'Fajr', time: this.apiPrayerTimes.fajr, key: 'fajr' },
                { name: 'Dhuhr', time: this.apiPrayerTimes.dhuhr, key: 'dhuhr' },
                { name: 'Asr', time: this.apiPrayerTimes.asr, key: 'asr' },
                { name: 'Maghrib', time: this.apiPrayerTimes.maghrib, key: 'maghrib' },
                { name: 'Isha', time: this.apiPrayerTimes.isha, key: 'isha' }
            ];
        } else {
            // Fall back to hardcoded times
            prayerData = Object.entries(this.prayerTimes).map(([key, data]) => ({
                name: window.localization ? window.localization.getString(data.key) : key,
                time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), data.hour, data.minute, 0, 0),
                key: key
            }));
        }

        // Find next prayer
        let nextPrayer = null;
        this.nextPrayerTime = null;

        for (const prayer of prayerData) {
            if (prayer.time > now) {
                nextPrayer = prayer.name;
                this.nextPrayerTime = prayer.time;
                break;
            }
        }

        // If all prayers have passed today, next prayer is tomorrow's Fajr
        if (!nextPrayer) {
            if (this.apiPrayerTimes) {
                // Tomorrow's Fajr from API
                nextPrayer = 'Fajr';
                this.nextPrayerTime = new Date(this.apiPrayerTimes.fajr);
                this.nextPrayerTime.setDate(this.nextPrayerTime.getDate() + 1);
            } else {
                // Tomorrow's Fajr from hardcoded times
                nextPrayer = window.localization ? window.localization.getString(this.prayerTimes.fajr.key) : 'Fajr';
                this.nextPrayerTime = new Date(now);
                this.nextPrayerTime.setDate(this.nextPrayerTime.getDate() + 1);
                this.nextPrayerTime.setHours(this.prayerTimes.fajr.hour, this.prayerTimes.fajr.minute, 0, 0);
            }
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
            logger.warn('No pending prayer confirmation');
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
            logger.warn('Counter component not available for prayer goal update');
        }
    }

    updateLocationDisplay() {
        const locationElement = document.getElementById('userLocation');
        if (!locationElement) {
            logger.warn('Location element not found');
            return;
        }

        if (!this.userLocation) {
            locationElement.textContent = 'Detecting...';
            return;
        }

        // Format location for display
        let locationText = '';

        // First priority: Use stored city name if available (from manual selection)
        if (this.userLocation.cityName) {
            locationText = this.userLocation.cityName;
        }
        // Second priority: Extract city name from timezone
        else if (this.userLocation.timezone) {
            const timezoneParts = this.userLocation.timezone.split('/');
            if (timezoneParts.length > 1) {
                const city = timezoneParts[1].replace(/_/g, ' ');
                locationText = city;
            } else {
                locationText = this.userLocation.timezone;
            }
        }

        // If we can't determine city, show coordinates
        if (!locationText && this.userLocation.lat && this.userLocation.lon) {
            locationText = `${this.userLocation.lat.toFixed(2)}°, ${this.userLocation.lon.toFixed(2)}°`;
        }

        // Fallback
        if (!locationText) {
            locationText = 'Unknown';
        }

        locationElement.textContent = locationText;
        locationElement.style.cursor = 'pointer';
        locationElement.title = 'Click to manually set location';

        // Make location clickable to manually set
        locationElement.onclick = () => this.showLocationSelector();

        logger.info('Updated location display:', locationText);
    }

    showLocationSelector() {
        // Create an enhanced location selector modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-overlay" style="background: rgba(0,0,0,0.5);"></div>
            <div class="modal-content" style="max-width: 500px; margin: auto; margin-top: 50px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3>🌍 Select Your Location</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px; color: #666;">Choose your location for accurate Islamic prayer times worldwide</p>

                    <!-- Search Section -->
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">🔍 Search for any city worldwide:</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="citySearch" placeholder="Enter city name (e.g., London, Tokyo, Sydney)"
                                   style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px;">
                            <button id="searchBtn" style="padding: 10px 15px; background: #007acc; color: white; border: none; border-radius: 5px; cursor: pointer;">Search</button>
                        </div>
                        <div id="searchResults" style="margin-top: 10px; max-height: 200px; overflow-y: auto;"></div>
                    </div>

                    <!-- Manual Coordinates -->
                    <div style="margin-bottom: 25px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">📍 Or enter coordinates manually:</label>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <input type="number" id="manualLat" step="0.0001" placeholder="Latitude (e.g., 27.1783)"
                                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div>
                                <input type="number" id="manualLon" step="0.0001" placeholder="Longitude (e.g., 31.1859)"
                                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>
                        <button id="manualBtn" style="margin-top: 10px; padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Use Coordinates</button>
                    </div>

                    <!-- Popular Cities -->
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">⭐ Popular Islamic Cities:</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px;">
                            <button class="btn-primary location-preset" data-city="Asyut,Egypt">Asyut, Egypt</button>
                            <button class="btn-primary location-preset" data-city="Cairo,Egypt">Cairo, Egypt</button>
                            <button class="btn-primary location-preset" data-city="Alexandria,Egypt">Alexandria, Egypt</button>
                            <button class="btn-primary location-preset" data-city="Makkah,Saudi Arabia">Makkah, KSA</button>
                            <button class="btn-primary location-preset" data-city="Madinah,Saudi Arabia">Madinah, KSA</button>
                            <button class="btn-primary location-preset" data-city="Istanbul,Turkey">Istanbul, Turkey</button>
                            <button class="btn-primary location-preset" data-city="Dubai,UAE">Dubai, UAE</button>
                            <button class="btn-primary location-preset" data-city="London,UK">London, UK</button>
                        </div>
                    </div>

                    <!-- Current Location Info -->
                    <div style="padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
                        <strong>💡 Tip:</strong> Your location is automatically detected. You can also manually select your city above for accurate prayer times.
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal when clicking overlay
        modal.querySelector('.modal-overlay').onclick = () => modal.remove();

        // Setup event listeners
        this.setupLocationModalEvents(modal);
    }

    setupLocationModalEvents(modal) {
        const searchBtn = modal.querySelector('#searchBtn');
        const manualBtn = modal.querySelector('#manualBtn');
        const citySearch = modal.querySelector('#citySearch');
        const searchResults = modal.querySelector('#searchResults');

        // Search functionality
        const performSearch = async () => {
            const query = citySearch.value.trim();
            if (!query) {return;}

            searchResults.innerHTML = '<div style="text-align: center; padding: 20px;">🔍 Searching...</div>';

            try {
                // Use Nominatim API for geocoding (OpenStreetMap)
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
                const data = await response.json();

                if (data.length === 0) {
                    searchResults.innerHTML = '<div style="color: #dc3545; padding: 10px;">No results found. Try a different city name.</div>';
                    return;
                }

                searchResults.innerHTML = data.map(location => `
                    <button class="search-result" data-lat="${location.lat}" data-lon="${location.lon}"
                            data-name="${location.display_name.split(',')[0]}"
                            style="display: block; width: 100%; padding: 10px; margin: 5px 0; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; cursor: pointer; text-align: left;">
                        📍 ${location.display_name.split(',')[0]}, ${location.address?.country || ''}
                        <br><small style="color: #666;">${location.lat}, ${location.lon}</small>
                    </button>
                `).join('');

                // Add click handlers for search results
                searchResults.querySelectorAll('.search-result').forEach(btn => {
                    btn.onclick = () => {
                        const lat = parseFloat(btn.dataset.lat);
                        const lon = parseFloat(btn.dataset.lon);
                        const name = btn.dataset.name;
                        this.setCustomLocation(lat, lon, name);
                        modal.remove();
                    };
                });

            } catch (error) {
                searchResults.innerHTML = '<div style="color: #dc3545; padding: 10px;">Search failed. Please try again.</div>';
                logger.error('Geocoding error:', error);
            }
        };

        searchBtn.onclick = performSearch;
        citySearch.onkeypress = (e) => {
            if (e.key === 'Enter') {performSearch();}
        };

        // Manual coordinates
        manualBtn.onclick = () => {
            const lat = parseFloat(modal.querySelector('#manualLat').value);
            const lon = parseFloat(modal.querySelector('#manualLon').value);

            if (isNaN(lat) || isNaN(lon)) {
                alert('Please enter valid coordinates');
                return;
            }

            this.setCustomLocation(lat, lon, `Custom (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
            modal.remove();
        };

        // Preset cities
        modal.querySelectorAll('.location-preset').forEach(btn => {
            btn.onclick = () => {
                const cityData = btn.dataset.city.split(',');
                this.searchAndSetCity(cityData[0], cityData[1]);
                modal.remove();
            };
        });
    }

    setLocationPreset(city) {
        const locations = {
            'Asyut': { lat: 27.1783, lon: 31.1859, timezone: 'Africa/Cairo' },
            'Cairo': { lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo' },
            'Alexandria': { lat: 31.2001, lon: 29.9187, timezone: 'Africa/Cairo' },
            'Makkah': { lat: 21.3891, lon: 39.8579, timezone: 'Asia/Riyadh' },
            'Madinah': { lat: 24.5247, lon: 39.5692, timezone: 'Asia/Riyadh' }
        };

        if (locations[city]) {
            this.setUserLocation(locations[city].lat, locations[city].lon, locations[city].timezone);
            this.updateLocationDisplay();
            this.showNotification(`Location set to ${city}`, 'success');

            // Close modal
            const modal = document.querySelector('.modal');
            if (modal) {modal.remove();}
        }
    }

    setCustomLocation(lat, lon, name) {
        // Determine timezone based on coordinates (simplified approach)
        let timezone = 'UTC'; // Default fallback

        // Rough timezone determination based on longitude
        if (lon >= -30 && lon <= 60) { // Africa/Europe/Middle East
            if (lat >= 30) { // Northern
                timezone = lon < 30 ? 'Europe/London' : 'Asia/Riyadh';
            } else { // Southern
                timezone = 'Africa/Cairo';
            }
        } else if (lon >= 60 && lon <= 150) { // Asia
            timezone = 'Asia/Shanghai';
        } else if (lon >= -150 && lon <= -30) { // Americas
            timezone = lon < -100 ? 'America/Los_Angeles' : 'America/New_York';
        }

        this.setUserLocation(lat, lon, timezone, name); // Pass city name
        this.updateLocationDisplay();
        this.showNotification(`Location set to ${name}`, 'success');
    }

    async searchAndSetCity(city, country) {
        try {
            const query = `${city}, ${country}`;
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
            const data = await response.json();

            if (data.length > 0) {
                const location = data[0];
                this.setCustomLocation(parseFloat(location.lat), parseFloat(location.lon), city); // Pass city name
            } else {
                this.showNotification(`Could not find ${city}, ${country}. Please try searching manually.`, 'warning');
            }
        } catch (error) {
            logger.error('City search error:', error);
            this.showNotification('Search failed. Please try again.', 'error');
        }
    }

    tryDetectLocationAgain() {
        // Reset detection flag to try again
        this.locationDetectionAttempted = false;
        this.detectUserLocation();

        // Close modal
        const modal = document.querySelector('.modal');
        if (modal) {modal.remove();}
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
