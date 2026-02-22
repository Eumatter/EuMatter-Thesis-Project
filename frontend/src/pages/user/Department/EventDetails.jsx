import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    FaComments,
    FaQrcode,
    FaMoneyBillWave,
    FaUserCheck
} from 'react-icons/fa';

const EventDetails = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { backendUrl } = useContext(AppContent);
    
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [volunteers, setVolunteers] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [qrStatus, setQrStatus] = useState(null);
    const [donations, setDonations] = useState([]);
    const [activeView, setActiveView] = useState('overview'); // 'overview', 'hours', 'feedback', 'registered', 'attendance', 'qr', 'donations'

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            const url = `${backendUrl}api/events/${eventId}/analytics?period=all`;

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
            setLoading(false);
        }
    }, [eventId, backendUrl]);

    // Fetch volunteers data
    const fetchVolunteers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${backendUrl}api/volunteers/event/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            if (response.data.success) {
                setVolunteers(response.data.volunteers || []);
            }
        } catch (error) {
            console.error('Error fetching volunteers:', error);
            // Silently fail if no volunteers
        }
    }, [eventId, backendUrl]);

    // Fetch attendance data
    const fetchAttendance = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${backendUrl}api/volunteers/event/${eventId}/attendance`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            
            // Handle different response formats and flatten nested structure
            let attendanceData = [];
            
            if (response.data) {
                let rawAttendance = [];
                
                if (response.data.success && response.data.attendance) {
                    rawAttendance = response.data.attendance;
                } else if (response.data.attendance) {
                    rawAttendance = response.data.attendance;
                } else if (Array.isArray(response.data)) {
                    rawAttendance = response.data;
                }
                
                // Flatten the nested structure (volunteer -> attendanceByDate -> records)
                rawAttendance.forEach(volunteerEntry => {
                    if (volunteerEntry.attendanceByDate && Array.isArray(volunteerEntry.attendanceByDate)) {
                        volunteerEntry.attendanceByDate.forEach(dateEntry => {
                            if (dateEntry.records && Array.isArray(dateEntry.records)) {
                                dateEntry.records.forEach(record => {
                                    attendanceData.push({
                                        volunteer: volunteerEntry.volunteer,
                                        userId: volunteerEntry.volunteer?._id || volunteerEntry.volunteer,
                                        date: dateEntry.date || record.date,
                                        timeIn: record.checkInTime || record.timeIn || record.checkIn,
                                        timeOut: record.checkOutTime || record.timeOut || record.checkOut,
                                        totalHours: record.hoursWorked || record.totalHours || 0,
                                        isValid: record.isValid !== false && !record.voidedHours,
                                        status: record.status || 'valid'
                                    });
                                });
                            }
                        });
                    } else if (volunteerEntry.validRecords && Array.isArray(volunteerEntry.validRecords)) {
                        // Handle validRecords array
                        volunteerEntry.validRecords.forEach(record => {
                            attendanceData.push({
                                volunteer: volunteerEntry.volunteer,
                                userId: volunteerEntry.volunteer?._id || volunteerEntry.volunteer,
                                date: record.date,
                                timeIn: record.checkInTime || record.timeIn || record.checkIn,
                                timeOut: record.checkOutTime || record.timeOut || record.checkOut,
                                totalHours: record.hoursWorked || record.totalHours || 0,
                                isValid: true,
                                status: record.status || 'valid'
                            });
                        });
                    }
                    
                    // Also handle invalidRecords if needed
                    if (volunteerEntry.invalidRecords && Array.isArray(volunteerEntry.invalidRecords)) {
                        volunteerEntry.invalidRecords.forEach(record => {
                            attendanceData.push({
                                volunteer: volunteerEntry.volunteer,
                                userId: volunteerEntry.volunteer?._id || volunteerEntry.volunteer,
                                date: record.date,
                                timeIn: record.checkInTime || record.timeIn || record.checkIn,
                                timeOut: record.checkOutTime || record.timeOut || record.checkOut,
                                totalHours: record.hoursWorked || record.totalHours || 0,
                                isValid: false,
                                status: record.status || 'voided'
                            });
                        });
                    }
                });
            }
            
            setAttendance(attendanceData);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            // Set empty array on error so the tab still shows
            setAttendance([]);
        }
    }, [eventId, backendUrl]);

    // Fetch QR status
    const fetchQRStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${backendUrl}api/volunteers/event/${eventId}/qr/status`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            setQrStatus(response.data);
        } catch (error) {
            console.error('Error fetching QR status:', error);
            // Silently fail if no QR status
            setQrStatus(null);
        }
    }, [eventId, backendUrl]);

    // Fetch donations
    const fetchDonations = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${backendUrl}api/events/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });
            if (response.data && response.data.donations) {
                setDonations(response.data.donations || []);
            }
        } catch (error) {
            console.error('Error fetching donations:', error);
            // Silently fail if no donations
        }
    }, [eventId, backendUrl]);

    // Initial load
    useEffect(() => {
        fetchAnalytics();
    }, [eventId, fetchAnalytics]);

    // Fetch additional data if event is open for volunteers
    useEffect(() => {
        if (analytics?.event?.isOpenForVolunteer) {
            fetchVolunteers();
            fetchAttendance();
            fetchQRStatus();
        }
    }, [analytics?.event?.isOpenForVolunteer, fetchVolunteers, fetchAttendance, fetchQRStatus]);

    // Fetch donations if event is open for donation
    useEffect(() => {
        if (analytics?.event?.isOpenForDonation) {
            fetchDonations();
        }
    }, [analytics?.event?.isOpenForDonation, fetchDonations]);

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
            <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
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
            <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
                <Header />
                <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <div className="w-14 h-14 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center mx-auto mb-4">
                            <FaChartLine className="w-7 h-7 text-[#800000]" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 mb-2">Failed to load analytics</h1>
                        <p className="text-sm text-gray-600 mb-6">We couldn’t load this event’s data. Please try again.</p>
                        <button
                            type="button"
                            onClick={() => navigate('/department/events')}
                            className="px-5 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition"
                        >
                            Back to Events
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
            <Header />

            <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
                <button
                    type="button"
                    onClick={() => navigate('/department/events')}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#800000] mb-4 transition"
                >
                    <FaArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to Events</span>
                </button>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 w-full">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight mb-3">{analytics.event.title}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaCalendarAlt className="w-4 h-4 text-[#800000]" />
                                    </div>
                                    <span className="whitespace-nowrap">{formatDate(analytics.event.startDate)} – {formatDate(analytics.event.endDate)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaMapMarkerAlt className="w-4 h-4 text-[#800000]" />
                                    </div>
                                    <span className="whitespace-nowrap">{analytics.event.location || 'N/A'}</span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
                                    analytics.event.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                                    analytics.event.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                                    analytics.event.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {analytics.event.status}
                                </span>
                            </div>
                        </div>
                        {analytics.event.isOpenForVolunteer && (
                            <button
                                type="button"
                                onClick={() => navigate(`/department/volunteer-management/${eventId}`)}
                                className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
                            >
                                <FaUsers className="w-4 h-4" />
                                Volunteer Management
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
                    {(() => {
                        const tabs = ['overview', 'hours', 'feedback'];
                        if (analytics?.event?.isOpenForVolunteer) tabs.push('registered', 'attendance', 'qr');
                        if (analytics?.event?.isOpenForDonation) tabs.push('donations');
                        return tabs.map((view) => (
                            <button
                                key={view}
                                type="button"
                                onClick={() => setActiveView(view)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                                    activeView === view ? 'border-[#800000] text-[#800000]' : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {view === 'qr' ? 'QR Code' : view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
                        ));
                    })()}
                </div>

                {/* Overview Tab */}
                {activeView === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analytics.event.isOpenForDonation ? (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600 mb-1">Total Donations</p>
                                            <p className="text-xl sm:text-2xl font-bold text-[#800000]">₱{donations.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0).toLocaleString()}</p>
                                            <p className="text-xs text-gray-500 mt-1">{donations.length} donation{donations.length !== 1 ? 's' : ''}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                            <FaMoneyBillWave className="w-5 h-5 text-[#800000]" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-600 mb-1">Total Volunteers</p>
                                            <p className="text-xl sm:text-2xl font-bold text-[#800000]">{analytics.volunteerHours.totalVolunteers}</p>
                                            <p className="text-xs text-gray-500 mt-1">Avg: {analytics.volunteerHours.averageHoursPerVolunteer.toFixed(1)} hrs/volunteer</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                            <FaUsers className="w-5 h-5 text-[#800000]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-600 mb-1">Average Rating</p>
                                        <p className="text-xl sm:text-2xl font-bold text-[#800000]">{analytics.feedback.averageRating.toFixed(1)}/5.0</p>
                                        <p className="text-xs text-gray-500 mt-1">{analytics.feedback.totalResponses} responses</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaStar className="w-5 h-5 text-[#800000]" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-600 mb-1">Satisfaction Score</p>
                                        <p className="text-xl sm:text-2xl font-bold text-[#800000]">{analytics.feedback.satisfactionScore.toFixed(1)}%</p>
                                        <p className="text-xs text-gray-500 mt-1">{analytics.feedback.feedbackResponseRate.toFixed(1)}% response rate</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                                        <FaChartLine className="w-5 h-5 text-[#800000]" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center"><FaUsers className="w-4 h-4 text-[#800000]" /></div>
                                    Top Volunteers by Hours
                                </h3>
                                <div className="space-y-3">
                                    {analytics.volunteerHours.byUser.slice(0, 5).map((user, idx) => (
                                        <div key={user.volunteerId} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center text-[#800000] font-semibold text-sm flex-shrink-0">{idx + 1}</div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{user.volunteerName}</p>
                                                    <p className="text-xs text-gray-500 truncate">{user.volunteerEmail}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-[#800000]">{user.totalHours.toFixed(1)} hrs</p>
                                                <p className="text-xs text-gray-500">{user.records.length} records</p>
                                            </div>
                                        </div>
                                    ))}
                                    {analytics.volunteerHours.byUser.length === 0 && (
                                        <p className="text-gray-500 text-center py-4 text-sm">No volunteer hours recorded</p>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center"><FaStar className="w-4 h-4 text-[#800000]" /></div>
                                    Rating Distribution
                                </h3>
                                <div className="space-y-3">
                                    {[5, 4, 3, 2, 1].map((rating) => {
                                        const count = analytics.feedback.ratingDistribution[rating] || 0;
                                        const total = analytics.feedback.totalResponses;
                                        const percentage = total > 0 ? (count / total) * 100 : 0;
                                        return (
                                            <div key={rating} className="flex items-center gap-3">
                                                <span className="w-10 text-sm font-medium text-gray-700">{rating}★</span>
                                                <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                                    <div className="h-full rounded-full bg-[#800000]/20 transition-all" style={{ width: `${percentage}%` }} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-600 w-8 text-right">{count}</span>
                                            </div>
                                        );
                                    })}
                                    {analytics.feedback.totalResponses === 0 && (
                                        <p className="text-gray-500 text-center py-4 text-sm">No feedback received yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hours Tab */}
                {activeView === 'hours' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                        <FaUser className="w-4 h-4 text-[#800000]" />
                                    </div>
                                    Volunteer Hours by User
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Voided Hours</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {analytics.volunteerHours.byUser.flatMap((user) => 
                                            user.records && user.records.length > 0 ? user.records.map((record, idx) => (
                                                <tr key={`${user.volunteerId}-${idx}`} className="hover:bg-gray-50/50 transition">
                                                    <td className="py-3 px-4">
                                                        {idx === 0 && (
                                                            <div className="flex items-center gap-3">
                                                                {user.volunteerImage ? (
                                                                    <img src={user.volunteerImage} alt={user.volunteerName} className="w-10 h-10 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center text-[#800000] font-semibold text-sm">
                                                                        {user.volunteerName?.charAt(0).toUpperCase() || 'U'}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="font-semibold text-gray-900">{user.volunteerName || 'Unknown'}</p>
                                                                    <p className="text-xs text-gray-500">{user.volunteerEmail || ''}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">{formatDate(record.date)}</td>
                                                    <td className="text-right py-3 px-4 font-bold text-[#800000]">{record.hours?.toFixed(1) || '0.0'}</td>
                                                    <td className="text-right py-3 px-4 text-red-600">{record.voided ? (record.hours?.toFixed(1) || '0.0') : '0.0'}</td>
                                                </tr>
                                            )) : (
                                                <tr key={user.volunteerId} className="hover:bg-gray-50/50 transition">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            {user.volunteerImage ? (
                                                                <img src={user.volunteerImage} alt={user.volunteerName} className="w-10 h-10 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center text-[#800000] font-semibold text-sm">
                                                                    {user.volunteerName?.charAt(0).toUpperCase() || 'U'}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-medium text-gray-900">{user.volunteerName || 'Unknown'}</p>
                                                                <p className="text-xs text-gray-500">{user.volunteerEmail || ''}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">-</td>
                                                    <td className="text-right py-3 px-4 font-bold text-[#800000]">{user.totalHours?.toFixed(1) || '0.0'}</td>
                                                    <td className="text-right py-3 px-4 text-red-600">{user.totalVoidedHours?.toFixed(1) || '0.0'}</td>
                                                </tr>
                                            )
                                        )}
                                        {analytics.volunteerHours.byUser.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-8 text-gray-500">No volunteer hours recorded</td>
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
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Responses</h3>
                                <p className="text-2xl font-bold text-[#800000]">{analytics.feedback.totalResponses}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {analytics.feedback.volunteersWithFeedback} of {analytics.feedback.totalVolunteers} volunteers
                                </p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Average Rating</h3>
                                <p className={`text-2xl font-bold ${getRatingColor(analytics.feedback.averageRating)}`}>
                                    {analytics.feedback.averageRating.toFixed(1)}/5.0
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Based on {analytics.feedback.totalResponses} ratings</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                                <h3 className="text-sm font-medium text-gray-600 mb-2">Satisfaction Score</h3>
                                <p className={`text-2xl font-bold ${getSatisfactionColor(analytics.feedback.satisfactionScore)}`}>
                                    {analytics.feedback.satisfactionScore.toFixed(1)}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">4-5 star ratings</p>
                            </div>
                        </div>

                        {/* Feedback Comments */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaComments className="w-4 h-4 text-[#800000]" />
                                </div>
                                Feedback Comments
                            </h3>
                            <div className="space-y-4">
                                {analytics.feedback.comments.map((comment, idx) => (
                                    <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/80">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 text-[#800000] flex items-center justify-center font-semibold text-sm">
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
                                                    <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-lg font-medium">Overridden</span>
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

                {/* Registered Users Tab - Only if event is open for volunteers */}
                {activeView === 'registered' && analytics?.event?.isOpenForVolunteer && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaUserCheck className="w-4 h-4 text-[#800000]" />
                                </div>
                                Registered Volunteers
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Registered Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {volunteers.map((volunteer) => (
                                            <tr key={volunteer._id || volunteer.user?._id} className="hover:bg-gray-50/50 transition">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        {volunteer.user?.profileImage || volunteer.profileImage ? (
                                                            <img src={volunteer.user?.profileImage || volunteer.profileImage} alt={volunteer.user?.name || volunteer.name} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-[#F5E6E8] border border-[#800000]/10 text-[#800000] rounded-full flex items-center justify-center font-semibold text-sm">
                                                                {(volunteer.user?.name || volunteer.name || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{volunteer.user?.name || volunteer.name || 'Unknown'}</p>
                                                            <p className="text-xs text-gray-500">{volunteer.user?.department || volunteer.department || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">{volunteer.user?.email || volunteer.email || 'N/A'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                        (volunteer.status || volunteer.user?.status) === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                                                        (volunteer.status || volunteer.user?.status) === 'rejected' ? 'bg-red-50 text-red-700' :
                                                        'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {(volunteer.status || volunteer.user?.status || 'registered').charAt(0).toUpperCase() + (volunteer.status || volunteer.user?.status || 'registered').slice(1)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">{formatDate(volunteer.joinedAt || volunteer.user?.joinedAt)}</td>
                                            </tr>
                                        ))}
                                        {volunteers.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="text-center py-8 text-gray-500">No registered volunteers yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Attendance Tab - Only if event is open for volunteers */}
                {activeView === 'attendance' && analytics?.event?.isOpenForVolunteer && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaCheckCircle className="w-4 h-4 text-[#800000]" />
                                </div>
                                Volunteer Attendance Records
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Hours</th>
                                            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendance.map((record, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        {record.volunteer?.profileImage || record.userId?.profileImage ? (
                                                            <img src={record.volunteer?.profileImage || record.userId?.profileImage} alt={record.volunteer?.name || record.userId?.name} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-[#F5E6E8] border border-[#800000]/10 text-[#800000] rounded-full flex items-center justify-center font-semibold text-sm">
                                                                {(record.volunteer?.name || record.userId?.name || 'U').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{record.volunteer?.name || record.userId?.name || 'Unknown'}</p>
                                                            <p className="text-xs text-gray-500">{record.volunteer?.email || record.userId?.email || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">{formatDate(record.date)}</td>
                                                <td className="py-3 px-4 text-gray-600">{record.timeIn ? formatTime(record.timeIn) : 'N/A'}</td>
                                                <td className="py-3 px-4 text-gray-600">{record.timeOut ? formatTime(record.timeOut) : 'N/A'}</td>
                                                <td className="text-right py-3 px-4 font-bold text-[#800000]">{record.totalHours?.toFixed(1) || '0.0'}</td>
                                                <td className="text-center py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                        record.isValid === false ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {record.isValid === false ? 'Voided' : 'Valid'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {attendance.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center py-8 text-gray-500">No attendance records yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* QR Code Tab - Only if event is open for volunteers */}
                {activeView === 'qr' && analytics?.event?.isOpenForVolunteer && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaQrcode className="w-4 h-4 text-[#800000]" />
                                </div>
                                QR Code Attendance & Evaluation
                            </h3>
                            
                            {/* Check-In QR Code */}
                            <div className="mb-8">
                                <h4 className="text-sm font-semibold text-gray-900 mb-4">Check-In QR Code</h4>
                                {qrStatus?.hasCheckInQR && qrStatus?.checkInActive ? (
                                    <div className="text-center rounded-xl border border-gray-100 bg-gray-50/80 p-6">
                                        <img 
                                            src={qrStatus.checkInQR} 
                                            alt="Check-In QR Code" 
                                            className="mx-auto mb-4 max-w-xs"
                                        />
                                        <p className="text-sm text-gray-600 mb-2">
                                            Generated: {qrStatus.generatedAt ? formatDate(qrStatus.generatedAt) : 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Expires: {qrStatus.expiresAt ? formatDate(qrStatus.expiresAt) : 'N/A'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = qrStatus.checkInQR;
                                                link.download = `checkin-qr-${eventId}.png`;
                                                link.click();
                                            }}
                                            className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition"
                                        >
                                            Download QR Code
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center rounded-xl border border-gray-100 bg-gray-50/80 p-6">
                                        <p className="text-gray-500 mb-4 text-sm">No active check-in QR code</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    await axios.post(`${backendUrl}api/volunteers/event/${eventId}/qr/generate`, 
                                                        { type: 'checkIn' }, 
                                                        { 
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            withCredentials: true 
                                                        }
                                                    );
                                                    toast.success('Check-in QR code generated successfully');
                                                    fetchQRStatus();
                                                } catch (error) {
                                                    toast.error(error.response?.data?.message || 'Failed to generate QR code');
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition"
                                        >
                                            Generate Check-In QR Code
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Check-Out/Evaluation QR Code */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-4">Evaluation QR Code (Time Out)</h4>
                                {qrStatus?.hasCheckOutQR && qrStatus?.checkOutActive ? (
                                    <div className="text-center rounded-xl border border-gray-100 bg-gray-50/80 p-6">
                                        <img 
                                            src={qrStatus.checkOutQR} 
                                            alt="Evaluation QR Code" 
                                            className="mx-auto mb-4 max-w-xs"
                                        />
                                        <p className="text-sm text-gray-600 mb-2">
                                            Generated: {qrStatus.generatedAt ? formatDate(qrStatus.generatedAt) : 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Expires: {qrStatus.expiresAt ? formatDate(qrStatus.expiresAt) : 'N/A'}
                                        </p>
                                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = qrStatus.checkOutQR;
                                                    link.download = `evaluation-qr-${eventId}.png`;
                                                    link.click();
                                                }}
                                                className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition"
                                            >
                                                Download QR Code
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!window.confirm('Are you sure you want to close the evaluation QR code? This will prevent volunteers from checking out.')) return;
                                                    try {
                                                        const token = localStorage.getItem('token');
                                                        await axios.post(`${backendUrl}api/volunteers/event/${eventId}/qr/close-evaluation`, 
                                                            {}, 
                                                            { 
                                                                headers: { Authorization: `Bearer ${token}` },
                                                                withCredentials: true 
                                                            }
                                                        );
                                                        toast.success('Evaluation QR code closed');
                                                        fetchQRStatus();
                                                    } catch (error) {
                                                        toast.error(error.response?.data?.message || 'Failed to close QR code');
                                                    }
                                                }}
                                                className="px-4 py-2.5 border border-red-200 text-red-700 text-sm font-medium rounded-xl hover:bg-red-50 transition"
                                            >
                                                Close Evaluation QR
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center rounded-xl border border-gray-100 bg-gray-50/80 p-6">
                                        <p className="text-gray-500 mb-4 text-sm">No active evaluation QR code</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    await axios.post(`${backendUrl}api/volunteers/event/${eventId}/qr/generate`, 
                                                        { type: 'checkOut' }, 
                                                        { 
                                                            headers: { Authorization: `Bearer ${token}` },
                                                            withCredentials: true 
                                                        }
                                                    );
                                                    toast.success('Evaluation QR code generated successfully');
                                                    fetchQRStatus();
                                                } catch (error) {
                                                    toast.error(error.response?.data?.message || 'Failed to generate QR code');
                                                }
                                            }}
                                            className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition"
                                        >
                                            Generate Evaluation QR Code
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Donations Tab - Only if event is open for donation */}
                {activeView === 'donations' && analytics?.event?.isOpenForDonation && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                    <FaMoneyBillWave className="w-4 h-4 text-[#800000]" />
                                </div>
                                Donation Management
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Donor</th>
                                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {donations.map((donation) => (
                                            <tr key={donation._id} className="hover:bg-gray-50/50 transition">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        {donation.user?.profileImage ? (
                                                            <img src={donation.user.profileImage} alt={donation.donorName} className="w-10 h-10 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-[#F5E6E8] border border-[#800000]/10 text-[#800000] rounded-full flex items-center justify-center font-semibold text-sm">
                                                                {(donation.donorName || donation.user?.name || 'A').charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {donation.isAnonymous ? 'An*****s' : (donation.donorName || donation.user?.name || 'Anonymous')}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{donation.donorEmail || donation.user?.email || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-right py-3 px-4 font-bold text-[#800000]">₱{parseFloat(donation.amount || 0).toLocaleString()}</td>
                                                <td className="py-3 px-4 text-gray-600 capitalize">{donation.paymentMethod || 'N/A'}</td>
                                                <td className="py-3 px-4 text-gray-600">{formatDate(donation.createdAt || donation.donatedAt)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                        donation.status === 'succeeded' ? 'bg-emerald-50 text-emerald-700' :
                                                        donation.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                                        'bg-red-50 text-red-700'
                                                    }`}>
                                                        {donation.status || 'pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {donations.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center py-8 text-gray-500">No donations received yet</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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

