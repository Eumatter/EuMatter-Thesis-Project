import axios from 'axios';
import { getBackendUrl } from './backendUrl.js';

const backendUrl = getBackendUrl();

/**
 * Get VAPID public key from backend
 */
export async function getVapidPublicKey() {
    try {
        // backendUrl already ends with '/', so don't add another one
        const url = backendUrl.endsWith('/') 
            ? `${backendUrl}api/push/vapid-key` 
            : `${backendUrl}/api/push/vapid-key`;
        
        // Make request with error handling that suppresses 404/503
        const response = await axios.get(url, {
            validateStatus: function (status) {
                // Don't throw errors for 404 or 503 - these mean VAPID is not configured
                // Return true to prevent axios from throwing an error for these status codes
                return (status >= 200 && status < 300) || status === 404 || status === 503;
            }
        });
        
        // Check if we got a valid response
        if (response.status === 200 && response.data?.publicKey) {
            return response.data.publicKey;
        }
        
        // Service unavailable or not configured - return null silently
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
        await axios.post(
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

        return { success: true, subscription };
    } catch (error) {
        // Silently handle errors - push notifications are optional
        // Don't log or throw errors for unavailable service
        const status = error.response?.status;
        const isServiceUnavailable = status === 404 || status === 503;
        if (!isServiceUnavailable) {
            // Only log actual errors, not service unavailability
            console.error('Error subscribing to push notifications:', error);
        }
        // Return failure result instead of throwing
        return { success: false, message: error.message || 'Push notifications not available' };
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

