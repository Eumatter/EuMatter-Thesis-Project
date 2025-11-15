import pushSubscriptionModel from '../models/pushSubscriptionModel.js';
import userNotificationPreferencesModel from '../models/userNotificationPreferencesModel.js';
import { getVapidPublicKey } from '../utils/pushNotificationService.js';

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { endpoint, keys, userAgent, deviceInfo } = req.body;
        
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ message: 'Invalid subscription data' });
        }
        
        // Check if subscription already exists
        const existing = await pushSubscriptionModel.findOne({
            userId,
            endpoint
        });
        
        if (existing) {
            // Update existing subscription
            existing.keys = keys;
            existing.userAgent = userAgent || existing.userAgent;
            existing.deviceInfo = deviceInfo || existing.deviceInfo;
            existing.isActive = true;
            await existing.save();
            
            return res.json({
                success: true,
                message: 'Subscription updated',
                subscription: existing
            });
        }
        
        // Create new subscription
        const subscription = await pushSubscriptionModel.create({
            userId,
            endpoint,
            keys,
            userAgent: userAgent || req.headers['user-agent'] || '',
            deviceInfo: deviceInfo || ''
        });
        
        res.json({
            success: true,
            message: 'Subscribed to push notifications',
            subscription
        });
    } catch (error) {
        console.error('Error subscribing to push:', error);
        res.status(500).json({ message: 'Failed to subscribe to push notifications' });
    }
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const { endpoint } = req.body;
        
        if (endpoint) {
            // Unsubscribe specific endpoint
            await pushSubscriptionModel.updateOne(
                { userId, endpoint },
                { $set: { isActive: false } }
            );
        } else {
            // Unsubscribe all endpoints for this user
            await pushSubscriptionModel.updateMany(
                { userId },
                { $set: { isActive: false } }
            );
        }
        
        res.json({
            success: true,
            message: 'Unsubscribed from push notifications'
        });
    } catch (error) {
        console.error('Error unsubscribing from push:', error);
        res.status(500).json({ message: 'Failed to unsubscribe from push notifications' });
    }
};

/**
 * Get VAPID public key
 */
export const getVapidKey = async (req, res) => {
    try {
        const publicKey = getVapidPublicKey();
        if (!publicKey) {
            return res.status(503).json({ 
                message: 'Push notifications not configured',
                error: 'VAPID keys not set'
            });
        }
        
        res.json({ publicKey });
    } catch (error) {
        console.error('Error getting VAPID key:', error);
        res.status(500).json({ message: 'Failed to get VAPID key' });
    }
};

/**
 * Get user's notification preferences
 */
export const getNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        let preferences = await userNotificationPreferencesModel.findOne({ userId });
        
        if (!preferences) {
            // Create default preferences
            preferences = await userNotificationPreferencesModel.create({ userId });
        }
        
        res.json({ preferences });
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({ message: 'Failed to get notification preferences' });
    }
};

/**
 * Update user's notification preferences
 */
export const updateNotificationPreferences = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        
        const updates = req.body;
        
        const preferences = await userNotificationPreferencesModel.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true, upsert: true }
        );
        
        res.json({
            success: true,
            message: 'Notification preferences updated',
            preferences
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ message: 'Failed to update notification preferences' });
    }
};

