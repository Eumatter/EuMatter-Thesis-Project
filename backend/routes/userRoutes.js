import express from "express";
import userAuth from "../middleware/userAuth.js";
import roleAuth from "../middleware/roleAuth.js";
import {
    getUserData,
    updateUser,
    deleteUser,
    getAllUsers,
    updateUserRole,
    updateProfileImage,
    sendChangePasswordOtp,
    changePasswordWithOtp
} from "../controllers/userController.js";

const userRouter = express.Router();

/**
 * User Self-Service Routes
 */
userRouter.get("/data", userAuth, getUserData);       // Get own profile
userRouter.put("/profile", userAuth, updateUser);     // Update own profile
userRouter.put("/profile-image", userAuth, updateProfileImage); // Update profile image
userRouter.post("/change-password-otp", userAuth, sendChangePasswordOtp); // Request OTP for password change
userRouter.put("/change-password", userAuth, changePasswordWithOtp); // Change password with OTP verification
userRouter.delete("/delete", userAuth, deleteUser);   // Delete own account

/**
 * Admin-Only Routes
 */
userRouter.get(
    "/",
    userAuth,
    roleAuth(["System Administrator"]),
    getAllUsers
); // List all users

userRouter.put(
    "/role",
    userAuth,
    roleAuth(["System Administrator"]),
    updateUserRole
); // Change a user's role

export default userRouter;
