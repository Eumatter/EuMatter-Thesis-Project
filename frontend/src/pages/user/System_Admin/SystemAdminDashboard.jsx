import React, { useContext, useState, useEffect } from 'react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';
import { AppContent } from '../../../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
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
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 sm:py-5 mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">System Administration</h1>
                        <p className="text-sm text-gray-600 mt-0.5">Manage users, roles, and system settings.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Users</p>
                                    <p className="text-xl sm:text-2xl font-bold text-[#800000]">{isLoading ? '—' : stats.totalUsers}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
                                    <p className="text-xl sm:text-2xl font-bold text-[#800000]">{isLoading ? '—' : stats.totalEvents}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending Events</p>
                                    <p className="text-xl sm:text-2xl font-bold text-[#800000]">{isLoading ? '—' : stats.pendingEvents}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Departments</p>
                                    <p className="text-xl sm:text-2xl font-bold text-[#800000]">{isLoading ? '—' : stats.totalDepartments}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Recent Users</h3>
                                <button
                                    type="button"
                                    onClick={() => navigate('/system-admin/users')}
                                    className="text-sm font-medium text-[#800000] hover:text-[#6b0000] rounded-xl px-3 py-1.5 hover:bg-gray-50 transition"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="py-8">
                                        <LoadingSpinner size="medium" text="Loading users..." />
                                    </div>
                                ) : recentUsers.length > 0 ? (
                                    recentUsers.map((user) => (
                                        <div key={user._id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {user.profileImage ? (
                                                    <img src={user.profileImage} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">IMG</div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                                                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <span className={`flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium ${user.role === 'User' ? 'bg-blue-50 text-blue-700' : user.role === 'CRD Staff' ? 'bg-emerald-50 text-emerald-700' : user.role === 'Department/Organization' ? 'bg-violet-50 text-violet-700' : user.role === 'System Administrator' ? 'bg-[#F5E6E8] text-[#800000]' : 'bg-gray-100 text-gray-700'}`}>
                                                {user.role}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm">No users found</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-[#800000] tracking-tight">Quick Actions</h3>
                            <p className="text-sm text-gray-600 mt-0.5 mb-4">Access key administrative functions.</p>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/system-admin/users')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 hover:border-gray-200 transition text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaUsers className="w-6 h-6 text-[#800000]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900">User Management</h4>
                                        <p className="text-sm text-gray-600">Manage accounts, roles, and permissions.</p>
                                    </div>
                                    <span className="text-sm font-medium text-[#800000]">View</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/system-admin/settings')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 hover:border-gray-200 transition text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaCogs className="w-6 h-6 text-[#800000]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900">System Settings</h4>
                                        <p className="text-sm text-gray-600">Configure preferences and maintenance.</p>
                                    </div>
                                    <span className="text-sm font-medium text-[#800000]">View</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/system-admin/reports')}
                                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/80 hover:border-gray-200 transition text-left"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaChartBar className="w-6 h-6 text-[#800000]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900">System Reports</h4>
                                        <p className="text-sm text-gray-600">Generate system-wide reports.</p>
                                    </div>
                                    <span className="text-sm font-medium text-[#800000]">View</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SystemAdminDashboard;