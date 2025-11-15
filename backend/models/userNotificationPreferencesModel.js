import mongoose from "mongoose";

const userNotificationPreferencesSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        unique: true,
        index: true
    },
    // Push notification preferences
    pushEnabled: {
        type: Boolean,
        default: true
    },
    pushTypes: {
        events: { type: Boolean, default: true },
        volunteers: { type: Boolean, default: true },
        donations: { type: Boolean, default: true },
        social: { type: Boolean, default: true },
        system: { type: Boolean, default: true }
    },
    // Email notification preferences
    emailEnabled: {
        type: Boolean,
        default: true
    },
    emailTypes: {
        events: { type: Boolean, default: true },
        volunteers: { type: Boolean, default: true },
        donations: { type: Boolean, default: true },
        social: { type: Boolean, default: false },
        system: { type: Boolean, default: true }
    },
    // Quiet hours (disable notifications during these times)
    quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: "22:00" }, // 10 PM
        end: { type: String, default: "08:00" }   // 8 AM
    },
    // Frequency preferences
    emailFrequency: {
        type: String,
        enum: ["immediate", "daily", "weekly"],
        default: "immediate"
    }
}, { timestamps: true });

const userNotificationPreferencesModel = mongoose.models.userNotificationPreferences || mongoose.model("userNotificationPreferences", userNotificationPreferencesSchema);

export default userNotificationPreferencesModel;

