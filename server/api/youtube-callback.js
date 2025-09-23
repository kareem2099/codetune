const express = require('express');
const axios = require('axios');

// Create Express app for Vercel serverless function
const app = express();

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// YouTube OAuth configuration
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || '';
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || '';
const YOUTUBE_SERVER_URL = process.env.VERCEL_SERVER_URL || '';

// Configure axios with optimized settings for serverless
const axiosInstance = axios.create({
    timeout: 5000, // 5 seconds timeout for serverless environment
    headers: {
        'User-Agent': 'CodeTune-VSCode-Extension/1.0'
    }
});

// Background token exchange function
async function exchangeToken(code, redirectUri) {
    try {
        console.log('🔄 Starting background token exchange...');

        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: YOUTUBE_CLIENT_ID,
            client_secret: YOUTUBE_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        }, {
            timeout: 5000, // 5 second timeout for token exchange
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ Token exchange completed successfully');
        return tokenResponse.data;
    } catch (error) {
        console.error('❌ Background token exchange failed:', error.response?.data || error.message);
        throw error;
    }
}

// YouTube OAuth callback endpoint - OPTIMIZED for serverless
app.get('/youtube-callback', async (req, res) => {
    // Set short response timeout to prevent hanging
    const responseTimeout = setTimeout(() => {
        console.error('❌ YouTube callback response timeout');
        if (!res.headersSent) {
            res.status(504).json({
                error: 'timeout',
                message: 'Request timeout - please try again'
            });
        }
    }, 5000); // 5 seconds timeout for immediate response

    try {
        const { code, error, state } = req.query;

        console.log('🎵 YouTube OAuth Callback received:', {
            code: code ? 'present' : 'missing',
            error,
            state,
            timestamp: new Date().toISOString()
        });

        // Handle OAuth errors immediately
        if (error) {
            console.error('❌ YouTube OAuth Error:', error);
            clearTimeout(responseTimeout);
            return res.status(400).json({
                error: 'oauth_error',
                message: `Authentication error: ${error}`,
                details: 'Please try connecting to YouTube Music again'
            });
        }

        // Handle successful authorization code
        if (code) {
            const redirectUri = process.env.VERCEL_SERVER_URL || 'https://server-nu-lovat.vercel.app/youtube-callback';

            // Send immediate success response
            clearTimeout(responseTimeout);
            res.json({
                status: 'processing',
                message: 'Authentication successful - processing tokens...',
                timestamp: new Date().toISOString()
            });

            // Process token exchange in background (non-blocking)
            exchangeToken(code, redirectUri)
                .then((tokenData) => {
                    console.log('✅ Background token exchange completed:', {
                        has_access_token: !!tokenData.access_token,
                        has_refresh_token: !!tokenData.refresh_token,
                        expires_in: tokenData.expires_in
                    });

                    // TODO: Store tokens securely and notify the extension
                    // This could be done via webhook, database, or other storage mechanism
                })
                .catch((tokenError) => {
                    console.error('❌ Background token exchange failed:', {
                        error: tokenError.response?.data || tokenError.message,
                        status: tokenError.response?.status,
                        timestamp: new Date().toISOString()
                    });

                    // TODO: Implement retry logic or error notification
                });

            return; // Exit early since we already responded
        }

        // No code or error - send processing message
        clearTimeout(responseTimeout);
        res.json({
            status: 'waiting',
            message: 'Waiting for YouTube authentication...',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Unexpected error in YouTube callback:', error);
        clearTimeout(responseTimeout);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'server_error',
                message: 'An unexpected error occurred',
                details: 'Please try again'
            });
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'CodeTune YouTube Callback' });
});

// Export for Vercel serverless function
const serverless = require('serverless-http');
module.exports = serverless(app);
