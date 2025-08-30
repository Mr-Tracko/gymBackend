require("dotenv").config(); 
const path = require("path");
const express = require("express");
const cors = require('cors');
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

// Import routes
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth");

// Import middlewares
const { checkForAuthenticationCookie, checkForBearerToken } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 5000; // Fixed: Added fallback port

// CORS configuration - Fixed: Removed trailing slashes
app.use(cors({
    origin: [
        'https://gym-frontend-taupe.vercel.app', 
        'http://localhost:5173', 
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(express.static(path.resolve("./public")));

// MongoDB Connection with Error Handling
const MONGODB_URI = process.env.MONGODB_URI;

console.log('Attempting to connect to MongoDB...');
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB Atlas connected successfully");
    })
    .catch(err => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });

// Connection event listeners
mongoose.connection.on('connected', () => {
    console.log('✅ Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ Mongoose disconnected from MongoDB Atlas');
});

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Public API routes (no authentication middleware)
app.use("/api/auth", authRoute);

// Protected API routes (with Bearer token authentication)
app.use('/api', checkForBearerToken);
app.use("/api/user", userRoute);

// Protected Web routes (with cookie authentication) 
app.use(checkForAuthenticationCookie("token"));
app.use("/user", userRoute);

// Home Route (for web interface)
app.get("/", async (req, res) => {
    try {
        res.json({
            success: true,
            message: "Fitness Tracker API is running",
            user: req.user || null,
            routes: [
                "POST /api/auth/register",
                "POST /api/auth/login", 
                "GET /api/auth/verify-token",
                "POST /api/auth/logout"
            ],
            mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
        });
    } catch (err) {
        console.error("Error in home route:", err);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error("Global error:", error);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 MongoDB URI configured: ${MONGODB_URI ? 'Yes' : 'No'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});