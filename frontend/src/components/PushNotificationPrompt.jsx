import React, { useState, useEffect } from 'react';
import { XMarkIcon, BellIcon } from '@heroicons/react/24/solid';
import {
    isPushNotificationSupported,
    getPushNotificationPermission,
    requestPushNotificationPermission,
    subscribeToPushNotifications,
    isSubscribedToPush
} from '../utils/pushNotificationService.js';

const PushNotificationPrompt = () => {
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState(null);

    useEffect(() => {
        checkPushNotificationStatus();
    }, []);

    const checkPushNotificationStatus = async () => {
        const supported = isPushNotificationSupported();
        setIsSupported(supported);

        if (!supported) {
            return;
        }

        const currentPermission = await getPushNotificationPermission();
        setPermission(currentPermission);

        // Show prompt if permission is default (not granted or denied)
        if (currentPermission === 'default') {
            // Check if user has dismissed this before (localStorage)
            const dismissed = localStorage.getItem('pushNotificationPromptDismissed');
            if (!dismissed) {
                setShow(true);
            }
        } else if (currentPermission === 'granted') {
            // Check if actually subscribed
            const subscribed = await isSubscribedToPush();
            if (!subscribed) {
                // User granted permission but not subscribed, try to subscribe
                try {
                    const result = await subscribeToPushNotifications();
                    // If subscription failed silently (not configured), don't log anything
                    if (result && !result.success) {
                        // Service not configured - silently skip
                        return;
                    }
                } catch (error) {
                    // Silently fail for any error - push notifications are optional
                    // Don't log anything to prevent console spam
                }
            }
        }
    };

    const handleEnable = async () => {
        setIsLoading(true);
        try {
            // Request permission
            const newPermission = await requestPushNotificationPermission();

            if (newPermission === 'granted') {
                // Subscribe to push notifications
                try {
                    const result = await subscribeToPushNotifications();
                    if (result && result.success) {
                        setShow(false);
                        localStorage.setItem('pushNotificationPromptDismissed', 'true');
                        // Show success message
                        window.dispatchEvent(new CustomEvent('toast', {
                            detail: { message: 'Push notifications enabled!', type: 'success' }
                        }));
                    } else {
                        // Service not configured - silently hide prompt
                        setShow(false);
                        localStorage.setItem('pushNotificationPromptDismissed', 'true');
                    }
                } catch (error) {
                    // Silently handle errors - don't show error messages for unavailable service
                    setShow(false);
                    localStorage.setItem('pushNotificationPromptDismissed', 'true');
                }
            } else if (newPermission === 'denied') {
                // Show error message
                window.dispatchEvent(new CustomEvent('toast', {
                    detail: { message: 'Push notifications were blocked. Please enable them in your browser settings.', type: 'error' }
                }));
            }
        } catch (error) {
            console.error('Error enabling push notifications:', error);
            window.dispatchEvent(new CustomEvent('toast', {
                detail: { message: 'Failed to enable push notifications. Please try again.', type: 'error' }
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem('pushNotificationPromptDismissed', 'true');
    };

    if (!isSupported || !show || permission !== 'default') {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 p-6 relative">
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#800000] to-[#a00000] rounded-full flex items-center justify-center">
                            <BellIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Enable Push Notifications
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Get real-time notifications on your device, even when the app is closed. Stay updated on events, volunteer invitations, and more!
                        </p>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleEnable}
                                disabled={isLoading}
                                className="flex-1 bg-gradient-to-r from-[#800000] to-[#a00000] text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Enabling...' : 'Enable'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                disabled={isLoading}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PushNotificationPrompt;

