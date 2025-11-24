import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import multer from "multer";
import connectDB from './config/mongoDB.js'
import authRouter from './routes/authRoutes.js'
import userRouter from "./routes/userRoutes.js";
import eventRouter from "./routes/eventRoutes.js";
import donationRouter from "./routes/donationRoutes.js";
import inKindDonationRouter from "./routes/inKindDonationRoutes.js";
import volunteerRouter from "./routes/volunteerRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import subscriptionRouter from "./routes/subscriptionRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import commentRouter from "./routes/commentRoutes.js";
import reactionRouter from "./routes/reactionRoutes.js";
import facebookRouter from "./routes/facebookRoutes.js";
import systemSettingsRouter from "./routes/systemSettingsRoutes.js";
import feedbackRouter from "./routes/feedbackRoutes.js";
import pushNotificationRouter from "./routes/pushNotificationRoutes.js";
import walletRouter from "./routes/walletRoutes.js";
import auditLogRouter from "./routes/auditLogRoutes.js";
import { scheduleReminders } from './utils/reminderScheduler.js'
import { startMaintenanceScheduler } from './utils/maintenanceScheduler.js'
import { startFeedbackScheduler } from './utils/feedbackScheduler.js'
import { startQRScheduler } from './utils/qrScheduler.js'

const app = express();
const port = process.env.PORT || 8000; // Default to 8000 if not set

// Connect to DB - handle async properly to prevent server crash
let dbConnected = false;
connectDB()
    .then(() => {
        dbConnected = true;
        console.log('✅ Database connection successful');
    })
    .catch((error) => {
        console.error('❌ Failed to initialize database connection:', error.message);
        console.warn('⚠️  Server will continue to start, but database operations may fail');
        console.warn('⚠️  Please check your MONGO_URI environment variable and MongoDB server status');
        // Don't exit - let server start even if DB connection fails initially
    });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS setup
const normalizeOrigin = (origin) => {
    if (!origin) return origin;
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL?.replace('https://', 'https://www.'),
    process.env.BACKEND_PUBLIC_URL,
    process.env.RENDER_EXTERNAL_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://eu-matter-thesis-project.vercel.app'
].map(normalizeOrigin).filter(Boolean);

const allowVercelPreviews = (process.env.ALLOW_VERCEL_PREVIEWS || 'true').trim().toLowerCase() !== 'false';

if (process.env.NODE_ENV !== 'production') {
    console.log('CORS allowed origins:', allowedOrigins);
    if (allowVercelPreviews) {
        console.log('CORS preview domains: *.vercel.app enabled');
    }
}

// CORS configuration with proper error handling
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('CORS: Allowing request with no origin');
            }
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        // Check against allowed origins list
        if (allowedOrigins.includes(normalizedOrigin)) {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`CORS: Allowing origin from allowedOrigins: ${origin}`);
            }
            return callback(null, true);
        }

        // Allow all vercel.app subdomains (including preview deployments)
        if (allowVercelPreviews && normalizedOrigin.endsWith('.vercel.app')) {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`CORS: Allowing Vercel preview domain: ${origin}`);
            }
            return callback(null, true);
        }

        // Additional check for any vercel.app domain
        if (normalizedOrigin.includes('vercel.app')) {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`CORS: Allowing Vercel domain: ${origin}`);
            }
            return callback(null, true);
        }

        // Log and allow in development, block in production
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`CORS: Unknown origin (allowing in dev): ${origin} (normalized: ${normalizedOrigin})`);
            console.warn(`CORS: Allowed origins:`, allowedOrigins);
            return callback(null, true);
        }
        
        // In production, block unknown origins
        console.warn(`CORS: Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

// API Endpoints
app.get("/", (req, res) => res.send("Backend API Working Fine!"));
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/events", eventRouter);
app.use("/api/donations", donationRouter);
app.use("/api/in-kind-donations", inKindDonationRouter);
app.use("/api/volunteers", volunteerRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/subscriptions", subscriptionRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/admin", adminRouter);
app.use("/api/events", commentRouter);  // Mount comment routes under /api/events
app.use("/api/events", reactionRouter); // Mount reaction routes under /api/events
app.use("/api/facebook", facebookRouter); // Mount Facebook routes
app.use("/api/system-settings", systemSettingsRouter); // System settings routes
app.use("/api/feedback", feedbackRouter);
app.use("/api/push", pushNotificationRouter); // Push notification routes
app.use("/api/wallets", walletRouter); // Wallet management routes
app.use("/api/audit-logs", auditLogRouter); // Audit log routes

// Enhanced Error Handler with CORS headers
app.use((err, req, res, next) => {
    console.error("Server Error:", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        origin: req.headers.origin
    });

    // Ensure CORS headers are set even in error responses
    const origin = req.headers.origin;
    if (origin) {
        const normalizedOrigin = normalizeOrigin(origin);
        const isAllowed = allowedOrigins.includes(normalizedOrigin) || 
                         (allowVercelPreviews && normalizedOrigin.endsWith('.vercel.app')) ||
                         normalizedOrigin.includes('vercel.app');
        
        if (isAllowed || !origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    // Handle Multer errors
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: "File upload error",
            error: err.message
        });
    }

    // Handle CORS errors specifically
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: "CORS policy: Origin not allowed",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Handle other errors
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start Server - ensure we always bind to a port
const serverPort = port || 8000;

app.listen(serverPort, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${serverPort}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Check critical environment variables (warn only, don't crash)
    if (!process.env.PAYMONGO_SECRET_KEY) {
        console.warn("⚠️  PAYMONGO_SECRET_KEY is not set - donation features will not work");
    }
    if (!process.env.BACKEND_URL) {
        console.warn("⚠️  BACKEND_URL is not set - payment redirects may fail");
    }
    if (!process.env.FRONTEND_URL) {
        console.warn("⚠️  FRONTEND_URL is not set - CORS and redirects may fail");
    }
});

// Handle server errors gracefully
app.on('error', (error) => {
    console.error('❌ Server error:', error);
    // Don't exit - let the process handle it
});

// Handle server errors gracefully
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Promise Rejection:', error);
    console.error('Stack:', error?.stack);
    // Log but don't exit - allow server to continue running
    // Only exit if it's a critical error that prevents the server from functioning
    if (error?.message?.includes('EADDRINUSE')) {
        console.error('❌ Port already in use. Exiting...');
        process.exit(1);
    }
    // For other errors, log but continue
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
});

// Start reminder scheduler (simple interval)
try { 
    scheduleReminders(); 
    console.log('✅ Reminder scheduler started');
} catch (e) { 
    console.error('❌ Reminder scheduler failed to start:', e?.message);
}

// Start maintenance mode scheduler
try { 
    startMaintenanceScheduler(); 
    console.log('✅ Maintenance scheduler started');
} catch (e) { 
    console.error('❌ Maintenance scheduler failed to start:', e?.message);
}

// Start feedback scheduler
try {
    startFeedbackScheduler(); 
    console.log('✅ Feedback scheduler started');
} catch (e) { 
    console.error('❌ Feedback scheduler failed to start:', e?.message);
}

// Start QR code scheduler for automatic evaluation QR generation
try {
    startQRScheduler(); 
    console.log('✅ QR code scheduler started');
} catch (e) { 
    console.error('❌ QR code scheduler failed to start:', e?.message);
}