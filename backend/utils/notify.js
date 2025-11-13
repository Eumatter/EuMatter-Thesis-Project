import Notification from '../models/notificationModel.js'
import Subscription from '../models/subscriptionModel.js'

export async function notifyUsers({ userIds = [], title, message, payload = {} }) {
    if (!Array.isArray(userIds) || userIds.length === 0) return 0
    const docs = userIds.map(uid => ({ userId: uid, title, message, payload, read: false }))
    await Notification.insertMany(docs, { ordered: false }).catch(() => {})
    return docs.length
}

export async function notifyFollowersOfEvent(event, title, message) {
    const base = []
    if (event?.createdBy) base.push(event.createdBy)
    const subsEvent = await Subscription.find({ scope: 'event', targetId: event?._id }).lean().catch(() => [])
    const subsDept = event?.departmentId ? await Subscription.find({ scope: 'department', targetId: event.departmentId }).lean().catch(() => []) : []
    const userIds = Array.from(new Set([
        ...base,
        ...subsEvent.map(s => s.userId?.toString()),
        ...subsDept.map(s => s.userId?.toString())
    ].filter(Boolean)))
    return notifyUsers({ userIds, title, message, payload: { eventId: event?._id } })
}


