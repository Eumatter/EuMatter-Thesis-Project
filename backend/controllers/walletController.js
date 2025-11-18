import departmentWalletModel from "../models/departmentWalletModel.js";
import userModel from "../models/userModel.js";
import { verifyPayMongoCredentials, maskKey } from "../utils/walletEncryption.js";
import { createAuditLog } from "./auditLogController.js";

/**
 * Create wallet for a department (System Admin only)
 */
export const createWallet = async (req, res) => {
    try {
        const { userId, publicKey, secretKey, webhookSecret } = req.body;
        const currentUser = req.user; // Logged-in user (should be System Administrator)

        console.log('Creating wallet - Request details:', { 
            userId: userId,
            userIdType: typeof userId,
            hasPublicKey: !!publicKey, 
            hasSecretKey: !!secretKey,
            currentUserId: currentUser?._id?.toString(),
            currentUserRole: currentUser?.role
        });

        if (!userId || !publicKey || !secretKey) {
            return res.status(400).json({
                success: false,
                message: "userId, publicKey, and secretKey are required"
            });
        }

        // Ensure userId is a string (handle both string and ObjectId)
        const userIdString = String(userId).trim();
        
        if (!userIdString || userIdString === 'undefined' || userIdString === 'null') {
            return res.status(400).json({
                success: false,
                message: "Invalid userId format"
            });
        }

        // Verify user exists and is Department/Organization
        // IMPORTANT: Look up the TARGET user (the one the wallet is being created for), not the logged-in admin
        const targetUser = await userModel.findById(userIdString);
        console.log('Target user lookup result:', { 
            found: !!targetUser, 
            requestedUserId: userIdString,
            targetUserId: targetUser?._id?.toString(),
            targetUserRole: targetUser?.role,
            targetUserEmail: targetUser?.email,
            targetUserName: targetUser?.name
        });
        
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: `User not found with ID: ${userIdString}`
            });
        }

        // Validate that the TARGET user (not the logged-in admin) is Department/Organization
        if (targetUser.role !== "Department/Organization") {
            console.error('Role validation failed:', { 
                expected: "Department/Organization", 
                actual: targetUser.role,
                targetUserId: targetUser._id.toString(),
                targetUserEmail: targetUser.email,
                currentUserRole: currentUser?.role // This should be System Administrator
            });
            return res.status(400).json({
                success: false,
                message: `Wallet can only be created for Department/Organization users. The user with ID ${userIdString} has role: ${targetUser.role}`
            });
        }

        // Check if wallet already exists (use the normalized userIdString)
        const existingWallet = await departmentWalletModel.findOne({ userId: userIdString });
        if (existingWallet) {
            return res.status(400).json({
                success: false,
                message: "Wallet already exists for this user. Use update endpoint instead."
            });
        }

        // Create wallet (encryption happens in pre-save hook)
        // Use userIdString to ensure we're using the target user's ID, not the admin's
        const wallet = await departmentWalletModel.create({
            userId: userIdString, // Target user's ID (Department/Organization user)
            publicKey, // Will be encrypted in pre-save hook
            secretKey, // Will be encrypted in pre-save hook
            webhookSecret: webhookSecret || null,
            isActive: true,
            verificationStatus: "pending"
        });

        // Return wallet info (masked keys)
        const maskedKeys = wallet.getMaskedKeys();

        // Log wallet creation - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'WALLET_CREATED',
            resourceType: 'wallet',
            resourceId: wallet._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 201,
            success: true,
            newValues: {
                userId: userIdString,
                isActive: wallet.isActive,
                verificationStatus: wallet.verificationStatus
            }
        }).catch(err => console.error('Failed to log audit:', err));

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

        console.log('Updating wallet - Request details:', {
            userId: userId,
            userIdType: typeof userId,
            hasPublicKey: publicKey !== undefined,
            hasSecretKey: secretKey !== undefined,
            hasWebhookSecret: webhookSecret !== undefined,
            isActive: isActive
        });

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required"
            });
        }

        // Normalize userId to string
        const userIdString = String(userId).trim();

        // Verify user exists and is Department/Organization
        const user = await userModel.findById(userIdString);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User not found with ID: ${userIdString}`
            });
        }

        if (user.role !== "Department/Organization") {
            return res.status(400).json({
                success: false,
                message: `Wallet can only be updated for Department/Organization users. Current role: ${user.role}`
            });
        }

        // Find existing wallet (use normalized userIdString)
        const wallet = await departmentWalletModel.findOne({ userId: userIdString });
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

        // Capture previous values for audit log
        const previousValues = {
            isActive: wallet.isActive,
            verificationStatus: wallet.verificationStatus,
            hasWebhookSecret: !!wallet.webhookSecret
        };

        Object.assign(wallet, updateData);
        await wallet.save();

        // Log wallet update - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        // Determine action type based on what was updated
        let actionType = 'WALLET_UPDATED';
        if (webhookSecret !== undefined && webhookSecret !== null) {
            actionType = 'WEBHOOK_SECRET_CHANGED';
        } else if (publicKey !== undefined || secretKey !== undefined) {
            actionType = 'WALLET_KEY_REGENERATED';
        }
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: actionType,
            resourceType: 'wallet',
            resourceId: wallet._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: previousValues,
            newValues: {
                isActive: wallet.isActive,
                verificationStatus: wallet.verificationStatus,
                hasWebhookSecret: !!wallet.webhookSecret
            }
        }).catch(err => console.error('Failed to log audit:', err));

        // Return wallet info (masked keys)
        let maskedKeys;
        try {
            maskedKeys = wallet.getMaskedKeys();
        } catch (maskError) {
            console.error('Error masking keys after update:', maskError.message);
            // Return masked values if getMaskedKeys fails
            maskedKeys = {
                publicKey: '****',
                secretKey: '****',
                webhookSecret: wallet.webhookSecret ? '****' : null
            };
        }

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
        console.error("Error updating wallet:", error);
        console.error("Error stack:", error.stack);
        // Never expose encryption errors in detail
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

        // Capture previous verification status
        const previousStatus = wallet.verificationStatus;

        // Update wallet verification status
        wallet.lastVerifiedAt = new Date();
        wallet.verificationStatus = verification.valid ? "verified" : "failed";
        wallet.lastVerificationError = verification.valid ? null : verification.error;
        await wallet.save();

        // Log wallet verification - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'WALLET_VERIFICATION_CHANGED',
            resourceType: 'wallet',
            resourceId: wallet._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: verification.valid ? 200 : 400,
            success: verification.valid,
            previousValues: { verificationStatus: previousStatus },
            newValues: { verificationStatus: wallet.verificationStatus },
            errorMessage: verification.valid ? null : verification.error
        }).catch(err => console.error('Failed to log audit:', err));

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

        // Log wallet deactivation - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'WALLET_DEACTIVATED',
            resourceType: 'wallet',
            resourceId: wallet._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: { isActive: true },
            newValues: { isActive: false }
        }).catch(err => console.error('Failed to log audit:', err));

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

        // Log wallet activation - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'WALLET_ACTIVATED',
            resourceType: 'wallet',
            resourceId: wallet._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: { isActive: false },
            newValues: { isActive: true }
        }).catch(err => console.error('Failed to log audit:', err));

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
 * Returns all Department/Organization users with their wallet information (if exists)
 */
export const getAllWallets = async (req, res) => {
    try {
        // Get all Department/Organization users
        const departmentUsers = await userModel.find({ role: "Department/Organization" })
            .select('name email role _id')
            .sort({ name: 1 });

        // Get all existing wallets
        const existingWallets = await departmentWalletModel.find({})
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 });

        // Create a map of userId to wallet for quick lookup
        const walletMap = new Map();
        existingWallets.forEach(wallet => {
            if (wallet.userId && wallet.userId._id) {
                walletMap.set(wallet.userId._id.toString(), wallet);
            }
        });

        // Combine users with their wallet information
        const walletsWithUsers = departmentUsers.map(user => {
            const wallet = walletMap.get(user._id.toString());
            
            if (wallet) {
                try {
                    // User has a wallet - return wallet with masked keys
                    const maskedKeys = wallet.getMaskedKeys();
                    return {
                        _id: wallet._id,
                        userId: {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        },
                        publicKey: maskedKeys.publicKey,
                        secretKey: maskedKeys.secretKey,
                        webhookSecret: maskedKeys.webhookSecret,
                        isActive: wallet.isActive,
                        lastVerifiedAt: wallet.lastVerifiedAt,
                        verificationStatus: wallet.verificationStatus,
                        lastVerificationError: wallet.lastVerificationError,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt,
                        hasWallet: true
                    };
                } catch (maskError) {
                    console.error(`Error masking keys for wallet ${wallet._id}:`, maskError.message);
                    // Return wallet without masked keys if masking fails
                    return {
                        _id: wallet._id,
                        userId: {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            role: user.role
                        },
                        publicKey: '****',
                        secretKey: '****',
                        webhookSecret: wallet.webhookSecret ? '****' : null,
                        isActive: wallet.isActive,
                        lastVerifiedAt: wallet.lastVerifiedAt,
                        verificationStatus: wallet.verificationStatus,
                        lastVerificationError: wallet.lastVerificationError,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt,
                        hasWallet: true
                    };
                }
            } else {
                // User doesn't have a wallet yet
                return {
                    _id: null,
                    userId: {
                        _id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    },
                    publicKey: null,
                    secretKey: null,
                    webhookSecret: null,
                    isActive: false,
                    lastVerifiedAt: null,
                    verificationStatus: 'never',
                    lastVerificationError: null,
                    createdAt: null,
                    updatedAt: null,
                    hasWallet: false
                };
            }
        });

        res.json({
            success: true,
            wallets: walletsWithUsers,
            total: walletsWithUsers.length,
            withWallets: existingWallets.length,
            withoutWallets: departmentUsers.length - existingWallets.length
        });
    } catch (error) {
        console.error("Error getting all wallets:", error);
        console.error("Error stack:", error.stack);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get wallets"
        });
    }
};

