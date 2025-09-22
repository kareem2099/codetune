const express = require('express');
const axios = require('axios');

// Create Express app for Vercel serverless function
const app = express();

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// YouTube OAuth callback endpoint
app.get('/youtube-callback', async (req, res) => {
    const { code, error, state } = req.query;

    console.log('🎵 YouTube OAuth Callback received:', { code: code ? 'present' : 'missing', error, state });

    if (error) {
        console.error('❌ YouTube OAuth Error:', error);
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CodeTune - YouTube Authentication Error</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 2rem;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                    }
                    h1 { margin-bottom: 1rem; }
                    .error { color: #ff6b6b; }
                    button {
                        background: #ff0000;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ YouTube Authentication Error</h1>
                    <p class="error">Error: ${error}</p>
                    <p>Please try connecting to YouTube Music again.</p>
                    <button onclick="window.close()">Close Window</button>
                </div>
            </body>
            </html>
        `);
    }

    if (code) {
        console.log('✅ Received YouTube authorization code:', code.substring(0, 10) + '...');

        // Show success page - the VS Code extension will handle token exchange
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CodeTune - YouTube Authentication Successful</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 2rem;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                        max-width: 500px;
                    }
                    h1 { margin-bottom: 1rem; color: #4CAF50; }
                    .success { color: #4CAF50; }
                    .code-display {
                        background: rgba(0, 0, 0, 0.2);
                        padding: 1rem;
                        border-radius: 10px;
                        margin: 1rem 0;
                        font-family: monospace;
                        font-size: 14px;
                        word-break: break-all;
                    }
                    button {
                        background: #ff0000;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 16px;
                        margin-top: 1rem;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ YouTube Authentication Successful!</h1>
                    <p class="success">CodeTune has received the authorization code from YouTube.</p>

                    <div class="code-display">
                        <p><strong>Authorization Code:</strong></p>
                        <p>${code}</p>
                    </div>

                    <p><strong>Next Steps:</strong></p>
                    <p>1. Copy the authorization code above</p>
                    <p>2. Return to VS Code</p>
                    <p>3. Paste the code when prompted</p>

                    <p>This window will close automatically in 10 seconds...</p>
                    <button onclick="copyCodeAndClose()">Copy Code & Close</button>
                </div>

                <script>
                    function copyCodeAndClose() {
                        navigator.clipboard.writeText('${code}').then(() => {
                            // Show a brief success message
                            const container = document.querySelector('.container');
                            const originalContent = container.innerHTML;
                            container.innerHTML = '<h1 style="color: #4CAF50;">✅ Code Copied!</h1><p>Authorization code copied to clipboard.</p><p>Return to VS Code and paste the code.</p><button onclick="window.close()">Close Window</button>';

                            setTimeout(() => {
                                window.close();
                            }, 2000);
                        }).catch(() => {
                            alert('Failed to copy code. Please copy it manually.');
                            window.close();
                        });
                    }

                    // Auto-close after 10 seconds
                    setTimeout(() => {
                        window.close();
                    }, 10000);
                </script>
            </body>
            </html>
        `);
    }

    // No code or error - show generic message
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>CodeTune - YouTube Callback</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #ff0000 0%, #ff6b6b 100%);
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                }
                h1 { margin-bottom: 1rem; }
                button {
                    background: #ff0000;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔄 Processing YouTube Authentication...</h1>
                <p>This window should close automatically.</p>
                <button onclick="window.close()">Close Window</button>
            </div>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'CodeTune YouTube Callback' });
});

// Export for Vercel serverless function
module.exports = app;
