import Notification from '../models/notificationModel.js'

export const listMyNotifications = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const limit = Math.min(parseInt(req.query.limit || '20', 10), 100)
        const skip = parseInt(req.query.skip || '0', 10)
        const paginated = req.query.paginated === 'true'
        
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
        
        // Backward compatibility: return array if not paginated
        if (!paginated) {
            return res.json(notifications.map(n => ({
                id: n._id,
                title: n.title,
                message: n.message,
                payload: n.payload,
                unread: !n.read,
                read: n.read,
                createdAt: n.createdAt,
            })))
        }
        
        const total = await Notification.countDocuments({ userId })
        const unreadCount = await Notification.countDocuments({ userId, read: false })
        
        res.json({
            notifications: notifications.map(n => ({
                id: n._id,
                title: n.title,
                message: n.message,
                payload: n.payload,
                unread: !n.read,
                read: n.read,
                createdAt: n.createdAt,
            })),
            total,
            unreadCount,
            hasMore: skip + notifications.length < total
        })
    } catch (e) {
        res.status(500).json({ message: 'Failed to load notifications' })
    }
}

export const getNotificationById = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const { id } = req.params
        const notification = await Notification.findOne({ _id: id, userId }).lean()
        if (!notification) return res.status(404).json({ message: 'Notification not found' })
        
        res.json({
            id: notification._id,
            title: notification.title,
            message: notification.message,
            payload: notification.payload,
            unread: !notification.read,
            read: notification.read,
            createdAt: notification.createdAt,
        })
    } catch (e) {
        res.status(500).json({ message: 'Failed to load notification' })
    }
}

export const markAsRead = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const { id } = req.params
        await Notification.updateOne({ _id: id, userId }, { $set: { read: true } })
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ message: 'Failed to mark as read' })
    }
}

export const markAllRead = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        await Notification.updateMany({ userId, read: false }, { $set: { read: true } })
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ message: 'Failed to mark read' })
    }
}

export const deleteNotification = async (req, res) => {
    try {
        const userId = req.user?._id || req.body.userId
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const { id } = req.params
        await Notification.deleteOne({ _id: id, userId })
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ message: 'Failed to delete notification' })
    }
}

export const createNotification = async (req, res) => {
    try {
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        
        const { title, message, payload = {} } = req.body
        if (!title && !message) {
            return res.status(400).json({ message: 'Title or message is required' })
        }
        
        const notification = await Notification.create({
            userId,
            title: title || message,
            message: message || title,
            payload,
            read: false
        })
        
        res.json({
            success: true,
            notification: {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                payload: notification.payload,
                read: notification.read,
                createdAt: notification.createdAt
            }
        })
    } catch (e) {
        console.error('Error creating notification:', e)
        res.status(500).json({ message: 'Failed to create notification' })
    }
}


