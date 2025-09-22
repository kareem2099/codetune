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
        // Success - automatically handle the authorization code
        console.log('✅ Received Spotify authorization code');

        // Show success page and automatically close
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
                    .success { color: #4CAF50; }
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
                    <h1>✅ Authentication Successful!</h1>
                    <p class="success">CodeTune has been successfully connected to your Spotify account.</p>
                    <p>This window will close automatically in 3 seconds...</p>
                    <button onclick="window.close()">Close Now</button>
                </div>

                <script>
                    // Auto-close after 3 seconds
                    setTimeout(() => {
                        window.close();
                    }, 3000);
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
