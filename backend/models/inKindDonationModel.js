import mongoose from "mongoose";

const inKindDonationSchema = new mongoose.Schema({
    // Donor Information
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true },
    donorPhone: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    
    // Donation Details
    donationType: {
        type: String,
        enum: ["food", "clothing", "school_supplies", "medical_supplies", "equipment", "services", "other"],
        required: true
    },
    itemDescription: { type: String, required: true },
    quantity: { type: String, default: "" }, // Can be number or description
    estimatedValue: { type: Number, default: 0 }, // Optional estimated value in PHP
    condition: {
        type: String,
        enum: ["new", "like_new", "good", "fair", "poor"],
        default: "good"
    },
    
    // Additional Information
    message: { type: String, default: "" },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null }, // Optional: related event
    
    // Delivery/Pickup Information
    deliveryMethod: {
        type: String,
        enum: ["drop_off", "pickup", "delivery", "pending"],
        default: "pending"
    },
    preferredDate: { type: Date, default: null },
    preferredTime: { type: String, default: "" },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },
    
    // Status and Management
    status: {
        type: String,
        enum: ["pending", "under_review", "approved", "scheduled", "received", "completed", "rejected", "cancelled"],
        default: "pending"
    },
    
    // CRD Staff Management
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: "" },
    scheduledDate: { type: Date, default: null },
    receivedDate: { type: Date, default: null },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    
    // Images/Attachments (store as base64 or file paths)
    images: [{ type: String, default: [] }], // Array of image URLs or base64 strings
    
    // Receipt/Acknowledgment
    acknowledgmentSent: { type: Boolean, default: false },
    acknowledgmentDate: { type: Date, default: null },
    receiptUrl: { type: String, default: "" },
    
    isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });

const inKindDonationModel = mongoose.models.inKindDonation || mongoose.model("inKindDonation", inKindDonationSchema);

export default inKindDonationModel;

