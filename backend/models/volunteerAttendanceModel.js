import mongoose from "mongoose";

const volunteerAttendanceSchema = new mongoose.Schema({
    // Legacy field names (kept for backward compatibility)
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "event"
    },
    volunteer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
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
    qrCode: {
        type: String,
        default: ""
    },
    
    // New standardized field names
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "event",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    date: {
        type: String, // Format: "YYYY-MM-DD"
        required: true
    },
    checkInTime: {
        type: Date
    },
    checkOutTime: {
        type: Date
    },
    hoursWorked: {
        type: Number,
        default: 0
    },
    
    // Additional fields
    isValid: {
        type: Boolean,
        default: true
    },
    location: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    },
    deadlineAt: {
        type: Date
    },
    status: {
        type: String,
        enum: ['pending', 'submitted', 'missed', 'voided', 'overridden', 'not_required'],
        default: 'pending',
        index: true
    },
    voidedHours: {
        type: Boolean,
        default: false
    },
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: 2000 },
        submittedAt: { type: Date },
        submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        overridden: { type: Boolean, default: false },
        overrideReason: { type: String, trim: true, maxlength: 1000 }
    },
    feedbackReminderSentAt: {
        type: Date
    }
}, { timestamps: true });

// Virtual to sync legacy fields with new fields
volunteerAttendanceSchema.pre('save', function(next) {
    // Sync new fields to legacy fields for backward compatibility
    if (this.eventId && !this.event) {
        this.event = this.eventId;
    }
    if (this.userId && !this.volunteer) {
        this.volunteer = this.userId;
    }
    if (this.checkInTime && !this.timeIn) {
        this.timeIn = this.checkInTime;
    }
    if (this.checkOutTime && !this.timeOut) {
        this.timeOut = this.checkOutTime;
    }
    if (this.hoursWorked !== undefined && this.totalHours === 0) {
        this.totalHours = this.hoursWorked;
    }
    
    // Sync legacy fields to new fields
    if (this.event && !this.eventId) {
        this.eventId = this.event;
    }
    if (this.volunteer && !this.userId) {
        this.userId = this.volunteer;
    }
    if (this.timeIn && !this.checkInTime) {
        this.checkInTime = this.timeIn;
    }
    if (this.timeOut && !this.checkOutTime) {
        this.checkOutTime = this.timeOut;
    }
    if (this.totalHours !== undefined && this.hoursWorked === 0) {
        this.hoursWorked = this.totalHours;
    }
    
    // Ensure date is in string format "YYYY-MM-DD"
    if (this.date instanceof Date) {
        const d = new Date(this.date);
        this.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (this.date && typeof this.date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
        // If date is a string but not in YYYY-MM-DD format, try to convert
        const d = new Date(this.date);
        if (!isNaN(d.getTime())) {
            this.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
    }
    
    next();
});

// Index for efficient queries
volunteerAttendanceSchema.index({ eventId: 1, userId: 1, date: 1 });
volunteerAttendanceSchema.index({ event: 1, volunteer: 1, date: 1 }); // Legacy index
volunteerAttendanceSchema.index({ qrCode: 1 });

const volunteerAttendanceModel = mongoose.models.volunteerAttendance || mongoose.model("volunteerAttendance", volunteerAttendanceSchema);

export default volunteerAttendanceModel;

