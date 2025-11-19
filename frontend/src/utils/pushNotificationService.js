import axios from 'axios';
import { getBackendUrl } from './backendUrl.js';

const backendUrl = getBackendUrl();

/**
 * Get VAPID public key from backend
 * Returns null if push notifications are not configured (this is optional)
 */
export async function getVapidPublicKey() {
    try {
        // backendUrl already ends with '/', so don't add another one
        const url = backendUrl.endsWith('/') 
            ? `${backendUrl}api/push/vapid-key` 
            : `${backendUrl}/api/push/vapid-key`;
        
        // Make request - endpoint now returns 200 even when not configured
        const response = await axios.get(url, {
            timeout: 5000, // 5 second timeout
            validateStatus: function (status) {
                // Accept 200 status codes only
                return status === 200;
            }
        });
        
        // Check if we got a valid response with a public key
        if (response.status === 200 && response.data?.publicKey && response.data?.configured) {
            return response.data.publicKey;
        }
        
        // Not configured or publicKey is null - return null silently
        // Push notifications are optional, so this is not an error
        return null;
    } catch (error) {
        // Silently fail for any error - push notifications are optional
        // Don't log anything, just return null
        return null;
    }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications() {
    try {
        // Check if browser supports push notifications
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            throw new Error('Push notifications are not supported in this browser');
        }

        // Get VAPID public key
        const publicKey = await getVapidPublicKey();
        if (!publicKey) {
            // Silently fail if VAPID is not configured - push notifications are optional
            // Return early without throwing an error to prevent console spam
            return { success: false, message: 'Push notifications not configured' };
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;

        // Subscribe to push notifications
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        // Get subscription data
        const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
                auth: arrayBufferToBase64(subscription.getKey('auth'))
            },
            userAgent: navigator.userAgent,
            deviceInfo: `${navigator.platform} - ${navigator.userAgent}`
        };

        // Send subscription to backend
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('User not authenticated');
        }

        // backendUrl already ends with '/', so don't add another one
        const subscribeUrl = backendUrl.endsWith('/') 
            ? `${backendUrl}api/push/subscribe` 
            : `${backendUrl}/api/push/subscribe`;
        
        const response = await axios.post(
            subscribeUrl,
            subscriptionData,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                validateStatus: function (status) {
                    // Don't throw errors for 404 or 503 - these mean push notifications are not configured
                    // Return true to prevent axios from throwing an error for these status codes
                    return (status >= 200 && status < 300) || status === 404 || status === 503;
                }
            }
        );

        // Check if subscription was successful
        if (response.status === 200 && response.data?.success) {
            return { success: true, subscription, message: response.data.message || 'Successfully subscribed to push notifications' };
        } else if (response.status === 404 || response.status === 503) {
            return { success: false, message: 'Push notifications are not configured on the server' };
        }

        return { success: true, subscription };
    } catch (error) {
        // Handle errors appropriately
        const status = error.response?.status;
        const isServiceUnavailable = status === 404 || status === 503;
        
        if (isServiceUnavailable) {
            // Service not configured - return informative message
            return { success: false, message: 'Push notifications are not configured on the server' };
        } else if (error.message === 'Push notifications are not supported in this browser') {
            return { success: false, message: 'Push notifications are not supported in this browser' };
        } else if (error.message === 'User not authenticated') {
            return { success: false, message: 'Please log in to enable push notifications' };
        } else {
            // Log actual errors for debugging
            console.error('Error subscribing to push notifications:', error);
            return { success: false, message: error.response?.data?.message || error.message || 'Failed to subscribe to push notifications' };
        }
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(endpoint = null) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('User not authenticated');
        }

        // backendUrl already ends with '/', so don't add another one
        const unsubscribeUrl = backendUrl.endsWith('/') 
            ? `${backendUrl}api/push/unsubscribe` 
            : `${backendUrl}/api/push/unsubscribe`;
        await axios.post(
            unsubscribeUrl,
            { endpoint },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Unsubscribe from browser push manager
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        throw error;
    }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if user has granted permission
 */
export async function getPushNotificationPermission() {
    if (!isPushNotificationSupported()) {
        return 'not-supported';
    }
    return Notification.permission;
}

/**
 * Request push notification permission
 */
export async function requestPushNotificationPermission() {
    if (!isPushNotificationSupported()) {
        throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    return permission;
}

/**
 * Check if user is subscribed
 */
export async function isSubscribedToPush() {
    try {
        if (!isPushNotificationSupported()) {
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    } catch (error) {
        console.error('Error checking subscription:', error);
        return false;
    }
}

/**
 * Helper function to convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

