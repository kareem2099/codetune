
const axios = require('axios');

module.exports = async (req, res) => {
    try {
        const { date, timezone } = req.query;

        let gregorianDate = new Date();
        if (date) {
            gregorianDate = new Date(date);
        }

        const day = gregorianDate.getDate().toString().padStart(2, '0');
        const month = (gregorianDate.getMonth() + 1).toString().padStart(2, '0');
        const year = gregorianDate.getFullYear();
        const dateStr = `${day}-${month}-${year}`; // DD-MM-YYYY

        // Use Aladhan API for Gregorian to Hijri conversion
        const response = await axios.get(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);

        if (response.data.code !== 200) {
            throw new Error('Failed to fetch Hijri date');
        }

        const hijri = response.data.data.hijri;

        // Adjust gregorian date for timezone if provided
        let adjustedGregorian = gregorianDate;
        if (timezone) {
            const offset = getTimezoneOffset(timezone, gregorianDate);
            adjustedGregorian = new Date(gregorianDate.getTime() + offset * 60000);
        }

        res.status(200).json({
            gregorian: adjustedGregorian.toISOString(),
            hijri: {
                day: parseInt(hijri.day),
                month: parseInt(hijri.month.number),
                year: parseInt(hijri.year),
                monthName: hijri.month.en,
                formatted: `${hijri.day} ${hijri.month.en} ${hijri.year} AH`
            },
            timezone: timezone || 'UTC'
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
