import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, default: "" },
    paymentMethod: {
        type: String,
        enum: ["gcash", "paymaya", "card", "bank", "cash"],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "succeeded", "failed", "canceled", "cash_pending_verification", "cash_verified", "cash_completed"],
        default: "pending"
    },
    // Cash donation process fields
    cashVerification: {
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
        verifiedAt: { type: Date, default: null },
        verificationNotes: { type: String, default: "" },
        receiptNumber: { type: String, default: "" }, // Official receipt number for cash donations
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
        completedAt: { type: Date, default: null }
    },
    paymongoReferenceId: { type: String, index: true },
    clientKey: { type: String, default: "" }, // for sources checkout URL retrieval
    sourceCheckoutUrl: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    // Donation recipient - can be CRD (null), Department, or Event
    recipientType: {
        type: String,
        enum: ["crd", "department", "event"],
        default: "crd"
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null }, // Department/Organization user ID
    isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });

const donationModel = mongoose.models.donation || mongoose.model("donation", donationSchema);

export default donationModel;


