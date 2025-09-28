# Change Log

All notable changes to the "codetune" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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
