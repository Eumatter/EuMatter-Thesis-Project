import express from 'express';
import { getSystemSettings, getMaintenanceMode, updateSystemSettings } from '../controllers/systemSettingsController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// Public endpoint to check maintenance mode
router.get('/maintenance-mode', getMaintenanceMode);

// Protected endpoints (System Admin only)
router.get('/', userAuth, getSystemSettings);
router.put('/', userAuth, updateSystemSettings);

export default router;

