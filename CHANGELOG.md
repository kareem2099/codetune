# Change Log

All notable changes to the "codetune" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.4] - 2025-10-01

### 🚀 **Major Feature: Intelligent Auto-Reading Quran Reader**

#### **🔄 Auto-Reading System**
- **Smart Page Auto-Turning**: Automatically advances to next page when scrolling reaches the bottom
- **Versatile Speed Controls**: Four reading speeds (🐢 Slow 0.5x, 🚶 Normal 1x, 🏃 Fast 1.5x, 🐇 Very Fast 2x)
- **Automatic Surah Progression**: Automatically advances to next Surah after completing current one
- **User Consent Protection**: Prompts for user confirmation before advancing to different Surahs

#### **🎮 Interactive Controls**
- **Auto-Reading Toggle**: Master switch to enable/disable entire auto-reading functionality
- **Play/Pause Controls**: Start, pause, and resume auto-scrolling at any time
- **Speed Selection Buttons**: Visual speed selector with active state highlighting
- **Responsive UI**: Auto-reading controls adapt to mobile/tablet layouts

#### **🎯 User Experience Features**
- **"Auto Reading Active" Indicator**: Real-time status showing in Quran reader modal
- **Smooth Auto-Scrolling**: Continuous, gentle scrolling through verses without jarring jumps
- **Keyboard Integration**: Spacebar toggles play/pause when reader modal is open
- **Progress Saving**: Automatically saves reading progress at every page transition

#### **🛡️ Safety & Control Features**
- **Manual Override**: Users can manually navigate pages while auto-reading is active
- **End-of-Content Protection**: Handles end of Quran gracefully with celebratory messages
- **Non-Blocking Operation**: Auto-reading operates independently of other UI functions
- **Graceful Error Handling**: Continues working even if individual operations fail

#### **📖 Enhanced Quran Reader**
- **Keyboard Navigation**: Full keyboard control (arrows, Home, End, Page Up/Down)
- **Manual Controls**: Traditional navigation buttons for manual page turning
- **Reading Statistics**: Tracks reading sessions, pages read, and time spent
- **Cross-Session Continuity**: Remembers where you left off reading

### 🎨 **Visual Enhancements**

#### **Auto-Reading UI Components**
- **Animated Toggle Button**: Spinning icon when auto-reading mode is enabled
- **Speed Button States**: Active speed buttons glow with accent colors
- **Modal Status Indication**: Visual indicators show current auto-reading status
- **Responsive Controls**: Auto-reading controls stack appropriately on small screens

#### **Quran Reader Improvements**
- **Enhanced Verse Display**: Better Arabic typography with Quranic calligraphy fonts
- **Improved Navigation**: Clear page counters and intuitive navigation controls
- **Reading Progress**: Visual progress indication and bookmarking system
- **Touch-Friendly Design**: Large buttons and appropriate spacing for mobile use

### 🛠️ **Technical Architecture**

#### **Auto-Reading Algorithm**
- **Smart Interval Management**: Calculates optimal scroll intervals based on user speed preferences
- **Page Boundary Detection**: Accurate detection of page scroll boundaries with safety buffers
- **Event-Driven Architecture**: Graceful handling of page changes and loading delays
- **Performance Optimized**: Efficient DOM manipulation with minimal UI blocking

#### **State Management**
- **Persistent Auto-Reading Settings**: Remembers speed preferences and enabled state
- **Cross-Session Continuity**: Maintains reading position across VS Code sessions
- **Error Resilience**: Continues operation even when individual components fail
- **Clean State Transitions**: Proper cleanup when switching between reading modes

### 🔧 **User Experience Refinements**

#### **Inclusive Design Considerations**
- **Accessibility Features**: Full keyboard navigation and screen reader friendly
- **User Consent Patterns**: Clear dialogs for major transitions with informative messaging
- **Progressive Enhancement**: Works with or without advanced features enabled
- **Error Prevention**: Validation and safety checks prevent accidental disruption

#### **Cultural Sensitivity**
- **Respectful Content Handling**: Appropriate confirmations for transitioning between sacred texts
- **Islamic Context Awareness**: designed with Islamic recitation practices in mind
- **Community Standards**: Aligns with digital Quran presentation best practices

## [0.0.3] - 2025-09-28

### 🎵 **Major Feature: Internal Audio Playback**
- **Replaced External Browser Playback**: Quran audio now plays directly within VS Code instead of opening external browser tabs
- **HTML5 Audio Integration**: Added native `<audio>` element to webview with full playback controls
- **Real-time Progress Tracking**: Live progress bar, time display, and seeking functionality
- **Audio Event Handling**: Proper play/pause/ended event management with UI updates

### ⚙️ **Comprehensive Settings Interface**
- **Integrated Settings**: Moved settings from separate webview to within the activity bar
- **Back Button Navigation**: Seamless navigation between main player and settings views
- **Organized Sections**: Five distinct settings categories with clear visual separation

#### **Audio Settings**
- Quran Reciter selection (Mishary Rashid Alafasy, Abdul Rahman Al-Sudais, Saad Al-Ghamidi, Maher Al-Mueaqly)
- Audio Quality options (32kbps, 48kbps, 64kbps, 128kbps, 192kbps)

#### **Playback Settings**
- Default Playback Mode (Full Surah / Ayah by Ayah)
- Auto-play on Startup toggle

#### **Appearance Settings**
- Theme selection (Auto, Light Theme, Dark Theme) with **immediate switching**
- Compact Mode toggle
- Show Notifications toggle
- Language selection (Auto Detect, English, العربية) with **immediate UI updates**

#### **Islamic Reminders**
- Enable/Disable reminders toggle
- Reminder Interval selection (5min, 15min, 30min, 1hr, 2hr, 4hr)
- Reminder Types filtering (Adia, Ahadis, Islamic Wisdom)
- Working Hours Only restriction (9 AM - 6 PM)
- Individual Prayer reminders (Fajr, Dhuhr, Asr, Maghrib, Isha)

#### **Advanced Settings**
- Cache Size configuration (50MB, 100MB, 200MB, 500MB)
- Download Timeout settings (10s, 30s, 60s, 120s)
- Retry Attempts configuration (1, 2, 3, 5 attempts)

### 🔧 **Fixed Critical Issues**
- **Islamic Reminders Integration**: Fixed message passing between webview and extension for real-time reminder control
- **Settings Persistence**: Proper localStorage integration with VSCode configuration sync
- **Language Switching**: Immediate UI language updates without VS Code restart
- **Theme Switching**: Instant theme changes with proper CSS class management
- **Webview-Extension Communication**: Robust message handling for all settings operations

### 🎨 **UI/UX Enhancements**
- **Settings View Styling**: Beautiful glassmorphism design matching the main interface
- **Responsive Layout**: Mobile-friendly settings interface
- **Visual Feedback**: Success notifications for all setting changes
- **Save/Reset Functionality**: Manual save and reset to defaults options
- **Loading States**: Proper loading indicators and error handling

### 🛠️ **Technical Improvements**
- **Message Passing Architecture**: Enhanced webview-to-extension communication
- **Settings Management**: Centralized settings handling with proper validation
- **Audio System**: Complete audio playback system with event-driven UI updates
- **Localization System**: Improved language switching with global state management
- **Error Handling**: Comprehensive error handling for all audio and settings operations

### 📚 **Content & Features**
- **Islamic Content Database**: Expanded collection of Adia, Ahadis, and Islamic wisdom
- **Prayer Time Integration**: Real-time prayer countdown with Islamic calendar
- **Hijri Date Display**: Accurate Islamic calendar date showing
- **Multi-language Support**: Full Arabic and English localization

## [0.0.2] - 2025-09-27

### Added
- **Dedicated Settings Webview**: Complete settings interface with organized sections for audio, playback, appearance, and advanced options
- **Settings Command**: New `codeTune.openSettings` command to open the settings panel
- **Theme Toggle Notifications**: Theme changes now show VS Code notifications instead of in-webview notifications
- **Separate File Architecture**: Refactored from hardcoded HTML to separate HTML, CSS, and JS files for better maintainability
- **Modern UI Components**: Enhanced activity bar with glassmorphism effects, smooth animations, and responsive design
- **Keyboard Shortcuts**: Added keyboard navigation support (spacebar, arrow keys, etc.)
- **Settings Persistence**: Auto-save functionality with localStorage integration
- **Professional Styling**: Modern CSS with custom properties, gradients, and hover effects

### Changed
- **Architecture Refactor**: Moved from monolithic HTML to modular file structure
- **UI Improvements**: Enhanced visual design with better spacing, colors, and interactions
- **Notification System**: Theme changes now use VS Code's native notification system
- **Code Organization**: Better separation of concerns between UI components

### Fixed
- **Duplicate Function Implementation**: Resolved TypeScript compilation error with duplicate `_getHtmlForWebview` methods
- **Webview Panel Removal**: Removed unused PlayerWebviewPanel and QuranWebviewPanel classes
- **Command Registration**: Cleaned up package.json commands and removed unused entries
- **Settings Button Functionality**: Fixed settings button to properly open the dedicated settings webview

### Technical Improvements
- **File Structure**: Organized UI files in `src/ui/` directory
- **Type Safety**: Improved TypeScript types and error handling
- **Build Process**: Optimized compilation and packaging process
- **Code Quality**: Enhanced ESLint configuration and code standards

## [0.0.1] - 2025-09-26

### Added
- Initial release of CodeTune extension
- Basic Quran player functionality
- Activity bar integration
- Basic command palette integration
