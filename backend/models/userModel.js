import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
        type: String,
        enum: ["User", "System Administrator", "CRD Staff", "Department/Organization", "Auditor"],
        default: "User"
    },

    profileImage: { 
        type: String, 
        default: ""
    },

    // Additional Personal Information
    birthday: { type: Date, default: null },
    gender: { 
        type: String, 
        enum: ["Male", "Female", "Other", "Prefer not to say", ""],
        default: ""
    },
    address: { type: String, default: "" },
    contact: { type: String, default: "" }, // Phone number

    // User Type: MSEUF or Outsider
    userType: {
        type: String,
        enum: ["MSEUF", "Outsider", ""],
        default: ""
    },

    // MSEUF Specific Information
    mseufCategory: {
        type: String,
        enum: ["Student", "Faculty", "Staff", ""],
        default: ""
    },
    
    // Outsider/Guest Specific Information
    outsiderCategory: {
        type: String,
        enum: ["Alumni", "External Partner", "General Public", ""],
        default: ""
    },
    
    // Student Information (if MSEUF Student)
    studentYear: {
        type: String,
        enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate", ""],
        default: ""
    },
    department: { type: String, default: "" },
    course: { type: String, default: "" },
    
    // MSEUF ID (extracted from email, e.g., A22-34197)
    mseufId: { type: String, default: "" },

    // Email verification OTP (aligned with controllers)
    verifyOtp: { type: String, default: '' },
    verifyOtpExpireAt: { type: Number, default: 0 },
    verifyOtpAttempts: { type: Number, default: 0 }, // Track failed attempts
    verifyOtpLastAttempt: { type: Number, default: 0 }, // Timestamp of last attempt
    isAccountVerified: { type: Boolean, default: false },
    // Password reset OTP (aligned with controllers)
    resetOtp: { type: String, default: '' },
    resetOtpExpireAt: { type: Number, default: 0 },

}, { timestamps: true })

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel;