import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AppContent } from '../../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { formatNotificationPayload, getNotificationIcon as getNotificationIconFromUtil, getNotificationColorClass } from '../../utils/notificationFormatter.js';
import { 
    FaBell, 
    FaCheck, 
    FaCheckCircle, 
    FaTrash, 
    FaFilter,
    FaTimes,
    FaEye,
    FaCalendarAlt,
    FaHandHoldingHeart,
    FaUsers,
    FaFileAlt,
    FaExclamationCircle,
    FaInfoCircle,
    FaCheckDouble,
    FaChevronRight,
    FaArrowLeft
} from 'react-icons/fa';

const Notifications = () => {
    const navigate = useNavigate();
    const { backendUrl, isLoggedIn } = useContext(AppContent);
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, read
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [stats, setStats] = useState({ total: 0, unread: 0 });

    useEffect(() => {
        if (!isLoggedIn) {
            navigate('/login');
            return;
        }
        fetchNotifications();
    }, [isLoggedIn]);

    useEffect(() => {
        filterNotifications();
    }, [notifications, filter]);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const response = await axios.get(backendUrl + 'api/notifications?paginated=true&limit=100');
            
            if (response.data) {
                let fetchedNotifications = [];
                if (Array.isArray(response.data)) {
                    // Backward compatibility
                    fetchedNotifications = response.data;
                } else {
                    fetchedNotifications = response.data.notifications || [];
                }
                
                // Remove duplicates based on notification ID
                const uniqueNotifications = fetchedNotifications.filter((n, index, self) =>
                    index === self.findIndex((t) => (t.id || t._id) === (n.id || n._id))
                );
                
                setNotifications(uniqueNotifications);
                setStats({
                    total: uniqueNotifications.length,
                    unread: uniqueNotifications.filter(n => n.unread || n.read === false).length
                });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const filterNotifications = () => {
        let filtered = [...notifications];
        
        if (filter === 'unread') {
            filtered = filtered.filter(n => n.unread);
        } else if (filter === 'read') {
            filtered = filtered.filter(n => !n.unread);
        }
        
        setFilteredNotifications(filtered);
    };

    const handleMarkAsRead = async (notificationId, e) => {
        e.stopPropagation();
        try {
            axios.defaults.withCredentials = true;
            await axios.post(backendUrl + `api/notifications/${notificationId}/read`);
            
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, unread: false, read: true } : n
            ));
            
            setStats(prev => ({
                ...prev,
                unread: Math.max(0, prev.unread - 1)
            }));
            
            toast.success('Notification marked as read');
        } catch (error) {
            console.error('Error marking as read:', error);
            toast.error('Failed to mark as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            axios.defaults.withCredentials = true;
            await axios.post(backendUrl + 'api/notifications/mark-all-read');
            
            setNotifications(prev => prev.map(n => ({ ...n, unread: false, read: true })));
            setStats(prev => ({ ...prev, unread: 0 }));
            
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (notificationId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this notification?')) return;
        
        try {
            axios.defaults.withCredentials = true;
            await axios.delete(backendUrl + `api/notifications/${notificationId}`);
            
            const deleted = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            
            setStats(prev => ({
                total: prev.total - 1,
                unread: deleted?.unread ? Math.max(0, prev.unread - 1) : prev.unread
            }));
            
            toast.success('Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    const handleNotificationClick = async (notification) => {
        setSelectedNotification(notification);
        setShowDetailModal(true);
        
        // Mark as read if unread
        if (notification.unread) {
            await handleMarkAsRead(notification.id, { stopPropagation: () => {} });
        }
    };

    const getNotificationIcon = (notification) => {
        const notificationType = notification.payload?.type || 'system';
        const icon = getNotificationIconFromUtil(notificationType);
        return <span className="text-2xl">{icon}</span>;
    };

    const getNotificationColor = (notification) => {
        const notificationType = notification.payload?.type || 'system';
        return getNotificationColorClass(notificationType);
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const handleNavigateFromPayload = (payload) => {
        if (!payload) return;
        
        if (payload.eventId) {
            navigate(`/user/events/${payload.eventId}`);
            setShowDetailModal(false);
        } else if (payload.donationId) {
            navigate('/user/donations');
            setShowDetailModal(false);
        }
    };

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-gray-50 to-white">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-8 sm:py-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <FaArrowLeft className="w-5 h-5 text-gray-700" />
                            </button>
                            <div>
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#800000] mb-2">
                                    Notifications
                                </h1>
                                <p className="text-gray-600">
                                    Stay updated with all your activities and interactions
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="bg-white rounded-xl p-5 shadow-lg border-2 border-[#800000]/10 hover:border-[#800000]/20 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
                                    <p className="text-3xl font-bold text-[#800000]">{stats.total}</p>
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center shadow-md">
                                    <FaBell className="w-7 h-7 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="bg-white rounded-xl p-5 shadow-lg border-2 border-[#D4AF37]/20 hover:border-[#D4AF37]/30 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Unread</p>
                                    <p className="text-3xl font-bold text-[#D4AF37]">{stats.unread}</p>
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-[#D4AF37] to-[#C9A227] rounded-xl flex items-center justify-center shadow-md">
                                    <FaExclamationCircle className="w-7 h-7 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="bg-white rounded-xl p-5 shadow-lg border-2 border-gray-200 hover:border-gray-300 transition-all duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Read</p>
                                    <p className="text-3xl font-bold text-gray-700">{stats.total - stats.unread}</p>
                                </div>
                                <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                                    <FaCheckDouble className="w-7 h-7 text-white" />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Filter and Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white rounded-xl p-5 shadow-lg border-2 border-[#800000]/10">
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#800000] to-[#900000] rounded-lg flex items-center justify-center">
                                <FaFilter className="text-white w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Filter:</span>
                            {['all', 'unread', 'read'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                                        filter === f
                                            ? 'bg-gradient-to-r from-[#800000] to-[#900000] text-white shadow-lg transform scale-105'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleMarkAllRead}
                            disabled={stats.unread === 0}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] hover:from-[#C9A227] hover:to-[#B8941F] text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 disabled:hover:shadow-md"
                        >
                            <FaCheckDouble />
                            Mark All Read
                        </button>
                    </div>
                </motion.div>

                {/* Notifications List */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <LoadingSpinner size="large" text="Loading notifications..." />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 bg-white rounded-xl shadow-lg border border-gray-100"
                    >
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaBell className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No notifications</h3>
                        <p className="text-gray-600">
                            {filter === 'all' 
                                ? "You're all caught up! No notifications yet."
                                : filter === 'unread'
                                ? "No unread notifications."
                                : "No read notifications."}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`group relative bg-white rounded-xl p-5 shadow-lg border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                                        notification.unread 
                                            ? 'border-[#800000]/40 bg-gradient-to-r from-[#800000]/8 via-[#D4AF37]/5 to-transparent' 
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getNotificationColor(notification)} flex items-center justify-center text-white shadow-lg`}>
                                            {getNotificationIcon(notification)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className={`font-bold text-base ${
                                                    notification.unread ? 'text-gray-900' : 'text-gray-700'
                                                }`}>
                                                    {notification.title || 'Notification'}
                                                </h3>
                                                {notification.unread && (
                                                    <span className="flex-shrink-0 w-2 h-2 bg-[#800000] rounded-full mt-2"></span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                {notification.message || 'No message'}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">
                                                    {formatTimeAgo(notification.createdAt)}
                                                </span>
                                                {notification.payload?.eventId && (
                                                    <span className="text-xs text-[#800000] font-medium flex items-center gap-1">
                                                        View Event
                                                        <FaChevronRight className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {notification.unread && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                    className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <FaCheck className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(notification.id, e)}
                                                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                                                title="Delete"
                                            >
                                                <FaTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Notification Detail Modal */}
            <AnimatePresence>
                {showDetailModal && selectedNotification && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowDetailModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                        >
                            <div className={`p-6 bg-gradient-to-br ${getNotificationColor(selectedNotification)} text-white shadow-lg`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                            {getNotificationIcon(selectedNotification)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold mb-1">
                                                {selectedNotification.title || 'Notification'}
                                            </h2>
                                            <p className="text-white/90 text-sm">
                                                {formatTimeAgo(selectedNotification.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        <FaTimes className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                                <div className="mb-6">
                                    <p className="text-gray-900 leading-relaxed text-base">
                                        {selectedNotification.message || 'No message content'}
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-4 border-t">
                                    {selectedNotification.payload?.type === 'volunteer_invitation' && selectedNotification.payload?.eventId && (
                                        <button
                                            onClick={async () => {
                                                try {
                                                    axios.defaults.withCredentials = true;
                                                    const response = await axios.post(
                                                        `${backendUrl}api/volunteers/event/${selectedNotification.payload.eventId}/accept-invitation`,
                                                        {},
                                                        { withCredentials: true }
                                                    );
                                                    toast.success(response.data.message || 'Invitation accepted successfully');
                                                    handleMarkAsRead(selectedNotification.id, { stopPropagation: () => {} });
                                                    setShowDetailModal(false);
                                                    fetchNotifications(); // Refresh notifications
                                                    // Navigate to event details
                                                    navigate(`/user/events/${selectedNotification.payload.eventId}`);
                                                } catch (error) {
                                                    console.error('Error accepting invitation:', error);
                                                    toast.error(error.response?.data?.message || 'Failed to accept invitation');
                                                }
                                            }}
                                            className="flex-1 px-5 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            <FaCheckCircle />
                                            Accept Invitation
                                        </button>
                                    )}
                                    {selectedNotification.payload?.eventId && selectedNotification.payload?.type !== 'volunteer_invitation' && (
                                        <button
                                            onClick={() => handleNavigateFromPayload(selectedNotification.payload)}
                                            className="flex-1 px-5 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                                        >
                                            <FaCalendarAlt />
                                            View Event
                                        </button>
                                    )}
                                    {selectedNotification.unread && (
                                        <button
                                            onClick={() => {
                                                handleMarkAsRead(selectedNotification.id, { stopPropagation: () => {} });
                                                setShowDetailModal(false);
                                            }}
                                            className="px-5 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C9A227] hover:from-[#C9A227] hover:to-[#B8941F] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                                        >
                                            <FaCheck />
                                            Mark as Read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            handleDelete(selectedNotification.id, { stopPropagation: () => {} });
                                            setShowDetailModal(false);
                                        }}
                                        className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                                    >
                                        <FaTrash />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default Notifications;

