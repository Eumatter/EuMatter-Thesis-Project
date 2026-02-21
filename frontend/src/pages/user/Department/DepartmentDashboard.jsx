import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useCache } from '../../../context/CacheContext.jsx'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import api from '../../../utils/api'
import { toast } from 'react-toastify'
import { stripHtml } from '../../../utils/stripHtml'
import Reactions from '../../../components/social/Reactions'
import CommentModal from '../../../components/social/CommentModal'
import { FaCalendarAlt, FaCheckCircle, FaHandHoldingHeart, FaChartBar, FaListAlt, FaImage } from 'react-icons/fa'

const DepartmentDashboard = () => {
    const navigate = useNavigate()
    const { userData, backendUrl } = useContext(AppContent)
    const { cachedGet } = useCache()
    const [events, setEvents] = useState([])
    const [notifications] = useState([]) // placeholder list
    const [selectedEventId, setSelectedEventId] = useState(null)
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await cachedGet('events', 'api/events', { forceRefresh: false })
                setEvents((data || []).filter(e => e?.createdBy?._id === userData?._id))
            } catch (error) {
                console.error('Error fetching events:', error)
            }
        }
        fetchEvents()
    }, [backendUrl, userData?._id, cachedGet])

    const stats = {
        created: events.length,
        donationsTotal: 0,
        approved: events.filter(e => e.status === 'Approved').length
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
            
            // Only show error toast for non-401 errors
            if (error.response?.status !== 401 && error.response?.status !== 400) {
                toast.error(errorMessage);
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
            toast.error('Comment cannot be empty');
            return false;
        }

        if (!userData) {
            toast.error('Please log in to post a comment');
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
            toast.error(errorMessage);

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
            
            toast.error(error.response?.data?.message || 'Failed to delete comment');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    }, [navigate]);

    const handleEditComment = useCallback(async (eventId, commentId, text) => {
        if (!text || text.trim() === '') {
            toast.error('Comment cannot be empty');
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
                
                toast.success('Comment edited successfully!');
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
            toast.error(errorMessage);
            
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                toast.error('Session expired. Please log in again.');
                navigate('/login');
            }
            
            return false;
        }
    }, [navigate]);

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

    // Calendar state and helpers (matching UserDashboard style)
    const [today, setToday] = useState(new Date())
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today)
    const year = today.getFullYear()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const startDay = start.getDay()
    const days = Array.from({ length: startDay + end.getDate() }, (_, i) => i < startDay ? null : i - startDay + 1)

    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 h-[calc(100vh-5rem)] flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 min-h-0">
                    {/* Left: Profile + Stats + Quick links - fixed, no scroll */}
                    <aside className="lg:col-span-3 space-y-4 sm:space-y-5 shrink-0">
                        {/* Profile card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                                    {userData?.profileImage ? (
                                        <img src={userData.profileImage} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#800000] font-semibold text-sm">
                                            {(userData?.name || 'D').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm sm:text-base font-semibold text-gray-900 break-words" title={userData?.name || 'Department'}>{userData?.name || 'Department'}</p>
                                    <p className="text-xs text-gray-600 break-all" title={userData?.email || ''}>{userData?.email || ''}</p>
                                </div>
                            </div>
                            {/* Stats row - full labels, no truncation */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
                                <div className="bg-[#F5E6E8] rounded-xl border border-[#800000]/10 p-3 flex flex-col items-center justify-center gap-1 text-center transition-all hover:shadow-sm min-w-0">
                                    <FaListAlt className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <p className="text-[11px] sm:text-xs font-medium text-gray-700 leading-tight">Created</p>
                                    <p className="text-base sm:text-lg font-bold text-[#800000]">{stats.created}</p>
                                </div>
                                <div className="bg-[#F5E6E8] rounded-xl border border-[#800000]/10 p-3 flex flex-col items-center justify-center gap-1 text-center transition-all hover:shadow-sm min-w-0">
                                    <FaHandHoldingHeart className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <p className="text-[11px] sm:text-xs font-medium text-gray-700 leading-tight">Donated</p>
                                    <p className="text-base sm:text-lg font-bold text-[#800000]">₱{stats.donationsTotal}</p>
                                </div>
                                <div className="bg-[#F5E6E8] rounded-xl border border-[#800000]/10 p-3 flex flex-col items-center justify-center gap-1 text-center transition-all hover:shadow-sm min-w-0">
                                    <FaCheckCircle className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <p className="text-[11px] sm:text-xs font-medium text-gray-700 leading-tight">Approved</p>
                                    <p className="text-base sm:text-lg font-bold text-[#800000]">{stats.approved}</p>
                                </div>
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Quick actions</p>
                            <div className="space-y-1">
                                <button
                                    onClick={() => navigate('/department/events')}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-[#800000] transition-colors"
                                >
                                    <FaCalendarAlt className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <span className="break-words">Manage Events</span>
                                </button>
                                <button
                                    onClick={() => navigate('/department/donations')}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-[#800000] transition-colors"
                                >
                                    <FaHandHoldingHeart className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <span className="break-words">View Donations</span>
                                </button>
                                <button
                                    onClick={() => navigate('/department/reports')}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-medium text-gray-800 hover:bg-gray-50 hover:text-[#800000] transition-colors"
                                >
                                    <FaChartBar className="w-5 h-5 text-[#800000] flex-shrink-0" />
                                    <span className="break-words">View Reports</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    {/* Middle: Events feed - only this section scrolls */}
                    <section className="lg:col-span-6 min-h-0 overflow-y-auto pr-1 scrollbar-thin flex flex-col">
                        {events.length > 0 ? (
                            <div className="space-y-4 sm:space-y-5 pb-6">
                                {events.map((event) => {
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
                                    const organizerName = event.organizer?.name || event.department?.name || userData?.name || 'Department'
                                    const organizerLogo = event.organizer?.logo || event.department?.logo || null
                                    // Ensure comments array exists and is valid
                                    const eventComments = Array.isArray(event.comments) 
                                        ? event.comments.filter(c => c && c._id && c.text && c.user)
                                        : [];
                                    return (
                                        <article key={event._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                                                    {organizerLogo ? (
                                                        <img src={organizerLogo} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#800000] font-semibold text-xs">{organizerName.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{organizerName}</p>
                                                    <p className="text-xs text-gray-500">{timeAgo}</p>
                                                </div>
                                            </div>

                                            <div className="w-full bg-gray-50 overflow-hidden rounded-xl aspect-video mb-4 border border-gray-100">
                                                {event.image ? (
                                                    <img
                                                        src={`data:image/jpeg;base64,${event.image}`}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={(e)=>{ e.target.onerror=null; e.target.src='/default-event.jpg'; }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <FaImage className="w-12 h-12 sm:w-14 sm:h-14" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">{event.title}</h3>
                                                {event.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2 sm:line-clamp-3">{stripHtml(event.description)}</p>
                                                )}
                                                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                    <span className="inline-block w-3.5 h-3.5 rounded-full bg-gray-200" aria-hidden />
                                                    {event.location || 'Location TBA'}
                                                </p>
                                            </div>

                                            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                                                <Reactions
                                                    eventId={event._id}
                                                    initialReactions={event.reactions || {}}
                                                    onReact={handleReact}
                                                    currentUserId={userData?._id}
                                                />
                                                <button
                                                    onClick={() => handleOpenComments(event._id)}
                                                    className="text-sm font-medium text-gray-500 hover:text-[#800000] transition-colors"
                                                >
                                                    {eventComments.length || 0} {eventComments.length === 1 ? 'Comment' : 'Comments'}
                                                </button>
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
                                <div className="w-14 h-14 rounded-full bg-[#F5E6E8] flex items-center justify-center mx-auto mb-4">
                                    <FaListAlt className="w-7 h-7 text-[#800000]" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-900 mb-1">No events yet</h3>
                                <p className="text-sm text-gray-500 mb-4">Create your first event from Manage Events.</p>
                                <button
                                    onClick={() => navigate('/department/events')}
                                    className="text-sm font-medium text-[#800000] hover:underline"
                                >
                                    Go to Events →
                                </button>
                            </div>
                        )}
                    </section>

                    {/* Right: Calendar (desktop) - fixed, no scroll */}
                    <aside className="hidden lg:block lg:col-span-3 shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900">{monthName} {year}</h3>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                        onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() - 1, 1))}
                                        aria-label="Previous month"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        type="button"
                                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                        onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() + 1, 1))}
                                        aria-label="Next month"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-500 mb-2">
                                {['S','M','T','W','T','F','S'].map(d => <div key={d}>{d}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-xs">
                                {days.map((d, idx) => {
                                    const isToday = d === new Date().getDate() && today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear()
                                    return (
                                        <div
                                            key={idx}
                                            className={`h-8 flex items-center justify-center rounded-lg ${isToday ? 'bg-[#800000] text-white font-semibold' : 'bg-gray-50 text-gray-700'}`}
                                        >
                                            {d ?? ''}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* Comment Modal */}
            {selectedEvent && (
                <CommentModal
                    isOpen={isCommentModalOpen}
                    onClose={handleCloseComments}
                    event={selectedEvent}
                    comments={Array.isArray(selectedEvent.comments) ? selectedEvent.comments.filter(c => c && c._id && c.text && c.user) : []}
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

export default DepartmentDashboard