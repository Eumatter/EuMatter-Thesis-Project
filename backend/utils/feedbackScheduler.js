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
        attendance.status = 'missed'
        attendance.voidedHours = true
        attendance.totalHours = 0
        attendance.isValid = false
        await attendance.save().catch(err => console.error('Missed feedback save error', err))

        await notifyUsers({
            userIds: [attendance.volunteer],
            title: 'Feedback deadline missed',
            message: `Your volunteer hours for ${event.title} were voided because feedback was not submitted in time.`,
            payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
        })

        if (event?.createdBy) {
            await notifyUsers({
                userIds: [event.createdBy],
                title: 'Volunteer missed feedback',
                message: `A volunteer missed the feedback deadline for ${event.title}.`,
                payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
            })
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

