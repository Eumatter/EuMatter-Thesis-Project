import express from 'express';
import { getAuditLogs, getAuditLogsByCategory, getAuditLogStats } from '../controllers/auditLogController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// All routes require authentication and System Administrator role
// The role check is done in the controller

// Get all audit logs with filtering and pagination
router.get('/', userAuth, getAuditLogs);

// Get audit logs by category
router.get('/category/:category', userAuth, getAuditLogsByCategory);

// Get audit log statistics
router.get('/stats', userAuth, getAuditLogStats);

export default router;

