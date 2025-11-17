import React, { useState, useContext, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, UserCircleIcon, EnvelopeIcon, LockClosedIcon, AcademicCapIcon, BuildingOffice2Icon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { AppContent } from '../../../context/AppContext';

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
    const { backendUrl } = useContext(AppContent);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'student',
        department: '',
        organization: '',
        paymongoPublicKey: '',
        paymongoSecretKey: '',
        paymongoWebhookSecret: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const response = await axios.post(`${backendUrl}api/admin/create-user`, formData, {
                withCredentials: true
            });
            
            if (response.data.success) {
                toast.success('User created successfully!');
                onUserAdded();
                onClose();
                // Reset form
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: 'student',
                    department: '',
                    organization: '',
                    paymongoPublicKey: '',
                    paymongoSecretKey: '',
                    paymongoWebhookSecret: ''
                });
            } else {
                toast.error(response.data.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            toast.error(error.response?.data?.message || 'An error occurred while creating user');
        } finally {
            setIsLoading(false);
        }
    };

    // Role configuration with icons and colors
    const roleConfig = {
        student: { 
            icon: AcademicCapIcon, 
            color: 'bg-blue-100 text-blue-800',
            label: 'Student'
        },
        faculty: { 
            icon: UserCircleIcon, 
            color: 'bg-purple-100 text-purple-800',
            label: 'Faculty'
        },
        'Department/Organization': { 
            icon: BuildingOffice2Icon, 
            color: 'bg-green-100 text-green-800',
            label: 'Department/Organization'
        },
        'CRD Staff': { 
            icon: UserGroupIcon, 
            color: 'bg-yellow-100 text-yellow-800',
            label: 'CRD Staff'
        },
        alumni: { 
            icon: UserGroupIcon, 
            color: 'bg-gray-100 text-gray-800',
            label: 'Alumni'
        }
    };

    const currentRole = roleConfig[formData.role] || roleConfig.student;
    const RoleIcon = currentRole.icon;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                {/* Backdrop with blur effect */}
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
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-semibold leading-6 text-gray-900"
                                    >
                                        Add New User
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

                                {/* Role Selection */}
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        User Role
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(roleConfig).map(([key, { icon: Icon, color, label }]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, role: key }))}
                                                className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 ${
                                                    formData.role === key 
                                                        ? 'border-red-500 bg-red-50' 
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className={`p-2 rounded-full mb-2 ${color.split(' ')[0]} bg-opacity-20`}>
                                                    <Icon className="h-6 w-6" />
                                                </div>
                                                <span className="text-xs font-medium text-gray-700">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                                    <div className="space-y-1">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                            </div>
                                            <input
                                                type="email"
                                                name="email"
                                                id="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                placeholder="user@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                                First Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                id="firstName"
                                                required
                                                value={formData.firstName}
                                                onChange={handleChange}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                placeholder="John"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                                Last Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                id="lastName"
                                                required
                                                value={formData.lastName}
                                                onChange={handleChange}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            Temporary Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                            </div>
                                            <input
                                                type="password"
                                                name="password"
                                                id="password"
                                                required
                                                minLength={8}
                                                value={formData.password}
                                                onChange={handleChange}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                                    </div>

                                    {(formData.role === 'faculty' || formData.role === 'student') && (
                                        <div className="space-y-1">
                                            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                                                Department <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="department"
                                                name="department"
                                                required
                                                value={formData.department}
                                                onChange={handleChange}
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-lg"
                                            >
                                                <option value="">Select Department</option>
                                                <option value="CCS">College of Computer Studies</option>
                                                <option value="COE">College of Engineering</option>
                                                <option value="CBM">College of Business and Management</option>
                                                <option value="CAS">College of Arts and Sciences</option>
                                                <option value="CON">College of Nursing</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Wallet Setup for Department/Organization */}
                                    {formData.role === 'Department/Organization' && (
                                        <div className="space-y-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center space-x-2">
                                                <LockClosedIcon className="h-5 w-5 text-gray-400" />
                                                <h3 className="text-sm font-semibold text-gray-700">PayMongo Wallet Setup (Optional)</h3>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Configure PayMongo wallet credentials. If not provided, wallet can be set up later.
                                            </p>
                                            
                                            <div className="space-y-1">
                                                <label htmlFor="paymongoPublicKey" className="block text-sm font-medium text-gray-700">
                                                    Public Key
                                                </label>
                                                <input
                                                    type="password"
                                                    name="paymongoPublicKey"
                                                    id="paymongoPublicKey"
                                                    value={formData.paymongoPublicKey}
                                                    onChange={handleChange}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm font-mono text-xs"
                                                    placeholder="pk_test_..."
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label htmlFor="paymongoSecretKey" className="block text-sm font-medium text-gray-700">
                                                    Secret Key
                                                </label>
                                                <input
                                                    type="password"
                                                    name="paymongoSecretKey"
                                                    id="paymongoSecretKey"
                                                    value={formData.paymongoSecretKey}
                                                    onChange={handleChange}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm font-mono text-xs"
                                                    placeholder="sk_test_..."
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label htmlFor="paymongoWebhookSecret" className="block text-sm font-medium text-gray-700">
                                                    Webhook Secret (Optional)
                                                </label>
                                                <input
                                                    type="password"
                                                    name="paymongoWebhookSecret"
                                                    id="paymongoWebhookSecret"
                                                    value={formData.paymongoWebhookSecret}
                                                    onChange={handleChange}
                                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm font-mono text-xs"
                                                    placeholder="whsec_..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className={`px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 ${
                                                isLoading ? 'opacity-70 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            {isLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <LoadingSpinner size="tiny" inline />
                                                    <span>Creating...</span>
                                                </span>
                                            ) : (
                                                `Create ${currentRole.label}`
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default AddUserModal;
