# 🎵 CodeTune - Relaxing Music & Quran for Developers

CodeTune is a VS Code extension that brings relaxation and focus to your coding sessions with integrated music players and Quran recitation capabilities. Perfect for developers who want to create a peaceful coding environment.

## ✨ Features

### 🎵 **Spotify Integration**
- **Connect your Spotify account** and play your personal music library
- **Search Spotify's catalog** directly from VS Code
- **Full playback controls** - play, pause, skip, previous, volume control
- **Real-time playback status** with current track information
- **Your playlists and liked songs** accessible within the extension

### 🎹 **Local Music Player**
- Play local audio files (MP3, WAV, OGG)
- Built-in relaxing tracks for focus and meditation
- Customizable volume controls
- Track selection and playback management

### 📿 **Quran Player**
- **Multiple Quran reciters** to choose from
- **Complete Surah list** with Arabic text and transliteration
- **Online streaming** for high-quality audio
- **Reciter selection** for personalized experience
- **Volume controls** for comfortable listening

### 🎛️ **Beautiful Interface**
- **Modern webview panel** with responsive design
- **Real-time status indicators** for all players
- **Intuitive controls** with hover effects
- **Dark/light theme support** matching VS Code
- **Grid layout** for easy navigation

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

### Opening CodeTune
- **Command Palette**: `Ctrl+Shift+P` → "CodeTune: Open CodeTune Player"
- **Status Bar**: Click the "CodeTune" button
- **Keyboard Shortcut**: Configure your own shortcuts in VS Code settings

### Spotify Controls
1. **Connect**: Click "Connect" in the Spotify section
2. **Authenticate**: Follow the browser authentication flow
3. **Search**: Use the search box to find tracks, artists, or albums
4. **Play**: Click on any track or use the playback controls
5. **Control**: Use play/pause, next/previous, and volume controls

### Local Music
1. **Select Track**: Choose from the built-in relaxing tracks
2. **Play**: Click play or use the toggle button
3. **Volume**: Adjust using the volume slider

### Quran Player
1. **Select Surah**: Choose from the list of available Surahs
2. **Select Reciter**: Click "Select Reciter" to choose your preferred reciter
3. **Play**: Start recitation with play controls
4. **Volume**: Adjust volume for comfortable listening

### Keyboard Shortcuts

Configure these in VS Code settings:

- `Ctrl+Shift+M`: Play local music
- `Ctrl+Shift+Q`: Play Quran

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
