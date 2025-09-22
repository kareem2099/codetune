const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 8888;

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static('public'));

// YouTube OAuth configuration
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;

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
        try {
            console.log('✅ Received YouTube authorization code, exchanging for tokens...');

            // Exchange authorization code for access token
            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                client_id: YOUTUBE_CLIENT_ID,
                client_secret: YOUTUBE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: `http://localhost:${port}/youtube-callback`
            });

            const tokenData = tokenResponse.data;
            console.log('✅ YouTube tokens received successfully');

            // Show success page and automatically close
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
                        }
                        h1 { margin-bottom: 1rem; color: #4CAF50; }
                        .success { color: #4CAF50; }
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
                        <p class="success">CodeTune has been successfully connected to your YouTube Music account.</p>
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
        } catch (tokenError) {
            console.error('❌ Failed to exchange YouTube authorization code for tokens:', tokenError.response?.data || tokenError.message);
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>CodeTune - YouTube Token Exchange Error</title>
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
                        <h1>❌ Token Exchange Failed</h1>
                        <p class="error">Failed to complete YouTube authentication.</p>
                        <p>Please try connecting again.</p>
                        <button onclick="window.close()">Close Window</button>
                    </div>
                </body>
                </html>
            `);
        }
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

// Start the server
app.listen(port, () => {
    console.log(`🚀 CodeTune YouTube callback server running on port ${port}`);
    console.log(`📱 Health check available at: http://localhost:${port}/health`);
    console.log(`🎵 YouTube OAuth callback available at: http://localhost:${port}/youtube-callback`);
});
