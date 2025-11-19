import React, { useContext, useState, useEffect, Fragment, useMemo } from 'react';
import SystemAdminSidebar from './SystemAdminSidebar.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContent } from '../../../context/AppContext.jsx';
import { FaWallet, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaEye, FaEyeSlash, FaEdit, FaPlus, FaSearch, FaFilter, FaKey } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import LoadingSpinner from '../../../components/LoadingSpinner';

const WalletManagement = () => {
    const { backendUrl } = useContext(AppContent);
    const [wallets, setWallets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingWallet, setEditingWallet] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [walletToDisable, setWalletToDisable] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

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
        if (!userId) {
            toast.error('Invalid user ID');
            return;
        }
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

    const handleEdit = (wallet) => {
        setEditingWallet(wallet);
        setIsEditModalOpen(true);
    };

    const handleCreateWallet = (wallet) => {
        // For users without wallets, opening edit modal will create a new wallet
        setEditingWallet(wallet);
        setIsEditModalOpen(true);
    };

    const handleUpdateWallet = async (formData, enableWebhookSecret = false) => {
        if (!editingWallet) return;

        try {
            setIsUpdating(true);
            const userId = editingWallet.userId?._id || editingWallet.userId;
            const updateData = {};
            
            if (formData.publicKey && formData.publicKey.trim()) {
                updateData.publicKey = formData.publicKey.trim();
            }
            // Handle webhook secret based on toggle state
            if (enableWebhookSecret) {
                // Toggle is ON - use the entered value (or null if empty)
                updateData.webhookSecret = formData.webhookSecret.trim() || null;
            } else {
                // Toggle is OFF - explicitly set to null to remove
                updateData.webhookSecret = null;
            }

            if (Object.keys(updateData).length === 0) {
                toast.error('No changes to save');
                return;
            }

            const { data } = await axios.put(`${backendUrl}api/wallets/${userId}`, updateData, {
                withCredentials: true
            });

            if (data.success) {
                toast.success('Wallet updated successfully');
                setIsEditModalOpen(false);
                setEditingWallet(null);
                fetchWallets();
            } else {
                toast.error(data.message || 'Failed to update wallet');
            }
        } catch (error) {
            console.error('Error updating wallet:', error);
            toast.error(error.response?.data?.message || 'Failed to update wallet');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRegenerateSecretKey = async (newSecretKey) => {
        if (!editingWallet || !newSecretKey || !newSecretKey.trim()) {
            toast.error('Secret key is required');
            return;
        }

        try {
            setIsRegenerating(true);
            // Extract userId from wallet object - ensure we get the target user's ID
            const targetUserId = editingWallet.userId?._id || editingWallet.userId;
            const userIdString = targetUserId?.toString ? targetUserId.toString() : String(targetUserId || '');
            
            if (!userIdString || userIdString === 'undefined' || userIdString === 'null') {
                toast.error('Invalid user ID. Please refresh the page and try again.');
                setIsRegenerating(false);
                return;
            }

            console.log('Regenerating secret key - Request details:', {
                userId: userIdString,
                targetUserRole: editingWallet.userId?.role,
                hasSecretKey: !!newSecretKey.trim()
            });
            
            const { data } = await axios.put(`${backendUrl}api/wallets/${userIdString}`, {
                secretKey: newSecretKey.trim()
            }, {
                withCredentials: true
            });

            if (data.success) {
                toast.success('Secret key regenerated successfully');
                setIsEditModalOpen(false);
                setEditingWallet(null);
                fetchWallets();
            } else {
                toast.error(data.message || 'Failed to regenerate secret key');
            }
        } catch (error) {
            console.error('Error regenerating secret key:', error);
            toast.error(error.response?.data?.message || 'Failed to regenerate secret key');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleToggleClick = (wallet) => {
        if (!wallet.hasWallet) {
            toast.error('Cannot toggle wallet status. Wallet does not exist yet.');
            return;
        }
        if (wallet.isActive) {
            // Show confirmation dialog when disabling
            setWalletToDisable(wallet);
            setShowConfirmDialog(true);
        } else {
            // Enable immediately without confirmation
            handleToggleActive(wallet.userId?._id || wallet.userId, false);
        }
    };

    const handleConfirmDisable = () => {
        if (walletToDisable) {
            handleToggleActive(walletToDisable.userId?._id || walletToDisable.userId, true);
            setShowConfirmDialog(false);
            setWalletToDisable(null);
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
        if (!wallet.hasWallet) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">No Wallet</span>;
        }
        if (!wallet.isActive) {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>;
        }
        if (wallet.verificationStatus === 'verified') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Verified</span>;
        }
        if (wallet.verificationStatus === 'failed') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>;
        }
        if (wallet.verificationStatus === 'never') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Never Verified</span>;
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

    // Filter wallets based on search term and verification status
    const filteredWallets = useMemo(() => {
        return wallets.filter(wallet => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
                wallet.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wallet.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());

            // Status filter
            const matchesStatus = filterStatus === 'all' || 
                wallet.verificationStatus === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [wallets, searchTerm, filterStatus]);

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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-2">Wallet Management</h1>
                                <p className="text-sm sm:text-base text-gray-600">Manage PayMongo wallets for departments and organizations</p>
                            </div>
                        </div>

                        {/* Search and Filter */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search by department name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaFilter className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="block w-full sm:w-48 pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm appearance-none bg-white"
                                >
                                    <option value="all">All Status</option>
                                    <option value="verified">Verified</option>
                                    <option value="failed">Failed</option>
                                    <option value="pending">Pending</option>
                                </select>
                            </div>
                            {(searchTerm || filterStatus !== 'all') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterStatus('all');
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {filteredWallets.length !== wallets.length && (
                            <p className="text-sm text-gray-600 mt-2">
                                Showing {filteredWallets.length} of {wallets.length} wallets
                            </p>
                        )}
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
                                        {filteredWallets.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">
                                                    No wallets found matching your search criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWallets.map((wallet, index) => {
                                                // Use userId as primary key since it's always present for Department/Organization users
                                                const uniqueKey = wallet.userId?._id || wallet.userId || wallet._id || `wallet-${index}`;
                                                return (
                                                <tr key={uniqueKey} className="hover:bg-gray-50">
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
                                                            {wallet.hasWallet ? (wallet.publicKey || '****') : <span className="text-gray-400 italic">No wallet</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {getStatusBadge(wallet)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {wallet.hasWallet ? formatDate(wallet.lastVerifiedAt) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {wallet.hasWallet ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEdit(wallet)}
                                                                        className="text-blue-600 hover:text-blue-900 p-1"
                                                                        title="Edit Wallet"
                                                                    >
                                                                        <FaEdit />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleVerify(wallet.userId?._id || wallet.userId)}
                                                                        className="text-green-600 hover:text-green-900 p-1"
                                                                        title="Verify Credentials"
                                                                    >
                                                                        <FaCheckCircle />
                                                                    </button>
                                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={wallet.isActive}
                                                                            onChange={() => handleToggleClick(wallet)}
                                                                            className="sr-only peer"
                                                                        />
                                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]"></div>
                                                                    </label>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleCreateWallet(wallet)}
                                                                    className="px-3 py-1 text-xs font-medium text-white bg-[#800000] rounded-lg hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] flex items-center gap-1"
                                                                >
                                                                    <FaPlus className="h-3 w-3" />
                                                                    Create Wallet
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Edit Wallet Modal */}
                    <EditWalletModal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setEditingWallet(null);
                        }}
                        wallet={editingWallet}
                        onUpdate={handleUpdateWallet}
                        onRegenerateSecretKey={handleRegenerateSecretKey}
                        onWalletCreated={fetchWallets}
                        isUpdating={isUpdating}
                        isRegenerating={isRegenerating}
                    />

                    {/* Confirmation Dialog */}
                    <ConfirmDisableDialog
                        isOpen={showConfirmDialog}
                        onClose={() => {
                            setShowConfirmDialog(false);
                            setWalletToDisable(null);
                        }}
                        onConfirm={handleConfirmDisable}
                        wallet={walletToDisable}
                    />
                </div>
            </main>
        </div>
    );
};

// Edit Wallet Modal Component
const EditWalletModal = ({ isOpen, onClose, wallet, onUpdate, onRegenerateSecretKey, onWalletCreated, isUpdating, isRegenerating }) => {
    const { backendUrl } = useContext(AppContent);
    const [formData, setFormData] = useState({
        publicKey: '',
        secretKey: '',
        webhookSecret: ''
    });
    const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
    const [newSecretKey, setNewSecretKey] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [enableWebhookSecret, setEnableWebhookSecret] = useState(false);

    useEffect(() => {
        if (wallet) {
            // Log wallet object structure for debugging
            const targetUserId = wallet.userId?._id || wallet.userId;
            console.log('EditWalletModal - Wallet object:', {
                hasWallet: wallet.hasWallet,
                targetUserId: targetUserId?.toString ? targetUserId.toString() : targetUserId,
                targetUserRole: wallet.userId?.role,
                targetUserName: wallet.userId?.name,
                targetUserEmail: wallet.userId?.email
            });
            
            if (wallet.hasWallet) {
                // Editing existing wallet - only publicKey and webhookSecret editable
                setFormData({
                    publicKey: '',
                    secretKey: '',
                    webhookSecret: ''
                });
                // Set toggle based on whether webhook secret exists
                setEnableWebhookSecret(!!wallet.webhookSecret);
            } else {
                // Creating new wallet - all fields required
                setFormData({
                    publicKey: '',
                    secretKey: '',
                    webhookSecret: ''
                });
                setEnableWebhookSecret(false);
            }
        }
    }, [wallet]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // If creating a new wallet, use create endpoint
        if (wallet && !wallet.hasWallet) {
            if (!formData.publicKey.trim() || !formData.secretKey.trim()) {
                toast.error('Public Key and Secret Key are required to create a wallet');
                return;
            }

            // Extract userId from wallet object - ensure we get the target user's ID, not the logged-in admin's ID
            // wallet.userId should be: { _id: "...", name: "...", email: "...", role: "Department/Organization" }
            const targetUserId = wallet.userId?._id || wallet.userId;
            
            // Convert to string if it's an object
            const userIdString = targetUserId?.toString ? targetUserId.toString() : String(targetUserId || '');
            
            // Validate userId exists
            if (!userIdString || userIdString === 'undefined' || userIdString === 'null') {
                console.error('Invalid userId extraction:', { wallet, targetUserId, userIdString });
                toast.error('Invalid user ID. Please refresh the page and try again.');
                return;
            }

            // Validate that the user is a Department/Organization user (from the wallet object, not from auth context)
            const targetUserRole = wallet.userId?.role;
            if (targetUserRole && targetUserRole !== 'Department/Organization') {
                toast.error(`Wallets can only be created for Department/Organization users. This user has role: ${targetUserRole}`);
                return;
            }

            // Prepare the request payload - ONLY use data from the wallet object, never from auth context
            const requestPayload = {
                userId: userIdString,  // Target user's ID (Department/Organization user)
                publicKey: formData.publicKey.trim(),
                secretKey: formData.secretKey.trim()
            };
            
            // Only include webhookSecret if toggle is enabled (don't send null/undefined)
            if (enableWebhookSecret && formData.webhookSecret.trim()) {
                requestPayload.webhookSecret = formData.webhookSecret.trim();
            } else if (enableWebhookSecret) {
                // Toggle is on but empty - send null explicitly
                requestPayload.webhookSecret = null;
            }
            // If toggle is off, don't include webhookSecret in payload (backend will use default null)

            console.log('Creating wallet - Request payload:', {
                userId: requestPayload.userId,
                userIdType: typeof requestPayload.userId,
                targetUserRole: targetUserRole,
                walletUserId: wallet.userId,
                hasPublicKey: !!requestPayload.publicKey,
                hasSecretKey: !!requestPayload.secretKey,
                webhookSecret: requestPayload.webhookSecret ? '***' : null,
                enableWebhookSecret: enableWebhookSecret
            });

            try {
                setIsCreating(true);

                const { data } = await axios.post(`${backendUrl}api/wallets`, requestPayload, {
                    withCredentials: true
                });

                if (data.success) {
                    toast.success('Wallet created successfully');
                    onClose();
                    // Trigger refresh in parent component
                    if (onWalletCreated) {
                        onWalletCreated();
                    }
                } else {
                    toast.error(data.message || 'Failed to create wallet');
                }
            } catch (error) {
                console.error('Error creating wallet:', error);
                const errorMessage = error.response?.data?.message || error.message || 'Failed to create wallet';
                console.error('Error details:', {
                    sentUserId: userIdString,
                    targetUserRole: targetUserRole,
                    walletObject: wallet,
                    error: errorMessage,
                    errorStatus: error.response?.status,
                    errorData: error.response?.data,
                    fullError: error
                });
                toast.error(errorMessage);
            } finally {
                setIsCreating(false);
            }
        } else {
            // Updating existing wallet - pass the toggle state
            onUpdate(formData, enableWebhookSecret);
        }
    };

    const handleRegenerateSubmit = async (e) => {
        e.preventDefault();
        if (!newSecretKey.trim()) {
            toast.error('Secret key is required');
            return;
        }
        await onRegenerateSecretKey(newSecretKey);
        setShowRegenerateDialog(false);
        setNewSecretKey('');
    };

    if (!wallet) return null;

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <Dialog.Title
                                            as="h3"
                                            className="text-xl font-semibold leading-6 text-gray-900"
                                        >
                                            {wallet.hasWallet ? 'Edit Wallet' : 'Create Wallet'}
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                            onClick={onClose}
                                        >
                                            <span className="sr-only">Close</span>
                                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-medium text-gray-900 mb-1">
                                            {wallet.userId?.name || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-gray-600">{wallet.userId?.email || ''}</p>
                                    </div>

                                    {!wallet.hasWallet && (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-800">
                                                <FaExclamationTriangle className="inline h-4 w-4 mr-2" />
                                                Creating a new wallet for this department/organization.
                                            </p>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="publicKey" className="block text-sm font-medium text-gray-700 mb-1">
                                                Public Key {!wallet.hasWallet && <span className="text-red-500">*</span>}
                                            </label>
                                            {wallet.hasWallet && (
                                                <p className="text-xs text-gray-500 mb-2">
                                                    Current: {wallet.publicKey || 'Not set'}
                                                </p>
                                            )}
                                            <input
                                                type="text"
                                                name="publicKey"
                                                id="publicKey"
                                                required={!wallet.hasWallet}
                                                value={formData.publicKey}
                                                onChange={handleChange}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm font-mono"
                                                placeholder="Enter public key (pk_...)"
                                            />
                                            {wallet.hasWallet ? (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Leave empty to keep current value. Enter full key to update.
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Enter the PayMongo public key for this department/organization.
                                                </p>
                                            )}
                                        </div>

                                        {!wallet.hasWallet && (
                                            <div>
                                                <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Secret Key <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    name="secretKey"
                                                    id="secretKey"
                                                    required
                                                    value={formData.secretKey}
                                                    onChange={handleChange}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm font-mono"
                                                    placeholder="Enter secret key (sk_...)"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Enter the PayMongo secret key for this department/organization.
                                                </p>
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <label htmlFor="webhookSecretToggle" className="block text-sm font-medium text-gray-700 mb-1">
                                                        Webhook Secret (Optional)
                                                    </label>
                                                    <p className="text-xs text-gray-500">
                                                        {wallet.hasWallet 
                                                            ? `Current: ${wallet.webhookSecret ? 'Set' : 'Not set'}`
                                                            : 'Enable to set webhook secret'}
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        id="webhookSecretToggle"
                                                        checked={enableWebhookSecret}
                                                        onChange={(e) => {
                                                            setEnableWebhookSecret(e.target.checked);
                                                            if (!e.target.checked) {
                                                                // Clear webhook secret when toggle is off
                                                                setFormData(prev => ({ ...prev, webhookSecret: '' }));
                                                            }
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]"></div>
                                                </label>
                                            </div>
                                            {enableWebhookSecret && (
                                                <div>
                                                    <input
                                                        type="text"
                                                        name="webhookSecret"
                                                        id="webhookSecret"
                                                        value={formData.webhookSecret}
                                                        onChange={handleChange}
                                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm font-mono"
                                                        placeholder="Enter webhook secret (whsec_...)"
                                                    />
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {wallet.hasWallet 
                                                            ? 'Enter new webhook secret. Toggle off to remove.'
                                                            : 'Enter the PayMongo webhook secret for this department/organization.'}
                                                    </p>
                                                </div>
                                            )}
                                            {!enableWebhookSecret && wallet.hasWallet && wallet.webhookSecret && (
                                                <p className="text-xs text-yellow-600 mt-1">
                                                    Webhook secret will be removed when you save.
                                                </p>
                                            )}
                                        </div>

                                        {wallet.hasWallet && (
                                            <div className="border-t border-gray-200 pt-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Secret Key
                                                </label>
                                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-mono">sk_****</p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Secret key cannot be edited directly for security reasons.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRegenerateDialog(true)}
                                                        className="ml-4 px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] flex items-center gap-2"
                                                    >
                                                        <FaKey className="h-4 w-4" />
                                                        Regenerate
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isUpdating || isCreating}
                                                className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isCreating ? 'Creating...' : (isUpdating ? 'Saving...' : (wallet.hasWallet ? 'Save Changes' : 'Create Wallet'))}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Regenerate Secret Key Dialog */}
            <Transition appear show={showRegenerateDialog} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowRegenerateDialog(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-semibold leading-6 text-gray-900 mb-4"
                                    >
                                        Regenerate Secret Key
                                    </Dialog.Title>

                                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <FaExclamationTriangle className="inline h-4 w-4 mr-2" />
                                            Warning: Regenerating the secret key will invalidate the current key. Make sure you have the new key from PayMongo.
                                        </p>
                                    </div>

                                    <form onSubmit={handleRegenerateSubmit} className="space-y-4">
                                        <div>
                                            <label htmlFor="newSecretKey" className="block text-sm font-medium text-gray-700 mb-1">
                                                New Secret Key <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="newSecretKey"
                                                id="newSecretKey"
                                                required
                                                value={newSecretKey}
                                                onChange={(e) => setNewSecretKey(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#800000] focus:border-[#800000] sm:text-sm font-mono"
                                                placeholder="Enter new secret key (sk_...)"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowRegenerateDialog(false);
                                                    setNewSecretKey('');
                                                }}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isRegenerating || !newSecretKey.trim()}
                                                className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                            </button>
                                        </div>
                                    </form>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

// Confirmation Dialog Component
const ConfirmDisableDialog = ({ isOpen, onClose, onConfirm, wallet }) => {
    if (!wallet) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-semibold leading-6 text-gray-900 mb-4"
                                >
                                    Disable Wallet?
                                </Dialog.Title>

                                <div className="mb-4">
                                    <p className="text-sm text-gray-600 mb-3">
                                        Are you sure you want to disable the wallet for <strong>{wallet.userId?.name || 'Unknown'}</strong>?
                                    </p>
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            <FaExclamationTriangle className="inline h-4 w-4 mr-2" />
                                            Disabling this wallet will prevent new donations from being processed. Existing donations will remain in the system.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onConfirm}
                                        className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#700000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000]"
                                    >
                                        Disable Wallet
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default WalletManagement;

