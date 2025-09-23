import * as vscode from 'vscode';
import { QuranPlayer } from '../file/quranPlayer';

export class QuranWebviewPanel {
    private panel: vscode.WebviewPanel;
    private quranPlayer: QuranPlayer;
    private disposables: vscode.Disposable[] = [];

    constructor(
        context: vscode.ExtensionContext,
        quranPlayer: QuranPlayer
    ) {
        this.quranPlayer = quranPlayer;

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'quranPlayer',
            'Quran Player - القرآن الكريم',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')]
            }
        );

        // Set HTML content
        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => this.dispose(),
            null,
            this.disposables
        );

        // Update UI periodically
        this.updateUI();

        // Set up periodic updates
        const updateInterval = setInterval(() => {
            this.updateUI();
        }, 1000);

        // Clear interval when panel is disposed
        this.panel.onDidDispose(() => {
            clearInterval(updateInterval);
        }, null, this.disposables);
    }

    private async handleMessage(message: any) {
        switch (message.command) {
            case 'playQuran':
                await this.quranPlayer.play(message.surah);
                this.updateUI();
                break;
            case 'pauseQuran':
                this.quranPlayer.pause();
                this.updateUI();
                break;
            case 'stopQuran':
                this.quranPlayer.stop();
                this.updateUI();
                break;
            case 'setQuranVolume':
                this.quranPlayer.setVolume(message.volume);
                this.updateUI();
                break;
            case 'selectReciter':
                await this.quranPlayer.selectReciter();
                this.updateUI();
                break;
            case 'togglePlaybackMode':
                // This would be handled by the QuranPlayer if we add this functionality
                break;
            case 'searchSurah':
                this.filterSurahs(message.query);
                break;
            case 'playQuickSurah':
                await this.quranPlayer.play(message.surahNumber);
                this.updateUI();
                break;
        }
    }

    private filterSurahs(query: string) {
        // This method will be called from the webview JavaScript
        // The actual DOM manipulation happens in the webview context
        this.panel.webview.postMessage({
            command: 'filterSurahs',
            query: query
        });
    }

    private updateUI() {
        const isPlaying = this.quranPlayer.getIsPlaying();
        const currentSurah = this.quranPlayer.getCurrentSurah();
        const volume = this.quranPlayer.getVolume();

        this.panel.webview.postMessage({
            command: 'updateState',
            quranState: {
                isPlaying: isPlaying,
                currentSurah: currentSurah,
                volume: volume
            }
        });
    }

    private getWebviewContent(): string {
        return `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quran Player - القرآن الكريم</title>
    <style>
        :root {
            --primary-color: var(--vscode-button-background, #007acc);
            --primary-hover: var(--vscode-button-hoverBackground, #005a9e);
            --success-color: #4caf50;
            --warning-color: #ff9800;
            --error-color: #f44336;
            --info-color: #2196f3;
            --quran-green: #2e7d32;
            --quran-gold: #ffc107;
        }

        body {
            font-family: var(--vscode-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
            padding: 20px;
            color: var(--vscode-foreground, #cccccc);
            background: linear-gradient(135deg, var(--vscode-editor-background, #1e1e1e) 0%, #1a1a1a 100%);
            margin: 0;
            min-height: 100vh;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px 20px;
            background: linear-gradient(135deg, var(--quran-green), var(--quran-gold));
            border-radius: 20px;
            color: white;
            box-shadow: 0 8px 32px rgba(46, 125, 50, 0.3);
        }

        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }

        .header .icon {
            font-size: 1.2em;
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        }

        .header p {
            margin: 10px 0 0 0;
            font-size: 1.1em;
            opacity: 0.9;
        }

        .main-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            max-width: 1400px;
            margin: 0 auto;
        }

        .section {
            background: var(--vscode-editorWidget-background, #252526);
            border-radius: 16px;
            padding: 25px;
            border: 1px solid var(--vscode-panel-border, #3c3c3c);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }

        .section:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }

        .section-title {
            font-size: 1.4em;
            font-weight: bold;
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground, #4ec9b0);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-icon {
            font-size: 1.2em;
        }

        /* Quick Access Section */
        .quick-access {
            margin-bottom: 25px;
        }

        .quick-access-title {
            font-size: 1.1em;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .quick-access-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }

        .quick-surah-btn {
            background: linear-gradient(135deg, var(--quran-green), #388e3c);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 15px 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            min-height: 80px;
            font-size: 0.9em;
            box-shadow: 0 4px 15px rgba(46, 125, 50, 0.2);
        }

        .quick-surah-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(46, 125, 50, 0.3);
            background: linear-gradient(135deg, #388e3c, #2e7d32);
        }

        .quick-surah-btn:active {
            transform: translateY(-1px);
        }

        .surah-number {
            font-weight: bold;
            font-size: 1.1em;
            opacity: 0.9;
        }

        .surah-name {
            text-align: center;
            line-height: 1.3;
            font-weight: 500;
        }

        .surah-name.arabic {
            font-size: 1.2em;
            direction: rtl;
            margin-top: 4px;
        }

        /* Search Section */
        .search-section {
            margin: 20px 0;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--vscode-input-border, #3c3c3c);
            border-radius: 10px;
            background-color: var(--vscode-input-background, #252526);
            color: var(--vscode-input-foreground, #cccccc);
            font-size: 1em;
            transition: all 0.3s ease;
            box-sizing: border-box;
        }

        .search-input:focus {
            outline: none;
            border-color: var(--quran-green);
            box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1);
        }

        /* Surah List */
        .surah-list {
            max-height: 400px;
            overflow-y: auto;
            border: 1px solid var(--vscode-panel-border, #3c3c3c);
            border-radius: 12px;
            background: var(--vscode-editor-background, #1e1e1e);
        }

        .surah-item {
            padding: 15px 20px;
            cursor: pointer;
            border-bottom: 1px solid var(--vscode-panel-border, #3c3c3c);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
        }

        .surah-item:hover {
            background-color: var(--vscode-list-hoverBackground, #2a2d2e);
            transform: translateX(5px);
        }

        .surah-item:last-child {
            border-bottom: none;
        }

        .surah-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .surah-name-english {
            font-weight: 500;
            color: var(--vscode-textLink-foreground, #4ec9b0);
        }

        .surah-name-arabic {
            font-size: 1.1em;
            direction: rtl;
            color: var(--vscode-foreground, #cccccc);
            opacity: 0.8;
        }

        .surah-verses {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground, #cccccc99);
        }

        /* Player Controls */
        .player-section {
            background: linear-gradient(135deg, var(--vscode-editorWidget-background), var(--vscode-editor-background));
            border: 2px solid var(--quran-green);
        }

        .now-playing {
            background: linear-gradient(135deg, var(--quran-green), #388e3c);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(46, 125, 50, 0.2);
        }

        .now-playing-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 8px;
        }

        .now-playing-details {
            font-size: 0.9em;
            opacity: 0.9;
        }

        .controls {
            display: flex;
            gap: 12px;
            margin: 20px 0;
            justify-content: center;
            flex-wrap: wrap;
        }

        .control-btn {
            padding: 12px 24px;
            background: var(--primary-color);
            color: var(--vscode-button-foreground, #ffffff);
            border: none;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1em;
            font-weight: 500;
            min-width: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }

        .control-btn:hover {
            background: var(--primary-hover);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        .control-btn:active {
            transform: translateY(0);
        }

        .control-btn.playing {
            background: var(--success-color);
            animation: pulse 2s infinite;
        }

        .control-btn.reciter {
            background: linear-gradient(135deg, #ff9800, #f57c00);
            color: white;
        }

        .control-btn.settings {
            background: linear-gradient(135deg, #2196f3, #1976d2);
            color: white;
        }

        @keyframes pulse {
            0% { box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4); }
            50% { box-shadow: 0 4px 25px rgba(76, 175, 80, 0.6); }
            100% { box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4); }
        }

        /* Volume Control */
        .volume-control {
            display: flex;
            align-items: center;
            gap: 15px;
            margin: 20px 0;
            justify-content: center;
        }

        .volume-slider {
            flex: 1;
            max-width: 200px;
            height: 6px;
            border-radius: 3px;
            background: var(--vscode-scrollbarSlider-background, #5a5a5a);
            outline: none;
            -webkit-appearance: none;
        }

        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--quran-green);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .volume-value {
            font-size: 1.1em;
            font-weight: bold;
            color: var(--quran-green);
            min-width: 50px;
            text-align: center;
        }

        /* Progress Bar */
        .progress-section {
            margin: 20px 0;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--vscode-scrollbarSlider-background, #5a5a5a);
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--quran-green), var(--quran-gold));
            width: 0%;
            transition: width 0.5s ease;
            border-radius: 4px;
        }

        .progress-text {
            text-align: center;
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground, #cccccc99);
        }

        /* Status Messages */
        .status {
            padding: 12px 16px;
            border-radius: 8px;
            margin: 15px 0;
            text-align: center;
            font-weight: 500;
        }

        .status.success {
            background: rgba(76, 175, 80, 0.1);
            color: var(--success-color);
            border: 1px solid var(--success-color);
        }

        .status.warning {
            background: rgba(255, 152, 0, 0.1);
            color: var(--warning-color);
            border: 1px solid var(--warning-color);
        }

        .status.info {
            background: rgba(33, 150, 243, 0.1);
            color: var(--info-color);
            border: 1px solid var(--info-color);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .main-container {
                grid-template-columns: 1fr;
                gap: 20px;
            }

            .header h1 {
                font-size: 2em;
            }

            .quick-access-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .controls {
                flex-direction: column;
                align-items: center;
            }

            .control-btn {
                width: 100%;
                max-width: 200px;
            }
        }

        /* Scrollbar Styling */
        .surah-list::-webkit-scrollbar {
            width: 8px;
        }

        .surah-list::-webkit-scrollbar-track {
            background: var(--vscode-editor-background);
            border-radius: 4px;
        }

        .surah-list::-webkit-scrollbar-thumb {
            background: var(--quran-green);
            border-radius: 4px;
        }

        .surah-list::-webkit-scrollbar-thumb:hover {
            background: #388e3c;
        }

        /* Loading Animation */
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(46, 125, 50, 0.3);
            border-radius: 50%;
            border-top-color: var(--quran-green);
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>
            <span class="icon">📿</span>
            Quran Player
            <span class="icon">📿</span>
        </h1>
        <p>Experience the beauty of Quranic recitation - استمتع بتلاوة القرآن الكريم</p>
    </div>

    <div class="main-container">
        <!-- Quick Access Section -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">⚡</span>
                Quick Access - الوصول السريع
            </div>

            <div class="quick-access">
                <div class="quick-access-title">
                    <span>🎯</span>
                    Popular Surahs - السور المشهورة
                </div>
                <div class="quick-access-grid">
                    <button class="quick-surah-btn" onclick="playQuickSurah('036')">
                        <span class="surah-number">36</span>
                        <span class="surah-name">Ya-Sin</span>
                        <span class="surah-name arabic">يس</span>
                    </button>
                    <button class="quick-surah-btn" onclick="playQuickSurah('055')">
                        <span class="surah-number">55</span>
                        <span class="surah-name">Ar-Rahman</span>
                        <span class="surah-name arabic">الرحمن</span>
                    </button>
                    <button class="quick-surah-btn" onclick="playQuickSurah('067')">
                        <span class="surah-number">67</span>
                        <span class="surah-name">Al-Mulk</span>
                        <span class="surah-name arabic">الملك</span>
                    </button>
                    <button class="quick-surah-btn" onclick="playQuickSurah('112')">
                        <span class="surah-number">112</span>
                        <span class="surah-name">Al-Ikhlas</span>
                        <span class="surah-name arabic">الإخلاص</span>
                    </button>
                    <button class="quick-surah-btn" onclick="playQuickSurah('001')">
                        <span class="surah-number">1</span>
                        <span class="surah-name">Al-Fatiha</span>
                        <span class="surah-name arabic">الفاتحة</span>
                    </button>
                    <button class="quick-surah-btn" onclick="playQuickSurah('114')">
                        <span class="surah-number">114</span>
                        <span class="surah-name">An-Nas</span>
                        <span class="surah-name arabic">الناس</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Search and Browse Section -->
        <div class="section">
            <div class="section-title">
                <span class="section-icon">🔍</span>
                Search & Browse - البحث والتصفح
            </div>

            <div class="search-section">
                <input type="text" class="search-input" id="surahSearch" placeholder="Search for a Surah... - ابحث عن سورة" oninput="searchSurah()">
            </div>

            <div class="surah-list" id="surahList">
                <div class="surah-item" onclick="playQuran('001 - Al-Fatiha (الفاتحة)')">
                    <div class="surah-info">
                        <div class="surah-name-english">001 - Al-Fatiha (The Opening)</div>
                        <div class="surah-name-arabic">الفاتحة</div>
                        <div class="surah-verses">7 verses - 7 آيات</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('002 - Al-Baqarah (البقرة)')">
                    <div class="surah-info">
                        <div class="surah-name-english">002 - Al-Baqarah (The Cow)</div>
                        <div class="surah-name-arabic">البقرة</div>
                        <div class="surah-verses">286 verses - 286 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('003 - Aal-E-Imran (آل عمران)')">
                    <div class="surah-info">
                        <div class="surah-name-english">003 - Aal-E-Imran (The Family of Imran)</div>
                        <div class="surah-name-arabic">آل عمران</div>
                        <div class="surah-verses">200 verses - 200 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('004 - An-Nisa (النساء)')">
                    <div class="surah-info">
                        <div class="surah-name-english">004 - An-Nisa (The Women)</div>
                        <div class="surah-name-arabic">النساء</div>
                        <div class="surah-verses">176 verses - 176 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('005 - Al-Maida (المائدة)')">
                    <div class="surah-info">
                        <div class="surah-name-english">005 - Al-Maida (The Table Spread)</div>
                        <div class="surah-name-arabic">المائدة</div>
                        <div class="surah-verses">120 verses - 120 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('036 - Ya-Sin (يس)')">
                    <div class="surah-info">
                        <div class="surah-name-english">036 - Ya-Sin (Yaseen)</div>
                        <div class="surah-name-arabic">يس</div>
                        <div class="surah-verses">83 verses - 83 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('055 - Ar-Rahman (الرحمن)')">
                    <div class="surah-info">
                        <div class="surah-name-english">055 - Ar-Rahman (The Beneficent)</div>
                        <div class="surah-name-arabic">الرحمن</div>
                        <div class="surah-verses">78 verses - 78 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('067 - Al-Mulk (الملك)')">
                    <div class="surah-info">
                        <div class="surah-name-english">067 - Al-Mulk (The Sovereignty)</div>
                        <div class="surah-name-arabic">الملك</div>
                        <div class="surah-verses">30 verses - 30 آية</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('112 - Al-Ikhlas (الإخلاص)')">
                    <div class="surah-info">
                        <div class="surah-name-english">112 - Al-Ikhlas (The Sincerity)</div>
                        <div class="surah-name-arabic">الإخلاص</div>
                        <div class="surah-verses">4 verses - 4 آيات</div>
                    </div>
                </div>
                <div class="surah-item" onclick="playQuran('114 - An-Nas (الناس)')">
                    <div class="surah-info">
                        <div class="surah-name-english">114 - An-Nas (The Mankind)</div>
                        <div class="surah-name-arabic">الناس</div>
                        <div class="surah-verses">6 verses - 6 آيات</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Player Controls Section -->
        <div class="section player-section">
            <div class="section-title">
                <span class="section-icon">🎵</span>
                Now Playing - التشغيل الحالي
            </div>

            <div class="now-playing" id="nowPlaying">
                <div class="now-playing-title">Choose a Surah to begin - اختر سورة للبدء</div>
                <div class="now-playing-details">Select from Quick Access or browse the list above</div>
            </div>

            <div class="progress-section">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">Ready to play - جاهز للتشغيل</div>
            </div>

            <div class="controls">
                <button class="control-btn" onclick="toggleQuran()" id="playPauseBtn">
                    ▶️ Play - تشغيل
                </button>
                <button class="control-btn" onclick="stopQuran()" id="stopBtn">
                    ⏹️ Stop - إيقاف
                </button>
                <button class="control-btn reciter" onclick="selectReciter()">
                    👤 Reciter - القارئ
                </button>
            </div>

            <div class="volume-control">
                <span>🔊 Volume - مستوى الصوت:</span>
                <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="70" onchange="setVolume(this.value)">
                <span class="volume-value" id="volumeValue">70%</span>
            </div>

            <div class="status info" id="statusMessage">
                Welcome to Quran Player! Choose a Surah to begin your recitation.
                مرحباً بك في مشغل القرآن! اختر سورة لتبدأ التلاوة.
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        let quranState = {
            isPlaying: false,
            currentSurah: '',
            volume: 0.7
        };

        // Quick access functions
        function playQuickSurah(surahNumber) {
            const surahMap = {
                '001': '001 - Al-Fatiha (الفاتحة)',
                '036': '036 - Ya-Sin (يس)',
                '055': '055 - Ar-Rahman (الرحمن)',
                '067': '067 - Al-Mulk (الملك)',
                '112': '112 - Al-Ikhlas (الإخلاص)',
                '114': '114 - An-Nas (الناس)'
            };

            const surah = surahMap[surahNumber];
            if (surah) {
                vscode.postMessage({ command: 'playQuickSurah', surahNumber: surahNumber });
            }
        }

        // Search function
        function searchSurah() {
            const query = document.getElementById('surahSearch').value;
            vscode.postMessage({ command: 'searchSurah', query: query });
        }

        // Playback controls
        function playQuran(surah) {
            vscode.postMessage({ command: 'playQuran', surah: surah });
        }

        function toggleQuran() {
            if (quranState.isPlaying) {
                vscode.postMessage({ command: 'pauseQuran' });
            } else {
                // If no current Surah, play the first one
                if (!quranState.currentSurah) {
                    playQuran('001 - Al-Fatiha (الفاتحة)');
                } else {
                    vscode.postMessage({ command: 'playQuran', surah: quranState.currentSurah });
                }
            }
        }

        function stopQuran() {
            vscode.postMessage({ command: 'stopQuran' });
        }

        function selectReciter() {
            vscode.postMessage({ command: 'selectReciter' });
        }

        function setVolume(value) {
            const volume = value / 100;
            vscode.postMessage({ command: 'setQuranVolume', volume: volume });
            document.getElementById('volumeValue').textContent = value + '%';
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;

            if (message.command === 'updateState') {
                quranState = message.quranState;
                updateUI();
            }
        });

        function updateUI() {
            const nowPlayingEl = document.getElementById('nowPlaying');
            const playPauseBtn = document.getElementById('playPauseBtn');
            const stopBtn = document.getElementById('stopBtn');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');
            const statusMessage = document.getElementById('statusMessage');

            if (quranState.isPlaying) {
                playPauseBtn.textContent = '⏸️ Pause - إيقاف مؤقت';
                playPauseBtn.classList.add('playing');
                stopBtn.style.display = 'flex';

                if (quranState.currentSurah) {
                    nowPlayingEl.innerHTML = \`
                        <div class="now-playing-title">🎵 Now Playing - جاري التشغيل</div>
                        <div class="now-playing-details">\${quranState.currentSurah}</div>
                    \`;
                    progressText.textContent = 'Playing... - جاري التشغيل';
                    progressFill.style.width = '50%'; // Simulated progress
                    statusMessage.textContent = 'Enjoy the recitation! استمتع بالتلاوة!';
                    statusMessage.className = 'status success';
                }
            } else {
                playPauseBtn.textContent = '▶️ Play - تشغيل';
                playPauseBtn.classList.remove('playing');
                stopBtn.style.display = 'none';

                if (quranState.currentSurah) {
                    nowPlayingEl.innerHTML = \`
                        <div class="now-playing-title">⏸️ Paused - متوقف مؤقتاً</div>
                        <div class="now-playing-details">\${quranState.currentSurah}</div>
                    \`;
                    progressText.textContent = 'Paused - متوقف مؤقتاً';
                    progressFill.style.width = '25%';
                    statusMessage.textContent = 'Ready to resume - جاهز للاستئناف';
                    statusMessage.className = 'status warning';
                } else {
                    nowPlayingEl.innerHTML = \`
                        <div class="now-playing-title">Choose a Surah to begin - اختر سورة للبدء</div>
                        <div class="now-playing-details">Select from Quick Access or browse the list above</div>
                    \`;
                    progressText.textContent = 'Ready to play - جاهز للتشغيل';
                    progressFill.style.width = '0%';
                    statusMessage.textContent = 'Welcome to Quran Player! Choose a Surah to begin your recitation. مرحباً بك في مشغل القرآن! اختر سورة لتبدأ التلاوة.';
                    statusMessage.className = 'status info';
                }
            }

            // Update volume slider
            document.getElementById('volumeSlider').value = quranState.volume * 100;
            document.getElementById('volumeValue').textContent = Math.round(quranState.volume * 100) + '%';
        }

        // Initialize UI
        updateUI();

        // Add smooth scrolling for better UX
        document.querySelector('.surah-list').addEventListener('wheel', function(event) {
            if (event.deltaY !== 0) {
                this.scrollTop += event.deltaY;
                event.preventDefault();
            }
        });
    </script>
</body>
</html>`;
    }

    public reveal() {
        this.panel.reveal(vscode.ViewColumn.One);
    }

    public onDispose(callback: () => void) {
        this.panel.onDidDispose(callback, null, this.disposables);
    }

    public refresh() {
        this.panel.webview.html = this.getWebviewContent();
        this.updateUI();
    }

    public dispose() {
        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
