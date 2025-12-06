import express from 'express';
import { getSystemSettings, getMaintenanceMode, updateSystemSettings, getInKindDonationSettings } from '../controllers/systemSettingsController.js';
import userAuth from '../middleware/userAuth.js';

const router = express.Router();

// Public endpoint to check maintenance mode
router.get('/maintenance-mode', getMaintenanceMode);

// Public endpoint for in-kind donation settings (users need this for donation form)
router.get('/in-kind-donations', getInKindDonationSettings);

// Protected endpoints (System Admin only)
router.get('/', userAuth, getSystemSettings);
router.put('/', userAuth, updateSystemSettings);

export default router;

