import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AppContent } from '../../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { getNotificationIconType } from '../../utils/notificationFormatter.js';
import { 
    FaBell, 
    FaCheck, 
    FaCheckCircle, 
    FaTrash, 
    FaFilter,
    FaTimes,
    FaCalendarAlt,
    FaHandHoldingHeart,
    FaUsers,
    FaExclamationCircle,
    FaCheckDouble,
    FaChevronRight,
    FaArrowLeft,
    FaSyncAlt,
    FaTimesCircle,
    FaClock,
    FaUserCheck,
    FaCreditCard,
    FaComment,
    FaThumbsUp
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
        const iconTypeName = getNotificationIconType(notificationType);
        
        const iconMap = {
            'FaCalendarAlt': FaCalendarAlt,
            'FaSyncAlt': FaSyncAlt,
            'FaTimesCircle': FaTimesCircle,
            'FaClock': FaClock,
            'FaUsers': FaUsers,
            'FaCheckCircle': FaCheckCircle,
            'FaUserCheck': FaUserCheck,
            'FaHandHoldingHeart': FaHandHoldingHeart,
            'FaCreditCard': FaCreditCard,
            'FaExclamationCircle': FaExclamationCircle,
            'FaComment': FaComment,
            'FaThumbsUp': FaThumbsUp,
            'FaBell': FaBell,
        };
        
        const IconComponent = iconMap[iconTypeName] || FaBell;
        return <IconComponent className="w-5 h-5 text-[#800000]" />;
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
        <div className="min-h-screen w-full overflow-x-hidden bg-white">
            <Header />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="w-5 h-5 text-[#800000]" />
                        </button>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold text-[#800000] mb-1">
                                Notifications
                            </h1>
                            <p className="text-gray-500 text-sm">
                                Stay updated with all your activities
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-white rounded-lg p-5 border border-gray-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Total</p>
                                    <p className="text-2xl font-bold text-[#800000]">{stats.total}</p>
                                </div>
                                <FaBell className="w-6 h-6 text-[#800000]" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-white rounded-lg p-5 border border-gray-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Unread</p>
                                    <p className="text-2xl font-bold text-[#800000]">{stats.unread}</p>
                                </div>
                                <FaExclamationCircle className="w-6 h-6 text-[#800000]" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-white rounded-lg p-5 border border-gray-200"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Read</p>
                                    <p className="text-2xl font-bold text-[#800000]">{stats.total - stats.unread}</p>
                                </div>
                                <FaCheckDouble className="w-6 h-6 text-[#800000]" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Filter and Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white rounded-lg p-4 border border-gray-200 mb-6">
                        <div className="flex items-center gap-3 flex-wrap">
                            <FaFilter className="w-4 h-4 text-[#800000]" />
                            <span className="text-sm font-medium text-gray-700">Filter:</span>
                            {['all', 'unread', 'read'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        filter === f
                                            ? 'bg-gradient-to-r from-[#800000] to-[#900000] text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handleMarkAllRead}
                            disabled={stats.unread === 0}
                            className="px-4 py-2 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:shadow-md"
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
                        className="text-center py-16 bg-white rounded-lg border border-gray-200"
                    >
                        <FaBell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-[#800000] mb-2">No notifications</h3>
                        <p className="text-sm text-gray-500">
                            {filter === 'all' 
                                ? "You're all caught up! No notifications yet."
                                : filter === 'unread'
                                ? "No unread notifications."
                                : "No read notifications."}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2, delay: index * 0.02 }}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`group relative bg-white rounded-lg p-4 border cursor-pointer transition-all duration-200 hover:shadow-md ${
                                        notification.unread 
                                            ? 'border-[#800000]/30 border-l-4 border-l-[#800000]' 
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon - No background */}
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notification)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className={`font-semibold text-base ${
                                                    notification.unread ? 'text-[#800000]' : 'text-gray-700'
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
                                                <span className="text-xs text-gray-400">
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
                                        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {notification.unread && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 text-[#800000] transition-colors"
                                                    title="Mark as read"
                                                >
                                                    <FaCheck className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDelete(notification.id, e)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
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
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header - White background with maroon text */}
                            <div className="bg-white p-6 border-b border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0">
                                            {getNotificationIcon(selectedNotification)}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-[#800000] mb-1">
                                                {selectedNotification.title || 'Notification'}
                                            </h2>
                                            <p className="text-sm text-gray-500">
                                                {formatTimeAgo(selectedNotification.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                                        aria-label="Close"
                                    >
                                        <FaTimes className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto flex-1">
                                <p className="text-gray-700 leading-relaxed text-base mb-6">
                                    {selectedNotification.message || 'No message content'}
                                </p>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
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
                                                    fetchNotifications();
                                                    navigate(`/user/events/${selectedNotification.payload.eventId}`);
                                                } catch (error) {
                                                    console.error('Error accepting invitation:', error);
                                                    toast.error(error.response?.data?.message || 'Failed to accept invitation');
                                                }
                                            }}
                                            className="flex-1 min-w-[150px] px-5 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <FaCheckCircle className="w-4 h-4" />
                                            Accept Invitation
                                        </button>
                                    )}
                                    {selectedNotification.payload?.eventId && selectedNotification.payload?.type !== 'volunteer_invitation' && (
                                        <button
                                            onClick={() => handleNavigateFromPayload(selectedNotification.payload)}
                                            className="flex-1 min-w-[150px] px-5 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                                        >
                                            <FaCalendarAlt className="w-4 h-4" />
                                            View Event
                                        </button>
                                    )}
                                    {selectedNotification.unread && (
                                        <button
                                            onClick={() => {
                                                handleMarkAsRead(selectedNotification.id, { stopPropagation: () => {} });
                                                setShowDetailModal(false);
                                            }}
                                            className="px-5 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg font-medium hover:shadow-md transition-all duration-200 flex items-center gap-2"
                                        >
                                            <FaCheck className="w-4 h-4" />
                                            Mark as Read
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            handleDelete(selectedNotification.id, { stopPropagation: () => {} });
                                            setShowDetailModal(false);
                                        }}
                                        className="px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                                    >
                                        <FaTrash className="w-4 h-4" />
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

