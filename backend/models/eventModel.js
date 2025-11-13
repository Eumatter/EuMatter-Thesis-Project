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
        status: { type: String, enum: ["registered", "approved", "rejected"], default: "registered" },
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

    // QR Code for attendance tracking
    attendanceQR: {
        code: { type: String },
        generatedAt: { type: Date },
        generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        isActive: { type: Boolean, default: false },
        expiresAt: { type: Date }
    },

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

    // Donation and Volunteer options
    isOpenForDonation: { type: Boolean, default: false },
    isOpenForVolunteer: { type: Boolean, default: false },

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
            notes: { type: String, default: "" }
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
