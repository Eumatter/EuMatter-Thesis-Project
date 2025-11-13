import userModel from "../models/userModel.js";
import bcrypt from "bcryptjs";
import transporter from "../config/nodemailer.js";

/**
 * Get user profile data
 */
export const getUserData = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const user = await userModel.findById(userId).select("-password -verifyOTP -resetOTP");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update user profile (name, email, password, etc.)
 */
export const updateUser = async (req, res) => {
    try {
        const { userId, name, email, password } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (name) user.name = name;
        if (email) user.email = email;

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();

        res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update user profile image
 */
export const updateProfileImage = async (req, res) => {
    try {
        const { profileImage } = req.body;
        const userId = req.user?._id || req.body.userId;

        if (!profileImage) {
            return res.status(400).json({ success: false, message: "Profile image is required" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.profileImage = profileImage;
        await user.save();

        res.json({ 
            success: true, 
            message: "Profile image updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                isAccountVerified: user.isAccountVerified
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a user
 */
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;

        const user = await userModel.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all users (System Admin only)
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find().select("-password -verifyOTP -resetOTP");

        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update user role (System Admin only)
 */
export const updateUserRole = async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!["User", "System Administrator", "CRD Staff", "Department/Organization", "Auditor"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.role = role;
        await user.save();

        res.json({ success: true, message: `User role updated to ${role}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Send OTP for password change (authenticated users only)
 */
export const sendChangePasswordOtp = async (req, res) => {
    try {
        const userId = req.user?._id;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.resetOtp = otp;
        user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: "Password Change OTP - EuMatter",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #800000;">Password Change Request</h2>
                    <p>Hello ${user.name},</p>
                    <p>You have requested to change your password. Please use the following verification code:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #800000; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
                    </div>
                    <p><strong>This code will expire in 15 minutes.</strong></p>
                    <p>If you did not request a password change, please ignore this email and contact support immediately.</p>
                    <br/>
                    <p>Best regards,<br/>The EuMatter Team</p>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);

        return res.json({ success: true, message: "Password change OTP sent to your email" });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Verify OTP and change password (authenticated users only)
 */
export const changePasswordWithOtp = async (req, res) => {
    try {
        const { otp, newPassword } = req.body;
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!otp || !newPassword) {
            return res.status(400).json({ success: false, message: "OTP and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
        }

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.resetOtp === "" || user.resetOtp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        if (user.resetOtpExpireAt < Date.now()) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetOtp = "";
        user.resetOtpExpireAt = 0;
        await user.save();

        return res.json({ success: true, message: "Password changed successfully" });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
