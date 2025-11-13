import Subscription from '../models/subscriptionModel.js'

export const subscribe = async (req, res) => {
    try {
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const { scope, targetId } = req.body
        if (!['event','department'].includes(scope) || !targetId) return res.status(400).json({ message: 'Invalid scope or target' })
        await Subscription.updateOne({ userId, scope, targetId }, { $set: { userId, scope, targetId } }, { upsert: true })
        res.json({ success: true })
    } catch (e) { res.status(500).json({ message: 'Failed to subscribe' }) }
}

export const unsubscribe = async (req, res) => {
    try {
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const { scope, targetId } = req.body
        await Subscription.deleteOne({ userId, scope, targetId })
        res.json({ success: true })
    } catch (e) { res.status(500).json({ message: 'Failed to unsubscribe' }) }
}

export const mySubscriptions = async (req, res) => {
    try {
        const userId = req.user?._id
        if (!userId) return res.status(401).json({ message: 'Unauthorized' })
        const subs = await Subscription.find({ userId }).lean()
        res.json(subs)
    } catch (e) { res.status(500).json({ message: 'Failed to load subscriptions' }) }
}


