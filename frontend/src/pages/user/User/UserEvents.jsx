import React, { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import { useCache } from '../../../context/CacheContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'

const UserEvents = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    const { cachedGet } = useCache()
    const [events, setEvents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, volunteer, donation
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            setIsLoading(true)
            console.log('Fetching events from cache or API')
            const responseData = await cachedGet('events', 'api/events', { forceRefresh: false })
            console.log('Events data:', responseData)
            if (responseData) {
                // Filter out Proposed events - only show Approved, Upcoming, Ongoing, or Completed events
                const approvedEvents = Array.isArray(responseData) 
                    ? responseData.filter(event => event.status !== 'Proposed' && event.status !== 'Pending')
                    : []
                setEvents(approvedEvents)
            }
        } catch (error) {
            console.error('Error fetching events:', error)
            console.error('Error details:', error.response?.data || error.message)
            toast.error('Failed to load events. Please try again later.')
            setEvents([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleEventClick = (eventId) => {
        navigate(`/user/events/${eventId}`)
    }

    const filteredEvents = events.filter(event => {
        // Show all events regardless of status
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
        
        if (filter === 'volunteer') {
            return matchesSearch && event.isOpenForVolunteer === true;
        } else if (filter === 'donation') {
            return matchesSearch && event.isOpenForDonation === true;
        }
        return matchesSearch;
    })

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const getEventStatus = (event) => {
        // First check if there's a manual status set by CRD staff
        if (event.status === 'Upcoming') {
            return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200', canRegister: true }
        } else if (event.status === 'Ongoing') {
            return { text: 'Ongoing', color: 'bg-green-100 text-green-800 border-green-200', canRegister: false }
        } else if (event.status === 'Completed') {
            return { text: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200', canRegister: false }
        }
        
        // Fall back to date-based status if no manual status is set
        const now = new Date()
        const startDate = new Date(event.startDate)
        const endDate = new Date(event.endDate)
        
        if (now < startDate) return { text: 'Upcoming', color: 'bg-blue-100 text-blue-800 border-blue-200', canRegister: true }
        if (now >= startDate && now <= endDate) return { text: 'Ongoing', color: 'bg-green-100 text-green-800 border-green-200', canRegister: false }
        return { text: 'Completed', color: 'bg-gray-100 text-gray-800 border-gray-200', canRegister: false }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <h1 className="text-3xl font-bold text-black mb-2">Community Events</h1>
                    <p className="text-gray-600">Discover and join events that make a difference in your community.</p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                                />
                                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Filter Buttons */}
                        <div className="flex space-x-2">
                            <Button
                                variant={filter === 'all' ? 'primary' : 'ghostDark'}
                                size="sm"
                                onClick={() => setFilter('all')}
                            >
                                All Events
                            </Button>
                            <Button
                                variant={filter === 'volunteer' ? 'primary' : 'ghostDark'}
                                size="sm"
                                onClick={() => setFilter('volunteer')}
                            >
                                Volunteer
                            </Button>
                            <Button
                                variant={filter === 'donation' ? 'primary' : 'ghostDark'}
                                size="sm"
                                onClick={() => setFilter('donation')}
                            >
                                Donation
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Top Events by Donations Section */}
                {!isLoading && filteredEvents.length > 0 && (() => {
                    const eventsWithDonations = filteredEvents
                        .filter(e => e.isOpenForDonation && (e.totalDonations > 0 || e.donations?.length > 0))
                        .sort((a, b) => (parseFloat(b.totalDonations) || 0) - (parseFloat(a.totalDonations) || 0))
                        .slice(0, 3)
                    
                    if (eventsWithDonations.length > 0) {
                        return (
                            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-md p-6 mb-8">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Top Events by Donations
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {eventsWithDonations.map((event, index) => (
                                        <div 
                                            key={event._id}
                                            className="bg-white rounded-lg p-4 border border-green-200 hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => handleEventClick(event._id)}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <span className="text-xs font-bold text-green-600">#{index + 1}</span>
                                                <span className="text-xs font-semibold text-gray-900 line-clamp-1">{event.title}</span>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-lg font-bold text-green-600 mb-1">
                                                    ₱{parseFloat(event.totalDonations || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                {event.donations && event.donations.length > 0 && (
                                                    <p className="text-xs text-gray-600">
                                                        {event.donations.length} donor{event.donations.length !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                                {event.donationTarget && (
                                                    <div className="mt-2">
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div 
                                                                className={`h-1.5 rounded-full ${
                                                                    ((event.totalDonations || 0) / event.donationTarget) >= 1 ? 'bg-green-600' :
                                                                    ((event.totalDonations || 0) / event.donationTarget) >= 0.5 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                                }`}
                                                                style={{ 
                                                                    width: `${Math.min(((event.totalDonations || 0) / event.donationTarget) * 100, 100)}%` 
                                                                }}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {((event.totalDonations || 0) / event.donationTarget * 100).toFixed(1)}% of goal
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    }
                    return null
                })()}

                {/* Events Grid */}
                {isLoading ? (
                    <div className="py-12">
                        <LoadingSpinner size="medium" text="Loading events..." />
                    </div>
                ) : filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredEvents.map((event) => {
                            const status = getEventStatus(event)
                            return (
                                <div 
                                    key={event._id} 
                                    className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                                    onClick={() => handleEventClick(event._id)}
                                >
                                    <div className="h-48 bg-gray-100 overflow-hidden">
                                        {event.image ? (
                                            <img
                                                src={`data:image/jpeg;base64,${event.image}`}
                                                alt={event.title}
                                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/default-event.jpg';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-gray-100">
                                                <div className="text-center p-4">
                                                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="mt-2 text-sm text-gray-500">No image available</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-lg font-semibold text-black line-clamp-2 hover:text-red-900 transition-colors">{event.title}</h3>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} flex-shrink-0 ml-2`}>
                                                {status.text}
                                            </span>
                                        </div>
                                        
                                        {event.description && (
                                            <div 
                                                className="text-gray-600 text-sm mb-4 line-clamp-3 prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ 
                                                    __html: event.description
                                                        .replace(/&lt;/g, '<')
                                                        .replace(/&gt;/g, '>')
                                                        .replace(/&amp;/g, '&')
                                                }}
                                            />
                                        )}
                                        
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="truncate">{formatDate(event.startDate)} - {formatDate(event.endDate)}</span>
                                            </div>
                                            
                                            {/* Donation Information */}
                                            {event.isOpenForDonation && (
                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium text-gray-700">Donations</span>
                                                        <span className="text-xs font-bold text-green-600">
                                                            ₱{parseFloat(event.totalDonations || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                    {event.donations && event.donations.length > 0 && (
                                                        <p className="text-xs text-gray-500 mb-2">
                                                            {event.donations.length} donor{event.donations.length !== 1 ? 's' : ''} contributed
                                                        </p>
                                                    )}
                                                    {event.donationTarget && (
                                                        <>
                                                            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                                                                <div 
                                                                    className={`h-1.5 rounded-full ${
                                                                        ((event.totalDonations || 0) / event.donationTarget) >= 1 ? 'bg-green-600' :
                                                                        ((event.totalDonations || 0) / event.donationTarget) >= 0.5 ? 'bg-yellow-500' :
                                                                        'bg-red-500'
                                                                    }`}
                                                                    style={{ 
                                                                        width: `${Math.min(((event.totalDonations || 0) / event.donationTarget) * 100, 100)}%` 
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {((event.totalDonations || 0) / event.donationTarget * 100).toFixed(1)}% of ₱{parseFloat(event.donationTarget).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} goal
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Volunteer Count */}
                                            {event.isOpenForVolunteer && event.volunteers && event.volunteers.length > 0 && (
                                                <div className="flex items-center text-sm text-gray-500 mt-2">
                                                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    <span>{event.volunteers.length} volunteer{event.volunteers.length !== 1 ? 's' : ''} joined</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${status.text === 'Ongoing' ? 'bg-blue-100 text-blue-800 border-blue-200' : status.color}`}>
                                                {status.text}
                                            </span>
                                            
                                            {/* Show volunteer/donation badges only for Upcoming events */}
                                            {status.text === 'Upcoming' && (
                                                <>
                                                    {event.isOpenForVolunteer && (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                            Volunteers Needed
                                                        </span>
                                                    )}
                                                    {event.isOpenForDonation && (
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            Accepting Donations
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            
                                            {/* Show ongoing notice */}
                                            {status.text === 'Ongoing' && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Event in Progress
                                                </span>
                                            )}
                                            
                                            {/* Show completed notice */}
                                            {status.text === 'Completed' && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Event Completed
                                                </span>
                                            )}
                                        </div>

                                        {/* Click to view details hint */}
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-xs text-gray-400 text-center flex items-center justify-center">
                                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Click to view full details
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No events found</h3>
                        <p className="text-gray-500">
                            {searchTerm ? 'Try adjusting your search terms' : 'No events match your current filter'}
                        </p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}

export default UserEvents
