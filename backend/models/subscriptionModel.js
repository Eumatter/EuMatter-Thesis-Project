import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', index: true, required: true },
    // scope: 'event' | 'department'
    scope: { type: String, enum: ['event', 'department'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true })

subscriptionSchema.index({ userId: 1, scope: 1, targetId: 1 }, { unique: true })

export default mongoose.model('subscriptions', subscriptionSchema)


