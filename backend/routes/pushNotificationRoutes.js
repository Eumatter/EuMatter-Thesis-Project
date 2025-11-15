import express from 'express';
import userAuth from '../middleware/userAuth.js';
import {
    subscribeToPush,
    unsubscribeFromPush,
    getVapidKey,
    getNotificationPreferences,
    updateNotificationPreferences
} from '../controllers/pushNotificationController.js';

const router = express.Router();

// Public route to get VAPID public key
router.get('/vapid-key', getVapidKey);

// Protected routes
router.post('/subscribe', userAuth, subscribeToPush);
router.post('/unsubscribe', userAuth, unsubscribeFromPush);
router.get('/preferences', userAuth, getNotificationPreferences);
router.put('/preferences', userAuth, updateNotificationPreferences);

export default router;

