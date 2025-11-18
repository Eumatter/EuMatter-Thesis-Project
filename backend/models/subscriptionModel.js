import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    // scope: 'event' | 'department'
    scope: { type: String, enum: ['event', 'department'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true })

// Compound index includes userId, so no separate index needed on userId
subscriptionSchema.index({ userId: 1, scope: 1, targetId: 1 }, { unique: true })

export default mongoose.model('subscriptions', subscriptionSchema)


