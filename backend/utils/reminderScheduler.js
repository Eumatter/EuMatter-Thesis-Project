import eventModel from '../models/eventModel.js'
import Notification from '../models/notificationModel.js'
import nodemailer from '../config/nodemailer.js'
import userModel from '../models/userModel.js'

function toSec(ms) { return Math.floor(ms / 1000) }

export function scheduleReminders() {
    // Run every 60s; find events starting within next 25h and create reminders at 24h/1h if not yet created
    const run = async () => {
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
    run().catch(()=>{})
    setInterval(() => run().catch(()=>{}), 60000)
}


