import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const CRDDashboard = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [stats, setStats] = useState({
        pendingEvents: 0,
        approvedEvents: 0,
        totalDonations: 0,
        activeVolunteers: 0
    })
    const [recentEvents, setRecentEvents] = useState([])
    const [allEvents, setAllEvents] = useState([])
    const [notifications, setNotifications] = useState([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            axios.defaults.withCredentials = true
            
            // Fetch events for review
            const eventsResponse = await axios.get(backendUrl + 'api/events')
            const events = eventsResponse.data || []
            
            // Calculate stats
            const pendingEvents = events.filter(event => event.status === 'Pending').length
            const approvedEvents = events.filter(event => event.status === 'Approved').length
            
            setStats({
                pendingEvents,
                approvedEvents,
                totalDonations: 0, // Will be calculated from donations
                activeVolunteers: 0 // Will be calculated from volunteers
            })
            
            // Get recent events (last 5)
            setRecentEvents(events.slice(0, 5))
            
            // Set all events for the middle column
            setAllEvents(events)
            
            // Mock notifications for CRD staff
            setNotifications([
                {
                    id: 1,
                    title: "New Event Submission",
                    message: "Environmental Cleanup Drive submitted by Green Earth Organization",
                    time: "2 hours ago",
                    type: "event",
                    unread: true
                },
                {
                    id: 2,
                    title: "Event Approved",
                    message: "Community Health Fair has been approved and is now live",
                    time: "4 hours ago",
                    type: "approval",
                    unread: true
                },
                {
                    id: 3,
                    title: "Donation Alert",
                    message: "₱5,000 donation received for Education Support Program",
                    time: "6 hours ago",
                    type: "donation",
                    unread: false
                },
                {
                    id: 4,
                    title: "Volunteer Registration",
                    message: "15 new volunteers registered for upcoming events",
                    time: "1 day ago",
                    type: "volunteer",
                    unread: false
                }
            ])
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            toast.error('Failed to load dashboard data')
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickAction = (action) => {
        switch (action) {
            case 'review-events':
                navigate('/crd-staff/events')
                break
            case 'generate-reports':
                navigate('/crd-staff/reports')
                break
            case 'view-donations':
                toast.info('Donation management coming soon!')
                break
            case 'manage-volunteers':
                toast.info('Volunteer management coming soon!')
                break
            default:
                break
        }
    }

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() + direction)
            return newDate
        })
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()
        
        const days = []
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day)
        }
        
        return days
    }

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'event':
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )
            case 'approval':
                return (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )
            case 'donation':
                return (
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                )
            case 'volunteer':
                return (
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                )
            default:
                return (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h6v-2H4v2zM4 11h6V9H4v2zM4 7h6V5H4v2z" />
                    </svg>
                )
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div>
                {/* Welcome Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-black mb-2">
                                CRD Operations Dashboard
                            </h1>
                            <p className="text-gray-600">
                                Welcome back, {userData?.name || 'CRD Staff'}! Manage campaigns, reviews, and reports.
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <Button 
                                variant="outlineLight" 
                                onClick={() => navigate('/user/profile')}
                                className="border-red-900 text-red-900 hover:bg-red-900 hover:text-white"
                            >
                                Profile Settings
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                        <div className="flex flex-col items-center sm:flex-row sm:items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 mx-auto sm:mx-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black">{stats.pendingEvents}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Pending Reviews</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                        <div className="flex flex-col items-center sm:flex-row sm:items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 mx-auto sm:mx-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black">{stats.approvedEvents}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Approved Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                        <div className="flex flex-col items-center sm:flex-row sm:items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 mx-auto sm:mx-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black">₱{stats.totalDonations.toLocaleString()}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Total Donations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
                        <div className="flex flex-col items-center sm:flex-row sm:items-center">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 mx-auto sm:mx-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="text-center sm:text-left">
                                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-black">{stats.activeVolunteers}</p>
                                <p className="text-xs sm:text-sm text-gray-600">Active Volunteers</p>
                            </div>
                        </div>
                    </div>
                </div>

                    {/* Three Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column - Calendar (hidden on mobile) */}
                        <aside className="hidden lg:block lg:col-span-3">
                            <div className="bg-white rounded-xl shadow-md p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar</h3>
                                
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <button
                                        onClick={() => navigateMonth(-1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                                        aria-label="Previous month"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <h4 className="text-lg font-semibold text-gray-900">
                                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h4>
                                    <button
                                        onClick={() => navigateMonth(1)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                                        aria-label="Next month"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="grid grid-cols-7 gap-1">
                                    {getDaysInMonth(currentDate).map((day, index) => (
                                        <div
                                            key={index}
                                            className={`text-center py-2 text-sm rounded-lg ${
                                                day ? 'hover:bg-gray-100 cursor-pointer' : ''
                                            } ${
                                                day === new Date().getDate() && 
                                                currentDate.getMonth() === new Date().getMonth() && 
                                                currentDate.getFullYear() === new Date().getFullYear()
                                                    ? 'bg-red-100 text-red-600 font-semibold' 
                                                    : 'text-gray-700'
                                            }`}
                                        >
                                            {day}
                                        </div>
                                    ))}
                </div>

                {/* Quick Actions */}
                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                                    <div className="space-y-2">
                            <Button
                                onClick={() => handleQuickAction('review-events')}
                                            className="w-full h-10 flex items-center justify-center space-x-2 text-sm"
                            >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                            <span>Review Events</span>
                            </Button>
                            
                            <Button
                                onClick={() => handleQuickAction('generate-reports')}
                                            className="w-full h-10 flex items-center justify-center space-x-2 text-sm"
                            >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                            <span>Generate Reports</span>
                            </Button>
                        </div>
                    </div>
                            </div>
                        </aside>

                        {/* Middle Column - Events Feed (Scrollable) */}
                        <section className="lg:col-span-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">All Events Feed</h3>
                            <Button 
                                variant="ghostDark"
                                onClick={() => navigate('/crd-staff/events')}
                            >
                                View All
                            </Button>
                        </div>
                        
                                <div className="space-y-4">
                        {isLoading ? (
                            <div className="py-12">
                                <LoadingSpinner size="medium" text="Loading events..." />
                            </div>
                                        ) : allEvents.length > 0 ? (
                                            allEvents.map((event) => (
                                                <div key={event._id} className="border border-gray-200 rounded-lg p-4 transition-colors duration-200 hover:bg-gray-50">
                                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{String(event.description || '').replace(/<[^>]*>/g,'')}</p>
                                                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                <span className="flex items-center">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                {new Date(event.startDate).toLocaleDateString()}
                                                                </span>
                                                                <span className="flex items-center">
                                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                    {event.location}
                                                                </span>
                                                            </div>
                                        </div>
                                                        <div className="ml-4 flex flex-col items-end space-y-2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            event.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                            event.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {event.status || 'Pending'}
                                        </span>
                                                            <Button
                                                                variant="outlineLight"
                                                                size="sm"
                                                                onClick={() => navigate('/crd-staff/events')}
                                                            >
                                                                Review
                                                            </Button>
                                                        </div>
                                    </div>
                            </div>
                                            ))
                        ) : (
                                            <div className="text-center py-12">
                                                <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                <p className="text-gray-500">No events found</p>
                            </div>
                        )}
                    </div>
                </div>
                        </section>

                        {/* Right Column - Notifications */}
                        <aside className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-md p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                                        {notifications.filter(n => n.unread).length} new
                                    </span>
                                </div>
                                
                                <div className="space-y-3">
                                    {notifications.map((notification) => (
                                        <div key={notification.id} className={`p-3 rounded-lg border transition-colors duration-200 ${
                                            notification.unread 
                                                ? 'bg-blue-50 border-blue-200' 
                                                : 'bg-gray-50 border-gray-200'
                                        }`}>
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                                        {notification.title}
                                                    </h4>
                                                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {notification.time}
                                                    </p>
                                                </div>
                                                {notification.unread && (
                                                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                                                )}
                        </div>
                        </div>
                                    ))}
                        </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default CRDDashboard
