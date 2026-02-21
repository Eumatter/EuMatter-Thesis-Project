import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import { useCache } from '../../../context/CacheContext.jsx'
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { stripHtml } from '../../../utils/stripHtml';
import { notifyError, notifySuccess } from '../../../utils/notify';
import Reactions from '../../../components/social/Reactions';
import CommentModal from '../../../components/social/CommentModal';
import { Tooltip } from 'react-tooltip';
import { FaStar, FaHandHoldingHeart, FaCalendarAlt, FaClock } from 'react-icons/fa';

const UserDashboard = () => {
    const navigate = useNavigate();
    const { backendUrl, userData, setUserData } = useContext(AppContent);
    const { cachedGet } = useCache();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [today, setToday] = useState(new Date());
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [pendingFeedback, setPendingFeedback] = useState([]);
    const [feedbackForms, setFeedbackForms] = useState({});
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [attendanceSummary, setAttendanceSummary] = useState({ totalHours: 0, totalEvents: 0, events: [] });

    useEffect(() => {
        fetchEvents()
        fetchUserData()
        fetchPendingFeedback()
        fetchAttendanceSummary()
    }, [])

    const fetchEvents = async () => {
        try {
            const data = await cachedGet('events', 'api/events', { forceRefresh: false });
            if (data) {
                // Filter out Proposed events - only show Approved, Upcoming, Ongoing, or Completed events
                const approvedEvents = Array.isArray(data) 
                    ? data.filter(event => event.status !== 'Proposed' && event.status !== 'Pending')
                    : [];
                setEvents(approvedEvents);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            const errorMessage = error.response?.data?.message || 'Failed to load events. Please try again.';
            notifyError('Failed to Load Events', errorMessage);
            
            // If unauthorized, redirect to login
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }
        } finally {
            setIsLoading(false);
        }
    }

    const fetchUserData = async () => {
        try {
            const data = await cachedGet('user', 'api/auth/is-authenticated', { forceRefresh: false });
            if (data?.success) {
                setUserData(data.user);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            // If not authenticated, redirect to login
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const fetchPendingFeedback = async () => {
        try {
            setFeedbackLoading(true);
            const data = await cachedGet('notifications', 'api/feedback/me/pending', { forceRefresh: false });
            if (data?.success) {
                // Ensure we always set an array, even if records is undefined or null
                const records = Array.isArray(data.records) ? data.records : [];
                setPendingFeedback(records);
                console.log('Pending feedback updated:', records.length, 'items');
            } else {
                // If no success, set empty array
                setPendingFeedback([]);
            }
        } catch (error) {
            console.error('Error fetching pending feedback:', error);
            // On error, set empty array to hide notification
            setPendingFeedback([]);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const fetchAttendanceSummary = async () => {
        try {
            const data = await cachedGet('volunteers', 'api/attendance/me/summary', { forceRefresh: false });
            if (data?.success) {
                setAttendanceSummary({
                    totalHours: data.totalHours || 0,
                    totalEvents: data.totalEvents || 0,
                    events: Array.isArray(data.events) ? data.events : []
                });
            }
        } catch (error) {
            console.error('Error fetching attendance summary:', error);
        }
    };

    const handleFeedbackChange = (attendanceId, field, value) => {
        setFeedbackForms(prev => ({
            ...prev,
            [attendanceId]: {
                ...(prev[attendanceId] || {}),
                [field]: value
            }
        }));
    };

    const handleSubmitFeedback = async (attendanceId) => {
        const form = feedbackForms[attendanceId] || {};
        const rating = form.rating;
        const comment = form.comment || '';

        if (!rating) {
            notifyError('Rating required', 'Please select a rating before submitting feedback.');
            return;
        }

        try {
            handleFeedbackChange(attendanceId, 'submitting', true);
            const { data } = await api.post(`/api/feedback/${attendanceId}`, { rating, comment });
            if (data?.success) {
                notifySuccess('Feedback submitted', 'Thank you for sharing your feedback!');
                setPendingFeedback(prev => prev.filter(entry => String(entry._id) !== String(attendanceId)));
                setFeedbackForms(prev => {
                    const clone = { ...prev };
                    delete clone[attendanceId];
                    return clone;
                });
                fetchAttendanceSummary();
                fetchPendingFeedback();
            }
        } catch (error) {
            console.error('Submit feedback error:', error);
            const message = error.response?.data?.message || 'Failed to submit feedback.';
            notifyError('Feedback error', message);
        } finally {
            handleFeedbackChange(attendanceId, 'submitting', false);
        }
    };

    const getEventStatus = (event) => {
        // First check if there's a manual status set by CRD staff
        if (event.status === 'Upcoming') {
            return { text: 'Upcoming', canRegister: true, canDonate: true }
        } else if (event.status === 'Ongoing') {
            return { text: 'Ongoing', canRegister: false, canDonate: false }
        } else if (event.status === 'Completed') {
            return { text: 'Completed', canRegister: false, canDonate: false }
        }
        
        // Fall back to date-based status if no manual status is set
        const now = new Date()
        const startDate = new Date(event.startDate)
        const endDate = new Date(event.endDate)
        
        if (now < startDate) return { text: 'Upcoming', canRegister: true, canDonate: true }
        if (now >= startDate && now <= endDate) return { text: 'Ongoing', canRegister: false, canDonate: false }
        return { text: 'Completed', canRegister: false, canDonate: false }
    }

    const handleJoinEvent = async (eventId) => {
        try {
            const { data } = await api.post(`/api/events/${eventId}/join`, {});
            if (data && data.success) {
                notifySuccess('Event Joined', data.message || 'Successfully joined the event!', { eventId, type: 'event_joined' });
                fetchEvents(); // Refresh events
            } else {
                notifyError('Failed to Join Event', data?.message || 'Failed to join event');
            }
        } catch (error) {
            console.error('Error joining event:', error);
            const errorMessage = error.response?.data?.message || 'Failed to join event. Please try again.';
            notifyError('Failed to Join Event', errorMessage);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    }

    const handleDonate = (eventId) => {
        // Navigate to donation page
        navigate('/user/donations')
    }

    // Handle reactions
    const handleReact = async (eventId, reactionType) => {
        try {
            // If reactionType is null, remove reaction (send DELETE request)
            if (!reactionType || reactionType === 'null') {
                const { data } = await api.delete(`/api/events/${eventId}/react`);
                
                // Update the event in the local state
                setEvents(prevEvents => 
                    prevEvents.map(event => {
                        if (event._id === eventId) {
                            // Convert response to the format expected by the component
                            const reactions = data.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
                            return { 
                                ...event, 
                                reactions: {
                                    ...reactions,
                                    userReaction: null
                                }
                            };
                        }
                        return event;
                    })
                );
                
                return true;
            }

            // Add or update reaction (send POST request with reactionType)
            const { data } = await api.post(`/api/events/${eventId}/react`, { reactionType: reactionType });
            
            // Update the event in the local state
            setEvents(prevEvents => 
                prevEvents.map(event => {
                    if (event._id === eventId) {
                        // Convert response to the format expected by the component
                        const reactions = data.reactions || { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 };
                        return { 
                            ...event, 
                            reactions: reactions
                        };
                    }
                    return event;
                })
            );
            
            return true;
        } catch (error) {
            console.error('Error adding reaction:', error);
            const errorMessage = error.response?.data?.message || 'Failed to add reaction';
            
            // Show user-friendly error for 4xx/5xx (except 401 which triggers login)
            if (error.response?.status !== 401) {
                notifyError('Reaction failed', errorMessage);
            }
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
                return false;
            }
            
            // Return false to trigger rollback in optimistic update
            return false;
        }
    };

    // Handle comments - optimized to prevent refresh
    const handleAddComment = useCallback(async (eventId, text) => {
        if (!text || text.trim() === '') {
            notifyError('Invalid Comment', 'Comment cannot be empty');
            return false;
        }

        if (!userData) {
            notifyError('Authentication Required', 'Please log in to post a comment');
            navigate('/login');
            return false;
        }

        const trimmedText = text.trim();
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        
        // Create optimistic comment with proper structure
        const optimisticComment = {
            _id: tempId,
            text: trimmedText,
            user: {
                _id: userData._id,
                name: userData.name || 'You',
                email: userData.email,
                profileImage: userData.profileImage
            },
            createdAt: new Date().toISOString(),
            isOptimistic: true
        };

        // Optimistic update - add comment immediately without refetch
        setEvents(prevEvents => {
            const eventsCopy = [...prevEvents]; // Shallow copy
            const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
            
            if (eventIndex !== -1) {
                const event = { ...eventsCopy[eventIndex] }; // Copy event object
                const currentComments = Array.isArray(event.comments) ? [...event.comments] : [];
                event.comments = [optimisticComment, ...currentComments];
                eventsCopy[eventIndex] = event;
            }
            
            return eventsCopy;
        });

        try {
            // Make API call silently in background
            const response = await api.post(`/api/events/${eventId}/comments`, { text: trimmedText });

            if (response.data && response.data._id) {
                // Structure the server comment properly
                const serverComment = {
                    _id: response.data._id,
                    text: response.data.text || trimmedText,
                    createdAt: response.data.createdAt || new Date().toISOString(),
                    updatedAt: response.data.updatedAt,
                    user: response.data.user && typeof response.data.user === 'object' ? {
                        _id: response.data.user._id,
                        name: response.data.user.name || userData.name || 'You',
                        email: response.data.user.email || userData.email,
                        profileImage: response.data.user.profileImage || userData.profileImage
                    } : {
                        _id: userData._id,
                        name: userData.name || 'You',
                        email: userData.email,
                        profileImage: userData.profileImage
                    }
                };

                // Silently replace temp comment with server response - no visual refresh
                setEvents(prevEvents => {
                    const eventsCopy = [...prevEvents];
                    const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
                    
                    if (eventIndex !== -1) {
                        const event = { ...eventsCopy[eventIndex] };
                        const currentComments = Array.isArray(event.comments) ? [...event.comments] : [];
                        
                        // Replace temp comment with server comment
                        const commentIndex = currentComments.findIndex(c => c && c._id === tempId);
                        if (commentIndex !== -1) {
                            currentComments[commentIndex] = serverComment;
                        } else {
                            // If temp comment not found, prepend server comment
                            currentComments.unshift(serverComment);
                        }
                        
                        event.comments = currentComments.filter(
                            c => c && c._id && c.text && c.user
                        );
                        eventsCopy[eventIndex] = event;
                    }
                    
                    return eventsCopy;
                });
                
                return true;
            } else {
                // Keep optimistic comment if server response is invalid
                console.warn('Server response missing expected fields:', response.data);
            return true;
            }
        } catch (error) {
            console.error('Error adding comment:', error);

            // Remove optimistic comment on error
            setEvents(prevEvents => {
                const eventsCopy = [...prevEvents];
                const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
                
                if (eventIndex !== -1) {
                    const event = { ...eventsCopy[eventIndex] };
                    event.comments = (event.comments || []).filter(c => c && c._id !== tempId);
                    eventsCopy[eventIndex] = event;
                }
                
                return eventsCopy;
            });

            const errorMessage = error.response?.data?.message || 'Failed to add comment. Please try again.';
            notifyError('Failed to Add Comment', errorMessage);

            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            }

            return false;
        }
    }, [userData, navigate]);

    const handleDeleteComment = useCallback(async (eventId, commentId) => {
        // Store original comments for rollback
        let originalComments = [];
        
        // Optimistically remove the comment from UI - no refresh
        setEvents(prevEvents => {
            const eventsCopy = [...prevEvents];
            const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
            
            if (eventIndex !== -1) {
                const event = { ...eventsCopy[eventIndex] };
                originalComments = [...(event.comments || [])];
                event.comments = originalComments.filter(comment => comment._id !== commentId);
                eventsCopy[eventIndex] = event;
            }
            
            return eventsCopy;
        });

        try {
            await api.delete(`/api/events/${eventId}/comments/${commentId}`);
            // Success - comment already removed optimistically
        } catch (error) {
            console.error('Error deleting comment:', error);
            
            // Revert optimistic update on error - restore comment
            setEvents(prevEvents => {
                const eventsCopy = [...prevEvents];
                const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
                
                if (eventIndex !== -1) {
                    const event = { ...eventsCopy[eventIndex] };
                    event.comments = originalComments;
                    eventsCopy[eventIndex] = event;
                }
                
                return eventsCopy;
            });
            
            notifyError('Failed to Delete Comment', error.response?.data?.message || 'Failed to delete comment');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    }, [navigate]);

    const handleEditComment = useCallback(async (eventId, commentId, text) => {
        if (!text || text.trim() === '') {
            notifyError('Invalid Comment', 'Comment cannot be empty');
            return false;
        }

        const trimmedText = text.trim();
        let originalComment = null;

        // Optimistic update - update comment immediately
        setEvents(prevEvents => {
            const eventsCopy = [...prevEvents];
            const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
            
            if (eventIndex !== -1) {
                const event = { ...eventsCopy[eventIndex] };
                const comments = [...(event.comments || [])];
                const commentIndex = comments.findIndex(c => c && c._id === commentId);
                
                if (commentIndex !== -1) {
                    originalComment = { ...comments[commentIndex] };
                    comments[commentIndex] = {
                        ...originalComment,
                        text: trimmedText,
                        updatedAt: new Date().toISOString()
                    };
                    event.comments = comments;
                    eventsCopy[eventIndex] = event;
                }
            }
            
            return eventsCopy;
        });

        try {
            const { data } = await api.put(
                `/api/events/${eventId}/comments/${commentId}`,
                { text: trimmedText }
            );
            
            if (data) {
                // Replace optimistic update with server response
                setEvents(prevEvents => {
                    const eventsCopy = [...prevEvents];
                    const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
                    
                    if (eventIndex !== -1) {
                        const event = { ...eventsCopy[eventIndex] };
                        const comments = [...(event.comments || [])];
                        const commentIndex = comments.findIndex(c => c && c._id === commentId);
                        
                        if (commentIndex !== -1) {
                            comments[commentIndex] = {
                                ...comments[commentIndex],
                                ...data,
                                user: data.user || comments[commentIndex].user
                            };
                            event.comments = comments;
                            eventsCopy[eventIndex] = event;
                        }
                    }
                    
                    return eventsCopy;
                });
                
                notifySuccess('Comment Updated', 'Comment edited successfully!');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error editing comment:', error);
            
            // Revert optimistic update on error
            if (originalComment) {
                setEvents(prevEvents => {
                    const eventsCopy = [...prevEvents];
                    const eventIndex = eventsCopy.findIndex(e => e._id === eventId);
                    
                    if (eventIndex !== -1) {
                        const event = { ...eventsCopy[eventIndex] };
                        const comments = [...(event.comments || [])];
                        const commentIndex = comments.findIndex(c => c && c._id === commentId);
                        
                        if (commentIndex !== -1) {
                            comments[commentIndex] = originalComment;
                            event.comments = comments;
                            eventsCopy[eventIndex] = event;
                        }
                    }
                    
                    return eventsCopy;
                });
            }
            
            const errorMessage = error.response?.data?.message || 'Failed to edit comment';
            notifyError('Failed to Edit Comment', errorMessage);
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                notifyError('Session Expired', 'Please log in again.');
                navigate('/login');
            }
            
            return false;
        }
    }, [navigate]);

    // Calendar data
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today);
    const year = today.getFullYear();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDay = start.getDay();
    const days = Array.from({ length: startDay + end.getDate() }, (_, i) => 
        i < startDay ? null : i - startDay + 1
    );

    // Handle opening comment modal
    const handleOpenComments = (eventId) => {
        setSelectedEventId(eventId);
        setIsCommentModalOpen(true);
    };

    // Handle closing comment modal
    const handleCloseComments = () => {
        setIsCommentModalOpen(false);
        setSelectedEventId(null);
    };

    // Get selected event for modal - use useMemo to prevent unnecessary recalculations
    const selectedEvent = useMemo(() => {
        if (!selectedEventId) return null;
        return events.find(e => e._id === selectedEventId) || null;
    }, [events, selectedEventId]);

    const eventsJoined = attendanceSummary.totalEvents || 0;
    const totalHours = attendanceSummary.totalHours || 0;
    const hoursDisplay = Number(totalHours).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
    // Ensure pendingFeedback is an array and get count
    const pendingFeedbackCount = Array.isArray(pendingFeedback) ? pendingFeedback.length : 0;

    // Main component render
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 pb-4 overflow-y-auto lg:overflow-hidden">
                    {/* Left: Profile + Stats + Quick actions — fixed, no scroll */}
                    <aside className="lg:col-span-3 space-y-4 min-h-0 flex flex-col lg:overflow-hidden">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-gray-100">
                                    {userData?.profileImage ? (
                                        <img src={userData.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#800000] text-white text-sm font-semibold">
                                            {(userData?.name || 'U').split(' ').slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('')}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{userData?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 truncate">{userData?.email || ''}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                    <p className="text-xs text-gray-500">Events joined</p>
                                    <p className="text-sm font-semibold text-gray-900">{eventsJoined}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                    <p className="text-xs text-gray-500">Hours</p>
                                    <p className="text-sm font-semibold text-gray-900">{hoursDisplay}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Quick actions</p>
                            <div className="space-y-1">
                                <button type="button" onClick={() => handleDonate()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-[#800000] transition-colors">
                                    <FaHandHoldingHeart className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <span className="break-words">Donate</span>
                                </button>
                                <button type="button" onClick={() => navigate('/user/events')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-[#800000] transition-colors">
                                    <FaCalendarAlt className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <span className="break-words">Events</span>
                                </button>
                                <button type="button" onClick={() => navigate('/user/volunteer-history')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-[#800000] transition-colors">
                                    <FaClock className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <span className="break-words">Volunteer Hours</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Middle: Event feed — only this section scrolls */}
                    <section className="lg:col-span-6 min-h-0 flex flex-col overflow-y-auto">
                        {isLoading ? (
                            <div className="py-12 flex justify-center">
                                <LoadingSpinner size="medium" text="Loading events..." />
                            </div>
                        ) : events.length > 0 ? (
                            <div className="space-y-4 lg:space-y-5 pb-6">
                                {events.map((event) => {
                                    // Ensure comments array exists and is valid
                                    const eventComments = Array.isArray(event.comments) 
                                        ? event.comments.filter(c => c && c._id && c.text && c.user)
                                        : [];
                                    const postedAt = event.createdAt || event.startDate
                                    const timeAgo = (() => {
                                        const now = new Date()
                                        const then = new Date(postedAt)
                                        const diffMs = Math.max(0, now.getTime() - then.getTime())
                                        const sec = Math.floor(diffMs / 1000)
                                        if (sec < 60) return 'just now'
                                        const min = Math.floor(sec / 60)
                                        if (min < 60) return `${min} minute${min>1?'s':''} ago`
                                        const hrs = Math.floor(min / 60)
                                        if (hrs < 24) return `${hrs} hour${hrs>1?'s':''} ago`
                                        const days = Math.floor(hrs / 24)
                                        if (days < 30) return `${days} day${days>1?'s':''} ago`
                                        const months = Math.floor(days / 30)
                                        if (months < 12) return `${months} month${months>1?'s':''} ago`
                                        const years = Math.floor(months / 12)
                                        return `${years} year${years>1?'s':''} ago`
                                    })()
                                    const organizerName = event.organizer?.name || event.department?.name || 'Organizer'
                                    const organizerLogo = event.organizer?.logo || event.department?.logo || null
                                    return (
                                        <article key={event._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            <div className="flex items-center gap-3 p-3 border-b border-gray-100">
                                                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                    {organizerLogo ? <img src={organizerLogo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">—</div>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{organizerName}</p>
                                                    <p className="text-xs text-gray-500">{timeAgo}</p>
                                                </div>
                                            </div>

                                            <div className="aspect-video bg-gray-100">
                                                {event.image ? (
                                                    <img src={`data:image/jpeg;base64,${event.image}`} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 sm:p-4">
                                                <h3 className="text-base font-semibold text-gray-900 leading-tight">{event.title}</h3>
                                                {event.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{stripHtml(event.description)}</p>}
                                                <p className="text-xs text-gray-500 mt-2">{event.location || 'Location TBA'}</p>
                                            </div>

                                            <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-gray-100">
                                                <div className="flex items-center gap-4 flex-wrap mb-3">
                                                    <Reactions eventId={event._id} initialReactions={event.reactions || {}} onReact={handleReact} currentUserId={userData?._id} />
                                                    <button type="button" onClick={() => handleOpenComments(event._id)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#800000]">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                        <span>{eventComments.length || 0} {eventComments.length === 1 ? 'comment' : 'comments'}</span>
                                                    </button>
                                                </div>

                                                {(() => {
                                                    const eventStatus = getEventStatus(event)
                                                    const isUpcoming = eventStatus.text === 'Upcoming' && (event.status === 'Upcoming' || event.status === 'Approved')
                                                    const isOngoing = eventStatus.text === 'Ongoing' || event.status === 'Ongoing'
                                                    const isCompleted = eventStatus.text === 'Completed' || event.status === 'Completed'
                                                    const canRegister = isUpcoming && event.isOpenForVolunteer
                                                    const canDonate = isUpcoming && event.isOpenForDonation

                                                    if (isCompleted) return <p className="text-sm text-gray-500 py-1">Event completed.</p>
                                                    if (isOngoing) return <p className="text-sm text-gray-500 py-1">Ongoing. Registration closed.</p>
                                                    if (canRegister || canDonate) {
                                                        return (
                                                            <div className="flex gap-2">
                                                                {event.isOpenForVolunteer && (
                                                                    <button type="button" onClick={() => navigate(`/user/events/${event._id}`)} className="flex-1 py-2 rounded-lg text-sm font-medium bg-[#800000] text-white hover:bg-[#9c0000]">
                                                                        Join event
                                                                    </button>
                                                                )}
                                                                {event.isOpenForDonation && (
                                                                    <button type="button" onClick={() => navigate(`/user/events/${event._id}`)} className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                                                                        Donate
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                })()}
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <p className="text-sm font-medium text-gray-700 mb-1">No events</p>
                                <p className="text-xs text-gray-500">Check back later for community events.</p>
                            </div>
                        )}
                    </section>

                    {/* Right: Calendar + Pending feedback (desktop) — fixed, no scroll */}
                    <aside className="hidden lg:flex lg:col-span-3 flex-col space-y-4 min-h-0 lg:overflow-hidden">
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-semibold text-gray-900">{monthName} {year}</p>
                                <div className="flex gap-1">
                                    <button type="button" className="w-7 h-7 flex items-center justify-center text-xs rounded border border-gray-300 hover:bg-gray-50" onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() - 1, 1))} aria-label="Previous month">&lsaquo;</button>
                                    <button type="button" className="w-7 h-7 flex items-center justify-center text-xs rounded border border-gray-300 hover:bg-gray-50" onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() + 1, 1))} aria-label="Next month">&rsaquo;</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-500 mb-1">
                                {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-xs">
                                {days.map((d, idx) => {
                                    const isToday = d === new Date().getDate() && today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear()
                                    return (
                                        <div key={idx} className={`h-7 flex items-center justify-center rounded ${isToday ? 'bg-[#800000] text-white font-medium' : 'text-gray-600'}`}>
                                            {d || ''}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {!feedbackLoading && Array.isArray(pendingFeedback) && pendingFeedback.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm font-semibold text-gray-900 mb-1">Pending feedback</p>
                                <p className="text-xs text-gray-600 mb-3">You have {pendingFeedback.length} feedback {pendingFeedback.length === 1 ? 'task' : 'tasks'} to submit.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const first = pendingFeedback[0]
                                        const eventId = first?.event?._id || first?.event
                                        navigate(eventId ? `/volunteer/attendance/${eventId}` : '/user/volunteer-history')
                                    }}
                                    className="w-full py-2 rounded-lg text-sm font-medium bg-[#800000] text-white hover:bg-[#9c0000]"
                                >
                                    View & submit
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            {/* Comment Modal */}
            {isCommentModalOpen && selectedEventId && (
                <CommentModal
                    isOpen={isCommentModalOpen}
                    onClose={handleCloseComments}
                    event={selectedEvent}
                    comments={selectedEvent?.comments || []}
                    currentUser={userData}
                    onAddComment={handleAddComment}
                    onDeleteComment={(commentId) => handleDeleteComment(selectedEvent._id, commentId)}
                    onEditComment={(commentId, text) => handleEditComment(selectedEvent._id, commentId, text)}
                />
            )}

            <Footer />
        </div>
    )
}

export default UserDashboard
