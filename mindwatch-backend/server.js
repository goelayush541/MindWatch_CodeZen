const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// 1. CORS Implementation
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'http://localhost:5173',
        'https://mindwatch.netlify.app',
        'https://mind-watch-code-zen.vercel.app'
    ];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Vercel health checks)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`[CORS Blocked] ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health route (always works, even without DB)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'MindWatch API is accessible',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: {
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasMongoUri: !!process.env.MONGODB_URI,
            hasGroqKey: !!process.env.GROQ_API_KEY,
            nodeEnv: process.env.NODE_ENV,
            allowedOrigins: allowedOrigins
        }
    });
});

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'MindWatch AI Backend is running! (Canary v3)' });
});

// Routes - wrapped in try-catch to prevent one broken route from crashing the whole app
try {
    app.use('/api/auth', require('./routes/auth.routes'));
    app.use('/api/chat', require('./routes/chat.routes'));
    app.use('/api/mood', require('./routes/mood.routes'));
    app.use('/api/journal', require('./routes/journal.routes'));
    app.use('/api/mindfulness', require('./routes/mindfulness.routes'));
    app.use('/api/analysis', require('./routes/analysis.routes'));
    app.use('/api/face', require('./routes/face.routes'));
} catch (err) {
    console.error('Failed to load one or more route files:', err.message);
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message
    });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI is not set!');
            return;
        }
        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
};

// Only listen locally (not on Vercel or Netlify)
if (process.env.NODE_ENV !== 'production' || (!process.env.VERCEL && !process.env.NETLIFY)) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    });
} else {
    connectDB();
}

// Export for Vercel
module.exports = app;
