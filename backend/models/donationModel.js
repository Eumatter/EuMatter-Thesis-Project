import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, default: "" },
    paymentMethod: {
        type: String,
        enum: ["gcash", "paymaya", "card", "bank"],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "succeeded", "failed", "canceled"],
        default: "pending"
    },
    paymongoReferenceId: { type: String, index: true },
    clientKey: { type: String, default: "" }, // for sources checkout URL retrieval
    sourceCheckoutUrl: { type: String, default: "" },
    receiptUrl: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: null },
    isAnonymous: { type: Boolean, default: false }
}, { timestamps: true });

const donationModel = mongoose.models.donation || mongoose.model("donation", donationSchema);

export default donationModel;


