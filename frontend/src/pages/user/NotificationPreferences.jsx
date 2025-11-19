import React, { useState, useEffect } from 'react';
import { BellIcon, DevicePhoneMobileIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import axios from 'axios';
import { getBackendUrl } from '../../utils/backendUrl.js';
import { toast } from 'react-toastify';
import {
    isPushNotificationSupported,
    getPushNotificationPermission,
    subscribeToPushNotifications,
    unsubscribeFromPushNotifications,
    isSubscribedToPush
} from '../../utils/pushNotificationService.js';

const NotificationPreferences = () => {
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushPermission, setPushPermission] = useState('default');
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        loadPreferences();
        checkPushStatus();
    }, []);

    const loadPreferences = async () => {
        try {
            const token = localStorage.getItem('token');
            const backendUrl = getBackendUrl();
            const response = await axios.get(`${backendUrl}/api/push/preferences`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPreferences(response.data.preferences);
        } catch (error) {
            console.error('Error loading preferences:', error);
            toast.error('Failed to load notification preferences');
        } finally {
            setLoading(false);
        }
    };

    const checkPushStatus = async () => {
        const supported = isPushNotificationSupported();
        setPushSupported(supported);

        if (supported) {
            const permission = await getPushNotificationPermission();
            setPushPermission(permission);
            const subscribed = await isSubscribedToPush();
            setIsSubscribed(subscribed);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const backendUrl = getBackendUrl();
            await axios.put(
                `${backendUrl}/api/push/preferences`,
                preferences,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            toast.success('Notification preferences saved!');
        } catch (error) {
            console.error('Error saving preferences:', error);
            toast.error('Failed to save notification preferences');
        } finally {
            setSaving(false);
        }
    };

    const handlePushToggle = async () => {
        if (!isSubscribed) {
            try {
                await subscribeToPushNotifications();
                setIsSubscribed(true);
                setPushPermission('granted');
                toast.success('Push notifications enabled!');
            } catch (error) {
                console.error('Error enabling push:', error);
                toast.error('Failed to enable push notifications');
            }
        } else {
            try {
                await unsubscribeFromPushNotifications();
                setIsSubscribed(false);
                toast.success('Push notifications disabled!');
            } catch (error) {
                console.error('Error disabling push:', error);
                toast.error('Failed to disable push notifications');
            }
        }
    };

    const updatePreference = (path, value) => {
        setPreferences(prev => {
            const newPrefs = { ...prev };
            const keys = path.split('.');
            let current = newPrefs;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newPrefs;
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
            </div>
        );
    }

    if (!preferences) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">Failed to load preferences</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Preferences</h1>
                        <p className="text-gray-600">Manage how you receive notifications</p>
                    </div>

                    {/* Push Notifications Section */}
                    <div className="mb-8 pb-8 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <DevicePhoneMobileIcon className="w-6 h-6 text-[#800000]" />
                                <h2 className="text-xl font-semibold text-gray-900">Push Notifications</h2>
                            </div>
                            <div className="flex items-center space-x-4">
                                {pushSupported ? (
                                    <>
                                        <span className={`text-sm px-3 py-1 rounded-full ${
                                            pushPermission === 'granted' && isSubscribed
                                                ? 'bg-green-100 text-green-800'
                                                : pushPermission === 'denied'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {pushPermission === 'granted' && isSubscribed
                                                ? 'Enabled'
                                                : pushPermission === 'denied'
                                                ? 'Blocked'
                                                : 'Not Enabled'}
                                        </span>
                                        <button
                                            onClick={handlePushToggle}
                                            disabled={pushPermission === 'denied'}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                isSubscribed
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-gradient-to-r from-[#800000] to-[#a00000] text-white hover:opacity-90'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isSubscribed ? 'Disable' : 'Enable'}
                                        </button>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-500">Not supported in this browser</span>
                                )}
                            </div>
                        </div>

                        {pushSupported && (
                            <div className="ml-9 space-y-4">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.pushEnabled}
                                        onChange={(e) => updatePreference('pushEnabled', e.target.checked)}
                                        className="w-5 h-5 text-[#800000] rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-gray-700">Enable push notifications</span>
                                </label>

                                <div className="ml-6 space-y-3">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Notification Types:</p>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.pushTypes?.events !== false}
                                            onChange={(e) => updatePreference('pushTypes.events', e.target.checked)}
                                            className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                        />
                                        <span className="text-gray-600">Events</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.pushTypes?.volunteers !== false}
                                            onChange={(e) => updatePreference('pushTypes.volunteers', e.target.checked)}
                                            className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                        />
                                        <span className="text-gray-600">Volunteers</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.pushTypes?.donations !== false}
                                            onChange={(e) => updatePreference('pushTypes.donations', e.target.checked)}
                                            className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                        />
                                        <span className="text-gray-600">Donations</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.pushTypes?.social !== false}
                                            onChange={(e) => updatePreference('pushTypes.social', e.target.checked)}
                                            className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                        />
                                        <span className="text-gray-600">Social</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={preferences.pushTypes?.system !== false}
                                            onChange={(e) => updatePreference('pushTypes.system', e.target.checked)}
                                            className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                        />
                                        <span className="text-gray-600">System</span>
                                    </label>
                                </div>

                                {/* Quiet Hours */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <label className="flex items-center space-x-3 cursor-pointer mb-3">
                                        <input
                                            type="checkbox"
                                            checked={preferences.quietHours?.enabled || false}
                                            onChange={(e) => updatePreference('quietHours.enabled', e.target.checked)}
                                            className="w-5 h-5 text-[#800000] rounded focus:ring-[#800000]"
                                        />
                                        <span className="text-gray-700 font-medium">Enable Quiet Hours</span>
                                    </label>
                                    {preferences.quietHours?.enabled && (
                                        <div className="ml-6 flex items-center space-x-4">
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">Start</label>
                                                <input
                                                    type="time"
                                                    value={preferences.quietHours?.start || '22:00'}
                                                    onChange={(e) => updatePreference('quietHours.start', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#800000] focus:border-[#800000]"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-gray-600 mb-1">End</label>
                                                <input
                                                    type="time"
                                                    value={preferences.quietHours?.end || '08:00'}
                                                    onChange={(e) => updatePreference('quietHours.end', e.target.value)}
                                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#800000] focus:border-[#800000]"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Email Notifications Section */}
                    <div className="mb-8">
                        <div className="flex items-center space-x-3 mb-4">
                            <EnvelopeIcon className="w-6 h-6 text-[#800000]" />
                            <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
                        </div>

                        <div className="ml-9 space-y-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences.emailEnabled}
                                    onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
                                    className="w-5 h-5 text-[#800000] rounded focus:ring-[#800000]"
                                />
                                <span className="text-gray-700">Enable email notifications</span>
                            </label>

                            <div className="ml-6 space-y-3">
                                <p className="text-sm font-medium text-gray-700 mb-2">Notification Types:</p>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailTypes?.events !== false}
                                        onChange={(e) => updatePreference('emailTypes.events', e.target.checked)}
                                        className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-gray-600">Events</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailTypes?.volunteers !== false}
                                        onChange={(e) => updatePreference('emailTypes.volunteers', e.target.checked)}
                                        className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-gray-600">Volunteers</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailTypes?.donations !== false}
                                        onChange={(e) => updatePreference('emailTypes.donations', e.target.checked)}
                                        className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-gray-600">Donations</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailTypes?.social !== false}
                                        onChange={(e) => updatePreference('emailTypes.social', e.target.checked)}
                                        className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-gray-600">Social</span>
                                </label>
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences.emailTypes?.system !== false}
                                        onChange={(e) => updatePreference('emailTypes.system', e.target.checked)}
                                        className="w-4 h-4 text-[#800000] rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-gray-600">System</span>
                                </label>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Frequency</label>
                                <select
                                    value={preferences.emailFrequency || 'immediate'}
                                    onChange={(e) => updatePreference('emailFrequency', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#800000] focus:border-[#800000]"
                                >
                                    <option value="immediate">Immediate</option>
                                    <option value="daily">Daily Digest</option>
                                    <option value="weekly">Weekly Digest</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 bg-gradient-to-r from-[#800000] to-[#a00000] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Preferences'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationPreferences;

