const axios = require('axios');

module.exports = async (req, res) => {
    try {
        const { lat, lon, timezone, method = 2 } = req.query; // method 2 is Islamic Society of North America

        let latitude = lat ? parseFloat(lat) : 21.3891; // Mecca
        let longitude = lon ? parseFloat(lon) : 39.8579; // Mecca

        // If timezone provided and no lat/lon, use default for timezone
        if (timezone && !lat && !lon) {
            if (timezone === 'Africa/Cairo') {
                latitude = 30.0444;
                longitude = 31.2357;
            }
            // Add more if needed
        }

        const currentTime = new Date();
        const today = currentTime.toISOString().split('T')[0];

        // Build API URL
        let apiUrl = `https://api.aladhan.com/v1/timings/${today}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
        if (timezone) {
            apiUrl += `&timezonestring=${timezone}`;
        }

        // Get today's prayer times
        const response = await axios.get(apiUrl);
        if (response.data.code !== 200) {
            throw new Error('Failed to fetch prayer times');
        }

        const data = response.data.data;
        const timings = data.timings;

        // Parse prayer times into Date objects (API already adjusts to timezone)
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            const date = new Date(today);
            date.setHours(hours, minutes, 0, 0);
            return date;
        };

        const prayerTimes = {
            fajr: parseTime(timings.Fajr),
            dhuhr: parseTime(timings.Dhuhr),
            asr: parseTime(timings.Asr),
            maghrib: parseTime(timings.Maghrib),
            isha: parseTime(timings.Isha)
        };

        // Adjust current time to the timezone
        let adjustedCurrentTime = currentTime;
        if (timezone) {
            const offset = getTimezoneOffset(timezone, currentTime);
            adjustedCurrentTime = new Date(currentTime.getTime() + offset * 60000);
        }

        // Find next prayer
        const prayers = [
            { name: 'Fajr', time: prayerTimes.fajr },
            { name: 'Dhuhr', time: prayerTimes.dhuhr },
            { name: 'Asr', time: prayerTimes.asr },
            { name: 'Maghrib', time: prayerTimes.maghrib },
            { name: 'Isha', time: prayerTimes.isha }
        ];

        let nextPrayer = null;
        for (const prayer of prayers) {
            if (prayer.time.getTime() > adjustedCurrentTime.getTime()) {
                nextPrayer = prayer;
                break;
            }
        }

        // If no next prayer today, get tomorrow's Fajr
        if (!nextPrayer) {
            const tomorrow = new Date(currentTime);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDate = tomorrow.toISOString().split('T')[0];

            let tomorrowUrl = `https://api.aladhan.com/v1/timings/${tomorrowDate}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
            if (timezone) {
                tomorrowUrl += `&timezonestring=${timezone}`;
            }

            const tomorrowResponse = await axios.get(tomorrowUrl);
            if (tomorrowResponse.data.code === 200) {
                const tomorrowTimings = tomorrowResponse.data.data.timings;
                // Parse time for tomorrow's date
                const parseTomorrowTime = (timeStr) => {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    const date = new Date(tomorrowDate);
                    date.setHours(hours, minutes, 0, 0);
                    return date;
                };
                nextPrayer = {
                    name: 'Fajr',
                    time: parseTomorrowTime(tomorrowTimings.Fajr)
                };
            }
        }

        // Calculate countdown
        let countdown = '00:00:00';
        if (nextPrayer) {
            const timeDiff = nextPrayer.time.getTime() - adjustedCurrentTime.getTime();
            if (timeDiff > 0) {
                const totalSeconds = Math.floor(timeDiff / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }

        res.status(200).json({
            location: { latitude, longitude },
            timezone: timezone || data.meta.timezone,
            method: data.meta.method.name,
            currentTime: adjustedCurrentTime.toISOString(),
            nextPrayer: nextPrayer ? {
                name: nextPrayer.name,
                time: nextPrayer.time.toISOString(),
                countdown
            } : null,
            allPrayers: {
                fajr: prayerTimes.fajr.toISOString(),
                dhuhr: prayerTimes.dhuhr.toISOString(),
                asr: prayerTimes.asr.toISOString(),
                maghrib: prayerTimes.maghrib.toISOString(),
                isha: prayerTimes.isha.toISOString()
            },
            hijri: {
                day: parseInt(data.date.hijri.day),
                month: parseInt(data.date.hijri.month.number),
                year: parseInt(data.date.hijri.year),
                monthName: data.date.hijri.month.en,
                formatted: `${data.date.hijri.day} ${data.date.hijri.month.en} ${data.date.hijri.year} AH`
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

function getTimezoneOffset(timezone, date) {
    try {
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        return (tzDate.getTime() - utcDate.getTime()) / 60000; // minutes
    } catch (e) {
        return 0; // fallback to UTC
    }
}
