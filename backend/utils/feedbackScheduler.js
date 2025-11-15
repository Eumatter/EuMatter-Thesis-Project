import volunteerAttendanceModel from '../models/volunteerAttendanceModel.js'
import eventModel from '../models/eventModel.js'
import { notifyUsers } from './notify.js'

const REMINDER_WINDOW_HOURS = 6

async function sendReminders(now) {
    const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 3600000)
    const records = await volunteerAttendanceModel.find({
        status: 'pending',
        isValid: true,
        deadlineAt: { $gt: now, $lte: reminderCutoff },
        feedbackReminderSentAt: { $exists: false }
    }).populate('event', 'title createdBy')

    for (const attendance of records) {
        const event = attendance.event
        await notifyUsers({
            userIds: [attendance.volunteer],
            title: 'Feedback reminder',
            message: `Please submit your feedback for ${event.title} before the deadline.`,
            payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
        })
        attendance.feedbackReminderSentAt = now
        await attendance.save().catch(err => console.error('Reminder save error', err))
    }
}

async function processMissedFeedback(now) {
    const overdue = await volunteerAttendanceModel.find({
        status: 'pending',
        isValid: true,
        deadlineAt: { $lte: now }
    }).populate('event', 'title createdBy feedbackRules')

    for (const attendance of overdue) {
        const event = attendance.event
        
        // Check if feedback is required for this event
        const requiresFeedback = event.feedbackRules?.requireFeedback !== false
        
        // Only void hours if feedback is required
        if (requiresFeedback) {
            attendance.status = 'missed'
            attendance.voidedHours = true
            attendance.totalHours = 0
            attendance.isValid = false
            await attendance.save().catch(err => console.error('Missed feedback save error', err))

            await notifyUsers({
                userIds: [attendance.volunteer],
                title: 'Feedback deadline missed',
                message: `Your volunteer hours for ${event.title} were voided because feedback was not submitted within 24 hours after the event ended. Please contact the event organizer to reinstate your hours.`,
                payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
            })

            if (event?.createdBy) {
                await notifyUsers({
                    userIds: [event.createdBy],
                    title: 'Volunteer missed feedback deadline',
                    message: `A volunteer missed the 24-hour feedback deadline for ${event.title}. Their hours have been automatically voided. You can override this decision if needed.`,
                    payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
                })
            }
        } else {
            // Feedback not required - mark as not_required instead of missed
            attendance.status = 'not_required'
            await attendance.save().catch(err => console.error('Not required save error', err))
        }
    }
}

export async function runFeedbackMaintenance() {
    const now = new Date()
    await sendReminders(now)
    await processMissedFeedback(now)
}

export function startFeedbackScheduler() {
    runFeedbackMaintenance().catch(err => console.error('Initial feedback scheduler error', err))
    setInterval(() => {
        runFeedbackMaintenance().catch(err => console.error('Feedback scheduler error', err))
    }, 15 * 60 * 1000) // every 15 minutes
    console.log('✅ Feedback scheduler started')
}

