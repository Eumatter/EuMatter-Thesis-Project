import React, { useContext, useState, useEffect, Fragment } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';
import axios from 'axios'
import { toast } from 'react-toastify'
import { PlusIcon, UserGroupIcon, UserIcon, AcademicCapIcon, BuildingOfficeIcon, ShieldCheckIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Dialog, Transition } from '@headlessui/react';
import AddUserModal from './AddUserModal';

// Add this helper function after the imports and before the component
const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date)
            ? date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
            : 'No date available';
    } catch {
        return 'No date available';
    }
};

// Pagination Controls Component
const PaginationControls = ({ currentPage, totalPages, onPageChange, totalUsers, limit }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            // Show all pages if total pages is less than max visible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show pages with ellipsis
            if (currentPage <= 3) {
                // Show first pages
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                // Show last pages
                pages.push(1);
                pages.push('ellipsis');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // Show middle pages
                pages.push(1);
                pages.push('ellipsis');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    return (
        <>
            {/* Mobile Pagination */}
            <div className="flex justify-between sm:hidden w-full">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md ${
                        currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Previous
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md ${
                        currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Next
                </button>
            </div>
            {/* Desktop Pagination */}
            <nav className="hidden sm:flex relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center h-8 w-8 rounded-l-md border border-gray-300 bg-white text-xs font-medium ${
                        currentPage === 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-[#800000]'
                    }`}
                >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                {getPageNumbers().map((page, index) => {
                    if (page === 'ellipsis') {
                        return (
                            <span
                                key={`ellipsis-${index}`}
                                className="relative inline-flex items-center h-8 px-3 border border-gray-300 bg-white text-xs font-medium text-gray-700"
                            >
                                ...
                            </span>
                        );
                    }
                    return (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`relative inline-flex items-center justify-center h-8 w-8 border text-xs font-medium ${
                                currentPage === page
                                    ? 'z-10 bg-[#800000] border-[#800000] text-white'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    );
                })}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center h-8 w-8 rounded-r-md border border-gray-300 bg-white text-xs font-medium ${
                        currentPage === totalPages
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-[#800000]'
                    }`}
                >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
            </nav>
        </>
    );
};

// Edit User Modal Component
const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
    const { backendUrl } = useContext(AppContent);
    const [selectedRole, setSelectedRole] = useState(user?.role || 'User');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setSelectedRole(user.role || 'User');
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !user._id) return;

        setIsLoading(true);
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.put(backendUrl + 'api/user/role', {
                userId: user._id,
                role: selectedRole
            });

            if (data.success) {
                toast.success('User role updated successfully');
                onUserUpdated();
                onClose();
            } else {
                toast.error(data.message || 'Failed to update user role');
            }
        } catch (error) {
            console.error('Error updating user role:', error);
            toast.error(error.response?.data?.message || 'Failed to update user role');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

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
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
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
                                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                                        Edit User Role
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <div className="mb-4">
                                    <div className="mb-2">
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Name:</span> {user.name || 'Unnamed User'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Email:</span> {user.email}
                                        </p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit}>
                                    <div className="mb-4">
                                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                                            Role <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="role"
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                            required
                                        >
                                            <option value="User">User</option>
                                            <option value="student">Student</option>
                                            <option value="faculty">Faculty</option>
                                            <option value="Department/Organization">Department/Organization</option>
                                            <option value="CRD Staff">CRD Staff</option>
                                            <option value="alumni">Alumni</option>
                                            <option value="System Administrator">System Administrator</option>
                                            <option value="Auditor">Auditor</option>
                                        </select>
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-md hover:bg-[#900000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Updating...' : 'Update Role'}
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

const UserManagement = () => {
    const { backendUrl } = useContext(AppContent)
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalUsers, setTotalUsers] = useState(0)
    
    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'student', label: 'Students' },
        { value: 'faculty', label: 'Faculty' },
        { value: 'Department/Organization', label: 'Department/Organization' },
        { value: 'CRD Staff', label: 'CRD Staff' },
        { value: 'alumni', label: 'Alumni' },
        { value: 'System Administrator', label: 'System Administrators' }
    ];
    
    const getRoleLabel = (role) => {
        const roleMap = {
            'student': 'Student',
            'faculty': 'Faculty',
            'Department/Organization': 'Department/Organization',
            'CRD Staff': 'CRD Staff',
            'alumni': 'Alumni',
            'System Administrator': 'System Administrator',
            'User': 'User',
            'Auditor': 'Auditor'
        };
        return roleMap[role] || role;
    };

    // Get user type display - shows category when role is "User"
    const getUserTypeDisplay = (user) => {
        if (user.role !== 'User') {
            return getRoleLabel(user.role);
        }
        
        // If role is "User", check userType
        if (user.userType === 'MSEUF' && user.mseufCategory) {
            return user.mseufCategory; // Student, Faculty, Staff
        }
        
        // All Outsider userType accounts are displayed as "Guest"
        if (user.userType === 'Outsider') {
            return 'Guest';
        }
        
        // If userType is empty or not set, return "User"
        return 'User';
    };
    
    const getRoleIcon = (user) => {
        // First check if role is "User" and has userType
        if (user.role === 'User') {
            if (user.userType === 'MSEUF' && user.mseufCategory) {
                switch(user.mseufCategory) {
                    case 'Student':
                        return <AcademicCapIcon className="h-3.5 w-3.5 text-blue-500" />;
                    case 'Faculty':
                        return <UserIcon className="h-3.5 w-3.5 text-purple-500" />;
                    case 'Staff':
                        return <ShieldCheckIcon className="h-3.5 w-3.5 text-yellow-500" />;
                    default:
                        return <UserIcon className="h-3.5 w-3.5 text-gray-400" />;
                }
            }
            // All Outsider userType accounts are displayed as "Guest"
            if (user.userType === 'Outsider') {
                return <UserIcon className="h-3.5 w-3.5 text-gray-500" />;
            }
            return <UserIcon className="h-3.5 w-3.5 text-gray-400" />;
        }
        
        // For non-User roles
        switch(user.role) {
            case 'student':
                return <AcademicCapIcon className="h-3.5 w-3.5 text-blue-500" />;
            case 'faculty':
                return <UserIcon className="h-3.5 w-3.5 text-purple-500" />;
            case 'Department/Organization':
                return <BuildingOfficeIcon className="h-3.5 w-3.5 text-green-500" />;
            case 'CRD Staff':
                return <ShieldCheckIcon className="h-3.5 w-3.5 text-yellow-500" />;
            case 'System Administrator':
                return <ShieldCheckIcon className="h-3.5 w-3.5 text-red-500" />;
            case 'alumni':
                return <UserGroupIcon className="h-3.5 w-3.5 text-gray-500" />;
            default:
                return <UserIcon className="h-3.5 w-3.5 text-gray-400" />;
        }
    };

    useEffect(() => {
        fetchUsers()
    }, [currentPage, filterRole, searchTerm])

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            // Fetch users with pagination - limit 15 per page
            const { data } = await axios.get(`${backendUrl}api/admin/users`, {
                params: {
                    page: currentPage,
                    limit: 15,
                    role: filterRole !== 'all' ? filterRole : undefined,
                    search: searchTerm || undefined
                }
            });

            if (data.success) {
                setUsers(data.users || []);
                setTotalPages(data.totalPages || 1);
                setTotalUsers(data.total || 0);
            } else {
                toast.error(data.message || 'Failed to fetch users');
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error(error.response?.data?.message || 'Failed to fetch users');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUserCreated = () => {
        setCurrentPage(1);
        fetchUsers();
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setCurrentPage(1); // Reset to page 1 when search changes
    };

    const handleRoleFilterChange = (value) => {
        setFilterRole(value);
        setCurrentPage(1); // Reset to page 1 when filter changes
    };
    
    const getRoleBadgeClass = (user) => {
        // First check if role is "User" and has userType
        if (user.role === 'User') {
            if (user.userType === 'MSEUF' && user.mseufCategory) {
                switch(user.mseufCategory) {
                    case 'Student':
                        return 'bg-blue-100 text-blue-800';
                    case 'Faculty':
                        return 'bg-purple-100 text-purple-800';
                    case 'Staff':
                        return 'bg-yellow-100 text-yellow-800';
                    default:
                        return 'bg-gray-100 text-gray-800';
                }
            }
            // All Outsider userType accounts are displayed as "Guest"
            if (user.userType === 'Outsider') {
                return 'bg-gray-100 text-gray-800';
            }
            return 'bg-gray-100 text-gray-800'; // Default for User without userType
        }
        
        // For non-User roles
        switch(user.role) {
            case 'System Administrator':
                return 'bg-red-100 text-red-800';
            case 'CRD Staff':
                return 'bg-yellow-100 text-yellow-800';
            case 'Department/Organization':
                return 'bg-green-100 text-green-800';
            case 'faculty':
                return 'bg-purple-100 text-purple-800';
            case 'student':
                return 'bg-blue-100 text-blue-800';
            case 'alumni':
                return 'bg-gray-100 text-gray-800';
            case 'User':
                return 'bg-gray-100 text-gray-800';
            case 'Auditor':
                return 'bg-indigo-100 text-indigo-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    };

    const handleUserUpdated = () => {
        fetchUsers();
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.delete(`${backendUrl}api/admin/users/${userId}`, {
                withCredentials: true
            });

            if (data.success) {
                toast.success('User deleted successfully');
                fetchUsers();
            } else {
                toast.error(data.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error(error.response?.data?.message || 'Failed to delete user');
        }
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="lg:ml-64 xl:ml-72 min-h-screen overflow-y-auto">
                {/* Mobile Menu Button */}
                <div className="lg:hidden sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-[#800000] hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="ml-3 text-xl font-bold text-[#800000]">System Admin</h1>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mb-4 sm:mb-6 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-center sm:text-left">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
                                <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Manage and monitor all user accounts in the system</p>
                            </div>
                            <div className="flex justify-center sm:justify-end">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 w-full sm:w-auto justify-center"
                                >
                                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Add New User
                                </button>
                            </div>
                        </div>
                        
                        {/* Filters and Search */}
                        <div className="mt-4">
                            <div className="flex flex-col sm:flex-row gap-3 items-end">
                                <div className="flex-1">
                                    <label htmlFor="search" className="block text-xs font-medium text-gray-700 mb-1">Search users</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            name="search"
                                            id="search"
                                            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                                            placeholder="Search by name or email..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="sm:w-48">
                                    <label htmlFor="role-filter" className="block text-xs font-medium text-gray-700 mb-1">Filter by Role</label>
                                    <select
                                        id="role-filter"
                                        className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md"
                                        value={filterRole}
                                        onChange={(e) => handleRoleFilterChange(e.target.value)}
                                    >
                                        {roleOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        {isLoading ? (
                            <div className="py-12">
                                <LoadingSpinner size="medium" text="Loading users..." />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">No users found</h3>
                                <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
                                    {searchTerm || filterRole !== 'all' 
                                        ? 'Try adjusting your search or filter criteria.'
                                        : 'Get started by creating a new user.'}
                                </p>
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                                    >
                                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                                        New User
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="block md:hidden divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <div key={user._id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {user.profileImage ? (
                                                            <img 
                                                                className="h-10 w-10 rounded-full object-cover" 
                                                                src={user.profileImage} 
                                                                alt={user.name} 
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                                <UserIcon className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <div className="text-sm font-medium text-gray-900 truncate">
                                                                {user.name || 'Unnamed User'}
                                                            </div>
                                                            {user.isAccountVerified && (
                                                                <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                            {!user.isAccountVerified && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                    <ClockIcon className="h-3 w-3" />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500 truncate mb-2">{user.email}</p>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user)}`}>
                                                            {getRoleIcon(user)}
                                                            <span className="ml-1">{getUserTypeDisplay(user)}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditUser(user);
                                                        }}
                                                        className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                        title="Edit user"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteUser(user._id, user.name);
                                                        }}
                                                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                        title="Delete user"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop Table View */}
                                <div className="hidden md:block w-full overflow-x-auto">
                                    <table className="w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                <th scope="col" className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Email
                                                </th>
                                                <th scope="col" className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Role
                                                </th>
                                                <th scope="col" className="hidden md:table-cell px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date Joined
                                                </th>
                                                <th scope="col" className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {users.map((user) => (
                                                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-3 py-1.5">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-6 w-6">
                                                                {user.profileImage ? (
                                                                    <img 
                                                                        className="h-6 w-6 rounded-full object-cover" 
                                                                        src={user.profileImage} 
                                                                        alt={user.name} 
                                                                    />
                                                                ) : (
                                                                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                                        <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="ml-2 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="text-sm font-medium text-gray-900 truncate">
                                                                        {user.name || 'Unnamed User'}
                                                                    </div>
                                                                    {user.isAccountVerified && (
                                                                        <svg className="h-3 w-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                        </svg>
                                                                    )}
                                                                    {!user.isAccountVerified && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                            <ClockIcon className="h-3 w-3" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <div className="text-sm text-gray-500 truncate max-w-[200px]">{user.email}</div>
                                                    </td>
                                                    <td className="px-3 py-1.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user)}`}>
                                                            {getRoleIcon(user)}
                                                            <span className="ml-1">{getUserTypeDisplay(user)}</span>
                                                        </span>
                                                    </td>
                                                    <td className="hidden md:table-cell px-3 py-1.5 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500">
                                                            {formatDate(user.createdAt) === 'No date available' ? (
                                                                <span className="text-gray-400 italic">No date available</span>
                                                            ) : (
                                                                formatDate(user.createdAt)
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditUser(user);
                                                                }}
                                                                className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                                title="Edit user"
                                                            >
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteUser(user._id, user.name);
                                                                }}
                                                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                                title="Delete user"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls - Bottom Right */}
                                {totalPages > 1 && (
                                    <div className="mt-4 px-4 py-3 border-t border-gray-200 bg-gray-50">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                            <div className="text-sm text-gray-500">
                                                Showing <span className="font-medium">{((currentPage - 1) * 15) + 1}</span> to{' '}
                                                <span className="font-medium">{Math.min(currentPage * 15, totalUsers)}</span> of{' '}
                                                <span className="font-medium">{totalUsers}</span> users
                                            </div>
                                            <PaginationControls
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={handlePageChange}
                                                totalUsers={totalUsers}
                                                limit={15}
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
            
            {/* Add User Modal */}
            <AddUserModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                onUserAdded={handleUserCreated}
            />

            {/* Edit User Modal */}
            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                onUserUpdated={handleUserUpdated}
            />
        </div>
    )
}

export default UserManagement