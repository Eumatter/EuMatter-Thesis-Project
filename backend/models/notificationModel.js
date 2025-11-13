import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', index: true, required: true },
    title: { type: String, default: 'Update' },
    message: { type: String, default: '' },
    payload: { type: Object, default: {} },
    read: { type: Boolean, default: false },
}, { timestamps: true })

export default mongoose.model('notifications', notificationSchema)


