import eventModel from '../models/eventModel.js'
import volunteerAttendanceModel from '../models/volunteerAttendanceModel.js'
import { issueAttendanceToken, verifyAttendanceToken } from '../utils/qrToken.js'
import { notifyUsers } from '../utils/notify.js'

function isOrganizer(user, event) {
    if (!user || !event) return false
    if (String(event.createdBy) === String(user._id)) return true
    const privileged = ['CRD Staff', 'System Administrator']
    return privileged.includes(user.role)
}

export async function getMyAttendanceSummary(req, res) {
    try {
        const volunteerId = req.user?._id
        if (!volunteerId) return res.status(401).json({ success: false, message: 'Not authenticated' })

        const records = await volunteerAttendanceModel.find({ volunteer: volunteerId })
            .populate('event', 'title startDate endDate location feedbackSummary')
            .sort({ date: -1 })
            .lean()

        let totalHours = 0
        const eventsMap = new Map()

        records.forEach(record => {
            const eventId = record.event?._id?.toString()
            if (!eventId) return

            const hours = record.voidedHours ? 0 : (record.totalHours || 0)
            if (!record.voidedHours) {
                totalHours += hours
            }

            if (!eventsMap.has(eventId)) {
                eventsMap.set(eventId, {
                    eventId,
                    title: record.event.title,
                    startDate: record.event.startDate,
                    endDate: record.event.endDate,
                    location: record.event.location,
                    feedbackSummary: record.event.feedbackSummary || {},
                    totalHours: 0,
                    records: []
                })
            }

            const eventEntry = eventsMap.get(eventId)
            eventEntry.totalHours += hours
            eventEntry.records.push({
                attendanceId: record._id,
                date: record.date,
                timeIn: record.timeIn,
                timeOut: record.timeOut,
                totalHours: hours,
                status: record.status,
                deadlineAt: record.deadlineAt,
                feedback: record.feedback
            })
        })

        const events = Array.from(eventsMap.values()).map(event => ({
            ...event,
            records: event.records.sort((a, b) => new Date(b.date) - new Date(a.date))
        })).sort((a, b) => new Date(b.startDate) - new Date(a.startDate))

        return res.json({
            success: true,
            totalHours: Math.round(totalHours * 100) / 100,
            totalEvents: events.length,
            events
        })
    } catch (error) {
        console.error('Get my attendance summary error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

// POST /api/attendance/:eventId/issue-token
export async function issueQrToken(req, res) {
    try {
        const { eventId } = req.params
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

        const event = await eventModel.findById(eventId)
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' })

        // Only event owner (department) or admins can issue tokens
        const isOwner = String(event.createdBy) === String(userId)
        const role = req.user?.role || 'User'
        const isAdmin = ['CRD Staff', 'System Administrator'].includes(role)
        if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' })

        // Only during event window (with some grace before start)
        const now = new Date()
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const allowLeadMs = 15 * 60 * 1000 // 15 minutes early issuance
        if (now < new Date(start.getTime() - allowLeadMs)) {
            return res.status(400).json({ success: false, message: 'Token issuance not yet available' })
        }
        if (now > end) {
            return res.status(400).json({ success: false, message: 'Event already ended' })
        }

        const token = issueAttendanceToken({ eventId, issuedByUserId: userId, ttlSeconds: 30 })
        return res.json({ success: true, token, expiresIn: 30 })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// POST /api/attendance/check-in
// body: { token }
export async function checkInWithToken(req, res) {
    try {
        const { token } = req.body
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })
        if (!token) return res.status(400).json({ success: false, message: 'Missing token' })

        const decoded = verifyAttendanceToken(token)
        const eventId = decoded.evt
        const event = await eventModel.findById(eventId)
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' })

        // Anti-abuse: event window and one active record per user/event
        const now = new Date()
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const allowedWindowMs = 60 * 60 * 1000 // 1 hour grace after end for checkout
        if (now < start) return res.status(400).json({ success: false, message: 'Event has not started yet' })
        if (now > new Date(end.getTime() + allowedWindowMs)) return res.status(400).json({ success: false, message: 'Event window closed' })

        // Ensure the user is a volunteer of the event (if volunteers list enforced)
        if (Array.isArray(event.volunteers) && event.volunteers.length > 0) {
            const isVolunteer = event.volunteers.some(v => String(v) === String(userId))
            if (!isVolunteer) return res.status(403).json({ success: false, message: 'Not a registered volunteer for this event' })
        }

        // Find existing attendance for today (same date) without timeOut
        const startOfDay = new Date(now)
        startOfDay.setHours(0,0,0,0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23,59,59,999)

        let attendance = await volunteerAttendanceModel.findOne({
            event: eventId,
            volunteer: userId,
            date: { $gte: startOfDay, $lte: endOfDay },
            isValid: true
        })

        // If no record, this is a time-in
        if (!attendance) {
            const requiresFeedback = event.feedbackRules?.requireFeedback !== false
            attendance = await volunteerAttendanceModel.create({
                event: eventId,
                volunteer: userId,
                date: now,
                timeIn: now,
                qrCode: decoded.jti,
                status: requiresFeedback ? 'pending' : 'not_required'
            })
            return res.json({ success: true, message: 'Time in recorded', status: 'timein' })
        }

        // If already has timeIn but no timeOut, this is time-out
        if (attendance.timeIn && !attendance.timeOut) {
            attendance.timeOut = now
            // Compute total hours
            const ms = Math.max(0, new Date(attendance.timeOut).getTime() - new Date(attendance.timeIn).getTime())
            attendance.totalHours = Math.round((ms / 3600000) * 100) / 100
            const requiresFeedback = event.feedbackRules?.requireFeedback !== false
            if (!requiresFeedback) {
                attendance.status = 'not_required'
            } else {
                const deadlineHours = Number(event.feedbackRules?.deadlineHours) || 24
                const base = new Date(Math.min(new Date(event.endDate).getTime(), new Date(attendance.timeOut).getTime()))
                attendance.deadlineAt = new Date(base.getTime() + deadlineHours * 3600000)
                attendance.status = 'pending'
            }
            attendance.voidedHours = false
            await attendance.save()
            return res.json({ success: true, message: 'Time out recorded', status: 'timeout', totalHours: attendance.totalHours })
        }

        // Already completed today
        return res.status(400).json({ success: false, message: 'Attendance already completed for today' })
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message })
    }
}

// GET /api/attendance/:eventId/count
export async function getAttendanceCount(req, res) {
    try {
        const { eventId } = req.params
        const startOfDay = new Date()
        startOfDay.setHours(0,0,0,0)
        const endOfDay = new Date()
        endOfDay.setHours(23,59,59,999)
        const count = await volunteerAttendanceModel.countDocuments({ event: eventId, date: { $gte: startOfDay, $lte: endOfDay } })
        return res.json({ success: true, count })
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// GET /api/attendance/:eventId/export.csv
export async function exportAttendanceCsv(req, res) {
    try {
        const { eventId } = req.params
        const records = await volunteerAttendanceModel.find({ event: eventId }).populate('volunteer', 'name email').lean()
        const header = ['Name', 'Email', 'Date', 'Time In', 'Time Out', 'Total Hours']
        const rows = records.map(r => [
            r.volunteer?.name || '',
            r.volunteer?.email || '',
            new Date(r.date).toISOString(),
            r.timeIn ? new Date(r.timeIn).toISOString() : '',
            r.timeOut ? new Date(r.timeOut).toISOString() : '',
            String(r.totalHours ?? 0)
        ])
        const csv = [header, ...rows].map(arr => arr.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"')
        return res.send(csv)
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message })
    }
}

// POST /api/attendance/:attendanceId/exception-request
// Submit an exception request for missed time-out
export async function submitExceptionRequest(req, res) {
    try {
        const { attendanceId } = req.params
        const { reason } = req.body
        const userId = req.user?._id

        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })
        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Reason is required' })
        }

        const attendance = await volunteerAttendanceModel.findById(attendanceId)
            .populate('event', 'title createdBy')
        
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' })
        }

        // Verify the attendance belongs to the requesting user
        if (String(attendance.volunteer || attendance.userId) !== String(userId)) {
            return res.status(403).json({ success: false, message: 'You can only submit exception requests for your own attendance' })
        }

        // Check if there's already a time-out recorded
        if (attendance.timeOut || attendance.checkOutTime) {
            return res.status(400).json({ success: false, message: 'Time-out is already recorded. Exception requests are only for missed time-outs.' })
        }

        // Check if there's already a pending or approved exception request
        if (attendance.exceptionRequest?.status === 'pending' || attendance.exceptionRequest?.status === 'approved') {
            return res.status(400).json({ success: false, message: 'An exception request already exists for this attendance record' })
        }

        // Create or update exception request
        attendance.exceptionRequest = {
            reason: reason.trim(),
            status: 'pending',
            requestedAt: new Date()
        }
        await attendance.save()

        // Notify event organizer
        const event = attendance.event
        if (event?.createdBy) {
            await notifyUsers({
                userIds: [event.createdBy],
                title: 'New Exception Request',
                message: `A volunteer has submitted an exception request for missed time-out in "${event.title}". Please review the request.`,
                payload: { 
                    eventId: String(event._id), 
                    attendanceId: String(attendance._id),
                    type: 'exception_request'
                }
            })
        }

        return res.json({ 
            success: true, 
            message: 'Exception request submitted successfully',
            exceptionRequest: attendance.exceptionRequest
        })
    } catch (error) {
        console.error('Submit exception request error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

// GET /api/attendance/exception-requests
// Get all pending exception requests (for organizers)
export async function getExceptionRequests(req, res) {
    try {
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

        const role = req.user?.role || 'User'
        const isAdmin = ['CRD Staff', 'System Administrator'].includes(role)

        let query = {
            'exceptionRequest.status': 'pending'
        }

        // If not admin, only show requests for events created by the user
        if (!isAdmin) {
            const events = await eventModel.find({ createdBy: userId }).select('_id').lean()
            const eventIds = events.map(e => e._id)
            query.event = { $in: eventIds }
        }

        const requests = await volunteerAttendanceModel.find(query)
            .populate('event', 'title startDate endDate createdBy')
            .populate('volunteer', 'name email profileImage')
            .populate('userId', 'name email profileImage')
            .sort({ 'exceptionRequest.requestedAt': -1 })
            .lean()

        const formatted = requests.map(req => ({
            attendanceId: req._id,
            event: {
                id: req.event?._id,
                title: req.event?.title,
                startDate: req.event?.startDate,
                endDate: req.event?.endDate
            },
            volunteer: {
                id: req.volunteer?._id || req.userId?._id,
                name: req.volunteer?.name || req.userId?.name,
                email: req.volunteer?.email || req.userId?.email,
                profileImage: req.volunteer?.profileImage || req.userId?.profileImage
            },
            date: req.date,
            timeIn: req.timeIn || req.checkInTime,
            timeOut: req.timeOut || req.checkOutTime,
            exceptionRequest: req.exceptionRequest
        }))

        return res.json({ success: true, requests: formatted })
    } catch (error) {
        console.error('Get exception requests error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

// PUT /api/attendance/:attendanceId/exception-request
// Approve or reject an exception request
export async function reviewExceptionRequest(req, res) {
    try {
        const { attendanceId } = req.params
        const { action, reviewNotes } = req.body // action: 'approve' or 'reject'
        const userId = req.user?._id

        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action. Must be "approve" or "reject"' })
        }

        const attendance = await volunteerAttendanceModel.findById(attendanceId)
            .populate('event', 'title createdBy endDate')
        
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' })
        }

        // Check if user is organizer or admin
        const event = attendance.event
        if (!isOrganizer(req.user, event)) {
            return res.status(403).json({ success: false, message: 'Only event organizers can review exception requests' })
        }

        // Check if exception request exists
        if (!attendance.exceptionRequest || attendance.exceptionRequest.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'No pending exception request found for this attendance record' })
        }

        // Update exception request
        attendance.exceptionRequest.status = action === 'approve' ? 'approved' : 'rejected'
        attendance.exceptionRequest.reviewedAt = new Date()
        attendance.exceptionRequest.reviewedBy = userId
        attendance.exceptionRequest.reviewNotes = reviewNotes ? reviewNotes.trim() : ''

        // If approved, set a reasonable time-out time (e.g., end of event day or current time)
        if (action === 'approve') {
            const eventEndDate = new Date(event.endDate)
            const attendanceDate = new Date(attendance.date)
            
            // Set time-out to the end of the event day or event end date, whichever is earlier
            let timeOutDate = new Date(attendanceDate)
            timeOutDate.setHours(23, 59, 59, 999)
            
            if (timeOutDate > eventEndDate) {
                timeOutDate = eventEndDate
            }

            attendance.timeOut = timeOutDate
            attendance.checkOutTime = timeOutDate

            // Recalculate total hours
            const timeIn = attendance.timeIn || attendance.checkInTime
            if (timeIn) {
                const ms = Math.max(0, timeOutDate.getTime() - new Date(timeIn).getTime())
                attendance.totalHours = Math.round((ms / 3600000) * 100) / 100
                attendance.hoursWorked = attendance.totalHours
            }

            attendance.voidedHours = false
            attendance.isValid = true

            // Set feedback status if needed
            const requiresFeedback = event.feedbackRules?.requireFeedback !== false
            if (requiresFeedback) {
                const deadlineHours = Number(event.feedbackRules?.deadlineHours) || 24
                const base = new Date(Math.min(eventEndDate.getTime(), timeOutDate.getTime()))
                attendance.deadlineAt = new Date(base.getTime() + deadlineHours * 3600000)
                attendance.status = 'pending'
            } else {
                attendance.status = 'not_required'
            }
        }

        await attendance.save()

        // Notify the volunteer
        const volunteerId = attendance.volunteer || attendance.userId
        if (volunteerId) {
            await notifyUsers({
                userIds: [volunteerId],
                title: `Exception Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
                message: action === 'approve' 
                    ? `Your exception request for "${event.title}" has been approved. Your attendance hours have been recorded.`
                    : `Your exception request for "${event.title}" has been rejected. ${reviewNotes ? `Reason: ${reviewNotes}` : ''}`,
                payload: { 
                    eventId: String(event._id), 
                    attendanceId: String(attendance._id),
                    type: 'exception_reviewed'
                }
            })
        }

        return res.json({ 
            success: true, 
            message: `Exception request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
            attendance: {
                attendanceId: attendance._id,
                timeOut: attendance.timeOut,
                totalHours: attendance.totalHours,
                exceptionRequest: attendance.exceptionRequest
            }
        })
    } catch (error) {
        console.error('Review exception request error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}

// GET /api/attendance/:attendanceId/exception-request
// Get exception request details for a specific attendance record
export async function getExceptionRequest(req, res) {
    try {
        const { attendanceId } = req.params
        const userId = req.user?._id

        if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' })

        const attendance = await volunteerAttendanceModel.findById(attendanceId)
            .populate('event', 'title createdBy')
            .populate('exceptionRequest.reviewedBy', 'name email')
            .lean()

        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance record not found' })
        }

        // Check if user has permission (either the volunteer or organizer/admin)
        const isVolunteer = String(attendance.volunteer || attendance.userId) === String(userId)
        const isOrg = isOrganizer(req.user, attendance.event)
        
        if (!isVolunteer && !isOrg) {
            return res.status(403).json({ success: false, message: 'You do not have permission to view this exception request' })
        }

        return res.json({ 
            success: true, 
            exceptionRequest: attendance.exceptionRequest || null,
            attendance: {
                attendanceId: attendance._id,
                date: attendance.date,
                timeIn: attendance.timeIn || attendance.checkInTime,
                timeOut: attendance.timeOut || attendance.checkOutTime,
                totalHours: attendance.totalHours
            }
        })
    } catch (error) {
        console.error('Get exception request error:', error)
        return res.status(500).json({ success: false, message: error.message })
    }
}


