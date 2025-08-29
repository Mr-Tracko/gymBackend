const { Router } = require("express");
const User = require("../models/user");
const { createTokenForUser } = require("../services/authentication");
const router = Router();

// Register endpoint
router.post("/register", async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        // Validate required fields
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                error: "Invalid input",
                message: "Full name, email, and password are required",
                details: [
                    !fullName && "Full name is required",
                    !email && "Email is required", 
                    !password && "Password is required"
                ].filter(Boolean)
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid input",
                message: "Invalid email format",
                details: ["Email format is invalid"]
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Invalid input", 
                message: "Password must be at least 6 characters long",
                details: ["Password must be at least 6 characters long"]
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "User already exists",
                message: "An account with this email already exists",
                details: ["Email is already registered"]
            });
        }
        
        // Create new user
        const user = await User.create({
            fullName,
            email,
            password,
        });
        
        // Generate token
        const token = createTokenForUser(user);
        
        // Send response
        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                publicImageURL: user.publicImageURL
            }
        });
        
    } catch (error) {
        console.error("Registration error:", error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const details = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: "Invalid input",
                message: "Validation failed",
                details
            });
        }
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "User already exists",
                message: "An account with this email already exists",
                details: ["Email is already registered"]
            });
        }
        
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Something went wrong. Please try again later.",
            details: ["Server error occurred"]
        });
    }
});

// Login endpoint
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Invalid input",
                message: "Email and password are required",
                details: [
                    !email && "Email is required",
                    !password && "Password is required"
                ].filter(Boolean)
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: "Invalid input",
                message: "Invalid email format",
                details: ["Email format is invalid"]
            });
        }
        
        try {
            // Use the existing static method to verify password and generate token
            const token = await User.matchPasswordAndGenerateToken(email, password);
            const user = await User.findOne({ email });
            
            res.json({
                success: true,
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    publicImageURL: user.publicImageURL
                }
            });
            
        } catch (authError) {
            if (authError.message === "User Not Found") {
                return res.status(401).json({
                    success: false,
                    error: "Authentication failed",
                    message: "Invalid email or password",
                    details: ["User not found"]
                });
            }
            
            if (authError.message === "Incorrect Password") {
                return res.status(401).json({
                    success: false,
                    error: "Authentication failed", 
                    message: "Invalid email or password",
                    details: ["Incorrect password"]
                });
            }
            
            throw authError; // Re-throw if it's not a known auth error
        }
        
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Something went wrong. Please try again later.",
            details: ["Server error occurred"]
        });
    }
});

// Token verification endpoint
router.get("/verify-token", async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "No valid token provided"
            });
        }
        
        // Get fresh user data from database
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }
        
        res.json({
            success: true,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                publicImageURL: user.publicImageURL
            }
        });
        
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during token verification"
        });
    }
});

// Logout endpoint (optional - mainly clears server-side sessions if any)
router.post("/logout", (req, res) => {
    // Clear cookie if using cookies
    res.clearCookie("token");
    
    res.json({
        success: true,
        message: "Logged out successfully"
    });
});

module.exports = router;