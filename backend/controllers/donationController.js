import donationModel from "../models/donationModel.js";
import userModel from "../models/userModel.js";
import eventModel from "../models/eventModel.js";
import { getPaymongoClientForDonation, getCRDPaymongoPublicKey } from "../config/paymongoFactory.js";
// Receipt generation - stub function (implement based on your receipt generator)
const generateReceiptPDF = async (donation) => {
    // TODO: Implement receipt generation
    // For now, return a placeholder URL
    return `/receipts/${donation._id}.pdf`;
};
import auditLogModel from "../models/auditLogModel.js";

// Create donation
export const createDonation = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { amount, message, paymentMethod, eventId, recipientType, departmentId, isAnonymous } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid donation amount" });
        }

        if (!paymentMethod || !["gcash", "paymaya", "card", "bank", "cash"].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "Invalid payment method" });
        }

        // Determine recipient type
        let finalRecipientType = recipientType || "crd";
        let finalDepartmentId = null;
        let finalEventId = eventId || null;

        if (recipientType === "event" && eventId) {
            const event = await eventModel.findById(eventId);
            if (!event) {
                return res.status(404).json({ success: false, message: "Event not found" });
            }
            if (!event.isOpenForDonation) {
                return res.status(400).json({ success: false, message: "Event is not open for donations" });
            }
            finalRecipientType = "event";
        } else if (recipientType === "department" && departmentId) {
            const department = await userModel.findById(departmentId);
            if (!department || department.role !== "Department/Organization") {
                return res.status(404).json({ success: false, message: "Department not found" });
            }
            finalRecipientType = "department";
            finalDepartmentId = departmentId;
        }

        // Handle cash donations
        if (paymentMethod === "cash") {
            const donation = new donationModel({
                donorName: isAnonymous ? "Anonymous" : user.name,
                donorEmail: user.email,
                amount: parseFloat(amount),
                message: message || "",
                paymentMethod: "cash",
                status: "cash_pending_verification",
                user: user._id,
                event: finalEventId,
                recipientType: finalRecipientType,
                department: finalDepartmentId,
                isAnonymous: isAnonymous || false
            });

            await donation.save();

            // Audit log
            await auditLogModel.create({
                userId: user._id,
                action: "CREATE_DONATION",
                resourceType: "donation",
                resourceId: donation._id,
                details: {
                    amount: donation.amount,
                    paymentMethod: "cash",
                    recipientType: finalRecipientType
                },
                ipAddress: req.ip,
                userAgent: req.get("user-agent")
            });

            return res.json({
                success: true,
                message: "Cash donation submitted. Please wait for verification.",
                donation: donation,
                type: "cash"
            });
        }

        // Get PayMongo client for the appropriate wallet
        let client, publicKey, walletUserId;
        try {
            const paymongoData = await getPaymongoClientForDonation({
                recipientType: finalRecipientType,
                eventId: finalEventId,
                departmentId: finalDepartmentId
            });
            client = paymongoData.client;
            publicKey = paymongoData.publicKey;
            walletUserId = paymongoData.walletUserId;
        } catch (error) {
            console.error('Error getting PayMongo client:', error);
            return res.status(500).json({ 
                success: false, 
                message: error.message || 'Payment service configuration error. Please contact support.' 
            });
        }

        // Create donation record
        const donation = new donationModel({
            donorName: isAnonymous ? "Anonymous" : user.name,
            donorEmail: user.email,
            amount: parseFloat(amount),
            message: message || "",
            paymentMethod: paymentMethod,
            status: "pending",
            user: user._id,
            event: finalEventId,
            recipientType: finalRecipientType,
            department: finalDepartmentId,
            isAnonymous: isAnonymous || false,
            walletUserId: walletUserId
        });

        await donation.save();

        // Create PayMongo source or payment intent
        if (paymentMethod === "gcash" || paymentMethod === "paymaya") {
            // Create source for GCash/PayMaya
            const sourceData = {
                data: {
                    attributes: {
                        amount: Math.round(amount * 100), // Convert to centavos
                        currency: "PHP",
                        type: paymentMethod === "gcash" ? "gcash" : "paymaya",
                        redirect: {
                            success: `${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/success?donationId=${donation._id}`,
                            failed: `${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/processing?donationId=${donation._id}&error=true`
                        }
                    }
                }
            };

            const sourceResponse = await client.post("/sources", sourceData);
            const source = sourceResponse.data.data;

            donation.paymongoReferenceId = source.id;
            donation.clientKey = publicKey;
            donation.sourceCheckoutUrl = source.attributes.redirect.checkout_url;
            await donation.save();

            return res.json({
                success: true,
                type: "source",
                checkoutUrl: source.attributes.redirect.checkout_url,
                donationId: donation._id
            });
        } else if (paymentMethod === "card") {
            // Create payment intent for card
            const intentData = {
                data: {
                    attributes: {
                        amount: Math.round(amount * 100),
                        currency: "PHP",
                        payment_method_allowed: ["card"],
                        payment_method_options: {
                            card: {
                                request_three_d_secure: "automatic"
                            }
                        }
                    }
                }
            };

            const intentResponse = await client.post("/payment_intents", intentData);
            const intent = intentResponse.data.data;

            donation.paymongoReferenceId = intent.id;
            donation.clientKey = publicKey;
            await donation.save();

            return res.json({
                success: true,
                type: "payment_intent",
                clientKey: publicKey,
                paymentIntentId: intent.id,
                donationId: donation._id
            });
        } else if (paymentMethod === "bank") {
            // Bank transfer - mark as pending
            donation.status = "pending";
            await donation.save();

            return res.json({
                success: true,
                message: "Bank transfer instructions will be sent to your email.",
                donation: donation,
                type: "bank"
            });
        }

        // Audit log
        await auditLogModel.create({
            userId: user._id,
            action: "CREATE_DONATION",
            resourceType: "donation",
            resourceId: donation._id,
            details: {
                amount: donation.amount,
                paymentMethod: paymentMethod,
                recipientType: finalRecipientType
            },
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });
    } catch (error) {
        console.error("Error creating donation:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Attach payment method to payment intent (for card payments)
export const attachPaymentMethod = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { donationId, paymentMethodId } = req.body;

        if (!donationId || !paymentMethodId) {
            return res.status(400).json({ success: false, message: "Donation ID and Payment Method ID are required" });
        }

        const donation = await donationModel.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        if (donation.user.toString() !== user._id.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Get PayMongo client
        const { client } = await getPaymongoClientForDonation({
            recipientType: donation.recipientType,
            eventId: donation.event,
            departmentId: donation.department
        });

        // Attach payment method to intent
        await client.post(`/payment_intents/${donation.paymongoReferenceId}/attach`, {
            data: {
                attributes: {
                    payment_method: paymentMethodId
                }
            }
        });

        // Update donation status
        donation.status = "succeeded";
        await donation.save();

        // Generate receipt
        const receiptUrl = await generateReceiptPDF(donation);
        donation.receiptUrl = receiptUrl;
        await donation.save();

        return res.json({
            success: true,
            message: "Payment successful",
            donation: donation
        });
    } catch (error) {
        console.error("Error attaching payment method:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Confirm source payment
export const confirmSourcePayment = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { donationId } = req.body;

        const donation = await donationModel.findById(donationId);
        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        // Get PayMongo client
        const { client } = await getPaymongoClientForDonation({
            recipientType: donation.recipientType,
            eventId: donation.event,
            departmentId: donation.department
        });

        // Retrieve source status
        const sourceResponse = await client.get(`/sources/${donation.paymongoReferenceId}`);
        const source = sourceResponse.data.data;

        if (source.attributes.status === "chargeable") {
            // Create payment
            const paymentData = {
                data: {
                    attributes: {
                        amount: Math.round(donation.amount * 100),
                        currency: "PHP",
                        source: {
                            id: donation.paymongoReferenceId,
                            type: "source"
                        }
                    }
                }
            };

            const paymentResponse = await client.post("/payments", paymentData);
            const payment = paymentResponse.data.data;

            if (payment.attributes.status === "paid") {
                donation.status = "succeeded";
                await donation.save();

                // Generate receipt
                const receiptUrl = await generateReceiptPDF(donation);
                donation.receiptUrl = receiptUrl;
                await donation.save();

                return res.json({
                    success: true,
                    message: "Payment confirmed",
                    donation: donation
                });
            } else {
                donation.status = "failed";
                await donation.save();
                return res.status(400).json({ success: false, message: "Payment failed" });
            }
        } else {
            return res.json({
                success: false,
                message: "Source is not chargeable yet",
                status: source.attributes.status
            });
        }
    } catch (error) {
        console.error("Error confirming source payment:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PayMongo redirect handler
export const paymongoRedirect = async (req, res) => {
    try {
        const { donationId } = req.query;

        if (!donationId) {
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/processing?error=true`);
        }

        const donation = await donationModel.findById(donationId);
        if (!donation) {
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/processing?error=true`);
        }

        // Check payment status via webhook or direct check
        if (donation.status === "succeeded") {
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/success?donationId=${donationId}`);
        } else {
            return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/processing?donationId=${donationId}`);
        }
    } catch (error) {
        console.error("Error in PayMongo redirect:", error);
        return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/donation/processing?error=true`);
    }
};

// Download receipt
export const downloadReceipt = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;
        const donation = await donationModel.findById(id);

        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        // Check permissions
        const isOwner = donation.user && donation.user.toString() === user._id.toString();
        const isCRD = user.role === "CRD Staff" || user.role === "System Administrator";
        const isDepartment = user.role === "Department/Organization" && donation.department && donation.department.toString() === user._id.toString();

        if (!isOwner && !isCRD && !isDepartment) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (!donation.receiptUrl) {
            // Generate receipt if not exists
            const receiptUrl = await generateReceiptPDF(donation);
            donation.receiptUrl = receiptUrl;
            await donation.save();
        }

        // Return receipt URL or stream file
        return res.json({
            success: true,
            receiptUrl: donation.receiptUrl
        });
    } catch (error) {
        console.error("Error downloading receipt:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get donation by ID
export const getDonationById = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { id } = req.params;
        const donation = await donationModel.findById(id)
            .populate("user", "name email")
            .populate("event", "title")
            .populate("department", "name");

        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        // Check permissions
        const isOwner = donation.user && donation.user._id.toString() === user._id.toString();
        const isCRD = user.role === "CRD Staff" || user.role === "System Administrator";
        const isDepartment = user.role === "Department/Organization" && donation.department && donation.department._id.toString() === user._id.toString();

        if (!isOwner && !isCRD && !isDepartment) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        return res.json({ success: true, donation: donation });
    } catch (error) {
        console.error("Error getting donation:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get my donations
export const getMyDonations = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const donations = await donationModel.find({ user: user._id })
            .populate("event", "title")
            .populate("department", "name")
            .sort({ createdAt: -1 });

        return res.json({ success: true, donations: donations });
    } catch (error) {
        console.error("Error getting my donations:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get all donations (CRD Staff only)
export const getAllDonations = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const allowedRoles = ["CRD Staff", "System Administrator"];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ success: false, message: "Access denied. CRD Staff or System Administrator required." });
        }

        const donations = await donationModel.find({})
            .populate("user", "name email")
            .populate("event", "title")
            .populate("department", "name")
            .sort({ createdAt: -1 });

        return res.json({ success: true, donations: donations });
    } catch (error) {
        console.error("Error getting all donations:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Handle PayMongo webhook
export const handleWebhook = async (req, res) => {
    try {
        const event = req.body.data;

        if (event.type === "source.chargeable") {
            const sourceId = event.attributes.data.id;
            const donation = await donationModel.findOne({ paymongoReferenceId: sourceId });

            if (donation && donation.status === "pending") {
                // Get PayMongo client
                const { client } = await getPaymongoClientForDonation({
                    recipientType: donation.recipientType,
                    eventId: donation.event,
                    departmentId: donation.department
                });

                // Create payment
                const paymentData = {
                    data: {
                        attributes: {
                            amount: Math.round(donation.amount * 100),
                            currency: "PHP",
                            source: {
                                id: sourceId,
                                type: "source"
                            }
                        }
                    }
                };

                const paymentResponse = await client.post("/payments", paymentData);
                const payment = paymentResponse.data.data;

                if (payment.attributes.status === "paid") {
                    donation.status = "succeeded";
                    await donation.save();

                    // Generate receipt
                    const receiptUrl = await generateReceiptPDF(donation);
                    donation.receiptUrl = receiptUrl;
                    await donation.save();
                } else {
                    donation.status = "failed";
                    await donation.save();
                }
            }
        } else if (event.type === "payment.paid") {
            const paymentId = event.attributes.data.id;
            // Handle payment.paid event if needed
        }

        return res.json({ received: true });
    } catch (error) {
        console.error("Error handling webhook:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Verify cash donation (CRD Staff or Department)
export const verifyCashDonation = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const allowedRoles = ["CRD Staff", "System Administrator", "Department/Organization"];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const { id } = req.params;
        const { verificationNotes, receiptNumber } = req.body;

        const donation = await donationModel.findById(id);
        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        if (donation.paymentMethod !== "cash") {
            return res.status(400).json({ success: false, message: "This is not a cash donation" });
        }

        if (donation.status !== "cash_pending_verification") {
            return res.status(400).json({ success: false, message: "Donation is not pending verification" });
        }

        // Check if department user can verify (only their own department donations)
        if (user.role === "Department/Organization") {
            if (!donation.department || donation.department.toString() !== user._id.toString()) {
                return res.status(403).json({ success: false, message: "You can only verify donations for your department" });
            }
        }

        donation.status = "cash_verified";
        donation.cashVerification.verifiedBy = user._id;
        donation.cashVerification.verifiedAt = new Date();
        donation.cashVerification.verificationNotes = verificationNotes || "";
        donation.cashVerification.receiptNumber = receiptNumber || "";
        await donation.save();

        // Audit log
        await auditLogModel.create({
            userId: user._id,
            action: "VERIFY_CASH_DONATION",
            resourceType: "donation",
            resourceId: donation._id,
            details: { receiptNumber },
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        return res.json({
            success: true,
            message: "Cash donation verified",
            donation: donation
        });
    } catch (error) {
        console.error("Error verifying cash donation:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Complete cash donation (CRD Staff or Department)
export const completeCashDonation = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const allowedRoles = ["CRD Staff", "System Administrator", "Department/Organization"];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const { id } = req.params;

        const donation = await donationModel.findById(id);
        if (!donation) {
            return res.status(404).json({ success: false, message: "Donation not found" });
        }

        if (donation.paymentMethod !== "cash") {
            return res.status(400).json({ success: false, message: "This is not a cash donation" });
        }

        if (donation.status !== "cash_verified") {
            return res.status(400).json({ success: false, message: "Donation must be verified first" });
        }

        // Check if department user can complete (only their own department donations)
        if (user.role === "Department/Organization") {
            if (!donation.department || donation.department.toString() !== user._id.toString()) {
                return res.status(403).json({ success: false, message: "You can only complete donations for your department" });
            }
        }

        donation.status = "cash_completed";
        donation.cashVerification.completedBy = user._id;
        donation.cashVerification.completedAt = new Date();
        await donation.save();

        // Generate receipt
        const receiptUrl = await generateReceiptPDF(donation);
        donation.receiptUrl = receiptUrl;
        await donation.save();

        // Audit log
        await auditLogModel.create({
            userId: user._id,
            action: "COMPLETE_CASH_DONATION",
            resourceType: "donation",
            resourceId: donation._id,
            details: {},
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        return res.json({
            success: true,
            message: "Cash donation completed",
            donation: donation
        });
    } catch (error) {
        console.error("Error completing cash donation:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get total donations per event
export const getTotalDonationsPerEvent = async (req, res) => {
    try {
        const user = req.user;
        if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

        // Check if user is CRD Staff or System Administrator
        const allowedRoles = ['CRD Staff', 'System Administrator'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ success: false, message: "Access denied. CRD Staff or System Administrator required." });
        }

        const events = await eventModel.find({}).select('_id title startDate endDate isOpenForDonation donationTarget').lean();

        // Calculate total donations for each event
        const eventsWithTotals = await Promise.all(events.map(async (event) => {
            const donations = await donationModel.find({
                event: event._id,
                status: { $in: ["succeeded", "cash_completed"] }
            }).select('amount').lean();

            const totalDonations = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

            return {
                eventId: event._id,
                eventTitle: event.title,
                startDate: event.startDate,
                endDate: event.endDate,
                isOpenForDonation: event.isOpenForDonation,
                donationTarget: event.donationTarget || null,
                totalDonations: totalDonations,
                donationCount: donations.length
            };
        }));

        // Calculate overall total
        const overallTotal = eventsWithTotals.reduce((sum, e) => sum + e.totalDonations, 0);

        return res.json({
            success: true,
            events: eventsWithTotals,
            overallTotal: overallTotal,
            totalEvents: eventsWithTotals.length
        });
    } catch (error) {
        console.error('Error getting total donations per event:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
