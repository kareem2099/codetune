const express = require('express');
const app = express();
const port = process.env.PORT || 8888;

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

// Store for pending authentication requests
const pendingAuths = new Map();

// Endpoint to check authentication status
app.get('/auth-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const authData = pendingAuths.get(sessionId);

    if (authData) {
        res.json({
            status: 'completed',
            code: authData.code,
            error: authData.error
        });
        // Clean up after sending
        pendingAuths.delete(sessionId);
    } else {
        res.json({ status: 'pending' });
    }
});

// Spotify OAuth callback endpoint
app.get('/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.error('Spotify OAuth Error:', error);
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CodeTune - Authentication Error</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                        background: #1db954;
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
                    <h1>❌ Authentication Error</h1>
                    <p class="error">Error: ${error}</p>
                    <p>Please try connecting to Spotify again.</p>
                    <button onclick="window.close()">Close Window</button>
                </div>
            </body>
            </html>
        `);
    }

    if (code) {
        // Success - show success page with the authorization code
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>CodeTune - Authentication Successful</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .container {
                        text-align: center;
                        padding: 2rem;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                    }
                    h1 { margin-bottom: 1rem; color: #1db954; }
                    .code {
                        background: rgba(0, 0, 0, 0.2);
                        padding: 1rem;
                        border-radius: 10px;
                        font-family: monospace;
                        margin: 1rem 0;
                        word-break: break-all;
                    }
                    button {
                        background: #1db954;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 0.5rem;
                    }
                    .copy-btn {
                        background: #667eea;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Authentication Successful!</h1>
                    <p>CodeTune has been successfully connected to your Spotify account.</p>
                    <p>Please copy the authorization code below and paste it back in VS Code:</p>
                    <div class="code" id="authCode">${code}</div>
                    <div>
                        <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
                        <button onclick="window.close()">✅ Done</button>
                    </div>
                </div>

                <script>
                    function copyCode() {
                        const codeElement = document.getElementById('authCode');
                        const range = document.createRange();
                        range.selectNode(codeElement);
                        window.getSelection().removeAllRanges();
                        window.getSelection().addRange(range);
                        document.execCommand('copy');
                        window.getSelection().removeAllRanges();

                        // Visual feedback
                        const copyBtn = document.querySelector('.copy-btn');
                        const originalText = copyBtn.textContent;
                        copyBtn.textContent = '✅ Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = originalText;
                        }, 2000);
                    }

                    // Auto-select the code for easy copying
                    document.getElementById('authCode').onclick = function() {
                        this.select();
                        document.execCommand('copy');
                    };
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
            <title>CodeTune - Callback</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
                    background: #1db954;
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
                <h1>🔄 Processing...</h1>
                <p>This window should close automatically.</p>
                <button onclick="window.close()">Close Window</button>
            </div>
        </body>
        </html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'CodeTune Spotify Callback' });
});

// Start the server
app.listen(port, () => {
    console.log(`🚀 CodeTune Spotify callback server running on port ${port}`);
    console.log(`📱 Health check available at: http://localhost:${port}/health`);
});
