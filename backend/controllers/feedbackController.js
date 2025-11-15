import mongoose from 'mongoose'
import volunteerAttendanceModel from '../models/volunteerAttendanceModel.js'
import eventModel from '../models/eventModel.js'
import { notifyUsers } from '../utils/notify.js'

const ObjectId = mongoose.Types.ObjectId

function isOrganizer(user, event) {
    if (!user || !event) return false
    if (String(event.createdBy) === String(user._id)) return true
    const privileged = ['CRD Staff', 'System Administrator']
    return privileged.includes(user.role)
}

async function recalculateEventFeedback(eventId) {
    try {
        const result = await volunteerAttendanceModel.aggregate([
            {
                $match: {
                    event: new ObjectId(eventId),
                    status: { $in: ['submitted', 'overridden'] },
                    'feedback.rating': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$event',
                    averageRating: { $avg: '$feedback.rating' },
                    totalResponses: { $sum: 1 }
                }
            }
        ])

        const summary = result[0]
        await eventModel.findByIdAndUpdate(eventId, {
            $set: {
                'feedbackSummary.averageRating': summary ? Math.round(summary.averageRating * 100) / 100 : 0,
                'feedbackSummary.totalResponses': summary ? summary.totalResponses : 0,
                'feedbackSummary.lastCalculatedAt': new Date()
            }
        }, { new: false })
    } catch (error) {
        console.error('Error recalculating feedback summary:', error?.message || error)
    }
}

export async function submitFeedback(req, res) {
    try {
        const { attendanceId } = req.params
        const { rating, comment } = req.body || {}
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

        let attendance = await volunteerAttendanceModel.findById(attendanceId).populate('event')
        if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found' })
        const event = attendance.event

        const isVolunteer = String(attendance.volunteer) === String(userId)
        const organizer = isOrganizer(req.user, event)
        if (!isVolunteer && !organizer) {
            return res.status(403).json({ success: false, message: 'Forbidden' })
        }

        // Log attendance state for debugging
        console.log('Feedback submission - Attendance state:', {
            attendanceId: attendance._id,
            timeIn: attendance.timeIn,
            checkInTime: attendance.checkInTime,
            timeOut: attendance.timeOut,
            checkOutTime: attendance.checkOutTime,
            totalHours: attendance.totalHours,
            hoursWorked: attendance.hoursWorked,
            status: attendance.status,
            isValid: attendance.isValid
        })

        // Sync fields manually to ensure consistency (the pre-save hook only runs on save)
        let needsSave = false
        
        // Sync timeIn/checkInTime
        if (attendance.timeIn && !attendance.checkInTime) {
            attendance.checkInTime = attendance.timeIn
            needsSave = true
        }
        if (attendance.checkInTime && !attendance.timeIn) {
            attendance.timeIn = attendance.checkInTime
            needsSave = true
        }
        
        // Sync timeOut/checkOutTime
        if (attendance.timeOut && !attendance.checkOutTime) {
            attendance.checkOutTime = attendance.timeOut
            needsSave = true
        }
        if (attendance.checkOutTime && !attendance.timeOut) {
            attendance.timeOut = attendance.checkOutTime
            needsSave = true
        }
        
        // Save if we synced any fields
        if (needsSave) {
            await attendance.save()
            // Reload to get synced values
            attendance = await volunteerAttendanceModel.findById(attendanceId).populate('event')
        }

        // Check if attendance is completed - check all possible field combinations
        const timeInValue = attendance.timeIn || attendance.checkInTime
        const timeOutValue = attendance.timeOut || attendance.checkOutTime
        const hasTimeIn = !!timeInValue
        const hasTimeOut = !!timeOutValue
        
        // Also check if totalHours > 0 or hoursWorked > 0 as indicators of completed attendance
        const hasHours = !!(attendance.totalHours && attendance.totalHours > 0) || !!(attendance.hoursWorked && attendance.hoursWorked > 0)
        
        // Check if status indicates completion
        // IMPORTANT: If status is 'pending', it means the system has determined that:
        // 1. Attendance is completed (time in and time out done)
        // 2. Feedback is required
        // So we should trust the status and allow feedback submission
        const statusIndicatesCompletion = attendance.status === 'submitted' || 
                                         attendance.status === 'overridden' || 
                                         attendance.status === 'pending' // If pending, attendance is completed
        
        // Check if isValid is true (another indicator of completed attendance)
        const isValidAttendance = attendance.isValid === true || attendance.isValid === undefined
        
        // Attendance is considered completed if ANY of these conditions are true:
        // 1. Status is 'pending' (system has verified completion and requires feedback)
        // 2. Status is 'submitted' or 'overridden' (feedback was already submitted)
        // 3. Both time in and time out exist
        // 4. Time out exists (implies time in was done)
        // 5. Hours are recorded (implies attendance was completed)
        // 6. Record is valid and has any time data
        const isCompleted = statusIndicatesCompletion ||
                           (hasTimeIn && hasTimeOut) || 
                           hasTimeOut || 
                           hasHours || 
                           (isValidAttendance && (hasTimeIn || hasTimeOut))
        
        if (!isCompleted) {
            console.error('Attendance not completed - Details:', {
                attendanceId: attendance._id,
                timeIn: timeInValue,
                checkInTime: attendance.checkInTime,
                timeOut: timeOutValue,
                checkOutTime: attendance.checkOutTime,
                totalHours: attendance.totalHours,
                hoursWorked: attendance.hoursWorked,
                status: attendance.status,
                hasTimeIn,
                hasTimeOut,
                hasHours,
                statusIndicatesCompletion,
                isCompleted
            })
            return res.status(400).json({ 
                success: false, 
                message: 'Attendance not completed yet. Please complete time in and time out before submitting feedback.' 
            })
        }
        
        console.log('Attendance validation passed - proceeding with feedback submission')

        if (attendance.status === 'not_required') {
            return res.status(400).json({ success: false, message: 'Feedback not required for this attendance' })
        }

        if (attendance.status === 'submitted' && !organizer) {
            return res.status(400).json({ success: false, message: 'Feedback already submitted' })
        }

        // Enforce 24-hour deadline: Feedback must be submitted within 24 hours after event ends
        // Only organizers can override this restriction
        if (isVolunteer && !organizer) {
            const deadline = attendance.deadlineAt
            if (deadline && new Date() > deadline) {
                // Deadline has passed - volunteer cannot submit feedback
                // Hours will be voided by scheduler unless organizer overrides
                return res.status(400).json({ 
                    success: false, 
                    message: 'Feedback deadline has passed. Please contact the event organizer to submit feedback or reinstate your hours.' 
                })
            }
        }

        const parsedRating = Number(rating)
        if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
        }

        // Validate comment is required
        const commentText = comment ? String(comment).trim() : ''
        if (!commentText || commentText.length === 0) {
            return res.status(400).json({ success: false, message: 'Feedback message is required' })
        }

        attendance.feedback = {
            rating: parsedRating,
            comment: commentText,
            submittedAt: new Date(),
            submittedBy: userId,
            overridden: organizer && !isVolunteer,
            overrideReason: organizer && !isVolunteer ? 'Submitted by organizer' : undefined
        }
        attendance.status = organizer && !isVolunteer ? 'overridden' : 'submitted'
        attendance.voidedHours = false
        await attendance.save()

        await recalculateEventFeedback(attendance.event._id || attendance.event)

        // Notify organizer that volunteer submitted feedback
        if (isVolunteer && event?.createdBy) {
            await notifyUsers({
                userIds: [event.createdBy],
                title: 'Volunteer feedback received',
                message: `${req.user.name || 'Volunteer'} submitted feedback for ${event.title}`,
                payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
            })
        }

        return res.json({ success: true, message: 'Feedback submitted', attendance })
    } catch (error) {
        console.error('Submit feedback error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

export async function overrideFeedback(req, res) {
    try {
        const { attendanceId } = req.params
        const { rating, comment, reinstateHours = false, reason } = req.body || {}

        const attendance = await volunteerAttendanceModel.findById(attendanceId).populate('event')
        if (!attendance) return res.status(404).json({ success: false, message: 'Attendance record not found' })

        const event = attendance.event
        if (!isOrganizer(req.user, event)) {
            return res.status(403).json({ success: false, message: 'Forbidden' })
        }

        if (event.feedbackRules?.allowOrganizerOverride === false) {
            return res.status(400).json({ success: false, message: 'Overrides disabled for this event' })
        }

        attendance.feedback = attendance.feedback || {}

        const hasRating = rating !== undefined && rating !== null
        if (hasRating) {
            const parsed = Number(rating)
            if (!parsed || parsed < 1 || parsed > 5) {
                return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' })
            }
            attendance.feedback.rating = parsed
        }
        if (comment !== undefined) {
            attendance.feedback.comment = String(comment ?? '').trim()
        }

        attendance.feedback.submittedAt = new Date()
        attendance.feedback.submittedBy = req.user._id
        attendance.feedback.overridden = true
        attendance.feedback.overrideReason = reason ? String(reason).trim() : ''

        attendance.status = reinstateHours ? 'overridden' : 'voided'
        attendance.voidedHours = !reinstateHours
        if (!reinstateHours) {
            attendance.totalHours = 0
        }
        await attendance.save()

        await recalculateEventFeedback(attendance.event._id || attendance.event)

        // Notify volunteer of the action
        await notifyUsers({
            userIds: [attendance.volunteer],
            title: reinstateHours ? 'Feedback override approved' : 'Attendance voided',
            message: reinstateHours
                ? `Your attendance for ${event.title} has been reinstated by the organizer.`
                : `Your attendance for ${event.title} was voided by the organizer.`,
            payload: { eventId: String(event._id), attendanceId: String(attendance._id) }
        })

        return res.json({ success: true, attendance })
    } catch (error) {
        console.error('Override feedback error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

export async function getPendingFeedback(req, res) {
    try {
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

        const now = new Date()
        const records = await volunteerAttendanceModel.find({
            volunteer: userId,
            status: { $in: ['pending', 'missed'] },
            isValid: true
        }).populate('event', 'title startDate endDate createdBy feedbackRules')
            .sort({ deadlineAt: 1 })
            .lean()

        const enriched = records.map(r => ({
            ...r,
            overdue: r.deadlineAt ? now.getTime() > new Date(r.deadlineAt).getTime() : false
        }))

        return res.json({ success: true, records: enriched })
    } catch (error) {
        console.error('Get pending feedback error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

export async function getEventFeedback(req, res) {
    try {
        const { eventId } = req.params
        const event = await eventModel.findById(eventId)
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' })

        if (!isOrganizer(req.user, event)) {
            return res.status(403).json({ success: false, message: 'Forbidden' })
        }

        const records = await volunteerAttendanceModel.find({ event: eventId })
            .populate('volunteer', 'name email role')
            .sort({ date: 1 })
            .lean()

        return res.json({
            success: true,
            event: {
                id: eventId,
                title: event.title,
                feedbackSummary: event.feedbackSummary
            },
            records
        })
    } catch (error) {
        console.error('Get event feedback error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

