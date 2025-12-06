import express from "express";
import userAuth from "../middleware/userAuth.js";
import {
    createExpenditure,
    getAllExpenditures,
    getExpenditureById,
    updateExpenditure,
    approveExpenditure,
    rejectExpenditure,
    markAsPaid,
    getExpenditureStats
} from "../controllers/expenditureController.js";

const router = express.Router();

// Create expenditure
router.post("/", userAuth, createExpenditure);

// Get all expenditures
router.get("/", userAuth, getAllExpenditures);

// Get expenditure statistics
router.get("/stats", userAuth, getExpenditureStats);

// Get expenditure by ID
router.get("/:id", userAuth, getExpenditureById);

// Update expenditure
router.put("/:id", userAuth, updateExpenditure);

// Approve expenditure (CRD Staff or System Administrator only)
router.post("/:id/approve", userAuth, approveExpenditure);

// Reject expenditure (CRD Staff or System Administrator only)
router.post("/:id/reject", userAuth, rejectExpenditure);

// Mark expenditure as paid (CRD Staff or System Administrator only)
router.post("/:id/mark-paid", userAuth, markAsPaid);

export default router;

