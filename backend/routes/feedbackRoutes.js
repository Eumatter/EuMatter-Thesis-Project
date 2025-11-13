import express from 'express'
import userAuth from '../middleware/userAuth.js'
import requireRole from '../middleware/roleAuth.js'
import {
    submitFeedback,
    overrideFeedback,
    getPendingFeedback,
    getEventFeedback
} from '../controllers/feedbackController.js'

const router = express.Router()

// Volunteer submits feedback
router.post('/:attendanceId', userAuth, submitFeedback)

// Organizer override
router.post('/:attendanceId/override', userAuth, requireRole(['Department/Organization', 'CRD Staff', 'System Administrator']), overrideFeedback)

// Volunteer pending list
router.get('/me/pending', userAuth, getPendingFeedback)

// Organizer view event feedback
router.get('/event/:eventId', userAuth, requireRole(['Department/Organization', 'CRD Staff', 'System Administrator']), getEventFeedback)

export default router

