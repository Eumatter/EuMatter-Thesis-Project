import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { AppContent } from '../../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
    FaArrowLeft,
    FaClock,
    FaUsers,
    FaStar,
    FaChartLine,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaFilter,
    FaDownload,
    FaCheckCircle,
    FaTimesCircle,
    FaUser,
    FaComments
} from 'react-icons/fa';

const EventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { backendUrl } = useContext(AppContent);
    
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [period, setPeriod] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [activeView, setActiveView] = useState('overview'); // 'overview', 'hours', 'feedback'

    const fetchAnalytics = useCallback(async (isInitialLoad = false, periodOverride = null, startDateOverride = null, endDateOverride = null) => {
        try {
            // Use full loading only for initial load, subtle loading for filters
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setFilterLoading(true);
            }

            const currentPeriod = periodOverride !== null ? periodOverride : period;
            const currentStartDate = startDateOverride !== null ? startDateOverride : customStartDate;
            const currentEndDate = endDateOverride !== null ? endDateOverride : customEndDate;

            const token = localStorage.getItem('token');
            let url = `${backendUrl}api/events/${eventId}/analytics?period=${currentPeriod}`;
            
            if (currentPeriod === 'custom' && currentStartDate && currentEndDate) {
                url += `&startDate=${currentStartDate}&endDate=${currentEndDate}`;
            } else if (currentPeriod === 'custom') {
                // Don't fetch if custom period but dates not ready
                setFilterLoading(false);
                return;
            }

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });

            if (response.data.success) {
                setAnalytics(response.data);
            } else {
                toast.error('Failed to load analytics');
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error(error.response?.data?.message || 'Failed to load event analytics');
        } finally {
            if (isInitialLoad) {
                setLoading(false);
            } else {
                setFilterLoading(false);
            }
        }
    }, [eventId, backendUrl, period, customStartDate, customEndDate]);

    // Initial load
    useEffect(() => {
        fetchAnalytics(true);
    }, [eventId, fetchAnalytics]);

    // Filter changes - only fetch if custom period has both dates
    useEffect(() => {
        if (period === 'custom') {
            // Only fetch if both dates are provided
            if (customStartDate && customEndDate) {
                fetchAnalytics(false);
            }
        } else {
            // For non-custom periods, fetch immediately
            fetchAnalytics(false);
        }
    }, [period, customStartDate, customEndDate, fetchAnalytics]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        return timeString;
    };

    const getRatingColor = (rating) => {
        if (rating >= 4.5) return 'text-green-600';
        if (rating >= 3.5) return 'text-yellow-600';
        if (rating >= 2.5) return 'text-orange-600';
        return 'text-red-600';
    };

    const getSatisfactionColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        if (score >= 40) return 'text-orange-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-white">
                <Header />
                <div className="flex-1 flex justify-center items-center py-20">
                    <LoadingSpinner size="large" text="Loading event analytics..." />
                </div>
                <Footer />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-white">
                <Header />
                <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                    <div className="text-center py-20">
                        <p className="text-gray-600">Failed to load analytics</p>
                        <button
                            onClick={() => navigate('/department/events')}
                            className="mt-4 px-4 py-2 bg-[#800000] text-white rounded-lg hover:opacity-90"
                        >
                            Back to Events
                        </button>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-white">
            <Header />

            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => navigate('/department/events')}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#800000] mb-4 transition-colors"
                    >
                        <FaArrowLeft className="w-4 h-4" />
                        <span>Back to Events</span>
                    </button>

                    <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6 mb-6">
                        <h1 className="text-3xl font-bold text-[#800000] mb-2">{analytics.event.title}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <FaCalendarAlt className="w-4 h-4" />
                                <span>{formatDate(analytics.event.startDate)} - {formatDate(analytics.event.endDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <FaMapMarkerAlt className="w-4 h-4" />
                                <span>{analytics.event.location || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    analytics.event.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                    analytics.event.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                    analytics.event.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {analytics.event.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Period Filter */}
                    <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-4 mb-6 relative">
                        {filterLoading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                                <div className="flex items-center gap-2 text-[#800000]">
                                    <div className="w-5 h-5 border-2 border-[#800000] border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-sm font-medium">Updating...</span>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <FaFilter className="text-[#800000]" />
                                <span className="font-semibold text-gray-700">Time Period:</span>
                            </div>
                            {['all', 'week', 'month', 'year', 'custom'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    disabled={filterLoading}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                        period === p
                                            ? 'bg-gradient-to-r from-[#800000] to-[#900000] text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                            {period === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        disabled={filterLoading}
                                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                                    />
                                    <span>to</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        disabled={filterLoading}
                                        className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* View Tabs */}
                <div className="flex gap-2 mb-6 border-b border-gray-200">
                    {['overview', 'hours', 'feedback'].map((view) => (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={`px-6 py-3 font-semibold transition-all border-b-2 ${
                                activeView === view
                                    ? 'border-[#800000] text-[#800000]'
                                    : 'border-transparent text-gray-600 hover:text-[#800000]'
                            }`}
                        >
                            {view.charAt(0).toUpperCase() + view.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeView === 'overview' && (
                    <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#800000] to-[#900000] rounded-lg flex items-center justify-center">
                                        <FaClock className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Volunteer Hours</h3>
                                <p className="text-3xl font-bold text-[#800000]">{analytics.volunteerHours.total.toFixed(1)}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {analytics.volunteerHours.totalVoided > 0 && (
                                        <span className="text-red-600">{analytics.volunteerHours.totalVoided.toFixed(1)} voided</span>
                                    )}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white rounded-xl shadow-lg border-2 border-[#D4AF37]/20 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#C9A227] rounded-lg flex items-center justify-center">
                                        <FaUsers className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Total Volunteers</h3>
                                <p className="text-3xl font-bold text-[#D4AF37]">{analytics.volunteerHours.totalVolunteers}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Avg: {analytics.volunteerHours.averageHoursPerVolunteer.toFixed(1)} hrs/volunteer
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-xl shadow-lg border-2 border-green-500/20 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                                        <FaStar className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Average Rating</h3>
                                <p className={`text-3xl font-bold ${getRatingColor(analytics.feedback.averageRating)}`}>
                                    {analytics.feedback.averageRating.toFixed(1)}/5.0
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {analytics.feedback.totalResponses} responses
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-xl shadow-lg border-2 border-blue-500/20 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                        <FaChartLine className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <h3 className="text-sm font-medium text-gray-600 mb-1">Satisfaction Score</h3>
                                <p className={`text-3xl font-bold ${getSatisfactionColor(analytics.feedback.satisfactionScore)}`}>
                                    {analytics.feedback.satisfactionScore.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {analytics.feedback.feedbackResponseRate.toFixed(1)}% response rate
                                </p>
                            </motion.div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Volunteers */}
                            <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FaUsers className="text-[#800000]" />
                                    Top Volunteers by Hours
                                </h3>
                                <div className="space-y-3">
                                    {analytics.volunteerHours.byUser.slice(0, 5).map((user, idx) => (
                                        <div key={user.volunteerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center text-white font-semibold">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{user.volunteerName}</p>
                                                    <p className="text-xs text-gray-500">{user.volunteerEmail}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-[#800000]">{user.totalHours.toFixed(1)} hrs</p>
                                                <p className="text-xs text-gray-500">{user.records.length} records</p>
                                            </div>
                                        </div>
                                    ))}
                                    {analytics.volunteerHours.byUser.length === 0 && (
                                        <p className="text-gray-500 text-center py-4">No volunteer hours recorded</p>
                                    )}
                                </div>
                            </div>

                            {/* Rating Distribution */}
                            <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <FaStar className="text-[#D4AF37]" />
                                    Rating Distribution
                                </h3>
                                <div className="space-y-3">
                                    {[5, 4, 3, 2, 1].map((rating) => {
                                        const count = analytics.feedback.ratingDistribution[rating] || 0;
                                        const total = analytics.feedback.totalResponses;
                                        const percentage = total > 0 ? (count / total) * 100 : 0;
                                        return (
                                            <div key={rating} className="flex items-center gap-3">
                                                <div className="w-12 text-right">
                                                    <span className="font-semibold text-gray-700">{rating}★</span>
                                                </div>
                                                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            rating >= 4 ? 'bg-green-500' :
                                                            rating >= 3 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <div className="w-16 text-right">
                                                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {analytics.feedback.totalResponses === 0 && (
                                        <p className="text-gray-500 text-center py-4">No feedback received yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hours Tab */}
                {activeView === 'hours' && (
                    <div className="space-y-6">
                        {/* Hours by User */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaUser className="text-[#800000]" />
                                Volunteer Hours by User
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Volunteer</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Hours</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Records</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Voided Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.volunteerHours.byUser.map((user) => (
                                            <tr key={user.volunteerId} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        {user.volunteerImage ? (
                                                            <img src={user.volunteerImage} alt={user.volunteerName} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center text-white font-semibold">
                                                                {user.volunteerName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{user.volunteerName}</p>
                                                            <p className="text-xs text-gray-500">{user.volunteerEmail}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-right py-3 px-4 font-bold text-[#800000]">{user.totalHours.toFixed(1)}</td>
                                                <td className="text-right py-3 px-4 text-gray-600">{user.records.length}</td>
                                                <td className="text-right py-3 px-4 text-red-600">{user.totalVoidedHours.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                        {analytics.volunteerHours.byUser.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-8 text-gray-500">No volunteer hours recorded</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Hours by Date */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaCalendarAlt className="text-[#800000]" />
                                Volunteer Hours by Date
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Hours</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Volunteers</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Voided Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.volunteerHours.byDate.map((date) => (
                                            <tr key={date.date} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 font-medium text-gray-900">{formatDate(date.date)}</td>
                                                <td className="text-right py-3 px-4 font-bold text-[#800000]">{date.totalHours.toFixed(1)}</td>
                                                <td className="text-right py-3 px-4 text-gray-600">{date.volunteerCount}</td>
                                                <td className="text-right py-3 px-4 text-red-600">{date.totalVoidedHours.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                        {analytics.volunteerHours.byDate.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-8 text-gray-500">No attendance records for selected period</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feedback Tab */}
                {activeView === 'feedback' && (
                    <div className="space-y-6">
                        {/* Feedback Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Responses</h3>
                                <p className="text-3xl font-bold text-[#800000]">{analytics.feedback.totalResponses}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {analytics.feedback.volunteersWithFeedback} of {analytics.feedback.totalVolunteers} volunteers
                                </p>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg border-2 border-[#D4AF37]/20 p-6">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Average Rating</h3>
                                <p className={`text-3xl font-bold ${getRatingColor(analytics.feedback.averageRating)}`}>
                                    {analytics.feedback.averageRating.toFixed(1)}/5.0
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Based on {analytics.feedback.totalResponses} ratings</p>
                            </div>
                            <div className="bg-white rounded-xl shadow-lg border-2 border-green-500/20 p-6">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Satisfaction Score</h3>
                                <p className={`text-3xl font-bold ${getSatisfactionColor(analytics.feedback.satisfactionScore)}`}>
                                    {analytics.feedback.satisfactionScore.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">4-5 star ratings</p>
                            </div>
                        </div>

                        {/* Feedback Comments */}
                        <div className="bg-white rounded-xl shadow-lg border-2 border-[#800000]/10 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaComments className="text-[#800000]" />
                                Feedback Comments
                            </h3>
                            <div className="space-y-4">
                                {analytics.feedback.comments.map((comment, idx) => (
                                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center text-white font-semibold">
                                                    {comment.volunteerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{comment.volunteerName}</p>
                                                    <p className="text-xs text-gray-500">{comment.volunteerEmail}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FaStar
                                                            key={i}
                                                            className={`w-4 h-4 ${
                                                                i < comment.rating
                                                                    ? 'text-[#D4AF37] fill-current'
                                                                    : 'text-gray-300'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                {comment.overridden && (
                                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Overridden</span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-gray-700 mb-2">{comment.comment}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatDate(comment.submittedAt)}
                                        </p>
                                    </div>
                                ))}
                                {analytics.feedback.comments.length === 0 && (
                                    <p className="text-gray-500 text-center py-8">No feedback comments yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default EventDetails;

