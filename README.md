# 🕌 CodeTune - Islamic Coding Companion

<div align="center">

<img src="images/icon.png" alt="CodeTune Logo" width="128" />

[![Version](https://img.shields.io/badge/Version-1.0.0-blue)](https://github.com/kareem2099/codetune/releases)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.74+-blue)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](https://opensource.org/licenses/MIT)

**Transform your VS Code into a spiritual environment.**
Authentic Islamic reminders, Quran recitation, prayer times, and spiritual focus tools.

[🚀 Installation](#-installation) • [✨ Features](#-features) • [📖 Usage](#-usage) • [⚙️ Configuration](#-configuration) • [🐛 Troubleshooting](#-troubleshooting)

</div>

---

## 📖 Overview
**CodeTune** integrates spirituality seamlessly into your development workflow. It helps you maintain faith and focus by providing context-aware Islamic content, prayer times based on your location, and a high-quality Quran player, all without leaving your editor.

> *"Indeed, in the remembrance of Allah do hearts find rest."* (Surah Ar-Ra'd, 13:28)

---

## 🏆 What's New in v1.0.0

**CodeTune is now stable and production-ready!** This major release includes:

### 🌍 **Complete Internationalization**
- **5 Languages Supported:** Arabic (العربية), English, Russian (Русский), French (Français), Spanish (Español)
- **Automatic Language Detection** based on VS Code locale
- **RTL Support** for Arabic with proper text direction

### 🎯 **Accurate Islamic Calendar**
- **Umm al-Qura Calendar:** Official Saudi Islamic calendar implementation
- **Fixed Hijri Date Issues:** Corrected 2-day offset (now shows accurate dates)
- **Precise Prayer Times:** Enhanced Adhan library with Egyptian calculation method

### 🔧 **Professional Features**
- **Smart Statistics Toggle:** Click icon to switch between session counts and listening time
- **Context-Aware Notifications:** Intelligent prayer time reminders
- **Friday Surah Intelligence:** Auto-show Friday Surah section only when relevant
- **Daily Prayer Goals Reset:** Automatic daily reset for spiritual tracking

### 🛡️ **Production Quality**
- **Zero Console Spam:** Clean logging with optional debug mode
- **Webview Sandboxing:** Proper VS Code dialog integration
- **Error Resilience:** Comprehensive error handling throughout
- **Cross-Platform:** Tested on Windows, macOS, and Linux

---

## ✨ Features

### 🤖 Intelligent Reminders System
* **Time-Aware Azkar:** Automatically displays **Morning Azkar** (Fajr-Sunrise) and **Evening Azkar** (Asr-Maghrib).
* **Smart Scheduling:** Reminders respect your coding flow with customizable intervals (5min - 4hrs).
* **Work Mode:** "Working Hours Only" filter to keep professional focus.
* **Authentic Content:** 500+ verified Adia, Hadis, and Quranic wisdom.

### 🕌 Prayer Times & Calendar
* **Live Countdown:** Real-time countdown to the next prayer (accurate astronomical calculations).
* **Hijri Date:** Displays current Islamic date with Arabic numerals.
* **Auto-Location:** Detects timezone automatically for accurate prayer times.

### 🎵 Premium Quran Player
* **15+ Reciters:** Including Mishary Alafasy, Al-Sudais, Abdul Basit, Al-Minshawy, and more.
* **Smart Auto-Reading:** Auto-page turner and multi-speed reading for Khatmah.
* **Background Play:** Independent volume control and seamless streaming via CDN.
* **Statistics:** Tracks your listening sessions (Daily/Weekly/Monthly metrics).

---

## 🚀 Installation

1. Open **VS Code**.
2. Press `Ctrl+Shift+X` to open Extensions.
3. Search for **"CodeTune"**.
4. Click **Install**.
5. *Optional:* Reload VS Code to initialize the Activity Bar icon.

---

## 📖 Usage

### 1. Activity Bar Integration
Click the **Mosque Icon (🕌)** in the left Activity Bar to access the dashboard.

* **View Date:** See the current Hijri date.
* **Prayer Status:** Check time remaining for the next prayer.
* **Quick Controls:** Access the Quran player immediately.

### 2. Quran Player
You can control the player via the dashboard or Command Palette:

| Command | Shortcut | Description |
|:---|:---|:---|
| `CodeTune: Play Quran` | `Ctrl+Shift+Q` | Start/Resume recitation |
| `CodeTune: Stop` | `Ctrl+Shift+S` | Stop playback |
| `CodeTune: Open Settings` | - | Open the configuration panel |

### 3. Smart Reminders
Reminders appear as notifications in the bottom right corner.
* **Morning/Evening:** Specific content appears during their respective sun times.
* **General:** Wisdom and Hadith appear based on your interval settings.

---

## ⚙️ Configuration

Manage all settings via the UI panel (No JSON editing required). Click the **Gear Icon (⚙️)** in the CodeTune panel.

### 📿 Reminders Settings
| Setting | Default | Description |
|:---|:---|:---|
| `Enable Reminders` | `True` | Master toggle for all notifications. |
| `Interval` | `30 min` | Frequency of reminders (5 - 240 mins). |
| `Show Morning Azkar` | `True` | Show specific Azkar after Fajr. |
| `Show Evening Azkar` | `True` | Show specific Azkar after Asr. |
| `Working Hours Only` | `False` | Only show reminders during 9-5 schedule. |

### 🎵 Audio Settings
| Setting | Default | Description |
|:---|:---|:---|
| `Reciter` | `Alafasy` | Choose from 15+ high-quality reciters. |
| `Volume` | `70%` | Independent volume level (doesn't affect system). |

---

## 🔧 Technical Details
* **Prayer Calculation:** Uses astronomical algorithms relative to Mecca coordinates for consistency.
* **Audio Source:** High-quality MP3 streaming from **Islamic Network CDN**.
* **Privacy:** No personal data is collected. Listening statistics are stored locally on your machine.

---

## 🐛 Troubleshooting

| Issue | Solution |
|:---|:---|
| **Audio not playing** | Check internet connection (CDN streaming) and independent volume slider. |
| **Wrong Prayer Times** | Ensure your system timezone is correct. The extension uses system time + astronomical calculation. |
| **Settings not saving** | Settings auto-save on change. If stuck, restart VS Code. |

---

## 🤝 Contributing
We welcome contributions from the community!
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes.
4. Open a Pull Request.

**Note:** Please ensure all Islamic content additions are verified against authentic sources.

---

## ❤️ License & Attribution
* **License:** MIT License.
* **Credits:**
    * Audio provided by [Islamic Network](https://islamic.network/).
    * Prayer times calculated via Aladhan API principles.

<div align="center">
  <i>Developed with ❤️ for the global Muslim developer community</i>
</div>
