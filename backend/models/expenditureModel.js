import mongoose from "mongoose";

const expenditureSchema = new mongoose.Schema({
    // Basic Information
    title: { type: String, required: true },
    description: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    
    // Category
    category: {
        type: String,
        enum: ["event_expenses", "operational", "equipment", "supplies", "transportation", "food", "other"],
        default: "other"
    },
    
    // Related Event (optional)
    event: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "event", 
        default: null 
    },
    
    // Department/Organization (optional)
    department: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "user", 
        default: null 
    },
    
    // Payment Information
    paymentMethod: {
        type: String,
        enum: ["cash", "check", "bank_transfer", "gcash", "paymaya", "other"],
        default: "cash"
    },
    receiptNumber: { type: String, default: "" },
    receiptUrl: { type: String, default: "" }, // For uploaded receipt images
    
    // Approval Information
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "paid"],
        default: "pending"
    },
    approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "user", 
        default: null 
    },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    
    // Payment Information
    paidBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "user", 
        default: null 
    },
    paidAt: { type: Date, default: null },
    
    // Date Information
    expenseDate: { type: Date, required: true, default: Date.now },
    
    // Created By
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "user", 
        required: true 
    },
    
    // Notes
    notes: { type: String, default: "" }
}, { timestamps: true });

// Indexes for efficient queries
expenditureSchema.index({ expenseDate: -1 });
expenditureSchema.index({ status: 1 });
expenditureSchema.index({ category: 1 });
expenditureSchema.index({ event: 1 });
expenditureSchema.index({ department: 1 });
expenditureSchema.index({ createdBy: 1 });

const expenditureModel = mongoose.models.expenditure || mongoose.model("expenditure", expenditureSchema);

export default expenditureModel;

