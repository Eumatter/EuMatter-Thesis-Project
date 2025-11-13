import React, { useState, useEffect } from 'react';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { toast } from 'react-toastify';

const UserCalendar = () => {
    const navigate = useNavigate();
    const [today, setToday] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchEvents = async () => {
        try {
            const { data } = await api.get('/api/events');
            if (data) {
                setEvents(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            toast.error('Failed to load events');
        } finally {
            setIsLoading(false);
        }
    };

    // Calendar data
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today);
    const year = today.getFullYear();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDay = start.getDay();
    const days = Array.from({ length: startDay + end.getDate() }, (_, i) => 
        i < startDay ? null : i - startDay + 1
    );

    // Get events for a specific date
    const getEventsForDate = (day) => {
        if (!day) return [];
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        return events.filter(event => {
            const eventDate = new Date(event.startDate);
            return eventDate.getDate() === date.getDate() &&
                   eventDate.getMonth() === date.getMonth() &&
                   eventDate.getFullYear() === date.getFullYear();
        });
    };

    const isToday = (day) => {
        if (!day) return false;
        const todayDate = new Date();
        return day === todayDate.getDate() &&
               today.getMonth() === todayDate.getMonth() &&
               today.getFullYear() === todayDate.getFullYear();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="flex items-center text-gray-600 hover:text-[#800000] mb-4 transition-colors duration-200"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#800000]">Calendar</h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-2">View all your events and activities</p>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-black">{monthName} {year}</h2>
                        <div className="flex items-center space-x-2">
                            <button 
                                className="w-10 h-10 flex items-center justify-center text-sm rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation" 
                                onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() - 1, 1))}
                                aria-label="Previous month"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button 
                                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation"
                                onClick={() => setToday(new Date())}
                            >
                                Today
                            </button>
                            <button 
                                className="w-10 h-10 flex items-center justify-center text-sm rounded-lg border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors touch-manipulation" 
                                onClick={() => setToday(new Date(today.getFullYear(), today.getMonth() + 1, 1))}
                                aria-label="Next month"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Calendar Days Header */}
                    <div className="grid grid-cols-7 gap-2 mb-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((day, idx) => {
                            const dayEvents = getEventsForDate(day);
                            const isCurrentDay = isToday(day);
                            
                            return (
                                <div
                                    key={idx}
                                    className={`min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 rounded-lg border transition-all duration-200 ${
                                        day 
                                            ? isCurrentDay
                                                ? 'bg-red-50 border-red-200 shadow-sm'
                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                            : 'bg-transparent border-transparent'
                                    }`}
                                >
                                    {day && (
                                        <>
                                            <div className={`text-xs sm:text-sm font-semibold mb-1 ${
                                                isCurrentDay ? 'text-red-700' : 'text-gray-900'
                                            }`}>
                                                {day}
                                            </div>
                                            {dayEvents.length > 0 && (
                                                <div className="space-y-1">
                                                    {dayEvents.slice(0, 2).map((event) => (
                                                        <div
                                                            key={event._id}
                                                            onClick={() => navigate(`/user/events/${event._id}`)}
                                                            className="text-[10px] sm:text-xs bg-[#800000] text-white px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-[#600000] transition-colors touch-manipulation"
                                                            title={event.title}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <div className="text-[10px] sm:text-xs text-gray-600">
                                                            +{dayEvents.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Events List for Current Month */}
                {isLoading ? (
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <LoadingSpinner size="medium" text="Loading events..." />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-black mb-4">
                            Events in {monthName} {year}
                        </h3>
                        {events.length > 0 ? (
                            <div className="space-y-4">
                                {events
                                    .filter(event => {
                                        const eventDate = new Date(event.startDate);
                                        return eventDate.getMonth() === today.getMonth() &&
                                               eventDate.getFullYear() === today.getFullYear();
                                    })
                                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                                    .map((event) => {
                                        const eventDate = new Date(event.startDate);
                                        return (
                                            <div
                                                key={event._id}
                                                onClick={() => navigate(`/user/events/${event._id}`)}
                                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-[#800000] transition-all duration-200 cursor-pointer touch-manipulation"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="text-base sm:text-lg font-semibold text-black mb-1">
                                                            {event.title}
                                                        </h4>
                                                        <div className="flex items-center text-sm text-gray-600 space-x-4">
                                                            <div className="flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                {eventDate.toLocaleDateString('en-US', { 
                                                                    month: 'short', 
                                                                    day: 'numeric',
                                                                    year: 'numeric'
                                                                })}
                                                            </div>
                                                            <div className="flex items-center">
                                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {event.location || 'Location TBA'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-gray-500 text-sm sm:text-base">No events scheduled for this month</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
};

export default UserCalendar;


