import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';
import axios from 'axios'
import { toast } from 'react-toastify'
import { PlusIcon, UserGroupIcon, UserIcon, AcademicCapIcon, BuildingOfficeIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
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

const UserManagement = () => {
    const { backendUrl } = useContext(AppContent)
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    
    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'student', label: 'Students' },
        { value: 'faculty', label: 'Faculty' },
        { value: 'department', label: 'Department Heads' },
        { value: 'crd', label: 'CRD Staff' },
        { value: 'organization', label: 'Organizations' },
        { value: 'alumni', label: 'Alumni' },
        { value: 'admin', label: 'Administrators' }
    ];
    
    const getRoleLabel = (role) => {
        const roleMap = {
            'student': 'Student',
            'faculty': 'Faculty',
            'department': 'Department Head',
            'crd': 'CRD Staff',
            'organization': 'Organization',
            'alumni': 'Alumni',
            'admin': 'Administrator'
        };
        return roleMap[role] || role;
    };
    
    const getRoleIcon = (role) => {
        switch(role) {
            case 'student':
                return <AcademicCapIcon className="h-5 w-5 text-blue-500" />;
            case 'faculty':
                return <UserIcon className="h-5 w-5 text-purple-500" />;
            case 'department':
                return <BuildingOfficeIcon className="h-5 w-5 text-green-500" />;
            case 'crd':
                return <ShieldCheckIcon className="h-5 w-5 text-yellow-500" />;
            case 'organization':
                return <BuildingOfficeIcon className="h-5 w-5 text-indigo-500" />;
            case 'alumni':
                return <UserGroupIcon className="h-5 w-5 text-gray-500" />;
            case 'admin':
                return <ShieldCheckIcon className="h-5 w-5 text-red-500" />;
            default:
                return <UserIcon className="h-5 w-5 text-gray-400" />;
        }
    };

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const { data } = await axios.get(`${backendUrl}api/admin/users`);

            if (data.success) {
                setUsers(data.users);
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
        fetchUsers();
    };
    
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        
        return matchesSearch && matchesRole;
    });
    
    const getRoleBadgeClass = (role) => {
        switch(role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'crd':
                return 'bg-yellow-100 text-yellow-800';
            case 'department':
                return 'bg-green-100 text-green-800';
            case 'faculty':
                return 'bg-purple-100 text-purple-800';
            case 'student':
                return 'bg-blue-100 text-blue-800';
            case 'organization':
                return 'bg-indigo-100 text-indigo-800';
            case 'alumni':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        // Validate inputs
        if (!userId) {
            toast.error('User ID is missing')
            return
        }

        if (!newRole) {
            toast.error('Role is missing')
            return
        }

        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.put(backendUrl + 'api/user/role', {
                userId,
                role: newRole
            })

            if (data.success) {
                toast.success('User role updated successfully')
                fetchUsers()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error('Failed to update user role')
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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="text-center sm:text-left">
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h1>
                                <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and monitor all user accounts in the system</p>
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
                        
                        {/* Filters */}
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="sm:col-span-2">
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">Search users</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        name="search"
                                        id="search"
                                        className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
                                        placeholder="Search by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                                <select
                                    id="role-filter"
                                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                >
                                    {roleOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <span className="text-sm text-gray-500">
                                    {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        {isLoading ? (
                            <div className="py-12">
                                <LoadingSpinner size="medium" text="Loading users..." />
                            </div>
                        ) : filteredUsers.length === 0 ? (
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
                            <ul className="divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <li key={user._id} className="hover:bg-gray-50 transition-colors">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                                    <div className="flex-shrink-0">
                                                        {user.profileImage ? (
                                                            <img 
                                                                className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover" 
                                                                src={user.profileImage} 
                                                                alt={user.name} 
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                                <UserIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                                                {user.name || 'Unnamed User'}
                                                            </p>
                                                            {user.isAccountVerified && (
                                                                <span className="flex-shrink-0">
                                                                    <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                                    </svg>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs sm:text-sm text-gray-500 truncate mt-1">{user.email}</p>
                                                        <div className="mt-2 sm:hidden">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                                                                {getRoleIcon(user.role)}
                                                                <span className="ml-1">{getRoleLabel(user.role)}</span>
                                                            </span>
                                                            <span className="ml-2 text-xs text-gray-500">
                                                                Joined {formatDate(user.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-3 sm:gap-0">
                                                    <div className="hidden sm:flex sm:flex-col sm:items-end">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                                                            {getRoleIcon(user.role)}
                                                            <span className="ml-1">{getRoleLabel(user.role)}</span>
                                                        </span>
                                                        <span className="mt-1 text-xs text-gray-500">
                                                            Joined {formatDate(user.createdAt)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-2 sm:items-end">
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                                                            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 rounded-md bg-white"
                                                        >
                                                            <option value="student">Student</option>
                                                            <option value="faculty">Faculty</option>
                                                            <option value="department">Department Head</option>
                                                            <option value="crd">CRD Staff</option>
                                                            <option value="organization">Organization</option>
                                                            <option value="alumni">Alumni</option>
                                                            <option value="admin">Administrator</option>
                                                        </select>
                                                        {!user.isAccountVerified && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 w-fit sm:w-auto">
                                                                <ClockIcon className="h-3 w-3 mr-1" />
                                                                Pending Verification
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
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
        </div>
    )
}

export default UserManagement