import express from "express";
import userAuth from "../middleware/userAuth.js";
import roleAuth from "../middleware/roleAuth.js";
import {
    getUsers,
    createUser,
    updateUserRole,
    deleteUser,
    toggleUserVerification
} from "../controllers/adminUserController.js";

const router = express.Router();

// Apply authentication and admin role check to all routes
router.use(userAuth);
router.use(roleAuth(["System Administrator"]));

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering and pagination
 * @access  System Administrator
 */
router.get("/users", getUsers);

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  System Administrator
 */
router.post("/users", createUser);

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  System Administrator
 */
router.put("/users/:userId/role", updateUserRole);

/**
 * @route   PUT /api/admin/users/:userId/verify
 * @desc    Toggle user verification status
 * @access  System Administrator
 */
router.put("/users/:userId/verify", toggleUserVerification);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete a user
 * @access  System Administrator
 */
router.delete("/users/:userId", deleteUser);

export default router;
