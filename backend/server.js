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
import { scheduleReminders } from './utils/reminderScheduler.js'
import { startMaintenanceScheduler } from './utils/maintenanceScheduler.js'
import { startFeedbackScheduler } from './utils/feedbackScheduler.js'

const app = express();
const port = process.env.PORT;

// Connect to DB
connectDB();

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

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }

        if (allowVercelPreviews && normalizedOrigin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        console.warn(`Blocked CORS origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
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

// Enhanced Error Handler
app.use((err, req, res, next) => {
    console.error("Server Error:", {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body
    });

    // Handle Multer errors
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: "File upload error",
            error: err.message
        });
    }

    // Handle other errors
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Start Server
if (!port) {
    console.error("❌ PORT environment variable is not set!");
    console.error("💡 Set PORT in your .env file (e.g., PORT=8000)");
    process.exit(1);
}

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
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

// Handle server errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Promise Rejection:', error);
    // Don't exit in development, but log the error
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
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