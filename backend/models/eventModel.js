import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    
    // Date handling
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    location: { type: String, required: true },

    // Event created by department/org
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "user",
        required: true 
    }, 

    volunteers: [
        { type: mongoose.Schema.Types.ObjectId, ref: "user" }
    ],

    // Optional volunteer registration records with metadata
    volunteerRegistrations: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        name: { type: String },
        email: { type: String },
        age: { type: Number },
        department: { type: String },
        skills: [{ type: String }],
        additionalNotes: { type: String },
        joinedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["registered", "approved", "rejected", "invited", "accepted"], default: "registered" },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" }, // Who sent the invitation
        invitedAt: { type: Date }, // When the invitation was sent
        acceptedAt: { type: Date }, // When the invitation was accepted
        attendanceRecords: [{
            date: { type: Date, required: true },
            timeIn: { type: Date },
            timeOut: { type: Date },
            totalHours: { type: Number, default: 0 },
            isValid: { type: Boolean, default: true },
            qrCode: { type: String }, // QR code used for this attendance
            createdAt: { type: Date, default: Date.now }
        }]
    }],

    // QR Code for attendance tracking (legacy - kept for backward compatibility)
    attendanceQR: {
        code: { type: String },
        generatedAt: { type: Date },
        generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        isActive: { type: Boolean, default: false },
        expiresAt: { type: Date }
    },

    // QR Codes for multi-day events - one QR per day for check-in and check-out
    qrCodes: [{
        date: { type: String, required: true }, // Format: "YYYY-MM-DD"
        checkIn: { type: String, default: "" }, // QR code string for check-in
        checkOut: { type: String, default: "" }, // QR code string for check-out
        generatedAt: { type: Date, default: Date.now },
        generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date }
    }],

    // Feedback collection for the event
    feedback: [{
        volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, default: "" },
        submittedAt: { type: Date, default: Date.now },
        attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "volunteerAttendance" } // Link to attendance record
    }],

    // Comments on the event
    comments: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }],

    // Reactions to the event
    reactions: {
        like: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        love: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        haha: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        wow: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        sad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
        angry: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }]
    },

    // Donations tracking
    donations: [{
        donor: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
        amount: { type: Number, required: true },
        donatedAt: { type: Date, default: Date.now }
    }],
    totalDonations: { type: Number, default: 0 },

    // Event status
    status: { 
        type: String, 
        enum: ["Proposed", "Pending", "Approved", "Declined", "Upcoming", "Ongoing", "Completed"], 
        default: "Proposed" 
    },

    // Track review info (approval/decline)
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    reviewedAt: { type: Date, default: null },

    // Base64 encoded image string (e.g. preview poster/banner)
    image: { type: String, default: "" },

    // Proposal document stored as Base64 string
    proposalDocument: { type: String, default: "" },

    // Event Category - for filtering community relations/extension services events
    eventCategory: {
        type: String,
        enum: ["community_relations", "community_extension", "other"],
        default: "other"
    },
    
    // Donation and Volunteer options
    isOpenForDonation: { type: Boolean, default: false },
    isOpenForVolunteer: { type: Boolean, default: false },
    donationTarget: { type: Number, default: null }, // Target donation amount (required if isOpenForDonation is true)

    // Volunteer settings and requirements
    volunteerSettings: {
        type: new mongoose.Schema({
            mode: { type: String, enum: ["open_for_all", "with_requirements"], default: "open_for_all" },
            minAge: { type: Number, default: null },
            maxVolunteers: { type: Number, default: null },
            requiredSkills: [{ type: String }],
            studentOnly: { type: Boolean, default: false },
            departmentRestrictionType: { type: String, enum: ["all", "specific"], default: "all" },
            allowedDepartments: [{ type: String }],
            notes: { type: String, default: "" },
            // Time in/out schedule for volunteers
            dailySchedule: {
                // For single-day events: one time in/out
                // For multi-day events: array of daily schedules
                type: [{
                    date: { type: Date, required: true },
                    timeIn: { type: String, required: true }, // Format: "HH:MM" (24-hour)
                    timeOut: { type: String, required: true }, // Format: "HH:MM" (24-hour)
                    notes: { type: String, default: "" }
                }],
                default: []
            },
            requireTimeTracking: { type: Boolean, default: true } // Whether time in/out is required
        }, { _id: false }),
        default: undefined
    },

    // Facebook integration
    facebookPostId: { type: String, default: null },
    facebookPostedAt: { type: Date, default: null },
    facebookPageId: { type: String, default: null },

    feedbackRules: {
        deadlineHours: { type: Number, default: 24 },
        requireFeedback: { type: Boolean, default: true },
        allowOrganizerOverride: { type: Boolean, default: true }
    },
    feedbackSummary: {
        averageRating: { type: Number, default: 0 },
        totalResponses: { type: Number, default: 0 },
        lastCalculatedAt: { type: Date, default: null }
    }
}, { timestamps: true });

const eventModel = mongoose.models.event || mongoose.model("event", eventSchema);

export default eventModel;
