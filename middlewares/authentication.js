// const { validateToken } = require('../services/authentication');
// const User = require("../models/user");

// function checkForAuthenticationCookie(cookieName){
//     return (req , res , next) => {
//         const tokenCookieValue = req.cookies[cookieName];
//         if(!tokenCookieValue){
//             return next();
//         }

//         try{
//             const userPayload = validateToken(tokenCookieValue);
//             req.user = userPayload;
//         } catch(error){}

//         return next();
//     }
// }

// module.exports = checkForAuthenticationCookie;

const { validateToken } = require('../services/authentication');
const User = require("../models/user");

function checkForAuthenticationCookie(cookieName) {
    return (req, res, next) => {
        let token = null;
        
        // Check for token in cookies first
        const tokenCookieValue = req.cookies[cookieName];
        if (tokenCookieValue) {
            token = tokenCookieValue;
        }
        
        // If no cookie token, check Authorization header (Bearer token)
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }
        
        // If no token found, proceed without authentication
        if (!token) {
            return next();
        }

        try {
            const userPayload = validateToken(token);
            req.user = userPayload;
        } catch (error) {
            console.error('Token validation error:', error);
            // Invalid token, but don't block the request for web routes
        }

        return next();
    }
}

// Bearer token middleware for API routes
function checkForBearerToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    // If no authorization header, continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }
    
    const token = authHeader.substring(7);
    
    try {
        const userPayload = validateToken(token);
        req.user = userPayload;
        return next();
    } catch (error) {
        console.error('Bearer token validation error:', error);
        // For API routes, don't automatically fail - let the specific route handle authentication requirements
        return next();
    }
}

// Middleware to require authentication
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
}

// Middleware to check authentication but not require it
function optionalAuth(req, res, next) {
    // Authentication is already checked by checkForBearerToken or checkForAuthenticationCookie
    // This middleware just passes through
    next();
}

module.exports = {
    checkForAuthenticationCookie,
    checkForBearerToken,
    requireAuth,
    optionalAuth
};