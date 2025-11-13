import React, { useContext, useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Button from '../../../components/Button';
import LoadingSpinner from '../../../components/LoadingSpinner';
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';
import { AppContent } from '../../../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaCogs, FaChartBar } from 'react-icons/fa';

const SystemAdminDashboard = () => {
    const navigate = useNavigate();
    const { backendUrl, userData } = useContext(AppContent);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalEvents: 0,
        pendingEvents: 0,
        totalDepartments: 0,
    });
    const [recentUsers, setRecentUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;

            const usersResponse = await axios.get(backendUrl + 'api/user/');
            const eventsResponse = await axios.get(backendUrl + 'api/events/');

            if (usersResponse.data.success) {
                const users = usersResponse.data.users;
                setStats((prev) => ({
                    ...prev,
                    totalUsers: users.length,
                    totalDepartments: users.filter((user) => user.role === 'Department/Organization').length,
                }));
                setRecentUsers(users.slice(0, 5));
            }

            if (eventsResponse.data.success) {
                const events = eventsResponse.data.events;
                setStats((prev) => ({
                    ...prev,
                    totalEvents: events.length,
                    pendingEvents: events.filter((event) => event.status === 'pending').length,
                }));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUserRoleUpdate = async (userId, newRole) => {
        try {
            axios.defaults.withCredentials = true;
            const { data } = await axios.put(backendUrl + 'api/user/role', {
                userId,
                role: newRole,
            });

            if (data.success) {
                toast.success('User role updated successfully');
                fetchDashboardData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update user role');
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* <Header /> */}
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
                
                <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                    {/* Page Header */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-300 hover:shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-2">System Administration</h1>
                                <p className="text-sm sm:text-base text-gray-600">Manage users, roles, and system settings.</p>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Cards - 4 Columns on Mobile/Tablet */}
                    <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-6 sm:mb-8">
                        {/* Total Users Card */}
                        <div className="bg-gradient-to-br from-white to-[#800000]/5 rounded-xl shadow-md hover:shadow-xl p-3 sm:p-4 md:p-5 lg:p-6 transform transition-all duration-300 hover:scale-105 active:scale-[0.98] touch-manipulation border border-[#800000]/20">
                            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0" />
                                    </svg>
                                </div>
                                <div className="w-full">
                                    <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 truncate">Total Users</p>
                                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">{isLoading ? '...' : stats.totalUsers}</p>
                                </div>
                            </div>
                        </div>

                        {/* Total Events Card */}
                        <div className="bg-gradient-to-br from-white to-[#800000]/5 rounded-xl shadow-md hover:shadow-xl p-3 sm:p-4 md:p-5 lg:p-6 transform transition-all duration-300 hover:scale-105 active:scale-[0.98] touch-manipulation border border-[#800000]/20">
                            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="w-full">
                                    <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 truncate">Total Events</p>
                                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">{isLoading ? '...' : stats.totalEvents}</p>
                                </div>
                            </div>
                        </div>

                        {/* Pending Events Card */}
                        <div className="bg-gradient-to-br from-white to-[#800000]/5 rounded-xl shadow-md hover:shadow-xl p-3 sm:p-4 md:p-5 lg:p-6 transform transition-all duration-300 hover:scale-105 active:scale-[0.98] touch-manipulation border border-[#800000]/20">
                            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="w-full">
                                    <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 truncate">Pending Events</p>
                                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">{isLoading ? '...' : stats.pendingEvents}</p>
                                </div>
                            </div>
                        </div>

                        {/* Departments Card */}
                        <div className="bg-gradient-to-br from-white to-[#800000]/5 rounded-xl shadow-md hover:shadow-xl p-3 sm:p-4 md:p-5 lg:p-6 transform transition-all duration-300 hover:scale-105 active:scale-[0.98] touch-manipulation border border-[#800000]/20">
                            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div className="w-full">
                                    <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 mb-1 truncate">Departments</p>
                                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">{isLoading ? '...' : stats.totalDepartments}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Recent Users */}
                        <div className="bg-white rounded-xl shadow-md p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-black">Recent Users</h3>
                                <Button
                                    variant="ghostDark"
                                    size="sm"
                                    onClick={() => navigate('/system-admin/users')}
                                >
                                    View All
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {isLoading ? (
                                    <div className="py-8">
                                        <LoadingSpinner size="medium" text="Loading users..." />
                                    </div>
                                ) : recentUsers.length > 0 ? (
                                    recentUsers.map((user) => (
                                        <div key={user._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-100">
                                            <div className="flex items-center space-x-3 min-w-0">
                                                {user.profileImage ? (
                                                    <img
                                                        src={user.profileImage}
                                                        alt={user.name}
                                                        className="w-10 h-10 rounded-full object-cover border-2 border-red-900"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-red-900 text-gray-500 text-xs">IMG</div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium text-black truncate max-w-[220px] sm:max-w-none">{user.name}</p>
                                                    <p className="text-sm text-gray-600 truncate max-w-[240px] sm:max-w-none">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'User' ? 'bg-blue-100 text-blue-800' :
                                                    user.role === 'CRD Staff' ? 'bg-green-100 text-green-800' :
                                                        user.role === 'Department/Organization' ? 'bg-purple-100 text-purple-800' :
                                                            user.role === 'System Administrator' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-gray-600">No users found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 transform transition-all duration-300 hover:shadow-xl">
                            {/* Header Section */}
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 sm:mb-6">
                                <div>
                                    <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#800000] leading-tight">Quick Actions</h3>
                                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Access key administrative functions</p>
                                </div>
                            </div>
                            
                            {/* Actions List - Minimal vertical layout */}
                            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                                {/* User Management - Maroon Theme */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/system-admin/users')}
                                    className="group relative bg-gradient-to-br from-white via-[#800000]/5 to-[#800000]/10 rounded-xl p-4 sm:p-5 border border-[#800000]/15 hover:border-[#800000]/40 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-lg flex items-center gap-4"
                                >
                                    {/* Decorative Background Elements */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#800000]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:bg-[#800000]/10 transition-all duration-500"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#800000]/5 rounded-full -ml-8 -mb-8 group-hover:scale-125 transition-all duration-500"></div>
                                    
                                    <div className="relative z-10 flex items-center gap-4 flex-1">
                                        {/* Icon Section */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300">
                                            <FaUsers className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                        </div>
                                        
                                        {/* Content Section */}
                                        <div className="space-y-1 flex-1">
                                            <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-[#800000] transition-colors duration-200">
                                                User Management
                                            </h4>
                                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                                Manage user accounts, roles, and permissions.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="relative z-10">
                                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#800000] to-[#EE1212] text-white text-xs sm:text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                                            View Details
                                        </button>
                                    </div>
                                </motion.div>

                                {/* System Settings - Maroon Theme */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/system-admin/settings')}
                                    className="group relative bg-gradient-to-br from-white via-[#800000]/5 to-[#800000]/10 rounded-xl p-4 sm:p-5 border border-[#800000]/15 hover:border-[#800000]/40 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-lg flex items-center gap-4"
                                >
                                    {/* Decorative Background Elements */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#800000]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:bg-[#800000]/10 transition-all duration-500"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#800000]/5 rounded-full -ml-8 -mb-8 group-hover:scale-125 transition-all duration-500"></div>
                                    
                                    <div className="relative z-10 flex items-center gap-4 flex-1">
                                        {/* Icon Section */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300">
                                            <FaCogs className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                        </div>
                                        
                                        {/* Content Section */}
                                        <div className="space-y-1 flex-1">
                                            <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-[#800000] transition-colors duration-200">
                                                System Settings
                                            </h4>
                                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                                Configure system preferences and maintenance.
                                            </p>
                                        </div>

                                    </div>

                                    {/* Action Button */}
                                    <div className="relative z-10">
                                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#800000] to-[#EE1212] text-white text-xs sm:text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                                            View Details
                                        </button>
                                    </div>
                                </motion.div>

                                {/* System Reports - Maroon Theme */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                        onClick={() => navigate('/system-admin/reports')}
                                    className="group relative bg-gradient-to-br from-white via-[#800000]/5 to-[#800000]/10 rounded-xl p-4 sm:p-5 border border-[#800000]/15 hover:border-[#800000]/40 transition-all duration-300 cursor-pointer overflow-hidden shadow-sm hover:shadow-lg flex items-center gap-4"
                                >
                                    {/* Decorative Background Elements */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#800000]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 group-hover:bg-[#800000]/10 transition-all duration-500"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#800000]/5 rounded-full -ml-8 -mb-8 group-hover:scale-125 transition-all duration-500"></div>
                                    
                                    <div className="relative z-10 flex items-center gap-4 flex-1">
                                        {/* Icon Section */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-[1.02] transition-all duration-300">
                                            <FaChartBar className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                        </div>
                                        
                                        {/* Content Section */}
                                        <div className="space-y-1 flex-1">
                                            <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-[#800000] transition-colors duration-200">
                                                System Reports
                                            </h4>
                                            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                                                Generate comprehensive system-wide reports.
                                            </p>
                                        </div>

                                    </div>

                                    {/* Action Button */}
                                    <div className="relative z-10">
                                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#800000] to-[#EE1212] text-white text-xs sm:text-sm font-semibold rounded-full shadow-md hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02]">
                                            View Details
                                        </button>
                                </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            {/* <Footer /> */}
        </div>
    );
};

export default SystemAdminDashboard;