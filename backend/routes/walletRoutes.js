import express from "express";
import userAuth from "../middleware/userAuth.js";
import requireRole from "../middleware/roleAuth.js";
import {
    createWallet,
    updateWallet,
    getWallet,
    getWalletStatus,
    verifyWallet,
    deactivateWallet,
    reactivateWallet,
    getAllWallets
} from "../controllers/walletController.js";

const router = express.Router();

// All routes require authentication
router.use(userAuth);

// System Admin only routes
router.post("/", requireRole(["System Administrator"]), createWallet);
router.put("/:userId", requireRole(["System Administrator"]), updateWallet);
router.post("/:userId/verify", requireRole(["System Administrator"]), verifyWallet);
router.post("/:userId/deactivate", requireRole(["System Administrator"]), deactivateWallet);
router.post("/:userId/reactivate", requireRole(["System Administrator"]), reactivateWallet);
router.get("/", requireRole(["System Administrator"]), getAllWallets);

// System Admin or Department owner routes
router.get("/:userId", getWallet); // Access control in controller
router.get("/:userId/status", getWalletStatus); // Access control in controller

export default router;

