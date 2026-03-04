# 🕌 CodeTune - Islamic Coding Companion

<div align="center">

<img src="images/icon.png" alt="CodeTune Logo" width="128" />

[![Version](https://img.shields.io/badge/Version-1.1.0-green)](https://github.com/kareem2099/codetune/releases)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.75+-blue)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)

**Transform your VS Code into a spiritual environment.**  
Authentic Islamic reminders, Quran recitation, prayer times, and spiritual focus tools — all without leaving your editor.

[🚀 Installation](#-installation) • [✨ Features](#-features) • [📖 Usage](#-usage) • [⚙️ Configuration](#-configuration) • [🐛 Troubleshooting](#-troubleshooting)

</div>

---

## 📖 Overview
**CodeTune** integrates spirituality seamlessly into your development workflow. It helps you maintain faith and focus by providing context-aware Islamic content, prayer times based on your location, and a high-quality Quran player — all without leaving your editor.

> *"Indeed, in the remembrance of Allah do hearts find rest."* (Surah Ar-Ra'd, 13:28)

---

## 🏆 What's New in v1.1.0

### 🧠 **Smart Focus Mode** *(NEW)*
- **Coding-Aware Notifications:** Detects when you're actively typing and **pauses** reminders automatically
- **Auto-Resume:** Notifications resume after you stop coding — never breaking your flow again
- **Quiet Hours:** Configurable night hours where all notifications are fully silenced

### 📊 **Spiritual Progress Dashboard** *(NEW)*
- **Daily Goals Tracker:** Visual progress bars for Quran listening minutes and Dhikr count
- **Streak System:** Tracks consecutive days of spiritual activity with motivational messages
- **Achievements:** Unlock badges like "One Week Warrior" (7-day streak) and "Legend" (30-day streak)
- **Weekly Summary:** Overview of your spiritual activity over the last 7 days
- **All-Time Stats:** Total Quran minutes, Dhikr count, and personal records

### 🛡️ **Intelligent Error Recovery** *(NEW)*
- **"You're Offline" Screen:** Beautiful network status UI with pending retry queue
- **Auto-Retry:** Automatically re-attempts failed audio streaming when connection returns
- **User-Friendly Errors:** No scary stack traces — just clear, helpful messages
- **Exponential Backoff:** Smart retry logic that doesn't hammer the server

### 🔒 **Reliability & Security Improvements** *(NEW)*
- **XSS Protection:** All dynamic content is fully sanitized before rendering
- **Memory Leak Prevention:** All intervals, timers, and event listeners are properly disposed
- **Error Black Box:** Background error logging for debugging without UI clutter
- **Retry Manager:** Robust network request handling with configurable max retries

---

## ✨ Features

### 🧠 Smart Focus Mode
* Detects **active coding** (typing, file saves) and pauses non-urgent reminders
* **Quiet Hours** setting prevents notifications during sleep/prayer times
* Zero configuration — works intelligently out of the box

### 📊 Spiritual Progress Tracker
* **Daily Goals:** Log Quran listening time and Dhikr count with simple modal inputs
* **Streak Counter:** Days-in-a-row tracker with midnight-safe date logic
* **Achievements:** Gamified spiritual milestones to keep you motivated
* **Weekly Heatmap:** See which days you were most spiritually active

### 🤖 Intelligent Reminders System
* **Time-Aware Azkar:** Morning Azkar (Fajr → Sunrise), Evening Azkar (Asr → Maghrib)
* **Friday Special:** Enhanced Friday content — Jumu'ah duas, Surah Al-Kahf enforcement, Salawat
* **Customizable:** Intervals from 5 minutes to 4 hours
* **Authentic Content:** 500+ verified Adia, Hadis, and Quranic wisdom

### 🕌 Prayer Times & Calendar
* **Live Countdown:** Real-time countdown to next prayer with precise astronomical calculation
* **Hijri Date:** Umm al-Qura calendar with accurate date display
* **Auto-Location:** Automatic timezone detection — no manual setup needed

### 🎵 Premium Quran Player
* **15+ Reciters:** Mishary Alafasy, Al-Sudais, Abdul Basit, Al-Minshawy, Maher Al-Muaiqly, and more
* **Smart Auto-Reading:** Auto-page turner with adaptive speed for Khatmah
* **Background Play:** Independent volume and seamless CDN streaming
* **Statistics:** Daily/Weekly/Monthly listening metrics

### 🧿 Islamic Dhikr Counters
* Tasbih (سُبْحَانَ اللَّهِ / الْحَمْدُ لِلَّهِ / اللَّهُ أَكْبَرُ)
* Istighfar, Salawat with Friday-aware daily targets
* Adhkar collection with one-click increment
* Persistent cross-session storage

---

## 🚀 Installation

1. Open **VS Code**
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for **"CodeTune"**
4. Click **Install**
5. Click the **🕌 Mosque icon** in the Activity Bar to open the dashboard

---

## 📖 Usage

### Activity Bar Dashboard
Click the **Mosque Icon (🕌)** in the left Activity Bar to access everything.

| Command | Shortcut | Description |
|:---|:---|:---|
| `CodeTune: Play Quran` | `Ctrl+Shift+Q` | Start/Resume recitation |
| `CodeTune: Stop` | — | Stop playback |
| `CodeTune: Open Settings` | — | Open configuration panel |

### Logging Spiritual Activity
In the **Spiritual Progress** section:
- Click **📖 Log Quran Time** → enter minutes → dashboard updates automatically
- Click **✨ Track Dhikr** → enter count → streak and goals update

### Smart Focus Mode
Just code normally — the extension watches your activity. When you stop typing for 30+ seconds, any pending notifications are delivered. You'll never see a popup mid-keystroke.

---

## ⚙️ Configuration

All settings are available in the UI panel. No JSON editing required.

### 📿 Reminders
| Setting | Default | Description |
|:---|:---|:---|
| `Enable Reminders` | `On` | Master toggle |
| `Interval` | `60 min` | Frequency (5–240 min) |
| `Morning/Evening Azkar` | `On` | Time-specific content |
| `Working Hours Only` | `Off` | Limit to 9 AM–6 PM |

### 📊 Tracker
| Setting | Default | Description |
|:---|:---|:---|
| `Daily Quran Goal` | `30 min` | Target minutes per day |
| `Daily Dhikr Goal` | `100` | Target count per day |

### 🎵 Audio
| Setting | Default | Description |
|:---|:---|:---|
| `Reciter` | `Alafasy` | Choose from 15+ reciters |
| `Volume` | `70%` | Independent audio level |

---

## 🔧 Technical Details
* **Prayer Calculation:** Adhan library with Egyptian calculation method
* **Audio:** High-quality MP3 streaming from Islamic Network CDN
* **Privacy:** No data collected. All stats stored **locally** on your machine
* **Architecture:** Clean Extension Host / Webview separation with secure `postMessage` bridge
* **Error Handling:** Background `ErrorReporter` with exponential backoff `RetryManager`

---

## 🐛 Troubleshooting

| Issue | Solution |
|:---|:---|
| **Audio not playing** | Check internet connection — audio streams from CDN. Use the offline retry button in the Error Recovery panel |
| **Wrong Prayer Times** | Ensure system timezone is correct. The extension uses astronomical calculation |
| **Dashboard not updating** | Click **Log Quran Time** — the backend sends fresh data after each action |
| **Notifications not appearing** | Check if Smart Focus Mode is holding them. Stop typing for 30s and they'll appear |
| **Settings not saving** | Settings auto-save on change. Restart VS Code if needed |

---

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes
4. Open a Pull Request

> Please ensure all Islamic content additions are verified against authentic sources (Quran, Bukhari, Muslim, etc.)

---

## ❤️ License & Attribution
* **License:** MIT
* **Audio:** [Islamic Network CDN](https://islamic.network/)
* **Prayer Times:** [Adhan.js](https://github.com/batoulapps/adhan-js)
* **Fonts:** Google Fonts — Amiri Quran, Scheherazade New, Noto Naskh Arabic

<div align="center">
  <i>Developed with ❤️ for the global Muslim developer community — بارك الله فيكم</i>
</div>
