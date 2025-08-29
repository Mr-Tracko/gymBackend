const path = require("path");
const express = require("express");
const cors = require('cors');
const mongoose = require("mongoose");
const userRoute = require("./routes/user");
const authRoute = require("./routes/auth"); // Add this line
const cookieParser = require("cookie-parser");

const { checkForAuthenticationCookie, checkForBearerToken } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8001;

// CORS configuration - allow both localhost and your Vercel frontend
app.use(cors({
    origin: [
        'https://gym-frontend-taupe.vercel.app/', 
        'https://fitness-tracker-v4.vercel.app',
        'https://your-frontend-domain.vercel.app' // Replace with your actual frontend URL
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Use Bearer token authentication for API routes
app.use('/api', checkForBearerToken);
// Use cookie authentication for web routes
app.use(checkForAuthenticationCookie("token"));

app.use(express.static(path.resolve("./public")));

// MongoDB Connection with Error Handling
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log("MongoDB Atlas connected successfully"))
    .catch(err => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// API Routes (with /api prefix)
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);

// Web Routes (existing routes for web interface)
app.use("/user", userRoute);

// const authRoute = require("./routes/auth");
// app.use("/api/auth", authRoute);

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
            ]
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
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB URI: ${MONGODB_URI}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});