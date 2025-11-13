import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';

const FacebookSettingsModal = ({ isOpen, onClose, backendUrl, onConfigSaved }) => {
    const [pageAccessToken, setPageAccessToken] = useState('');
    const [pageId, setPageId] = useState('');
    const [autoPost, setAutoPost] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);

    useEffect(() => {
        if (isOpen) {
            // Load existing config
            const fbConfig = localStorage.getItem('facebookConfig');
            if (fbConfig) {
                try {
                    const config = JSON.parse(fbConfig);
                    setPageAccessToken(config.pageAccessToken || '');
                    setPageId(config.pageId || '');
                    setAutoPost(config.autoPost || false);
                } catch (e) {
                    console.error('Error loading Facebook config:', e);
                }
            }
        }
    }, [isOpen]);

    const handleVerifyToken = async () => {
        if (!pageAccessToken) {
            toast.error('Please enter a Facebook Page Access Token');
            return;
        }

        // Check if user entered an App Token instead of Page Access Token
        if (pageAccessToken.includes('|')) {
            toast.error('App Token detected! Please use a Page Access Token instead. Get it from: https://developers.facebook.com/tools/accesstoken/');
            setVerificationStatus({ 
                success: false, 
                error: 'App Token provided. Please use a Page Access Token. App Tokens (format: APP_ID|SECRET) cannot be used to post events to Facebook Pages.',
                isAppToken: true
            });
            return;
        }

        setIsVerifying(true);
        setVerificationStatus(null);

        try {
            const response = await axios.post(
                `${backendUrl}api/facebook/verify-token`,
                { pageAccessToken },
                { withCredentials: true }
            );

            if (response.data.success) {
                setVerificationStatus({ success: true, pageName: response.data.pageName, pageId: response.data.pageId });
                setPageId(response.data.pageId);
                toast.success(`Token verified! Connected to page: ${response.data.pageName}`);
            } else {
                setVerificationStatus({ success: false, error: response.data.message });
                toast.error(response.data.message || 'Token verification failed');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Failed to verify token';
            const isAppToken = error.response?.data?.tokenType === 'App Token';
            setVerificationStatus({ 
                success: false, 
                error: errorMessage,
                isAppToken: isAppToken
            });
            toast.error(errorMessage);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSave = () => {
        if (!pageAccessToken || !pageId) {
            toast.error('Please verify your Facebook Page Access Token first');
            return;
        }

        setIsSaving(true);

        try {
            const config = {
                pageAccessToken,
                pageId,
                autoPost
            };

            localStorage.setItem('facebookConfig', JSON.stringify(config));
            toast.success('Facebook settings saved successfully!');
            
            if (onConfigSaved) {
                onConfigSaved(config);
            }
            
            onClose();
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 animate-scale-in">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Facebook Integration Settings</h2>
                                <p className="text-blue-100 text-sm">Connect your Facebook Page to auto-post events</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            How to Get Your Facebook Page Access Token
                        </h3>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 ml-2">
                            <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Meta Developers</a></li>
                            <li>Create or select your app</li>
                            <li>Add "Facebook Login" product</li>
                            <li>Get Page Access Token with <code className="bg-gray-200 px-1 rounded">pages_show_list</code> and <code className="bg-gray-200 px-1 rounded">pages_manage_posts</code> permissions</li>
                            <li>Paste the token below and verify</li>
                        </ol>
                    </div>

                    {/* Page Access Token Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Facebook Page Access Token
                        </label>
                        <input
                            type="password"
                            value={pageAccessToken}
                            onChange={(e) => setPageAccessToken(e.target.value)}
                            placeholder="Enter your Facebook Page Access Token (starts with EAA...)"
                            className={`w-full rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                pageAccessToken.includes('|') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            This token allows the app to post events to your Facebook page
                        </p>
                        {pageAccessToken.includes('|') && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800 font-medium">⚠️ App Token Detected</p>
                                <p className="text-xs text-red-700 mt-1">
                                    You've entered an App Token (format: APP_ID|SECRET). Please use a <strong>Page Access Token</strong> instead. 
                                    Get it from: <a href="https://developers.facebook.com/tools/accesstoken/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Access Token Tool</a>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Verify Button */}
                    <button
                        onClick={handleVerifyToken}
                        disabled={!pageAccessToken || isVerifying}
                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        {isVerifying ? (
                            <>
                                <LoadingSpinner size="tiny" inline />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <span>Verify Token</span>
                        )}
                    </button>

                    {/* Verification Status */}
                    {verificationStatus && (
                        <div className={`p-4 rounded-lg ${verificationStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                            {verificationStatus.success ? (
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-green-800">Token Verified Successfully!</p>
                                        <p className="text-sm text-green-700">Connected to: {verificationStatus.pageName}</p>
                                        <p className="text-xs text-green-600 mt-1">Page ID: {verificationStatus.pageId}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-start space-x-2">
                                        <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="font-semibold text-red-800">Verification Failed</p>
                                            <p className="text-sm text-red-700 mt-1">{verificationStatus.error}</p>
                                        </div>
                                    </div>
                                    {verificationStatus.isAppToken && (
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm font-semibold text-yellow-800 mb-2">How to Get a Page Access Token:</p>
                                            <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside ml-2">
                                                <li>Go to <a href="https://developers.facebook.com/tools/accesstoken/" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Access Token Tool</a></li>
                                                <li>Select your app from the dropdown</li>
                                                <li>Find your Facebook Page in the "Page Tokens" section</li>
                                                <li>Click "Generate Token" or "View Token" next to your page</li>
                                                <li>Copy the Page Access Token (it's a long string starting with "EAA...")</li>
                                                <li>Paste it here and verify</li>
                                            </ol>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Page ID (auto-filled after verification) */}
                    {pageId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Facebook Page ID
                            </label>
                            <input
                                type="text"
                                value={pageId}
                                readOnly
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-gray-50 text-gray-600"
                            />
                        </div>
                    )}

                    {/* Auto-Post Toggle */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900">Auto-Post to Facebook</h3>
                                <p className="text-sm text-gray-600">Automatically post events to Facebook when created</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAutoPost(!autoPost)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                    autoPost ? 'bg-blue-600' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                                        autoPost ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!pageAccessToken || !pageId || isSaving}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <LoadingSpinner size="tiny" inline />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                'Save Settings'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacebookSettingsModal;

