import express from 'express'
import { listMyNotifications, getNotificationById, markAsRead, markAllRead, deleteNotification, createNotification } from '../controllers/notificationController.js'
import userAuth from '../middleware/userAuth.js'

const router = express.Router()

router.get('/', userAuth, listMyNotifications)
router.post('/', userAuth, createNotification)
router.get('/:id', userAuth, getNotificationById)
router.post('/:id/read', userAuth, markAsRead)
router.post('/mark-all-read', userAuth, markAllRead)
router.delete('/:id', userAuth, deleteNotification)

export default router


