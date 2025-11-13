import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
    createInKindDonation,
    getAllInKindDonations,
    getMyInKindDonations,
    getInKindDonationById,
    updateInKindDonationStatus,
    deleteInKindDonation,
    getInKindDonationStats
} from "../controllers/inKindDonationController.js";

const router = express.Router();

// Create in-kind donation (Users)
router.post("/", userAuth, createInKindDonation);

// Get all in-kind donations (CRD Staff)
router.get("/", userAuth, getAllInKindDonations);

// Get my in-kind donations (Users)
router.get("/me", userAuth, getMyInKindDonations);

// Get statistics (CRD Staff)
router.get("/stats", userAuth, getInKindDonationStats);

// Get single in-kind donation
router.get("/:id", userAuth, getInKindDonationById);

// Update in-kind donation status (CRD Staff)
router.put("/:id/status", userAuth, updateInKindDonationStatus);

// Delete/Cancel in-kind donation
router.delete("/:id", userAuth, deleteInKindDonation);

export default router;

