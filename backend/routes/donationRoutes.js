import express from "express";
import userAuth from "../middleware/userAuth.js";
import {paymongoRedirect , attachPaymentMethod, createDonation, confirmSourcePayment, downloadReceipt, getDonationById, getMyDonations, getAllDonations, handleWebhook } from "../controllers/donationController.js";
const router = express.Router();

// Test endpoint to check if donation routes are working
router.get("/test", (req, res) => {
    res.json({ success: true, message: "Donation routes are working" });
});

// Test PayMongo connection
router.get("/test-paymongo", async (req, res) => {
    try {
        const paymongoClient = (await import("../config/paymongo.js")).default;
        // Try to make a simple request to PayMongo to test connection
        const response = await paymongoClient.get("/sources?limit=1");
        res.json({ 
            success: true, 
            message: "PayMongo connection successful",
            paymongoResponse: response.data
        });
    } catch (error) {
        console.error('PayMongo connection test failed:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: "PayMongo connection failed",
            error: error.response?.data || error.message
        });
    }
});

// Public webhook endpoint (PayMongo)
router.post("/webhook", express.json({ type: "application/json" }), handleWebhook);

// Create donation
router.post("/", userAuth, createDonation);

// Attach card payment method to intent
router.post("/attach", userAuth, attachPaymentMethod);

// Confirm source payment
router.post("/confirm-source", userAuth, confirmSourcePayment);

// My donations
router.get("/me", userAuth, getMyDonations);

// Get all donations (CRD Staff only)
router.get("/all", userAuth, getAllDonations);

// PayMongo redirect handler
router.get("/paymongo-redirect", paymongoRedirect);

// One donation
router.get("/:id", userAuth, getDonationById);

// Receipt download
router.get("/:id/receipt", userAuth, downloadReceipt);

export default router;


