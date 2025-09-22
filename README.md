# 🎵 CodeTune - Professional Music & Audio Integration for VS Code

<div align="center">

[![VS Code Version](https://img.shields.io/badge/VS%20Code-1.74+-blue.svg)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**Enhance your coding experience with integrated music streaming, local audio playback, and spiritual content - all within VS Code.**

[🚀 Installation](#-installation) • [📖 Usage](#-usage) • [⚙️ Configuration](#️-configuration) • [🎯 Features](#-features) • [🐛 Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Features

### 🎵 **Multi-Service Music Integration**
- **🎵 YouTube Music**: Enhanced search with AI-powered query processing, caching, and smart filtering
- **🎵 Spotify**: Full integration with your personal library and catalog search
- **🎹 Local Audio**: Play your local music files with advanced controls
- **📱 Activity Bar Integration**: Native VS Code sidebar for seamless music control

### 🎯 **Advanced YouTube Music Features**
- **🔍 Smart Search**: AI-enhanced queries with automatic music keyword detection
- **⚡ Real-time Metadata**: Actual track duration, high-quality thumbnails, accurate artist info
- **💾 Intelligent Caching**: 5-minute search result caching for improved performance
- **📚 Search History**: Track and reuse your recent searches
- **🎛️ Quality Filtering**: Automatic removal of non-music content (tutorials, reviews, etc.)
- **📊 Rich Display**: Duration, view counts, and upload dates in search results

### 📿 **Quran & Spiritual Content**
- **📖 Complete Quran Library**: All 114 Surahs with multiple reciters
- **🎙️ Premium Reciters**: High-quality audio from renowned Qaris
- **🌐 Online Streaming**: Crystal-clear audio with global CDN
- **⚙️ Customizable Experience**: Volume controls and reciter selection

### 🎛️ **Professional Interface**
- **📱 Activity Bar Views**: Dedicated "Music Explorer" and "Search" panels
- **🌙 Theme Integration**: Full dark/light mode support
- **⚡ Real-time Updates**: Live status indicators and progress tracking
- **🎮 Intuitive Controls**: Professional-grade playback interface
- **📊 Visual Feedback**: Loading states, search progress, and result counts

## 🚀 Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "CodeTune"
4. Click Install
5. Reload VS Code

## ⚙️ Configuration

### Spotify Setup

To use Spotify features, you need to configure your Spotify App credentials:

1. **Deploy the callback server** (choose one option):

   **Option A: Vercel (Recommended)**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy the server
   cd server
   vercel --prod
   ```
   Copy the deployment URL (e.g., `https://your-app.vercel.app`)

   **Option B: Railway**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli

   # Deploy the server
   cd server
   railway login
   railway deploy
   ```
   Copy the deployment URL

   **Option C: Local Development**
   ```bash
   # Run locally (for development only)
   cd server
   npm install
   npm start
   ```
   Use `http://localhost:8888` as redirect URI

2. **Configure Spotify App**:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app or use an existing one
   - Add your callback server URL to **Redirect URIs**:
     - For Vercel/Railway: `https://your-deployed-app.com/callback`
     - For local: `http://localhost:8888/callback`
   - Copy your **Client ID** and **Client Secret**

3. **Configure VS Code Settings**:
   - Open VS Code Settings (Ctrl+,)
   - Search for "CodeTune"
   - Set your credentials:
     - `codeTune.spotifyClientId`: Your Spotify Client ID
     - `codeTune.spotifyClientSecret`: Your Spotify Client Secret
     - `codeTune.spotifyRedirectUri`: Your callback server URL (e.g., `https://your-app.vercel.app/callback`)

### Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `codeTune.musicVolume` | Default volume for local music | 0.5 |
| `codeTune.quranVolume` | Default volume for Quran | 0.7 |
| `codeTune.spotifyClientId` | Spotify Client ID | "" |
| `codeTune.spotifyClientSecret` | Spotify Client Secret | "" |

## 🎮 Usage

### 📱 Activity Bar Integration

CodeTune now features a professional Activity Bar integration for seamless music control:

1. **Access CodeTune**: Click the 🎵 "CodeTune" icon in the VS Code Activity Bar
2. **Music Explorer**: Browse services, search history, and current results
3. **Search View**: Quick searches and real-time search results
4. **One-Click Play**: Click any track to play it instantly

#### Activity Bar Interface
```
🎵 CodeTune Activity Bar
┌─────────────────────────────────────┐
│ 🎵 YouTube Music                    │
│ ┌─────────────────────────────────┐ │
│ │ 🔍 Search: [input field]        │ │
│ │ 🎵 Open Player    🗑️ Clear Cache │ │
│ │ Ready to search                 │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 🎵 Spotify                          │
│ ┌─────────────────────────────────┐ │
│ │ 🔗 Connect        🔍 Search      │ │
│ │ ⏯️ Play/Pause     ⏭️ Next        │ │
│ │ Not connected                   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 🎹 Local Music                      │
│ ┌─────────────────────────────────┐ │
│ │ Peaceful  Focus                 │ │
│ │ Meditation  Nature              │ │
│ │ [volume slider]  50%            │ │
│ │ Select a track to play          │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ 📿 Quran                            │
│ ┌─────────────────────────────────┐ │
│ │ [dropdown] Select Surah...      │ │
│ │ 🎵 Play                         │ │
│ │ [volume slider]  70%            │ │
│ │ Select a Surah to begin         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 🎵 YouTube Music Enhanced Search

Experience the most advanced YouTube Music integration:

1. **🔐 Authentication**: Connect your Google account for enhanced features
2. **Smart Search**: Enter natural queries like "chill music for coding"
3. **AI Enhancement**: Automatic detection of music types (official, live, remix, etc.)
4. **Rich Results**: See duration, quality thumbnails, and accurate metadata
5. **Quick Access**: Recent searches available in Activity Bar
6. **Cache System**: Fast repeated searches with 5-minute intelligent caching
7. **Personal Playlists**: Access your YouTube Music playlists when authenticated

#### YouTube Authentication Setup

1. **Get Google API Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable YouTube Data API v3
   - Create OAuth 2.0 credentials
   - Add your redirect URI (e.g., `http://localhost:8888/youtube-callback`)

2. **Configure VS Code Settings**:
   - Open VS Code Settings (Ctrl+,)
   - Search for "CodeTune"
   - Set your YouTube credentials:
     - `codeTune.youtubeClientId`: Your Google Client ID
     - `codeTune.youtubeClientSecret`: Your Google Client Secret
     - `codeTune.youtubeRedirectUri`: Your callback URL

3. **Connect YouTube**:
   - Click the 🎵 CodeTune icon in Activity Bar
   - Click "🔗 Connect" in YouTube Music section
   - Follow browser authentication flow
   - Enjoy enhanced search and personal playlists!

### 🎵 Spotify Integration

1. **Connect**: Click "Connect" in the Spotify section
2. **Authenticate**: Follow the secure browser authentication flow
3. **Search**: Use the search box to find tracks, artists, or albums
4. **Play**: Click on any track or use the playback controls
5. **Control**: Use play/pause, next/previous, and volume controls

### 🎹 Local Music Player

1. **Select Track**: Choose from built-in relaxing tracks
2. **Play**: Click play or use the toggle button
3. **Volume**: Adjust using the volume slider
4. **Integration**: Works seamlessly with Activity Bar

### 📿 Quran Player

1. **Select Surah**: Choose from all 114 Surahs
2. **Select Reciter**: Choose from premium reciters
3. **Play**: Start recitation with professional controls
4. **Volume**: Adjust for comfortable listening

### ⌨️ Keyboard Shortcuts

Configure these in VS Code settings:

- `Ctrl+Shift+M`: Play local music
- `Ctrl+Shift+Q`: Play Quran
- `Ctrl+Shift+P`: Open command palette for all CodeTune commands

## 📸 Screenshots

<div align="center">

### Activity Bar Integration
![Activity Bar](https://via.placeholder.com/300x400/2D3748/FFFFFF?text=🎵+CodeTune+Activity+Bar)

### YouTube Music Search
![YouTube Search](https://via.placeholder.com/300x400/2D3748/FFFFFF?text=🔍+YouTube+Music+Search)

### Main Interface
![Main Interface](https://via.placeholder.com/300x400/2D3748/FFFFFF?text=🎛️+Main+Interface)

</div>

## 🎯 Commands

| Command | Description |
|---------|-------------|
| `codeTune.openPlayer` | Open the main CodeTune interface |
| `codeTune.playMusic` | Play local music |
| `codeTune.playQuran` | Play Quran recitation |
| `codeTune.connectSpotify` | Connect to Spotify |
| `codeTune.searchSpotify` | Search Spotify catalog |
| `codeTune.pause` | Pause all players |
| `codeTune.stop` | Stop all players |

## 🔧 Development

### Prerequisites
- Node.js 16+
- VS Code 1.74+

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd codetune

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package the extension
npm run package
```

### Project Structure
```
src/
├── extension.ts              # Main extension entry point
├── file/
│   ├── musicPlayer.ts        # Local music player
│   └── quranPlayer.ts        # Quran player
└── logic/
    ├── spotifyService.ts     # Spotify API integration
    └── webviewPanel.ts       # Main UI interface
```

## 🐛 Troubleshooting

### Spotify Connection Issues
1. **Check credentials**: Ensure Client ID and Secret are correct
2. **Redirect URI**: Must match exactly what's configured in Spotify Developer Dashboard
3. **Deployed server**: Ensure your callback server is running and accessible
4. **Scopes**: The app needs proper permissions for playback control
5. **Re-authenticate**: Try disconnecting and reconnecting
6. **HTTPS requirement**: For production, use HTTPS redirect URIs (Vercel/Railway provide this automatically)

### Audio Not Playing
1. **Check volume**: Ensure volume is not muted
2. **Browser permissions**: Allow audio playback in browser
3. **File paths**: Verify local audio files exist
4. **Network**: Check internet connection for streaming

### Extension Not Loading
1. **Reload VS Code**: `Ctrl+Shift+P` → "Developer: Reload Window"
2. **Check console**: Look for errors in Developer Console
3. **Update dependencies**: Run `npm install`

## 📝 Requirements

- VS Code 1.74.0 or higher
- Spotify Premium account (for full playback features)
- Internet connection (for Spotify and online Quran streaming)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Spotify Web API for music integration
- VS Code Extension API for the development platform
- Quran audio sources for recitation content

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Search existing issues on GitHub
3. Create a new issue with detailed information
4. Include your VS Code version and error logs

---

**Happy coding with peaceful sounds! 🎵📿**
