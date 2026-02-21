import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContent } from '../../../context/AppContext.jsx';
import { FaWallet, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

const WalletStatus = () => {
    const { backendUrl, userData } = useContext(AppContent);
    const [walletStatus, setWalletStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userData?._id) {
            fetchWalletStatus();
        }
    }, [userData]);

    const fetchWalletStatus = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const { data } = await axios.get(`${backendUrl}api/wallets/${userData._id}/status`, {
                withCredentials: true
            });

            if (data.success) {
                setWalletStatus(data.status);
            } else {
                toast.error(data.message || 'Failed to fetch wallet status');
            }
        } catch (error) {
            console.error('Error fetching wallet status:', error);
            if (error.response?.status === 404) {
                setWalletStatus(null); // No wallet found
            } else {
                toast.error(error.response?.data?.message || 'Failed to fetch wallet status');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <LoadingSpinner />
            </div>
        );
    }

    if (!walletStatus) {
        return (
            <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-xl shadow-md p-8 text-center">
                        <FaExclamationTriangle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet Not Configured</h2>
                        <p className="text-gray-600 mb-6">
                            Your PayMongo wallet has not been set up yet. Please contact a System Administrator to configure your wallet.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                            <p className="text-sm text-blue-800">
                                <FaInfoCircle className="inline mr-2" />
                                Once your wallet is configured, donations for your events will go directly to your PayMongo account.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Wallet Status</h1>
                    <p className="text-gray-600">View your PayMongo wallet configuration status</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center space-x-3">
                            <FaWallet className="h-8 w-8 text-[#800000]" />
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">PayMongo Wallet</h2>
                                <p className="text-sm text-gray-500">Department Payment Account</p>
                            </div>
                        </div>
                        {walletStatus.isActive ? (
                            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
                                <FaCheckCircle className="mr-2" /> Active
                            </span>
                        ) : (
                            <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 flex items-center">
                                <FaTimesCircle className="mr-2" /> Inactive
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-500">Public Key</label>
                            <p className="mt-1 text-sm font-mono text-gray-900 break-all">
                                {walletStatus.publicKey || 'Not available'}
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-500">Verification Status</label>
                            <p className="mt-1 text-sm text-gray-900 capitalize">
                                {walletStatus.verificationStatus || 'Unknown'}
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-500">Last Verified</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {formatDate(walletStatus.lastVerifiedAt)}
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <label className="text-sm font-medium text-gray-500">Webhook Configured</label>
                            <p className="mt-1 text-sm text-gray-900">
                                {walletStatus.hasWebhookSecret ? 'Yes' : 'No'}
                            </p>
                        </div>
                    </div>

                    {!walletStatus.isActive && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <FaExclamationTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                                <div>
                                    <h3 className="text-sm font-semibold text-yellow-800">Wallet Inactive</h3>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Your wallet is currently inactive. Donations cannot be processed until it is activated. 
                                        Please contact a System Administrator to activate your wallet.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {walletStatus.verificationStatus === 'failed' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-start">
                                <FaTimesCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                                <div>
                                    <h3 className="text-sm font-semibold text-red-800">Verification Failed</h3>
                                    <p className="text-sm text-red-700 mt-1">
                                        The wallet credentials could not be verified. Please contact a System Administrator to update your wallet credentials.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletStatus;

