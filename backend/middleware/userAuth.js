import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'
import { ensureDBAndExecute } from '../utils/dbHelper.js'
import mongoose from 'mongoose'

const userAuth = async (req, res, next) => {
    const {token} = req.cookies;
    if (!token){
        return res.status(401).json({
            success: false,
            message: "Not Authorized. Please Login"
        })
    }
    try {
        const tokenDecode = jwt.verify(token, process.env.JWT_SECRET)
        if (tokenDecode.id){
            // Ensure req.body exists
            if (!req.body) {
                req.body = {};
            }
            
            // IMPORTANT: Only set req.body.userId if it doesn't already exist
            // This prevents overwriting the target user's ID (e.g., when creating wallets for other users)
            // The logged-in user's ID is available via req.user, not req.body.userId
            if (!req.body.userId) {
                req.body.userId = tokenDecode.id;
            }

            // Attach minimal user object for downstream use (logged-in user)
            // Use ensureDBAndExecute to prevent buffering timeout
            const user = await ensureDBAndExecute(
                () => userModel.findById(tokenDecode.id).select('-password').lean(),
                { maxWaitTime: 5000, throwOnError: false }
            );
            
            if (user) {
                req.user = user
            } else if (user === null) {
                // Database connection issue
                return res.status(503).json({
                    success: false,
                    message: "Service temporarily unavailable. Please try again later."
                })
            }
        }else{
            return res.status(401).json({
                success: false,
                message: "Not Authorized. Please Login"
            })
        }
        next();
    } catch (error) {
        // Handle JWT errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Not Authorized. Please Login"
            })
        }
        
        // Handle database errors securely
        if (error.name === 'DatabaseConnectionError' || 
            (error.message && error.message.includes('connection'))) {
            return res.status(503).json({
                success: false,
                message: "Service temporarily unavailable. Please try again later."
            })
        }
        
        // Generic error (don't expose internal error details)
        return res.status(401).json({
            success: false,
            message: "Not Authorized. Please Login"
        })
    }
}

export default userAuth;