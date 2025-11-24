import eventModel from '../models/eventModel.js'
import Notification from '../models/notificationModel.js'
import nodemailer from '../config/nodemailer.js'
import userModel from '../models/userModel.js'
import mongoose from 'mongoose'

function toSec(ms) { return Math.floor(ms / 1000) }

/**
 * Check if database is connected before performing operations
 */
function isDBReady() {
    return mongoose.connection.readyState === 1;
}

export function scheduleReminders() {
    // Run every 60s; find events starting within next 25h and create reminders at 24h/1h if not yet created
    const run = async () => {
        // Check if database is connected
        if (!isDBReady()) {
            return; // Skip if DB not ready
        }
        const now = new Date()
        const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000)
        const events = await eventModel.find({ startDate: { $gte: now, $lte: in25h } }).lean()
        for (const ev of events) {
            const offsets = (() => {
                try { return Array.isArray(ev.reminderOffsets) ? ev.reminderOffsets : [86400, 3600] } catch { return [86400, 3600] }
            })()
            for (const off of offsets) {
                const fireAt = new Date(new Date(ev.startDate).getTime() - off * 1000)
                if (fireAt < now) continue
                // de-dupe by composite key
                const exists = await Notification.findOne({ 'payload.eventId': ev._id, 'payload.offset': off }).lean()
                if (exists) continue
                // create scheduled notification doc (backend has no job queue; we store now and rely on next run when time passes)
                await Notification.create({
                    userId: ev.createdBy,
                    title: off >= 7200 ? 'Event tomorrow' : 'Event soon',
                    message: `${ev.title} at ${new Date(ev.startDate).toLocaleString()}`,
                    payload: { eventId: ev._id, offset: off, fireAt }
                })
            }
        }
        // deliver scheduled that are due (mark as created previously)
        const due = await Notification.find({ 'payload.fireAt': { $lte: new Date() }, read: false }).limit(50)
        for (const n of due) {
            // Attempt email delivery (best-effort). Users need to have email; ignore failures.
            try {
                const user = await userModel.findById(n.userId).lean()
                if (user?.email && nodemailer?.sendMail) {
                    await nodemailer.sendMail({
                        to: user.email,
                        subject: n.title || 'Event Reminder',
                        text: n.message || 'You have an upcoming event.',
                    })
                }
            } catch (_) {}
        }
    }
    
    // Wait for DB connection before starting
    const checkAndStart = () => {
        if (isDBReady()) {
            run().catch(err => {
                if (err.name !== 'MongooseError' || !err.message.includes('buffering')) {
                    console.error('Reminder scheduler error:', err.message);
                }
            });
            setInterval(() => {
                run().catch(err => {
                    if (err.name !== 'MongooseError' || !err.message.includes('buffering')) {
                        console.error('Reminder scheduler error:', err.message);
                    }
                });
            }, 60000);
        } else {
            // Retry after 2 seconds if DB not ready
            setTimeout(checkAndStart, 2000);
        }
    };
    
    checkAndStart();
}


