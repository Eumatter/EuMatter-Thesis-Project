import React, { useContext, useState, useEffect, Fragment, useMemo } from 'react';
import SystemAdminSidebar from './SystemAdminSidebar.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContent } from '../../../context/AppContext.jsx';
import { FaWallet, FaExclamationTriangle, FaEdit, FaPlus, FaSearch, FaKey } from 'react-icons/fa';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
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


    // Filter wallets based on search term
    const filteredWallets = useMemo(() => {
        return wallets.filter(wallet => {
            // Search filter
            const matchesSearch = searchTerm === '' || 
                wallet.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wallet.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        });
    }, [wallets, searchTerm]);

    return (
        <div className="bg-[#F5F5F5] min-h-screen">
            <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="lg:ml-64 xl:ml-72 min-h-screen overflow-y-auto">
                <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center">
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-600 hover:text-[#800000] hover:bg-gray-100 rounded-xl transition"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    <h1 className="ml-3 text-lg font-bold text-[#800000]">System Admin</h1>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">Wallet Management</h1>
                        <p className="text-sm text-gray-600 mt-0.5">Manage PayMongo wallets for departments and organizations.</p>
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-end mt-4 pt-4 border-t border-gray-100">
                            <div className="flex-1">
                                <label htmlFor="wallet-search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="wallet-search"
                                        type="text"
                                        placeholder="Search by department or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                    />
                                </div>
                            </div>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        {filteredWallets.length !== wallets.length && (
                            <p className="text-sm text-gray-500 mt-3">
                                Showing {filteredWallets.length} of {wallets.length} wallets
                            </p>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <LoadingSpinner />
                        </div>
                    ) : wallets.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                            <FaWallet className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-base font-semibold text-gray-900 mb-1">No Wallets Found</h3>
                            <p className="text-sm text-gray-500">No department wallets have been created yet.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Public Key</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredWallets.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-4 py-8 text-center text-sm text-gray-500">
                                                    No wallets match your search.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredWallets.map((wallet, index) => {
                                                const uniqueKey = wallet.userId?._id || wallet.userId || wallet._id || `wallet-${index}`;
                                                return (
                                                    <tr key={uniqueKey} className="hover:bg-gray-50/50 transition">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{wallet.userId?.name || 'Unknown'}</div>
                                                            <div className="text-sm text-gray-500">{wallet.userId?.email || ''}</div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-sm text-gray-900 font-mono">
                                                                {wallet.hasWallet ? (wallet.publicKey || '****') : <span className="text-gray-400">No wallet</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                {wallet.hasWallet ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEdit(wallet)}
                                                                            className="inline-flex items-center justify-center w-8 h-8 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                                                                            title="Edit Wallet"
                                                                        >
                                                                            <FaEdit className="h-4 w-4" />
                                                                        </button>
                                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={wallet.isActive}
                                                                                onChange={() => handleToggleClick(wallet)}
                                                                                className="sr-only peer"
                                                                            />
                                                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#800000]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800000]" />
                                                                        </label>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCreateWallet(wallet)}
                                                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] transition"
                                                                    >
                                                                        <FaPlus className="h-3.5 w-3.5" />
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
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-200"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-150"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-left">
                                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
                                        <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                                            {wallet.hasWallet ? 'Edit Wallet' : 'Create Wallet'}
                                        </Dialog.Title>
                                        <button
                                            type="button"
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                                            onClick={onClose}
                                        >
                                            <span className="sr-only">Close</span>
                                            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </div>

                                    <div className="px-4 sm:px-6 py-4">
                                        <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-sm font-medium text-gray-900">{wallet.userId?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-600 mt-0.5">{wallet.userId?.email || ''}</p>
                                        </div>

                                        {!wallet.hasWallet && (
                                            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
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
                                                <p className="text-xs text-gray-500 mb-2">Current: {wallet.publicKey || 'Not set'}</p>
                                            )}
                                            <input
                                                type="text"
                                                name="publicKey"
                                                id="publicKey"
                                                required={!wallet.hasWallet}
                                                value={formData.publicKey}
                                                onChange={handleChange}
                                                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
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
                                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
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
                                                        className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
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
                                            <div className="border-t border-gray-100 pt-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                                                <div className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div>
                                                        <p className="text-sm text-gray-900 font-mono">sk_****</p>
                                                        <p className="text-xs text-gray-500 mt-1">Secret key cannot be edited directly.</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRegenerateDialog(true)}
                                                        className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] flex items-center gap-2 transition"
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
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isUpdating || isCreating}
                                                className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] disabled:opacity-50 disabled:cursor-not-allowed transition"
                                            >
                                                {isCreating ? 'Creating...' : (isUpdating ? 'Saving...' : (wallet.hasWallet ? 'Save Changes' : 'Create Wallet'))}
                                            </button>
                                        </div>
                                    </form>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Regenerate Secret Key Dialog */}
            <Transition appear show={showRegenerateDialog} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowRegenerateDialog(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                    </Transition.Child>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                                <Dialog.Panel className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-left">
                                    <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                                        <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">Regenerate Secret Key</Dialog.Title>
                                    </div>
                                    <div className="px-4 sm:px-6 py-4">
                                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                            <p className="text-sm text-amber-800">
                                                <FaExclamationTriangle className="inline h-4 w-4 mr-2" />
                                                Regenerating will invalidate the current key. Use the new key from PayMongo.
                                            </p>
                                        </div>
                                        <form onSubmit={handleRegenerateSubmit} className="space-y-4">
                                            <div>
                                                <label htmlFor="newSecretKey" className="block text-sm font-medium text-gray-700 mb-1">New Secret Key <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    id="newSecretKey"
                                                    required
                                                    value={newSecretKey}
                                                    onChange={(e) => setNewSecretKey(e.target.value)}
                                                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                                    placeholder="Enter new secret key (sk_...)"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowRegenerateDialog(false); setNewSecretKey(''); }}
                                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isRegenerating || !newSecretKey.trim()}
                                                    className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                >
                                                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
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
                <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden text-left">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">Disable Wallet?</Dialog.Title>
                                </div>
                                <div className="px-4 sm:px-6 py-4">
                                    <p className="text-sm text-gray-600 mb-3">
                                        Disable the wallet for <strong>{wallet.userId?.name || 'Unknown'}</strong>?
                                    </p>
                                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4">
                                        <p className="text-sm text-amber-800">
                                            <FaExclamationTriangle className="inline h-4 w-4 mr-2" />
                                            New donations will not be processed. Existing data remains.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                            Cancel
                                        </button>
                                        <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] transition">
                                            Disable Wallet
                                        </button>
                                    </div>
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

