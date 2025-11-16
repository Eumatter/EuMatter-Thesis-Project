import express from 'express'
import userAuth from '../middleware/userAuth.js'
import requireRole from '../middleware/roleAuth.js'
import { 
    issueQrToken, 
    checkInWithToken, 
    getAttendanceCount, 
    exportAttendanceCsv, 
    getMyAttendanceSummary,
    submitExceptionRequest,
    getExceptionRequests,
    reviewExceptionRequest,
    getExceptionRequest
} from '../controllers/attendanceController.js'

const router = express.Router()

// Issue short-lived QR token (Department owner or Admin)
router.post('/:eventId/issue-token', userAuth, requireRole(['Department/Organization','CRD Staff','System Administrator']), issueQrToken)

// Logged-in volunteer summary
router.get('/me/summary', userAuth, getMyAttendanceSummary)

// Volunteer check-in using token
router.post('/check-in', userAuth, checkInWithToken)

// Live attendance count (owner/admin)
router.get('/:eventId/count', userAuth, requireRole(['Department/Organization','CRD Staff','System Administrator']), getAttendanceCount)

// CSV export (owner/admin)
router.get('/:eventId/export.csv', userAuth, requireRole(['Department/Organization','CRD Staff','System Administrator']), exportAttendanceCsv)

// Exception request routes
// Submit exception request (volunteer)
router.post('/:attendanceId/exception-request', userAuth, submitExceptionRequest)

// Get all pending exception requests (organizers/admins)
router.get('/exception-requests', userAuth, requireRole(['Department/Organization','CRD Staff','System Administrator']), getExceptionRequests)

// Get specific exception request details
router.get('/:attendanceId/exception-request', userAuth, getExceptionRequest)

// Review exception request (approve/reject) (organizers/admins)
router.put('/:attendanceId/exception-request', userAuth, requireRole(['Department/Organization','CRD Staff','System Administrator']), reviewExceptionRequest)

export default router


