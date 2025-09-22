#!/usr/bin/env node

/**
 * YouTube OAuth Callback Server Startup Script
 *
 * This script starts the YouTube OAuth callback server that handles
 * the OAuth flow completion for YouTube Music authentication.
 *
 * Usage:
 *   node server/start-youtube-server.js
 *
 * The server will start on port 8888 (or PORT environment variable)
 * and handle YouTube OAuth callbacks at /youtube-callback
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎵 Starting CodeTune YouTube OAuth Callback Server...');
console.log('📡 Server will handle YouTube authentication callbacks');
console.log('🔗 Make sure to set up your YouTube OAuth credentials in .env file');
console.log('📖 Check .env.example for required environment variables\n');

// Start the YouTube callback server
const serverProcess = spawn('node', [path.join(__dirname, 'youtube-callback.js')], {
    stdio: 'inherit',
    env: process.env
});

// Handle server process events
serverProcess.on('error', (error) => {
    console.error('❌ Failed to start YouTube callback server:', error.message);
    process.exit(1);
});

serverProcess.on('exit', (code, signal) => {
    if (code !== 0) {
        console.log(`\n⚠️  YouTube callback server exited with code ${code}`);
        if (signal) {
            console.log(`   Signal: ${signal}`);
        }
    } else {
        console.log('\n✅ YouTube callback server stopped gracefully');
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down YouTube callback server...');
    serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down YouTube callback server...');
    serverProcess.kill('SIGTERM');
});

console.log('🚀 YouTube callback server starting...');
console.log('📱 Server endpoints:');
console.log('   - Health check: http://localhost:8888/health');
console.log('   - YouTube OAuth callback: http://localhost:8888/youtube-callback');
console.log('\n💡 Press Ctrl+C to stop the server\n');
