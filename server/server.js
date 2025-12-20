const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check - kept for monitoring purposes
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'CodeTune Health Check - Islamic APIs moved to extension'
    });
});

// Catch-all route for removed APIs
app.get('/api/*', (req, res) => {
    res.status(410).json({
        error: 'Gone',
        message: 'This API endpoint has been removed. Islamic calculations are now handled locally in the VS Code extension.',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`CodeTune Health Check server running on port ${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log(`Note: Islamic APIs have been moved to the VS Code extension for better performance`);
});

module.exports = app;
