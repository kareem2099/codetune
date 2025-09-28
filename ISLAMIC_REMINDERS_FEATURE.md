# 🕌 Islamic Reminders Feature - CodeTune Extension

## Overview
The Islamic Reminders feature adds spiritual enhancement to the CodeTune VS Code extension by providing configurable Islamic content notifications during coding sessions. This feature includes Hijri date display, prayer time countdown, and periodic Islamic wisdom reminders.

## Features Implemented

### 1. **Islamic Information Card in Activity Bar**
- **Hijri Date Display**: Shows current Islamic date with Arabic numerals
- **Prayer Time Countdown**: Real-time countdown to next prayer time
- **Beautiful UI**: Glassmorphism design with Islamic-themed colors

### 2. **Islamic Reminders System**
- **Configurable Intervals**: Every 5 minutes to every 4 hours
- **Content Types**:
  - **Adia (Islamic Prayers)**: Authentic Islamic supplications
  - **Ahadis (Prophet's Sayings)**: Authentic hadiths from Prophet Muhammad ﷺ
  - **Islamic Wisdom**: Quranic verses and Islamic teachings
- **Working Hours Filter**: Optional restriction to 9 AM - 6 PM
- **VS Code Notifications**: Non-intrusive popup notifications

### 3. **Settings Integration**
- **Dedicated Settings Section**: "Islamic Reminders - التذكيرات الإسلامية"
- **Real-time Updates**: Settings changes immediately affect reminder behavior
- **Persistent Storage**: Uses VS Code's configuration system

## Technical Implementation

### Files Created/Modified

#### New Files:
- `src/logic/islamicReminders.ts` - Main Islamic reminders manager
- `src/logic/islamicCalendar.ts` - Hijri date and prayer time calculations
- `ISLAMIC_REMINDERS_FEATURE.md` - This documentation

#### Modified Files:
- `src/ui/activityBar.html` - Added Islamic information card
- `src/ui/activityBar.css` - Added Islamic-themed styling
- `src/ui/activityBar.js` - Added Islamic timer functionality
- `src/ui/settings.html` - Added Islamic reminders settings section
- `src/ui/settings.css` - Added settings styling
- `src/ui/settings.js` - Added Islamic reminder settings handling
- `src/logic/settingsView.ts` - Added Islamic reminder message handling
- `src/extension.ts` - Integrated IslamicRemindersManager
- `package.json` - Added Islamic reminder configuration properties

### Architecture

```
CodeTune Extension
├── Islamic Reminders System
│   ├── IslamicRemindersManager (Main Controller)
│   ├── IslamicCalendar (Date & Prayer Calculations)
│   ├── Content Database (Adia, Ahadis, Wisdom)
│   └── VS Code Integration (Notifications, Settings)
│
├── UI Components
│   ├── Activity Bar Card (Hijri Date + Prayer Timer)
│   └── Settings Panel (Configuration Options)
│
└── Configuration
    ├── VS Code Settings (Persistent Storage)
    └── Real-time Updates (Immediate Effect)
```

## Islamic Content Database

### Adia (Islamic Prayers)
```javascript
[
    {
        type: 'adia',
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
        english: 'O Allah, I ask You for pardon and well-being in this world and in the Hereafter.',
        source: 'Sunan Ibn Majah'
    },
    // ... more prayers
]
```

### Ahadis (Prophet's Sayings)
```javascript
[
    {
        type: 'hadis',
        arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ',
        english: 'Whoever follows a path seeking knowledge, Allah will make easy for him a path to Paradise.',
        source: 'Sahih Muslim'
    },
    // ... more hadiths
]
```

### Islamic Wisdom
```javascript
[
    {
        type: 'wisdom',
        arabic: 'إِنَّ مَعَ الْعُسْرِ يُسْرًا',
        english: 'Indeed, with hardship comes ease.',
        source: 'Surah Ash-Sharh 94:5'
    },
    // ... more wisdom
]
```

## Configuration Options

### VS Code Settings (package.json)
```json
{
    "codeTune.enableReminders": {
        "type": "boolean",
        "default": true,
        "description": "Enable Islamic reminders and wisdom notifications"
    },
    "codeTune.reminderInterval": {
        "type": "number",
        "default": 60,
        "minimum": 5,
        "maximum": 240,
        "description": "Interval between Islamic reminders in minutes"
    },
    "codeTune.showAdia": {
        "type": "boolean",
        "default": true,
        "description": "Show Islamic prayers (Adia) in reminders"
    },
    "codeTune.showAhadis": {
        "type": "boolean",
        "default": true,
        "description": "Show Prophet's sayings (Ahadis) in reminders"
    },
    "codeTune.showWisdom": {
        "type": "boolean",
        "default": true,
        "description": "Show Islamic wisdom and verses in reminders"
    },
    "codeTune.workingHoursOnly": {
        "type": "boolean",
        "default": false,
        "description": "Only show reminders during working hours (9 AM - 6 PM)"
    }
}
```

## User Experience

### Activity Bar Display
```
🕌 Islamic Information
├── Hijri Date: 15 Ramadan 1446 AH
└── Next Prayer: Fajr in 02:15:30
```

### Reminder Notification Example
```
🕌 Adia (Prayer)

اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ

O Allah, I ask You for pardon and well-being in this world and in the Hereafter.

Source: Sunan Ibn Majah

[Got it]
```

### Settings Interface
```
🕌 Islamic Reminders - التذكيرات الإسلامية

☑️ Enable Reminders
⏰ Reminder Interval: Every 1 hour
☑️ Adia (Islamic Prayers)
☑️ Ahadis (Prophet's Sayings)
☑️ Islamic Wisdom
☐ Working Hours Only (9 AM - 6 PM)
```

## Technical Details

### Prayer Time Calculation
- **Simplified Algorithm**: Uses basic astronomical calculations
- **Location**: Defaults to Mecca coordinates (21.3891°N, 39.8579°E)
- **Prayer Times**: Fajr, Dhuhr, Asr, Maghrib, Isha
- **Real-time Updates**: Updates every second for countdown accuracy

### Hijri Date Conversion
- **Algorithm**: Simplified lunar calendar conversion
- **Accuracy**: Approximate (not astronomically precise)
- **Format**: "DD Month YYYY AH" (e.g., "15 Ramadan 1446 AH")

### Reminder System
- **Timer Management**: Uses Node.js setInterval/clearInterval
- **Content Selection**: Random selection from enabled categories
- **VS Code Integration**: Uses vscode.window.showInformationMessage
- **Memory Management**: Proper cleanup on extension deactivation

## Benefits

### For Developers
- **Spiritual Connection**: Maintain Islamic awareness during coding
- **Knowledge Enhancement**: Regular exposure to Islamic teachings
- **Peace of Mind**: Prayer time awareness and reminders
- **Cultural Integration**: Arabic text with English translations

### For the Extension
- **Unique Feature**: Differentiates from other coding extensions
- **User Engagement**: Increases user retention and satisfaction
- **Educational Value**: Teaches Islamic knowledge passively
- **Community Appeal**: Appeals to Muslim developers worldwide

## Future Enhancements

### Potential Additions
- **Accurate Prayer Times**: Integration with prayer time APIs
- **Astronomical Hijri Calendar**: More precise Islamic calendar
- **Location-based Prayer Times**: User location detection
- **Custom Content**: User-defined Islamic reminders
- **Prayer Notifications**: Audio alerts for prayer times
- **Quran Integration**: Link reminders to relevant Quran verses

### Technical Improvements
- **Prayer Time API**: Integration with Islamic prayer time services
- **Calendar Accuracy**: Astronomical calculation improvements
- **Localization**: Support for multiple languages
- **Accessibility**: Screen reader support for Arabic text

## Installation & Usage

### For Users
1. **Install CodeTune Extension** from VS Code marketplace
2. **Open Activity Bar** to see Islamic information card
3. **Click Settings** (⚙️) to configure Islamic reminders
4. **Customize Preferences** in the Islamic Reminders section
5. **Enjoy Spiritual Reminders** during coding sessions

### For Developers
1. **Clone Repository**: `git clone https://github.com/kareem2099/codetune.git`
2. **Install Dependencies**: `npm install`
3. **Build Extension**: `npm run compile`
4. **Test Extension**: Press F5 to launch extension development host
5. **Configure Settings**: Access Islamic reminder settings in the UI

## Conclusion

The Islamic Reminders feature transforms CodeTune from a simple Quran player into a comprehensive Islamic companion for developers. By seamlessly integrating spiritual content into the coding workflow, it helps Muslim developers maintain their faith while pursuing their professional goals.

The feature combines beautiful UI design, authentic Islamic content, and thoughtful user experience to create a unique and valuable addition to the VS Code ecosystem.

---

**Developed with ❤️ for the Muslim developer community**

*May Allah accept our efforts and make this beneficial for all who use it. آمين*
