import express from 'express'
import rateLimit from 'express-rate-limit'
import { isAuthenticated, login, logout, register, resetPassword, sendResetOtp, sendVerifyOtp, verifyEmail, verifyResetOtp, testEmail, getEmailStatus } from '../controllers/authController.js'
import userAuth from '../middleware/userAuth.js';
const authRouter = express.Router();

// Strict rate limiter for sensitive operations (login, register, password reset)
const strictAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Allow only 10 attempts per window
    message: { success: false, message: "Too many authentication attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development'
    }
})

// More lenient rate limiter for frequent checks (is-authenticated)
const lenientAuthLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120, // Allow 120 requests per minute (more generous for auth checks)
    message: { success: false, message: "Too many requests, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development'
    }
})

// OTP rate limiter (more restrictive for OTP endpoints)
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Allow only 5 OTP requests per window
    message: { success: false, message: "Too many OTP requests, please wait before trying again" },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting in development
        return process.env.NODE_ENV === 'development'
    }
})

// Apply rate limiters to specific routes
authRouter.post('/register', strictAuthLimiter, register);
authRouter.post('/login', strictAuthLimiter, login);
authRouter.post('/logout', logout); // No rate limit for logout
authRouter.post('/send-verify-otp', otpLimiter, sendVerifyOtp); // No auth required - can send by email
authRouter.post('/verify-email', otpLimiter, verifyEmail); // No auth required - verify by email and OTP
authRouter.post('/verify-account', otpLimiter, userAuth, verifyEmail); // Alternative route with auth (for backwards compatibility)
authRouter.get('/is-authenticated', lenientAuthLimiter, isAuthenticated);
authRouter.post('/send-reset-otp', otpLimiter, sendResetOtp);
authRouter.post('/verify-reset-otp', otpLimiter, verifyResetOtp);
authRouter.post('/reset-password', otpLimiter, resetPassword);

// Admin-only email testing endpoints
authRouter.post('/test-email', userAuth, testEmail);
authRouter.get('/email-status', userAuth, getEmailStatus);

export default authRouter;