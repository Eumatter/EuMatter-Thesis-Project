import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import LoadingSpinner from '../../components/LoadingSpinner';
import { AppContent } from '../../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import NotificationIcon from '../../components/NotificationIcon.jsx';
import {
    FaBell,
    FaCheck,
    FaCheckCircle,
    FaTrash,
    FaFilter,
    FaTimes,
    FaCalendarAlt,
    FaChevronRight,
    FaArrowLeft,
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
            // Handle connection errors gracefully
            if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
                // Backend is not running - silently handle this
                if (process.env.NODE_ENV === 'development') {
                    console.warn('Backend server is not running. Notifications cannot be loaded.');
                }
                // Don't show error toast for connection errors
            } else {
                // Log other errors and show toast
                console.error('Error fetching notifications:', error);
                toast.error('Failed to load notifications');
            }
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

    const handleMarkAsRead = async (notificationId, e, silent = false) => {
        if (e && e.stopPropagation) e.stopPropagation();
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
            
            if (!silent) toast.success('Notification marked as read');
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
        // Auto mark as read when opening (no toast)
        if (notification.unread) {
            await handleMarkAsRead(notification.id, { stopPropagation: () => {} }, true);
        }
    };

    const getNotificationType = (notification) => notification.payload?.type || 'system';

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
        <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header Section - same style as Reports, Dashboard, Events, etc. */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                                aria-label="Go back"
                            >
                                <FaArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Notifications</h1>
                                <p className="text-gray-600 text-base sm:text-lg">Your activity updates</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    {/* Filter + Mark all read */}
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 flex-wrap">
                            <FaFilter className="w-4 h-4 text-gray-500" />
                            {['all', 'unread', 'read'].map((f) => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        filter === f
                                            ? 'bg-[#800000] text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={stats.unread === 0}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <FaCheck className="w-4 h-4" />
                            Mark all read
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <LoadingSpinner size="large" text="Loading notifications..." />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <FaBell className="w-7 h-7 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No notifications</h3>
                        <p className="text-sm text-gray-500">
                            {filter === 'all' ? "You're all caught up." : filter === 'unread' ? "No unread." : "No read."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {filteredNotifications.map((notification, index) => {
                                const notifType = getNotificationType(notification);
                                const isUnread = notification.unread;
                                return (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`group flex items-start gap-3 rounded-xl p-4 border cursor-pointer transition-colors hover:bg-gray-50 ${
                                            isUnread ? 'bg-[#800000]/5 border-[#800000]/20' : 'bg-white border-gray-200'
                                        }`}
                                    >
                                        <NotificationIcon type={notifType} size="lg" />
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="min-h-[4.25rem]">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className={`text-sm min-w-0 flex-1 ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                        {notification.title || 'Notification'}
                                                    </h3>
                                                </div>
                                                <p className={`text-sm line-clamp-2 mt-0.5 ${isUnread ? 'font-medium text-gray-700' : 'font-normal text-gray-500'}`}>
                                                    {notification.message || 'No message'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between mt-2 gap-3 min-h-[1.25rem] flex-shrink-0">
                                                <span className="text-xs text-gray-500 flex-shrink-0">{formatTimeAgo(notification.createdAt)}</span>
                                                <span className={`text-xs font-semibold flex items-center gap-0.5 shrink-0 min-w-[5rem] w-20 justify-end text-right text-[#800000] ${!notification.payload?.eventId ? 'invisible' : ''}`} aria-hidden={!notification.payload?.eventId}>
                                                    View event <FaChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-20 flex-shrink-0 justify-end">
                                            {isUnread && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
                                                    title="Mark as read"
                                                >
                                                    <FaCheck className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(notification.id, e)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                                                title="Delete"
                                            >
                                                <FaTrash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            {/* Detail modal — blur backdrop, minimalist; open = auto read; Delete bottom-right only */}
            <AnimatePresence>
                {showDetailModal && selectedNotification && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
                        onClick={() => setShowDetailModal(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="notification-modal-title"
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl border border-gray-200 max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-gray-100">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                        <NotificationIcon type={getNotificationType(selectedNotification)} size="md" className="text-gray-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 id="notification-modal-title" className="text-base font-semibold text-gray-900 truncate">
                                            {selectedNotification.title || 'Notification'}
                                        </h2>
                                        <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(selectedNotification.createdAt)}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDetailModal(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                                    aria-label="Close"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0">
                                <p className="text-sm text-gray-700 leading-relaxed">{selectedNotification.message || 'No message content'}</p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {selectedNotification.payload?.type === 'volunteer_invitation' && selectedNotification.payload?.eventId && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    axios.defaults.withCredentials = true;
                                                    const response = await axios.post(
                                                        `${backendUrl}api/volunteers/event/${selectedNotification.payload.eventId}/accept-invitation`,
                                                        {},
                                                        { withCredentials: true }
                                                    );
                                                    toast.success(response.data.message || 'Invitation accepted');
                                                    setShowDetailModal(false);
                                                    fetchNotifications();
                                                    navigate(`/user/events/${selectedNotification.payload.eventId}`);
                                                } catch (error) {
                                                    console.error('Error accepting invitation:', error);
                                                    toast.error(error.response?.data?.message || 'Failed to accept');
                                                }
                                            }}
                                            className="px-3 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] transition-colors flex items-center gap-2"
                                        >
                                            <FaCheckCircle className="w-4 h-4" /> Accept
                                        </button>
                                    )}
                                    {selectedNotification.payload?.eventId && selectedNotification.payload?.type !== 'volunteer_invitation' && (
                                        <button
                                            type="button"
                                            onClick={() => handleNavigateFromPayload(selectedNotification.payload)}
                                            className="px-3 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] transition-colors flex items-center gap-2"
                                        >
                                            <FaCalendarAlt className="w-4 h-4" /> View event
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end p-4 sm:p-5 pt-0 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => { handleDelete(selectedNotification.id, { stopPropagation: () => {} }); setShowDetailModal(false); }}
                                    className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors flex items-center gap-2"
                                >
                                    <FaTrash className="w-4 h-4" /> Delete
                                </button>
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

