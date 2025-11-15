import webpush from 'web-push';
import pushSubscriptionModel from '../models/pushSubscriptionModel.js';
import userNotificationPreferencesModel from '../models/userNotificationPreferencesModel.js';

// Initialize web-push with VAPID keys
// These should be set in environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || process.env.FRONTEND_URL || 'mailto:admin@eumatter.com';

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey
    );
} else {
    console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
    console.warn('💡 Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env file');
}

/**
 * Check if user has push notifications enabled and wants this type of notification
 */
async function shouldSendPush(userId, notificationType) {
    try {
        const preferences = await userNotificationPreferencesModel.findOne({ userId });
        
        // If no preferences, default to enabled
        if (!preferences) {
            return true;
        }
        
        // Check if push is enabled
        if (!preferences.pushEnabled) {
            return false;
        }
        
        // Check quiet hours
        if (preferences.quietHours?.enabled) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
            
            const start = preferences.quietHours.start;
            const end = preferences.quietHours.end;
            
            // Handle quiet hours that span midnight (e.g., 22:00 to 08:00)
            if (start > end) {
                // Quiet hours span midnight
                if (currentTime >= start || currentTime < end) {
                    return false; // In quiet hours
                }
            } else {
                // Quiet hours within same day
                if (currentTime >= start && currentTime < end) {
                    return false; // In quiet hours
                }
            }
        }
        
        // Check notification type preference
        const typeMap = {
            'event_created': 'events',
            'event_updated': 'events',
            'event_cancelled': 'events',
            'event_reminder': 'events',
            'volunteer_invitation': 'volunteers',
            'volunteer_approved': 'volunteers',
            'volunteer_registered': 'volunteers',
            'volunteer_invitation_accepted': 'volunteers',
            'donation_received': 'donations',
            'donation_success': 'donations',
            'feedback_deadline': 'volunteers',
            'attendance_recorded': 'volunteers',
            'comment_added': 'social',
            'reaction_added': 'social'
        };
        
        const category = typeMap[notificationType] || 'system';
        return preferences.pushTypes?.[category] !== false;
    } catch (error) {
        console.error('Error checking push preferences:', error);
        return true; // Default to enabled on error
    }
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(userId, title, message, payload = {}) {
    try {
        // Check if push notifications should be sent
        const shouldSend = await shouldSendPush(userId, payload.type || 'system');
        if (!shouldSend) {
            return { sent: 0, failed: 0 };
        }
        
        // Get all active push subscriptions for this user
        const subscriptions = await pushSubscriptionModel.find({
            userId,
            isActive: true
        });
        
        if (subscriptions.length === 0) {
            return { sent: 0, failed: 0, reason: 'No active subscriptions' };
        }
        
        // Prepare notification payload
        const notificationPayload = JSON.stringify({
            title,
            message,
            icon: '/eumatter_logo.png',
            badge: '/eumatter_logo.png',
            data: {
                url: payload.eventId ? `/user/events/${payload.eventId}` : '/notifications',
                ...payload
            },
            tag: payload.type || 'notification',
            requireInteraction: payload.type === 'volunteer_invitation' || payload.type === 'feedback_deadline',
            actions: payload.type === 'volunteer_invitation' ? [
                { action: 'accept', title: 'Accept' },
                { action: 'view', title: 'View Event' }
            ] : []
        });
        
        let sent = 0;
        let failed = 0;
        const failedSubscriptions = [];
        
        // Send to all subscriptions
        const sendPromises = subscriptions.map(async (subscription) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.keys.p256dh,
                            auth: subscription.keys.auth
                        }
                    },
                    notificationPayload
                );
                sent++;
            } catch (error) {
                console.error('Error sending push notification:', error);
                failed++;
                
                // If subscription is invalid (410 Gone), mark it as inactive
                if (error.statusCode === 410) {
                    failedSubscriptions.push(subscription._id);
                }
            }
        });
        
        await Promise.all(sendPromises);
        
        // Deactivate invalid subscriptions
        if (failedSubscriptions.length > 0) {
            await pushSubscriptionModel.updateMany(
                { _id: { $in: failedSubscriptions } },
                { $set: { isActive: false } }
            );
        }
        
        return { sent, failed };
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
        return { sent: 0, failed: 0, error: error.message };
    }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotifications(userIds, title, message, payload = {}) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return { totalSent: 0, totalFailed: 0 };
    }
    
    let totalSent = 0;
    let totalFailed = 0;
    
    const results = await Promise.all(
        userIds.map(userId => sendPushNotification(userId, title, message, payload))
    );
    
    results.forEach(result => {
        totalSent += result.sent || 0;
        totalFailed += result.failed || 0;
    });
    
    return { totalSent, totalFailed };
}

/**
 * Get VAPID public key for client
 */
export function getVapidPublicKey() {
    return vapidPublicKey;
}

