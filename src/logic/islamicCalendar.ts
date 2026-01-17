import { Logger } from "../utils/Logger";

export class IslamicCalendar {
    private static readonly HIJRI_MONTHS = [
        'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
        'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
        'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
    ];

    private static readonly PRAYER_NAMES = [
        'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'
    ];

    /**
     * Convert Gregorian date to Hijri date using Intl API (Umm al-Qura)
     * This fixes the 2-day offset issue by using the standard algorithmic calendar.
     */
    static gregorianToHijri(gregorianDate: Date, adjustment: number = 0): { day: number; month: number; year: number; monthName: string } {
        // Create a copy of the date for manual adjustment if needed
        const date = new Date(gregorianDate);
        date.setDate(date.getDate() + adjustment);

        // Use the built-in International API with Umm al-Qura calendar
        // 'en-US-u-ca-islamic-umalqura' forces the Umm al-Qura calendar
        const formatter = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        });

        const parts = formatter.formatToParts(date);

        let day = 0;
        let month = 0;
        let year = 0;

        // Extract date parts from the formatted result
        parts.forEach(part => {
            if (part.type === 'day') {day = parseInt(part.value, 10);}
            if (part.type === 'month') {month = parseInt(part.value, 10);}
            if (part.type === 'year') {year = parseInt(part.value.replace(/\D/g, ''), 10);} // Remove 'AH' if present
        });

        // Debug logging
        Logger.instance.info('Hijri conversion debug:', {
            inputDate: gregorianDate.toISOString(),
            adjustedDate: date.toISOString(),
            parts: parts,
            parsed: { day, month, year }
        });

        // Ensure month is within valid bounds for array lookup
        const monthIndex = Math.max(0, Math.min(month - 1, 11));
        const monthName = this.HIJRI_MONTHS[monthIndex];

        Logger.instance.info('Final result:', { day, month, year, monthName, monthIndex });

        return {
            day: day,
            month: month,
            year: year,
            monthName: monthName
        };
    }

    /**
     * Get formatted Hijri date string
     */
    static getHijriDateString(date: Date = new Date()): string {
        const hijri = this.gregorianToHijri(date);
        return `${hijri.day} ${hijri.monthName} ${hijri.year} AH`;
    }

    /**
     * Calculate prayer times for a given location
     * This is a simplified calculation - for accurate times, use a proper prayer time library
     */
    static calculatePrayerTimes(latitude: number = 21.3891, longitude: number = 39.8579, date: Date = new Date()): PrayerTimes {
        // Default to Mecca coordinates if not specified
        const dayOfYear = this.getDayOfYear(date);
        const declination = this.calculateSolarDeclination(dayOfYear);

        // Simplified prayer time calculations
        const fajr = this.calculateFajrTime(latitude, longitude, declination, dayOfYear);
        const dhuhr = this.calculateDhuhrTime(longitude);
        const asr = this.calculateAsrTime(latitude, declination, dhuhr);
        const maghrib = this.calculateMaghribTime(latitude, declination, dhuhr);
        const isha = this.calculateIshaTime(latitude, declination, dhuhr);

        return {
            fajr,
            dhuhr,
            asr,
            maghrib,
            isha
        };
    }

    /**
     * Get the next prayer time and name
     */
    static getNextPrayer(prayerTimes: PrayerTimes, currentTime: Date = new Date()): { name: string; time: Date; countdown: string } {
        const now = currentTime.getTime();
        const prayers = [
            { name: 'Fajr', time: prayerTimes.fajr },
            { name: 'Dhuhr', time: prayerTimes.dhuhr },
            { name: 'Asr', time: prayerTimes.asr },
            { name: 'Maghrib', time: prayerTimes.maghrib },
            { name: 'Isha', time: prayerTimes.isha }
        ];

        // Find next prayer
        for (const prayer of prayers) {
            if (prayer.time.getTime() > now) {
                const timeDiff = prayer.time.getTime() - now;
                const countdown = this.formatCountdown(timeDiff);
                return {
                    name: prayer.name,
                    time: prayer.time,
                    countdown
                };
            }
        }

        // If all prayers have passed today, return tomorrow's Fajr
        const tomorrow = new Date(currentTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowPrayers = this.calculatePrayerTimes(21.3891, 39.8579, tomorrow);

        const timeDiff = tomorrowPrayers.fajr.getTime() - now;
        const countdown = this.formatCountdown(timeDiff);

        return {
            name: 'Fajr',
            time: tomorrowPrayers.fajr,
            countdown
        };
    }

    /**
     * Check if current date is within Ramadan
     */
    static isRamadan(date: Date = new Date()): boolean {
        const hijri = this.gregorianToHijri(date);
        return hijri.month === 9; // Ramadan is the 9th month in Hijri calendar
    }

    /**
     * Format countdown time as HH:MM:SS
     */
    private static formatCountdown(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get day of year (1-365)
     */
    private static getDayOfYear(date: Date): number {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    /**
     * Calculate solar declination
     */
    private static calculateSolarDeclination(dayOfYear: number): number {
        return 23.45 * Math.sin(this.degreesToRadians(360 * (284 + dayOfYear) / 365));
    }

    /**
     * Calculate Fajr time
     */
    private static calculateFajrTime(latitude: number, longitude: number, declination: number, dayOfYear: number): Date {
        // Simplified Fajr calculation (18 degrees before sunrise)
        const fajrAngle = -18;
        const hourAngle = this.calculateHourAngle(latitude, declination, fajrAngle);
        const timeOffset = hourAngle * 4; // 15 degrees per hour

        const baseTime = new Date();
        baseTime.setHours(12, 0, 0, 0); // Solar noon

        // Adjust for longitude and equation of time (simplified)
        const longitudeAdjustment = (longitude / 15) * 60; // minutes
        const totalMinutes = timeOffset + longitudeAdjustment;

        baseTime.setMinutes(baseTime.getMinutes() + totalMinutes);

        // Fajr is before sunrise, so subtract from solar noon
        return baseTime;
    }

    /**
     * Calculate Dhuhr time (solar noon)
     */
    private static calculateDhuhrTime(longitude: number): Date {
        const dhuhr = new Date();
        dhuhr.setHours(12, 0, 0, 0);

        // Adjust for longitude (4 minutes per degree)
        const adjustment = (longitude / 15) * 4;
        dhuhr.setMinutes(dhuhr.getMinutes() + adjustment);

        return dhuhr;
    }

    /**
     * Calculate Asr time
     */
    private static calculateAsrTime(latitude: number, declination: number, dhuhrTime: Date): Date {
        // Simplified Asr calculation (shadow length = height + height)
        const shadowRatio = 1; // Shafi method
        const hourAngle = Math.atan(shadowRatio + Math.tan(this.degreesToRadians(Math.abs(latitude - declination))));
        const timeOffset = this.radiansToDegrees(hourAngle) * 4; // 15 degrees per hour

        const asr = new Date(dhuhrTime.getTime());
        asr.setMinutes(asr.getMinutes() + timeOffset);

        return asr;
    }

    /**
     * Calculate Maghrib time (sunset)
     */
    private static calculateMaghribTime(latitude: number, declination: number, dhuhrTime: Date): Date {
        const hourAngle = this.calculateHourAngle(latitude, declination, 0); // Sunset angle = 0
        const timeOffset = hourAngle * 4;

        const maghrib = new Date(dhuhrTime.getTime());
        maghrib.setMinutes(maghrib.getMinutes() + timeOffset);

        return maghrib;
    }

    /**
     * Calculate Isha time
     */
    private static calculateIshaTime(latitude: number, declination: number, dhuhrTime: Date): Date {
        // Simplified Isha calculation (17 degrees after sunset)
        const ishaAngle = 17;
        const hourAngle = this.calculateHourAngle(latitude, declination, ishaAngle);
        const timeOffset = hourAngle * 4;

        const isha = new Date(dhuhrTime.getTime());
        isha.setMinutes(isha.getMinutes() + timeOffset);

        return isha;
    }

    /**
     * Calculate hour angle for a given altitude
     */
    private static calculateHourAngle(latitude: number, declination: number, altitude: number): number {
        const latRad = this.degreesToRadians(latitude);
        const decRad = this.degreesToRadians(declination);
        const altRad = this.degreesToRadians(altitude);

        const cosHourAngle = (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) /
                            (Math.cos(latRad) * Math.cos(decRad));

        return this.radiansToDegrees(Math.acos(Math.max(-1, Math.min(1, cosHourAngle))));
    }

    private static degreesToRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private static radiansToDegrees(radians: number): number {
        return radians * (180 / Math.PI);
    }
}

export interface PrayerTimes {
    fajr: Date;
    dhuhr: Date;
    asr: Date;
    maghrib: Date;
    isha: Date;
}
