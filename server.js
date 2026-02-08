require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { runMigrations } = require('./src/config/migrations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 30 * 60 * 1000 // 30 minutes
    }
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes (will be added later)
// app.use('/api/templates', require('./src/routes/template.routes'));
// app.use('/api/boxes', require('./src/routes/box.routes'));
// app.use('/api/mappings', require('./src/routes/mapping.routes'));
// app.use('/api/export', require('./src/routes/export.routes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'DocsMapper API is running' });
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Run database migrations
        await runMigrations();

        // Start server
        app.listen(PORT, () => {
            console.log(`✅ Server running on http://localhost:${PORT}`);
            console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();
