import React, { useContext, useState, useEffect } from 'react';
import SystemAdminSidebar from './SystemAdminSidebar.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContent } from '../../../context/AppContext.jsx';
import { FaWallet, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaEye, FaEyeSlash, FaEdit, FaPlus } from 'react-icons/fa';
import LoadingSpinner from '../../../components/LoadingSpinner';

const WalletManagement = () => {
    const { backendUrl } = useContext(AppContent);
    const [wallets, setWallets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState(null);
    const [showKeys, setShowKeys] = useState({});

    useEffect(() => {
        fetchWallets();
    }, []);

    const fetchWallets = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const { data } = await axios.get(`${backendUrl}api/wallets`, {
                withCredentials: true
            });

            if (data.success) {
                setWallets(data.wallets || []);
            } else {
                toast.error(data.message || 'Failed to fetch wallets');
            }
        } catch (error) {
            console.error('Error fetching wallets:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch wallets');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (userId) => {
        try {
            const { data } = await axios.post(`${backendUrl}api/wallets/${userId}/verify`, {}, {
                withCredentials: true
            });

            if (data.success) {
                toast.success('Wallet credentials verified successfully');
                fetchWallets();
            } else {
                toast.error(data.message || 'Verification failed');
            }
        } catch (error) {
            console.error('Error verifying wallet:', error);
            toast.error(error.response?.data?.message || 'Failed to verify wallet');
        }
    };

    const handleToggleActive = async (userId, isActive) => {
        try {
            const endpoint = isActive ? 'deactivate' : 'reactivate';
            const { data } = await axios.post(`${backendUrl}api/wallets/${userId}/${endpoint}`, {}, {
                withCredentials: true
            });

            if (data.success) {
                toast.success(`Wallet ${isActive ? 'deactivated' : 'reactivated'} successfully`);
                fetchWallets();
            } else {
                toast.error(data.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Error toggling wallet:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const getStatusBadge = (wallet) => {
        if (!wallet.isActive) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>;
        }
        if (wallet.verificationStatus === 'verified') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Verified</span>;
        }
        if (wallet.verificationStatus === 'failed') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>;
        }
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="lg:ml-64 xl:ml-72 min-h-screen overflow-y-auto">
                <div className="lg:hidden sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-[#800000] hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="ml-3 text-xl font-bold text-[#800000]">Wallet Management</h1>
                </div>

                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-2">Wallet Management</h1>
                                <p className="text-sm sm:text-base text-gray-600">Manage PayMongo wallets for departments and organizations</p>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : wallets.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-md p-8 text-center">
                            <FaWallet className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Wallets Found</h3>
                            <p className="text-gray-600">No department wallets have been created yet.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-md overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Public Key</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Verified</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {wallets.map((wallet) => (
                                            <tr key={wallet._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {wallet.userId?.name || 'Unknown'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {wallet.userId?.email || ''}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 font-mono">
                                                        {wallet.publicKey || '****'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(wallet)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(wallet.lastVerifiedAt)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleVerify(wallet.userId?._id || wallet.userId)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="Verify Credentials"
                                                    >
                                                        <FaCheckCircle />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleActive(wallet.userId?._id || wallet.userId, wallet.isActive)}
                                                        className={wallet.isActive ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}
                                                        title={wallet.isActive ? "Deactivate" : "Reactivate"}
                                                    >
                                                        {wallet.isActive ? <FaTimesCircle /> : <FaCheckCircle />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default WalletManagement;

