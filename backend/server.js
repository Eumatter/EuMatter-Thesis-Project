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
import { scheduleReminders } from './utils/reminderScheduler.js'
import { startMaintenanceScheduler } from './utils/maintenanceScheduler.js'

const app = express();
const port = process.env.PORT;

// Connect to DB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS setup
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));

// Start reminder scheduler (simple interval)
try { scheduleReminders(); } catch (e) { console.error('Reminder scheduler failed to start', e?.message) }

// Start maintenance mode scheduler
try { startMaintenanceScheduler(); } catch (e) { console.error('Maintenance scheduler failed to start', e?.message) }