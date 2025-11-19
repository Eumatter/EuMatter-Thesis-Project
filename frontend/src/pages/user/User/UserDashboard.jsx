import React, { useContext, useState, useEffect, useCallback, useMemo } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { notifyError, notifySuccess } from '../../../utils/notify';
import Reactions from '../../../components/social/Reactions';
import CommentModal from '../../../components/social/CommentModal';
import { Tooltip } from 'react-tooltip';
import { FaStar } from 'react-icons/fa';

const UserDashboard = () => {
    const navigate = useNavigate();
    const { backendUrl, userData, setUserData } = useContext(AppContent);
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
            const { data } = await api.get('/api/events');
            if (data) {
                setEvents(Array.isArray(data) ? data : []);
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
            const { data } = await api.get('/api/auth/is-authenticated');
            if (data.success) {
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
            const { data } = await api.get('/api/feedback/me/pending');
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
            const { data } = await api.get('/api/attendance/me/summary');
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
            
            // Only show error notification for non-401 errors
            if (error.response?.status !== 401 && error.response?.status !== 400) {
                notifyError('Failed to Add Reaction', errorMessage);
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

    const stripHtml = (html) => {
        if (!html) return ''
        return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    }

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

            <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 min-h-[calc(100vh-80px)]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
                    {/* Left Column: Profile + Stats - Responsive */}
                    <aside className="lg:col-span-3 space-y-4 sm:space-y-6 lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
                        {/* Profile Card */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 transition-all duration-300 hover:shadow-lg">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                                    {userData?.profileImage ? (
                                        <img src={userData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#800000] text-white text-l sm:text-xl font-semibold">
                                            {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm sm:text-base font-semibold text-black truncate">{userData?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500 truncate">{userData?.email || ''}</p>
                                </div>
                            </div>
                             {/* Statistics Cards - 2 Column on Mobile, Single Column on Desktop */}
                             <div className="space-y-3 sm:space-y-4 lg:space-y-2 mt-4 sm:mt-5">
                                 {/* Events Joined and Hours - 2 Column on Mobile */}
                                 <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 lg:gap-2">
                                     {/* Events Joined */}
                                     <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#800000] to-[#9c0000] rounded-xl p-4 sm:p-5 lg:flex-row lg:justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg shadow-md">
                                         <div className="flex flex-col items-center lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-3">
                                             <div className="bg-white/20 rounded-full p-2 lg:p-1.5">
                                                 <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-5 lg:h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                             </div>
                                             <span className="text-xs sm:text-sm lg:text-sm text-white font-medium text-center lg:text-left">Events Joined</span>
                                        </div>
                                         <span className="text-xl sm:text-2xl lg:text-lg font-bold text-white mt-2 lg:mt-0">
                                            {eventsJoined}
                                        </span>
                                    </div>
                                     {/* Hours Volunteered */}
                                     <div className="flex flex-col items-center justify-center bg-gradient-to-br from-[#800000] to-[#9c0000] rounded-xl p-4 sm:p-5 lg:flex-row lg:justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg shadow-md">
                                         <div className="flex flex-col items-center lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-3">
                                             <div className="bg-white/20 rounded-full p-2 lg:p-1.5">
                                                 <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-5 lg:h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                             </div>
                                             <span className="text-xs sm:text-sm lg:text-sm text-white font-medium text-center lg:text-left">Total Hours</span>
                                        </div>
                                         <span className="text-xl sm:text-2xl lg:text-lg font-bold text-white mt-2 lg:mt-0">
                                            {hoursDisplay}
                                        </span>
                                    </div>
                                 </div>
                                 {/* Pending Feedback - Only show if there are pending feedbacks */}
                                 {Array.isArray(pendingFeedback) && pendingFeedback.length > 0 && (
                                 <button 
                                     onClick={() => {
                                         // Navigate to the first pending feedback's event attendance page
                                         const firstFeedback = pendingFeedback[0]
                                         const eventId = firstFeedback?.event?._id || firstFeedback?.event
                                         if (eventId) {
                                             navigate(`/volunteer/attendance/${eventId}`)
                                         } else {
                                             navigate('/user/volunteer-history')
                                         }
                                     }}
                                     className="flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-4 sm:p-5 lg:flex-row lg:justify-between transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg shadow-md cursor-pointer w-full"
                                 >
                                     <div className="flex flex-col items-center lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-3">
                                         <div className="bg-white/20 rounded-full p-2 lg:p-1.5">
                                             <svg className="w-6 h-6 sm:w-7 sm:h-7 lg:w-5 lg:h-5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-4.215A2 2 0 0016.695 11H16V7a4 4 0 10-8 0v4h-.695a2 2 0 00-1.9 1.318L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                         </div>
                                         <span className="text-xs sm:text-sm lg:text-sm text-white font-medium text-center lg:text-left">Pending Feedback</span>
                                    </div>
                                     <span className="text-xl sm:text-2xl lg:text-lg font-bold text-white mt-2 lg:mt-0">
                                        {pendingFeedbackCount}
                                    </span>
                                </button>
                                 )}
                            </div>
                        </div>

                        {/* Quick Actions - 3 Column on Mobile, Single Column on Desktop */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 transition-all duration-300 hover:shadow-lg">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 lg:mb-2">Quick Actions</h3>
                            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3 lg:gap-2 lg:space-y-2">
                                <button 
                                    onClick={() => handleDonate()}
                                    className="flex flex-col items-center justify-center space-y-2 lg:flex-row lg:justify-start lg:space-y-0 lg:space-x-3 px-2 py-4 sm:py-3 lg:py-2.5 sm:lg:py-2 rounded-xl bg-white border-2 border-[#800000] hover:bg-gradient-to-r hover:from-[#800000] hover:via-[#9c0000] hover:to-[#800000] active:scale-95 transition-all duration-200 touch-manipulation group"
                                >
                                    <div className="bg-[#800000] rounded-full p-2 lg:p-1.5 group-hover:bg-white transition-colors duration-200">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-4 lg:h-4 text-white group-hover:text-[#800000] flex-shrink-0 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                    <span className="text-[10px] sm:text-xs lg:text-sm text-[#800000] font-semibold group-hover:text-white transition-colors duration-200 text-center lg:text-left">Donate</span>
                                </button>
                                <button 
                                    onClick={() => navigate('/user/events')}
                                    className="flex flex-col items-center justify-center space-y-2 lg:flex-row lg:justify-start lg:space-y-0 lg:space-x-3 px-2 py-4 sm:py-3 lg:py-2.5 sm:lg:py-2 rounded-xl bg-white border-2 border-[#800000] hover:bg-gradient-to-r hover:from-[#800000] hover:via-[#9c0000] hover:to-[#800000] active:scale-95 transition-all duration-200 touch-manipulation group"
                                >
                                    <div className="bg-[#800000] rounded-full p-2 lg:p-1.5 group-hover:bg-white transition-colors duration-200">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-4 lg:h-4 text-white group-hover:text-[#800000] flex-shrink-0 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"/></svg>
                                    </div>
                                    <span className="text-[10px] sm:text-xs lg:text-sm text-[#800000] font-semibold group-hover:text-white transition-colors duration-200 text-center lg:text-left">Browse Events</span>
                                </button>
                                <button
                                    onClick={() => navigate('/user/volunteer-history')}
                                    className="flex flex-col items-center justify-center space-y-2 lg:flex-row lg:justify-start lg:space-y-0 lg:space-x-3 px-2 py-4 sm:py-3 lg:py-2.5 sm:lg:py-2 rounded-xl bg-white border-2 border-[#800000] hover:bg-gradient-to-r hover:from-[#800000] hover:via-[#9c0000] hover:to-[#800000] active:scale-95 transition-all duration-200 touch-manipulation group"
                                >
                                    <div className="bg-[#800000] rounded-full p-2 lg:p-1.5 group-hover:bg-white transition-colors duration-200">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-4 lg:h-4 text-white group-hover:text-[#800000] flex-shrink-0 transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <span className="text-[10px] sm:text-xs lg:text-sm text-[#800000] font-semibold group-hover:text-white transition-colors duration-200 text-center lg:text-left">Volunteer Hours</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Middle Column: Feed-style Events (scrollable only) */}
                    <section className="lg:col-span-6 lg:h-[calc(100vh-120px)] lg:overflow-y-auto lg:pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {isLoading ? (
                            <div className="py-12">
                                <LoadingSpinner size="medium" text="Loading events..." />
                            </div>
                        ) : events.length > 0 ? (
                            <div className="space-y-6 sm:space-y-8 lg:space-y-10 pb-6 sm:pb-8 lg:pb-8">
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
                                        <article key={event._id} className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-4 sm:p-6">
                                            {/* Post header */}
                                            <div className="flex items-center mb-3 sm:mb-4">
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 overflow-hidden mr-3 flex-shrink-0 ring-2 ring-gray-100">
                                                    {organizerLogo ? (
                                                        <img src={organizerLogo} alt={organizerName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">LOGO</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-black truncate">{organizerName}</p>
                                                    <p className="text-xs text-gray-500">{timeAgo}</p>
                                                </div>
                                            </div>

                                            {/* Image with perfect rectangle aspect ratio (16:9) */}
                                            <div className="w-full bg-gray-100 overflow-hidden rounded-lg sm:rounded-xl aspect-video mb-4 sm:mb-5 shadow-sm">
                                                {event.image ? (
                                                    <img
                                                        src={`data:image/jpeg;base64,${event.image}`}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/default-event.jpg';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
                                                        <div className="text-center p-6">
                                                            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <p className="mt-3 text-sm text-gray-500">No event image available</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details */}
                                            <div className="mt-3 sm:mt-4 space-y-2">
                                                <h3 className="text-base sm:text-lg font-semibold text-black leading-tight">{event.title}</h3>
                                                {event.description && (
                                                    <p className="text-sm text-gray-700 whitespace-pre-line">
                                                        {stripHtml(event.description)}
                                                    </p>
                                                )}
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    {event.location || 'Location TBA'}
                                                </div>
                                            </div>

                                            {/* Social Interactions */}
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                {/* Reactions and Comments - Balanced Layout */}
                                                <div className="flex items-center justify-between mb-2">
                                                    {/* Like Button - Left Side */}
                                                    <div className="flex items-center">
                                                        <Reactions 
                                                            eventId={event._id} 
                                                            initialReactions={{
                                                                reactions: event.reactions || {},
                                                                userReaction: event.reactions?.userReaction || null
                                                            }}
                                                            onReact={handleReact}
                                                            currentUserId={userData?._id}
                                                        />
                                                    </div>
                                                    
                                                    {/* Comment Button - Right Side */}
                                                    <button 
                                                        onClick={() => handleOpenComments(event._id)}
                                                        className="flex items-center text-gray-500 hover:text-[#800000] transition-colors duration-200 text-sm font-medium cursor-pointer group"
                                                    >
                                                        <svg className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                        </svg>
                                                        <span className="group-hover:underline whitespace-nowrap">{eventComments.length || 0} {eventComments.length === 1 ? 'Comment' : 'Comments'}</span>
                                                    </button>
                                                </div>

                                                {/* Action Buttons - Show based on event status */}
                                                {(() => {
                                                    const eventStatus = getEventStatus(event)
                                                    const isUpcoming = eventStatus.text === 'Upcoming' && (event.status === 'Upcoming' || event.status === 'Approved')
                                                    const isOngoing = eventStatus.text === 'Ongoing' || event.status === 'Ongoing'
                                                    const isCompleted = eventStatus.text === 'Completed' || event.status === 'Completed'
                                                    
                                                    const canRegister = isUpcoming && event.isOpenForVolunteer
                                                    const canDonate = isUpcoming && event.isOpenForDonation
                                                    
                                                    if (isCompleted) {
                                                        return (
                                                            <div className="mt-4 sm:mt-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                                <p className="text-sm text-gray-600 text-center">This event has been completed.</p>
                                                            </div>
                                                        )
                                                    }
                                                    
                                                    if (isOngoing) {
                                                        return (
                                                            <div className="mt-4 sm:mt-5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                                <p className="text-sm text-blue-700 text-center">Event is currently ongoing. Registration is closed.</p>
                                                            </div>
                                                        )
                                                    }
                                                    
                                                    if (canRegister || canDonate) {
                                                        return (
                                                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-5">
                                                                {event.isOpenForVolunteer && (
                                                                    <Button
                                                                        onClick={() => navigate(`/user/events/${event._id}`)}
                                                                        className="flex-1 bg-[#800000] hover:bg-[#600000] text-white py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
                                                                    >
                                                                        Join Event
                                                                    </Button>
                                                                )}
                                                                {event.isOpenForDonation && (
                                                                    <Button
                                                                        onClick={() => navigate(`/user/events/${event._id}`)}
                                                                        className="flex-1 border-2 border-[#800000] text-[#800000] hover:bg-red-50 py-2.5 sm:py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-manipulation"
                                                                    >
                                                                        Donate
                                                                    </Button>
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
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-600 mb-2">No events available</h3>
                                <p className="text-gray-500">Check back later for new community events!</p>
                            </div>
                        )}
                    </section>

                    {/* Right Column: Calendar + Notifications - DESKTOP ONLY (hidden on mobile) */}
                    <aside className="hidden lg:block lg:col-span-3 space-y-4 sm:space-y-6 lg:sticky lg:top-20 lg:self-start lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 transition-all duration-300 hover:shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-black">{monthName} {year}</h3>
                                <div className="flex items-center space-x-1">
                                    <button 
                                        className="w-8 h-8 flex items-center justify-center text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors" 
                                        onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() - 1, 1))}
                                        aria-label="Previous month"
                                    >
                                        {'<'}
                                    </button>
                                    <button 
                                        className="w-8 h-8 flex items-center justify-center text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors" 
                                        onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() + 1, 1))}
                                        aria-label="Next month"
                                    >
                                        {'>'}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-gray-500 mb-2">
                                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (<div key={d}>{d}</div>))}
                            </div>
                            <div className="grid grid-cols-7 gap-2 text-xs">
                                {days.map((d, idx) => (
                                    <div key={idx} className={`h-8 flex items-center justify-center rounded ${d === new Date().getDate() && today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear() ? 'bg-red-100 text-red-900' : 'bg-gray-50 text-gray-700'}`}>
                                        {d || ''}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pending Feedback Alert - Below Calendar */}
                        {/* Only show if there are pending feedbacks and not loading */}
                        {!feedbackLoading && Array.isArray(pendingFeedback) && pendingFeedback.length > 0 && (
                            <div className="bg-gradient-to-br from-yellow-50 via-amber-50/80 to-yellow-50 border-2 border-yellow-200/60 rounded-xl shadow-lg p-4 sm:p-5 transition-all duration-300 hover:shadow-xl">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-4.215A2 2 0 0016.695 11H16V7a4 4 0 10-8 0v4h-.695a2 2 0 00-1.9 1.318L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base sm:text-lg font-bold text-[#800000] mb-1">Pending Volunteer Feedback</h3>
                                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                            You have {pendingFeedback.length} pending feedback {pendingFeedback.length === 1 ? 'task' : 'tasks'}. Submit your feedback to keep your volunteer hours valid.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="maroon"
                                    onClick={() => {
                                        // Navigate to the first pending feedback's event attendance page
                                        const firstFeedback = pendingFeedback[0]
                                        const eventId = firstFeedback?.event?._id || firstFeedback?.event
                                        if (eventId) {
                                            navigate(`/volunteer/attendance/${eventId}`)
                                        } else {
                                            navigate('/user/volunteer-history')
                                        }
                                    }}
                                    className="w-full text-sm py-2.5"
                                >
                                    View & Submit Feedback
                                </Button>
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
