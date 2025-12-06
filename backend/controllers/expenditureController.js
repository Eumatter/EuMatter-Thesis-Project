import expenditureModel from "../models/expenditureModel.js";
import userModel from "../models/userModel.js";
import { notifyUsers } from "../utils/notify.js";
import { createAuditLog } from "./auditLogController.js";

// Create Expenditure
export const createExpenditure = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const {
            title,
            description,
            amount,
            category,
            event,
            department,
            paymentMethod,
            receiptNumber,
            receiptUrl,
            expenseDate,
            notes
        } = req.body;

        // Validate required fields
        if (!title || !amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Title and amount are required. Amount must be greater than 0."
            });
        }

        // Create expenditure
        const expenditure = await expenditureModel.create({
            title,
            description: description || "",
            amount: parseFloat(amount),
            category: category || "other",
            event: event || null,
            department: department || null,
            paymentMethod: paymentMethod || "cash",
            receiptNumber: receiptNumber || "",
            receiptUrl: receiptUrl || "",
            expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
            notes: notes || "",
            createdBy: userId,
            status: "pending"
        });

        // Notify CRD staff about new expenditure request
        try {
            const crdStaff = await userModel.find({
                role: { $in: ["CRD Staff", "System Administrator"] }
            }).select('_id').lean();

            const staffIds = crdStaff.map(staff => staff._id);
            if (staffIds.length > 0) {
                await notifyUsers({
                    userIds: staffIds,
                    title: "New Expenditure Request",
                    message: `New expenditure request: ${title} - ₱${amount.toLocaleString()}`,
                    payload: {
                        type: "expenditure",
                        expenditureId: expenditure._id,
                        link: `/crd-staff/expenditures`
                    }
                });
            }
        } catch (notifError) {
            console.error("Error sending notifications:", notifError);
        }

        // Audit log
        try {
            await createAuditLog({
                userId: userId,
                userEmail: req.user?.email,
                userRole: req.user?.role,
                actionType: 'DEPARTMENT_FINANCIAL_TRANSACTION',
                resourceType: 'expenditure',
                resourceId: expenditure._id,
                success: true,
                newValues: { title, amount, status: 'pending' }
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
        }

        return res.json({
            success: true,
            message: "Expenditure request created successfully. Awaiting approval.",
            expenditure
        });
    } catch (error) {
        console.error("Error creating expenditure:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create expenditure request"
        });
    }
};

// Get All Expenditures
export const getAllExpenditures = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { status, category, event, department, page = 1, limit = 50 } = req.query;
        const query = {};

        // Filter by status
        if (status && status !== "all") {
            query.status = status;
        }

        // Filter by category
        if (category && category !== "all") {
            query.category = category;
        }

        // Filter by event
        if (event) {
            query.event = event;
        }

        // Filter by department
        if (department) {
            query.department = department;
        }

        // CRD Staff and System Admin can see all expenditures
        // Departments can only see their own expenditures
        if (user.role === "Department/Organization") {
            query.department = user._id;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const expenditures = await expenditureModel.find(query)
            .populate('createdBy', 'name email profileImage role')
            .populate('event', 'title startDate endDate')
            .populate('department', 'name email role')
            .populate('approvedBy', 'name email')
            .populate('paidBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await expenditureModel.countDocuments(query);

        return res.json({
            success: true,
            expenditures,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error("Error fetching expenditures:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expenditures"
        });
    }
};

// Get Expenditure by ID
export const getExpenditureById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const expenditure = await expenditureModel.findById(id)
            .populate('createdBy', 'name email profileImage role')
            .populate('event', 'title startDate endDate')
            .populate('department', 'name email role')
            .populate('approvedBy', 'name email')
            .populate('paidBy', 'name email');

        if (!expenditure) {
            return res.status(404).json({ success: false, message: "Expenditure not found" });
        }

        // Check permissions
        if (user.role === "Department/Organization" && String(expenditure.department) !== String(user._id)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        return res.json({ success: true, expenditure });
    } catch (error) {
        console.error("Error fetching expenditure:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expenditure"
        });
    }
};

// Update Expenditure
export const updateExpenditure = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const updateData = req.body;

        const expenditure = await expenditureModel.findById(id);
        if (!expenditure) {
            return res.status(404).json({ success: false, message: "Expenditure not found" });
        }

        // Check permissions - only creator or CRD/Admin can update
        if (user.role !== "CRD Staff" && user.role !== "System Administrator" && String(expenditure.createdBy) !== String(user._id)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Can't update if already paid
        if (expenditure.status === "paid") {
            return res.status(400).json({ success: false, message: "Cannot update paid expenditure" });
        }

        // Update allowed fields
        const allowedFields = ['title', 'description', 'amount', 'category', 'event', 'paymentMethod', 'receiptNumber', 'receiptUrl', 'expenseDate', 'notes'];
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                if (field === 'amount') {
                    expenditure[field] = parseFloat(updateData[field]);
                } else if (field === 'expenseDate') {
                    expenditure[field] = new Date(updateData[field]);
                } else {
                    expenditure[field] = updateData[field];
                }
            }
        });

        await expenditure.save();

        // Audit log
        try {
            await createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'DEPARTMENT_FINANCIAL_TRANSACTION',
                resourceType: 'expenditure',
                resourceId: expenditure._id,
                success: true,
                previousValues: { status: expenditure.status },
                newValues: updateData
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
        }

        return res.json({
            success: true,
            message: "Expenditure updated successfully",
            expenditure
        });
    } catch (error) {
        console.error("Error updating expenditure:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update expenditure"
        });
    }
};

// Approve Expenditure (CRD Staff or System Administrator only)
export const approveExpenditure = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Check permissions
        if (user.role !== "CRD Staff" && user.role !== "System Administrator") {
            return res.status(403).json({ success: false, message: "Access denied. CRD Staff or System Administrator required." });
        }

        const expenditure = await expenditureModel.findById(id);
        if (!expenditure) {
            return res.status(404).json({ success: false, message: "Expenditure not found" });
        }

        if (expenditure.status !== "pending") {
            return res.status(400).json({ success: false, message: `Expenditure is already ${expenditure.status}` });
        }

        expenditure.status = "approved";
        expenditure.approvedBy = user._id;
        expenditure.approvedAt = new Date();

        await expenditure.save();

        // Notify creator
        if (expenditure.createdBy) {
            try {
                await notifyUsers({
                    userIds: [expenditure.createdBy],
                    title: "Expenditure Approved",
                    message: `Your expenditure request "${expenditure.title}" has been approved.`,
                    payload: {
                        type: "expenditure_approved",
                        expenditureId: expenditure._id
                    }
                });
            } catch (notifError) {
                console.error("Error sending notification:", notifError);
            }
        }

        // Audit log
        try {
            await createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'DEPARTMENT_FINANCIAL_TRANSACTION',
                resourceType: 'expenditure',
                resourceId: expenditure._id,
                success: true,
                previousValues: { status: 'pending' },
                newValues: { status: 'approved', approvedBy: user._id }
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
        }

        return res.json({
            success: true,
            message: "Expenditure approved successfully",
            expenditure
        });
    } catch (error) {
        console.error("Error approving expenditure:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to approve expenditure"
        });
    }
};

// Reject Expenditure (CRD Staff or System Administrator only)
export const rejectExpenditure = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const { rejectionReason } = req.body;

        // Check permissions
        if (user.role !== "CRD Staff" && user.role !== "System Administrator") {
            return res.status(403).json({ success: false, message: "Access denied. CRD Staff or System Administrator required." });
        }

        const expenditure = await expenditureModel.findById(id);
        if (!expenditure) {
            return res.status(404).json({ success: false, message: "Expenditure not found" });
        }

        if (expenditure.status !== "pending") {
            return res.status(400).json({ success: false, message: `Expenditure is already ${expenditure.status}` });
        }

        expenditure.status = "rejected";
        expenditure.rejectionReason = rejectionReason || "";

        await expenditure.save();

        // Notify creator
        if (expenditure.createdBy) {
            try {
                await notifyUsers({
                    userIds: [expenditure.createdBy],
                    title: "Expenditure Rejected",
                    message: `Your expenditure request "${expenditure.title}" has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
                    payload: {
                        type: "expenditure_rejected",
                        expenditureId: expenditure._id
                    }
                });
            } catch (notifError) {
                console.error("Error sending notification:", notifError);
            }
        }

        // Audit log
        try {
            await createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'DEPARTMENT_FINANCIAL_TRANSACTION',
                resourceType: 'expenditure',
                resourceId: expenditure._id,
                success: true,
                previousValues: { status: 'pending' },
                newValues: { status: 'rejected', rejectionReason }
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
        }

        return res.json({
            success: true,
            message: "Expenditure rejected successfully",
            expenditure
        });
    } catch (error) {
        console.error("Error rejecting expenditure:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reject expenditure"
        });
    }
};

// Mark Expenditure as Paid (CRD Staff or System Administrator only)
export const markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Check permissions
        if (user.role !== "CRD Staff" && user.role !== "System Administrator") {
            return res.status(403).json({ success: false, message: "Access denied. CRD Staff or System Administrator required." });
        }

        const expenditure = await expenditureModel.findById(id);
        if (!expenditure) {
            return res.status(404).json({ success: false, message: "Expenditure not found" });
        }

        if (expenditure.status !== "approved") {
            return res.status(400).json({ success: false, message: "Expenditure must be approved before marking as paid" });
        }

        expenditure.status = "paid";
        expenditure.paidBy = user._id;
        expenditure.paidAt = new Date();

        await expenditure.save();

        // Audit log
        try {
            await createAuditLog({
                userId: user._id,
                userEmail: user.email,
                userRole: user.role,
                actionType: 'DEPARTMENT_FINANCIAL_TRANSACTION',
                resourceType: 'expenditure',
                resourceId: expenditure._id,
                success: true,
                previousValues: { status: 'approved' },
                newValues: { status: 'paid', paidBy: user._id }
            });
        } catch (auditError) {
            console.error("Error creating audit log:", auditError);
        }

        return res.json({
            success: true,
            message: "Expenditure marked as paid successfully",
            expenditure
        });
    } catch (error) {
        console.error("Error marking expenditure as paid:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to mark expenditure as paid"
        });
    }
};

// Get Expenditure Statistics
export const getExpenditureStats = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

        const { startDate, endDate, category, event, department } = req.query;
        const query = {};

        // Date range filter
        if (startDate || endDate) {
            query.expenseDate = {};
            if (startDate) query.expenseDate.$gte = new Date(startDate);
            if (endDate) query.expenseDate.$lte = new Date(endDate);
        }

        // Category filter
        if (category && category !== "all") {
            query.category = category;
        }

        // Event filter
        if (event) {
            query.event = event;
        }

        // Department filter
        if (department) {
            query.department = department;
        }

        // CRD Staff and System Admin can see all expenditures
        // Departments can only see their own expenditures
        if (user.role === "Department/Organization") {
            query.department = user._id;
        }

        // Get all expenditures matching query
        const expenditures = await expenditureModel.find(query).lean();

        // Calculate statistics
        const total = expenditures.length;
        const totalAmount = expenditures.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const pending = expenditures.filter(e => e.status === "pending").length;
        const approved = expenditures.filter(e => e.status === "approved").length;
        const paid = expenditures.filter(e => e.status === "paid").length;
        const rejected = expenditures.filter(e => e.status === "rejected").length;

        // Amount by status
        const amountByStatus = {
            pending: expenditures.filter(e => e.status === "pending").reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
            approved: expenditures.filter(e => e.status === "approved").reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
            paid: expenditures.filter(e => e.status === "paid").reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0),
            rejected: expenditures.filter(e => e.status === "rejected").reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
        };

        // Amount by category
        const amountByCategory = {};
        expenditures.forEach(e => {
            const cat = e.category || "other";
            amountByCategory[cat] = (amountByCategory[cat] || 0) + (parseFloat(e.amount) || 0);
        });

        // Monthly breakdown
        const monthlyBreakdown = {};
        expenditures.forEach(e => {
            const date = new Date(e.expenseDate);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyBreakdown[monthKey] = (monthlyBreakdown[monthKey] || 0) + (parseFloat(e.amount) || 0);
        });

        return res.json({
            success: true,
            stats: {
                total,
                totalAmount,
                pending,
                approved,
                paid,
                rejected,
                amountByStatus,
                amountByCategory,
                monthlyBreakdown
            }
        });
    } catch (error) {
        console.error("Error fetching expenditure stats:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch expenditure statistics"
        });
    }
};

