import departmentWalletModel from "../models/departmentWalletModel.js";
import userModel from "../models/userModel.js";
import { verifyPayMongoCredentials, maskKey } from "../utils/walletEncryption.js";

/**
 * Create wallet for a department (System Admin only)
 */
export const createWallet = async (req, res) => {
    try {
        const { userId, publicKey, secretKey, webhookSecret } = req.body;

        if (!userId || !publicKey || !secretKey) {
            return res.status(400).json({
                success: false,
                message: "userId, publicKey, and secretKey are required"
            });
        }

        // Verify user exists and is Department/Organization
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== "Department/Organization") {
            return res.status(400).json({
                success: false,
                message: "Wallet can only be created for Department/Organization users"
            });
        }

        // Check if wallet already exists
        const existingWallet = await departmentWalletModel.findOne({ userId });
        if (existingWallet) {
            return res.status(400).json({
                success: false,
                message: "Wallet already exists for this user. Use update endpoint instead."
            });
        }

        // Create wallet (encryption happens in pre-save hook)
        const wallet = await departmentWalletModel.create({
            userId,
            publicKey, // Will be encrypted in pre-save hook
            secretKey, // Will be encrypted in pre-save hook
            webhookSecret: webhookSecret || null,
            isActive: true,
            verificationStatus: "pending"
        });

        // Return wallet info (masked keys)
        const maskedKeys = wallet.getMaskedKeys();

        res.status(201).json({
            success: true,
            message: "Wallet created successfully",
            wallet: {
                _id: wallet._id,
                userId: wallet.userId,
                publicKey: maskedKeys.publicKey,
                secretKey: maskedKeys.secretKey,
                webhookSecret: maskedKeys.webhookSecret,
                isActive: wallet.isActive,
                lastVerifiedAt: wallet.lastVerifiedAt,
                verificationStatus: wallet.verificationStatus,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt
            }
        });
    } catch (error) {
        console.error("Error creating wallet:", error.message);
        // Never expose encryption errors in detail
        if (error.message.includes("encrypt")) {
            return res.status(500).json({
                success: false,
                message: "Failed to securely store wallet credentials"
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create wallet"
        });
    }
};

/**
 * Update wallet credentials (System Admin only)
 */
export const updateWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const { publicKey, secretKey, webhookSecret, isActive } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        // Verify user exists and is Department/Organization
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== "Department/Organization") {
            return res.status(400).json({
                success: false,
                message: "Wallet can only be updated for Department/Organization users"
            });
        }

        // Find existing wallet
        const wallet = await departmentWalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found. Use create endpoint instead."
            });
        }

        // Update fields (only update provided fields)
        const updateData = {};
        if (publicKey !== undefined) updateData.publicKey = publicKey;
        if (secretKey !== undefined) updateData.secretKey = secretKey;
        if (webhookSecret !== undefined) updateData.webhookSecret = webhookSecret || null;
        if (isActive !== undefined) updateData.isActive = isActive;

        // If credentials are being updated, reset verification status
        if (publicKey !== undefined || secretKey !== undefined) {
            updateData.verificationStatus = "pending";
            updateData.lastVerifiedAt = null;
            updateData.lastVerificationError = null;
        }

        Object.assign(wallet, updateData);
        await wallet.save();

        // Return wallet info (masked keys)
        const maskedKeys = wallet.getMaskedKeys();

        res.json({
            success: true,
            message: "Wallet updated successfully",
            wallet: {
                _id: wallet._id,
                userId: wallet.userId,
                publicKey: maskedKeys.publicKey,
                secretKey: maskedKeys.secretKey,
                webhookSecret: maskedKeys.webhookSecret,
                isActive: wallet.isActive,
                lastVerifiedAt: wallet.lastVerifiedAt,
                verificationStatus: wallet.verificationStatus,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt
            }
        });
    } catch (error) {
        console.error("Error updating wallet:", error.message);
        if (error.message.includes("encrypt")) {
            return res.status(500).json({
                success: false,
                message: "Failed to securely store wallet credentials"
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update wallet"
        });
    }
};

/**
 * Get wallet info (Admin: full, Department: masked)
 */
export const getWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const wallet = await departmentWalletModel.findOne({ userId })
            .populate('userId', 'name email role');

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        // Check access: System Admin gets full info, Department gets masked
        const isSystemAdmin = currentUser.role === "System Administrator";
        const isOwner = currentUser._id.toString() === userId.toString();

        if (!isSystemAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only view your own wallet."
            });
        }

        if (isSystemAdmin) {
            // System Admin: Return decrypted keys (but still mask in response for security)
            const maskedKeys = wallet.getMaskedKeys();
            res.json({
                success: true,
                wallet: {
                    _id: wallet._id,
                    userId: wallet.userId,
                    publicKey: maskedKeys.publicKey,
                    secretKey: maskedKeys.secretKey, // Still masked even for admin
                    webhookSecret: maskedKeys.webhookSecret,
                    isActive: wallet.isActive,
                    lastVerifiedAt: wallet.lastVerifiedAt,
                    verificationStatus: wallet.verificationStatus,
                    lastVerificationError: wallet.lastVerificationError,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt
                }
            });
        } else {
            // Department owner: Only masked keys
            const maskedKeys = wallet.getMaskedKeys();
            res.json({
                success: true,
                wallet: {
                    _id: wallet._id,
                    userId: wallet.userId,
                    publicKey: maskedKeys.publicKey,
                    secretKey: "****", // Always hidden from department
                    webhookSecret: null, // Hidden from department
                    isActive: wallet.isActive,
                    lastVerifiedAt: wallet.lastVerifiedAt,
                    verificationStatus: wallet.verificationStatus,
                    createdAt: wallet.createdAt,
                    updatedAt: wallet.updatedAt
                }
            });
        }
    } catch (error) {
        console.error("Error getting wallet:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get wallet"
        });
    }
};

/**
 * Get wallet status (Department can view)
 */
export const getWalletStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUser = req.user;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const wallet = await departmentWalletModel.findOne({ userId })
            .populate('userId', 'name email role');

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        // Check access: System Admin or Department owner
        const isSystemAdmin = currentUser.role === "System Administrator";
        const isOwner = currentUser._id.toString() === userId.toString();

        if (!isSystemAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const maskedKeys = wallet.getMaskedKeys();

        res.json({
            success: true,
            status: {
                isActive: wallet.isActive,
                lastVerifiedAt: wallet.lastVerifiedAt,
                verificationStatus: wallet.verificationStatus,
                publicKey: maskedKeys.publicKey, // Masked
                hasWebhookSecret: !!wallet.webhookSecret
            }
        });
    } catch (error) {
        console.error("Error getting wallet status:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get wallet status"
        });
    }
};

/**
 * Verify wallet credentials (System Admin only)
 */
export const verifyWallet = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const wallet = await departmentWalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        // Get decrypted keys
        let decryptedKeys;
        try {
            decryptedKeys = wallet.getDecryptedKeys();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to decrypt wallet keys. Encryption key may be incorrect."
            });
        }

        // Verify credentials with PayMongo
        const verification = await verifyPayMongoCredentials(
            decryptedKeys.publicKey,
            decryptedKeys.secretKey
        );

        // Update wallet verification status
        wallet.lastVerifiedAt = new Date();
        wallet.verificationStatus = verification.valid ? "verified" : "failed";
        wallet.lastVerificationError = verification.valid ? null : verification.error;
        await wallet.save();

        if (verification.valid) {
            res.json({
                success: true,
                message: "Wallet credentials verified successfully",
                verified: true,
                lastVerifiedAt: wallet.lastVerifiedAt
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Wallet credentials verification failed",
                verified: false,
                error: verification.error,
                lastVerifiedAt: wallet.lastVerifiedAt
            });
        }
    } catch (error) {
        console.error("Error verifying wallet:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to verify wallet"
        });
    }
};

/**
 * Deactivate wallet (System Admin only)
 */
export const deactivateWallet = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const wallet = await departmentWalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        wallet.isActive = false;
        await wallet.save();

        res.json({
            success: true,
            message: "Wallet deactivated successfully",
            wallet: {
                _id: wallet._id,
                userId: wallet.userId,
                isActive: wallet.isActive
            }
        });
    } catch (error) {
        console.error("Error deactivating wallet:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to deactivate wallet"
        });
    }
};

/**
 * Reactivate wallet (System Admin only)
 */
export const reactivateWallet = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        const wallet = await departmentWalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found"
            });
        }

        wallet.isActive = true;
        await wallet.save();

        res.json({
            success: true,
            message: "Wallet reactivated successfully",
            wallet: {
                _id: wallet._id,
                userId: wallet.userId,
                isActive: wallet.isActive
            }
        });
    } catch (error) {
        console.error("Error reactivating wallet:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to reactivate wallet"
        });
    }
};

/**
 * Get all wallets (System Admin only)
 */
export const getAllWallets = async (req, res) => {
    try {
        const wallets = await departmentWalletModel.find({})
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 });

        // Return wallets with masked keys
        const walletsWithMaskedKeys = wallets.map(wallet => {
            const maskedKeys = wallet.getMaskedKeys();
            return {
                _id: wallet._id,
                userId: wallet.userId,
                publicKey: maskedKeys.publicKey,
                secretKey: maskedKeys.secretKey,
                webhookSecret: maskedKeys.webhookSecret,
                isActive: wallet.isActive,
                lastVerifiedAt: wallet.lastVerifiedAt,
                verificationStatus: wallet.verificationStatus,
                lastVerificationError: wallet.lastVerificationError,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt
            };
        });

        res.json({
            success: true,
            wallets: walletsWithMaskedKeys,
            total: wallets.length
        });
    } catch (error) {
        console.error("Error getting all wallets:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get wallets"
        });
    }
};

