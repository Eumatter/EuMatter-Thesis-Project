import React, { useContext, useState, useEffect, Fragment } from 'react'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';
import axios from 'axios'
import { toast } from 'react-toastify'
import { PlusIcon, UserGroupIcon, UserIcon, AcademicCapIcon, BuildingOfficeIcon, ShieldCheckIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
            <div className="flex justify-between sm:hidden w-full gap-2">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-xl ${
                        currentPage === 1 ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Previous
                </button>
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-xl ${
                        currentPage === totalPages ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    Next
                </button>
            </div>
            <nav className="hidden sm:inline-flex relative z-0 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden" aria-label="Pagination">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center h-9 w-9 border-r border-gray-200 text-sm ${
                        currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-[#800000]'
                    }`}
                >
                    <span className="sr-only">Previous</span>
                    <ChevronLeftIcon className="h-4 w-4 mx-auto" aria-hidden="true" />
                </button>
                {getPageNumbers().map((page, index) => {
                    if (page === 'ellipsis') {
                        return (
                            <span key={`ellipsis-${index}`} className="inline-flex items-center h-9 px-2 text-xs text-gray-500">
                                ...
                            </span>
                        );
                    }
                    return (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            className={`inline-flex items-center justify-center h-9 w-9 text-sm font-medium ${
                                currentPage === page ? 'bg-[#800000] text-white' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {page}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`inline-flex items-center h-9 w-9 border-l border-gray-200 text-sm ${
                        currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50 hover:text-[#800000]'
                    }`}
                >
                    <span className="sr-only">Next</span>
                    <ChevronRightIcon className="h-4 w-4 mx-auto" aria-hidden="true" />
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
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
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
                                        Edit User Role
                                    </Dialog.Title>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="px-4 sm:px-6 py-4">
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-600"><span className="font-medium text-gray-700">Name:</span> {user.name || 'Unnamed User'}</p>
                                        <p className="text-sm text-gray-600 mt-0.5"><span className="font-medium text-gray-700">Email:</span> {user.email}</p>
                                    </div>
                                    <form onSubmit={handleSubmit}>
                                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-2">Role <span className="text-red-500">*</span></label>
                                        <select
                                            id="edit-role"
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
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
                                        <div className="flex justify-end gap-3 mt-5">
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                                                disabled={isLoading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-4 py-2 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Updating...' : 'Update Role'}
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
        if (user.role === 'User') {
            if (user.userType === 'MSEUF' && user.mseufCategory) {
                switch (user.mseufCategory) {
                    case 'Student': return 'bg-blue-50 text-blue-700';
                    case 'Faculty': return 'bg-violet-50 text-violet-700';
                    case 'Staff': return 'bg-amber-50 text-amber-700';
                    default: return 'bg-gray-100 text-gray-700';
                }
            }
            if (user.userType === 'Outsider') return 'bg-gray-100 text-gray-700';
            return 'bg-gray-100 text-gray-700';
        }
        switch (user.role) {
            case 'System Administrator': return 'bg-[#F5E6E8] text-[#800000]';
            case 'CRD Staff': return 'bg-amber-50 text-amber-700';
            case 'Department/Organization': return 'bg-emerald-50 text-emerald-700';
            case 'faculty': return 'bg-violet-50 text-violet-700';
            case 'student': return 'bg-blue-50 text-blue-700';
            case 'alumni': return 'bg-gray-100 text-gray-700';
            case 'User': return 'bg-gray-100 text-gray-700';
            case 'Auditor': return 'bg-indigo-50 text-indigo-700';
            default: return 'bg-gray-100 text-gray-700';
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
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">User Management</h1>
                                <p className="text-sm text-gray-600 mt-0.5">Manage and monitor all user accounts.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] transition w-full sm:w-auto"
                            >
                                <PlusIcon className="h-5 w-5" />
                                Add New User
                            </button>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <div className="flex-1">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                        <input
                                            type="text"
                                            id="search"
                                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                            placeholder="Search by name or email..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearchChange(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="sm:w-44">
                                    <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        id="role-filter"
                                        className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                        value={filterRole}
                                        onChange={(e) => handleRoleFilterChange(e.target.value)}
                                    >
                                        {roleOptions.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="py-12">
                                <LoadingSpinner size="medium" text="Loading users..." />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-300" />
                                <h3 className="mt-3 text-base font-semibold text-gray-900">No users found</h3>
                                <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
                                    {searchTerm || filterRole !== 'all' ? 'Try adjusting your search or filter.' : 'Get started by adding a new user.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(true)}
                                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#800000] rounded-xl hover:bg-[#6b0000] transition"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    Add User
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                                <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Joined</th>
                                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.map((user) => (
                                                <tr key={user._id} className="hover:bg-gray-50/50 transition">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                                                                {user.profileImage ? (
                                                                    <img className="h-full w-full object-cover" src={user.profileImage} alt={user.name} />
                                                                ) : (
                                                                    <div className="h-8 w-8 flex items-center justify-center">
                                                                        <UserIcon className="h-4 w-4 text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm font-medium text-gray-900 truncate">{user.name || 'Unnamed User'}</span>
                                                                    {user.isAccountVerified && (
                                                                        <svg className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                                    )}
                                                                    {!user.isAccountVerified && (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700"><ClockIcon className="h-3 w-3" /></span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">{user.email}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getRoleBadgeClass(user)}`}>
                                                            {getRoleIcon(user)}
                                                            {getUserTypeDisplay(user)}
                                                        </span>
                                                    </td>
                                                    <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                        {formatDate(user.createdAt) === 'No date available' ? <span className="text-gray-400">—</span> : formatDate(user.createdAt)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditUser(user)}
                                                                className="inline-flex items-center justify-center w-8 h-8 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition"
                                                                title="Edit user"
                                                            >
                                                                <PencilIcon className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteUser(user._id, user.name)}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-white bg-red-600 hover:bg-red-700 transition"
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
                                {totalPages > 1 && (
                                    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <p className="text-sm text-gray-500">
                                            Showing <span className="font-medium text-gray-700">{((currentPage - 1) * 15) + 1}</span>–<span className="font-medium text-gray-700">{Math.min(currentPage * 15, totalUsers)}</span> of <span className="font-medium text-gray-700">{totalUsers}</span> users
                                        </p>
                                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} totalUsers={totalUsers} limit={15} />
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