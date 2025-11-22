import inKindDonationModel from "../models/inKindDonationModel.js";
import userModel from "../models/userModel.js";
import { notifyUsers } from "../utils/notify.js";

// Create In-Kind Donation Request
export const createInKindDonation = async (req, res) => {
    try {
        const userId = req.user?._id || null;
        const {
            donorName,
            donorEmail,
            donorPhone,
            donationType,
            itemDescription,
            quantity,
            estimatedValue,
            condition,
            message,
            eventId,
            deliveryMethod,
            preferredDate,
            preferredTime,
            address,
            notes,
            images,
            isAnonymous
        } = req.body;

        // Create the in-kind donation
        const inKindDonation = await inKindDonationModel.create({
            donorName: donorName || req.user?.name || "",
            donorEmail: donorEmail || req.user?.email || "",
            donorPhone: donorPhone || "",
            user: userId,
            donationType,
            itemDescription,
            quantity: quantity || "",
            estimatedValue: estimatedValue ? Number(estimatedValue) : 0,
            condition: condition || "good",
            message: message || "",
            event: eventId || null,
            deliveryMethod: deliveryMethod || "pending",
            preferredDate: preferredDate ? new Date(preferredDate) : null,
            preferredTime: preferredTime || "",
            address: address || "",
            notes: notes || "",
            images: images || [],
            isAnonymous: isAnonymous || false,
            status: "pending"
        });

        // Notify CRD staff about new in-kind donation request
        try {
            const crdStaff = await userModel.find({ 
                role: { $in: ["CRD Staff", "System Administrator"] } 
            });
            
            const staffIds = crdStaff.map(staff => staff._id);
            if (staffIds.length > 0) {
                await notifyUsers({
                    userIds: staffIds,
                    title: "New In-Kind Donation Request",
                    message: `${donorName || "Anonymous"} has submitted an in-kind donation: ${itemDescription.substring(0, 50)}...`,
                    payload: {
                        type: "in_kind_donation",
                        donationId: inKindDonation._id,
                        link: `/crd-staff/in-kind-donations`
                    }
                });
            }
        } catch (notifError) {
            console.error("Error sending notifications:", notifError);
            // Don't fail the request if notification fails
        }

        return res.json({
            success: true,
            message: "In-kind donation request submitted successfully. Our team will review it shortly.",
            inKindDonation
        });
    } catch (error) {
        console.error("Error creating in-kind donation:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create in-kind donation request"
        });
    }
};

// Get All In-Kind Donations (for CRD Staff)
export const getAllInKindDonations = async (req, res) => {
    try {
        const { status, donationType, search, page = 1, limit = 20 } = req.query;
        const query = {};

        // Filter by status
        if (status && status !== "all") {
            query.status = status;
        }

        // Filter by donation type
        if (donationType && donationType !== "all") {
            query.donationType = donationType;
        }

        // Search filter
        if (search) {
            query.$or = [
                { donorName: { $regex: search, $options: "i" } },
                { donorEmail: { $regex: search, $options: "i" } },
                { itemDescription: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const donations = await inKindDonationModel
            .find(query)
            .populate("user", "name email profileImage userType mseufCategory outsiderCategory role")
            .populate("event", "title")
            .populate("reviewedBy", "name email")
            .populate("receivedBy", "name email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await inKindDonationModel.countDocuments(query);

        return res.json({
            success: true,
            donations,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error("Error fetching in-kind donations:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch in-kind donations"
        });
    }
};

// Get My In-Kind Donations (for Users)
export const getMyInKindDonations = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const donations = await inKindDonationModel
            .find({ user: userId })
            .populate("event", "title")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            donations
        });
    } catch (error) {
        console.error("Error fetching user's in-kind donations:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch your in-kind donations"
        });
    }
};

// Get Single In-Kind Donation
export const getInKindDonationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        const donation = await inKindDonationModel
            .findById(id)
            .populate("user", "name email profileImage userType mseufCategory outsiderCategory role")
            .populate("event", "title")
            .populate("reviewedBy", "name email")
            .populate("receivedBy", "name email");

        if (!donation) {
            return res.status(404).json({
                success: false,
                message: "In-kind donation not found"
            });
        }

        // Check if user has permission to view this donation
        const isOwner = donation.user && String(donation.user._id) === String(userId);
        const isCRDStaff = userRole && (userRole.includes("CRD Staff") || userRole.includes("System Administrator"));

        if (!isOwner && !isCRDStaff) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You don't have permission to view this donation"
            });
        }

        return res.json({
            success: true,
            donation
        });
    } catch (error) {
        console.error("Error fetching in-kind donation:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch in-kind donation"
        });
    }
};

// Update In-Kind Donation Status (CRD Staff Only)
export const updateInKindDonationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        // Check if user is CRD Staff or System Administrator
        if (!userRole || (!userRole.includes("CRD Staff") && !userRole.includes("System Administrator"))) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Only CRD Staff can update donation status"
            });
        }

        const {
            status,
            reviewNotes,
            scheduledDate,
            receivedDate
        } = req.body;

        const donation = await inKindDonationModel.findById(id);
        if (!donation) {
            return res.status(404).json({
                success: false,
                message: "In-kind donation not found"
            });
        }

        // Update status and related fields
        if (status) {
            donation.status = status;
            
            // Set reviewedBy and reviewedAt when status changes from pending
            if (donation.status === "pending" && status !== "pending") {
                donation.reviewedBy = userId;
                donation.reviewedAt = new Date();
            }

            // Set receivedDate and receivedBy when status is received
            if (status === "received") {
                donation.receivedDate = receivedDate ? new Date(receivedDate) : new Date();
                donation.receivedBy = userId;
            }
        }

        if (reviewNotes !== undefined) {
            donation.reviewNotes = reviewNotes;
        }

        if (scheduledDate) {
            donation.scheduledDate = new Date(scheduledDate);
            if (donation.status === "approved") {
                donation.status = "scheduled";
            }
        }

        await donation.save();

        // Notify the donor about status update
        if (donation.user) {
            try {
                const statusMessages = {
                    under_review: "Your in-kind donation is under review",
                    approved: "Your in-kind donation has been approved",
                    scheduled: "Your in-kind donation pickup/delivery has been scheduled",
                    received: "Your in-kind donation has been received",
                    completed: "Your in-kind donation has been completed",
                    rejected: "Your in-kind donation request has been rejected",
                    cancelled: "Your in-kind donation has been cancelled"
                };

                await notifyUsers({
                    userIds: [donation.user._id],
                    title: "In-Kind Donation Status Update",
                    message: statusMessages[status] || "Your in-kind donation status has been updated",
                    payload: {
                        type: "in_kind_donation",
                        donationId: donation._id,
                        link: `/user/donations`
                    }
                });
            } catch (notifError) {
                console.error("Error sending notification:", notifError);
            }
        }

        // Populate before returning
        await donation.populate("user", "name email userType mseufCategory outsiderCategory role");
        await donation.populate("reviewedBy", "name email");
        if (donation.receivedBy) {
            await donation.populate("receivedBy", "name email");
        }

        return res.json({
            success: true,
            message: "In-kind donation status updated successfully",
            donation
        });
    } catch (error) {
        console.error("Error updating in-kind donation status:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update in-kind donation status"
        });
    }
};

// Delete/Cancel In-Kind Donation
export const deleteInKindDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id;
        const userRole = req.user?.role;

        const donation = await inKindDonationModel.findById(id);
        if (!donation) {
            return res.status(404).json({
                success: false,
                message: "In-kind donation not found"
            });
        }

        // Check permissions: owner can cancel, CRD staff can delete
        const isOwner = donation.user && String(donation.user._id) === String(userId);
        const isCRDStaff = userRole && (userRole.includes("CRD Staff") || userRole.includes("System Administrator"));

        if (!isOwner && !isCRDStaff) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You don't have permission to delete this donation"
            });
        }

        // If owner, just update status to cancelled
        if (isOwner && !isCRDStaff) {
            donation.status = "cancelled";
            await donation.save();
            return res.json({
                success: true,
                message: "In-kind donation cancelled successfully",
                donation
            });
        }

        // If CRD staff, delete the donation
        await inKindDonationModel.findByIdAndDelete(id);

        return res.json({
            success: true,
            message: "In-kind donation deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting in-kind donation:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete in-kind donation"
        });
    }
};

// Get Statistics for CRD Dashboard
export const getInKindDonationStats = async (req, res) => {
    try {
        const total = await inKindDonationModel.countDocuments();
        const pending = await inKindDonationModel.countDocuments({ status: "pending" });
        const approved = await inKindDonationModel.countDocuments({ status: "approved" });
        const scheduled = await inKindDonationModel.countDocuments({ status: "scheduled" });
        const received = await inKindDonationModel.countDocuments({ status: "received" });
        const completed = await inKindDonationModel.countDocuments({ status: "completed" });

        // Calculate total estimated value
        const donationsWithValue = await inKindDonationModel.find({
            estimatedValue: { $gt: 0 }
        });
        const totalEstimatedValue = donationsWithValue.reduce(
            (sum, donation) => sum + (donation.estimatedValue || 0),
            0
        );

        return res.json({
            success: true,
            stats: {
                total,
                pending,
                approved,
                scheduled,
                received,
                completed,
                totalEstimatedValue
            }
        });
    } catch (error) {
        console.error("Error fetching in-kind donation stats:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch statistics"
        });
    }
};

