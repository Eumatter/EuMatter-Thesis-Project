import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import departmentWalletModel from "../models/departmentWalletModel.js";

/**
 * Get all users with filtering and pagination (Admin only)
 */
export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = {};
        
        // Filter by role if provided
        if (role && role !== 'all') {
            query.role = role;
        }

        // Search by name or email if search term is provided
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Get total count for pagination
        const total = await userModel.countDocuments(query);
        
        // Get paginated users
        const users = await userModel.find(query)
            .select('-password -verifyOTP -resetOTP')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            users,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create a new user (Admin only)
 */
export const createUser = async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            email, 
            password, 
            role, 
            department, 
            organization,
            paymongoPublicKey,
            paymongoSecretKey,
            paymongoWebhookSecret
        } = req.body;

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new userModel({
            name: `${firstName} ${lastName}`.trim(),
            email,
            password: hashedPassword,
            role,
            isAccountVerified: true, // Auto-verify admin-created accounts
            ...(role === 'faculty' || role === 'student' ? { department } : {}),
            ...(role === 'Department/Organization' ? { department: department || organization } : {})
        });

        await newUser.save();

        // If role is Department/Organization and wallet credentials are provided, create wallet
        let walletCreated = false;
        let walletError = null;
        
        if (role === "Department/Organization" && paymongoPublicKey && paymongoSecretKey) {
            try {
                await departmentWalletModel.create({
                    userId: newUser._id,
                    publicKey: paymongoPublicKey, // Will be encrypted in pre-save hook
                    secretKey: paymongoSecretKey, // Will be encrypted in pre-save hook
                    webhookSecret: paymongoWebhookSecret || null,
                    isActive: true,
                    verificationStatus: "pending"
                });
                walletCreated = true;
                console.log(`✅ Wallet created for Department/Organization user: ${newUser._id}`);
            } catch (walletErr) {
                console.error("❌ Error creating wallet:", walletErr.message);
                walletError = walletErr.message;
                // Don't fail user creation if wallet creation fails - wallet can be added later
            }
        }

        // Return user data without sensitive information
        const userData = newUser.toObject();
        delete userData.password;
        delete userData.verifyOTP;
        delete userData.resetOTP;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userData,
            wallet: walletCreated ? { created: true } : { 
                created: false, 
                error: walletError || (role === "Department/Organization" ? "Wallet credentials not provided" : "N/A")
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!userId || !role) {
            return res.status(400).json({ success: false, message: 'User ID and role are required' });
        }

        // Valid roles from userModel enum
        const validRoles = ['User', 'System Administrator', 'CRD Staff', 'Department/Organization', 'Auditor', 'student', 'faculty', 'alumni'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            { role },
            { new: true, runValidators: true }
        ).select('-password -verifyOTP -resetOTP');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: 'User role updated successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a user (Admin only)
 */
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent deleting own account
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
        }

        const user = await userModel.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Toggle user verification status (Admin only)
 */
export const toggleUserVerification = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isVerified } = req.body;

        if (typeof isVerified !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isVerified must be a boolean' });
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            { isAccountVerified: isVerified },
            { new: true }
        ).select('-password -verifyOTP -resetOTP');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
            user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
