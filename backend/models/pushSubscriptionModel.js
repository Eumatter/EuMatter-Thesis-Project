import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true
    },
    keys: {
        p256dh: {
            type: String,
            required: true
        },
        auth: {
            type: String,
            required: true
        }
    },
    userAgent: {
        type: String,
        default: ""
    },
    deviceInfo: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Index for efficient queries
pushSubscriptionSchema.index({ userId: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });

const pushSubscriptionModel = mongoose.models.pushSubscription || mongoose.model("pushSubscription", pushSubscriptionSchema);

export default pushSubscriptionModel;

