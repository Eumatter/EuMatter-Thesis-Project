import mongoose from "mongoose";

const volunteerAttendanceSchema = new mongoose.Schema({
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "event",
        required: true
    },
    volunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    timeIn: {
        type: Date
    },
    timeOut: {
        type: Date
    },
    totalHours: {
        type: Number,
        default: 0
    },
    isValid: {
        type: Boolean,
        default: true
    },
    qrCode: {
        type: String,
        required: true
    },
    location: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    }
}, { timestamps: true });

// Index for efficient queries
volunteerAttendanceSchema.index({ event: 1, volunteer: 1, date: 1 });
volunteerAttendanceSchema.index({ qrCode: 1 });

const volunteerAttendanceModel = mongoose.models.volunteerAttendance || mongoose.model("volunteerAttendance", volunteerAttendanceSchema);

export default volunteerAttendanceModel;

