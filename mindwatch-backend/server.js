const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat.routes');
const moodRoutes = require('./routes/mood.routes');
const journalRoutes = require('./routes/journal.routes');
const mindfulnessRoutes = require('./routes/mindfulness.routes');
const analysisRoutes = require('./routes/analysis.routes');
const faceRoutes = require('./routes/face.routes');

const app = express();

// Security middleware
app.use(helmet());

const allowedOrigins = [
    'http://localhost:5173',
    'https://mindwatch.netlify.app'
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Standard middleware
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Health route (at the top for easy debugging)
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'MindWatch API is accessible',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: {
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasMongoUri: !!process.env.MONGODB_URI,
            hasGroqKey: !!process.env.GROQ_API_KEY,
            nodeEnv: process.env.NODE_ENV
        }
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/mindfulness', mindfulnessRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/face', faceRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'MindWatch AI Backend is running! (Canary v2)' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB without blocking
const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return;

        console.log('⏳ Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
    }
};

// Only listen if not handled by a serverless provider (Vercel/Netlify)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    });
} else {
    // In Vercel, we just want to ensure DB connection attempt starts
    connectDB();
}
// Export app for Vercel
module.exports = app;
