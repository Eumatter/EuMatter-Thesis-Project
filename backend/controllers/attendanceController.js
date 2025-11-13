import eventModel from '../models/eventModel.js'
import volunteerAttendanceModel from '../models/volunteerAttendanceModel.js'
import { issueAttendanceToken, verifyAttendanceToken } from '../utils/qrToken.js'

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
            attendance = await volunteerAttendanceModel.create({
                event: eventId,
                volunteer: userId,
                date: now,
                timeIn: now,
                qrCode: decoded.jti
            })
            return res.json({ success: true, message: 'Time in recorded', status: 'timein' })
        }

        // If already has timeIn but no timeOut, this is time-out
        if (attendance.timeIn && !attendance.timeOut) {
            attendance.timeOut = now
            // Compute total hours
            const ms = Math.max(0, new Date(attendance.timeOut).getTime() - new Date(attendance.timeIn).getTime())
            attendance.totalHours = Math.round((ms / 3600000) * 100) / 100
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


