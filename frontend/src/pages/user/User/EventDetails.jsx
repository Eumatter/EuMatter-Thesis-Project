import React, { useContext, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import gcashLogo from '../../../assets/gcashLogo.png'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import DOMPurify from 'dompurify'
import { notifyError, notifySuccess, notifyInfo } from '../../../utils/notify'

const EventDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [event, setEvent] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isJoining, setIsJoining] = useState(false)
    const [isDonating, setIsDonating] = useState(false)
    const [showJoinModal, setShowJoinModal] = useState(false)
    const [joinForm, setJoinForm] = useState({
        skills: '',
        additionalNotes: ''
    })
    const [showDonationModal, setShowDonationModal] = useState(false)
    const [donationAmount, setDonationAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('gcash')

    useEffect(() => {
        fetchEventDetails()
    }, [id])

    const fetchEventDetails = async () => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/events/${id}`)
            setEvent(data)
        } catch (error) {
            console.error('Error fetching event details:', error)
            notifyError('Failed to Load Event', 'Failed to load event details')
            navigate('/user/events')
        } finally {
            setIsLoading(false)
        }
    }

    const handleJoinEvent = async () => {
        if (!userData) {
            notifyError('Authentication Required', 'Please log in to join events')
            return
        }
        setShowJoinModal(true)
    }

    const submitJoin = async () => {
        if (!userData) return
        // Basic client-side validation against event.volunteerSettings if present
        const vs = event?.volunteerSettings
        if (vs && vs.mode === 'with_requirements') {
            if (Array.isArray(vs.requiredSkills) && vs.requiredSkills.length > 0) {
                const provided = (joinForm.skills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
                const missing = vs.requiredSkills.filter(req => !provided.includes(String(req).toLowerCase()))
                if (missing.length > 0) {
                    notifyError('Missing Required Skills', `Missing required skills: ${missing.join(', ')}`)
                    return
                }
            }
        }

        setIsJoining(true)
        try {
            axios.defaults.withCredentials = true
            const payload = {
                skills: (joinForm.skills || '').split(',').map(s => s.trim()).filter(Boolean),
                additionalNotes: joinForm.additionalNotes || ''
            }
            const { data } = await axios.post(`${backendUrl}api/events/${id}/join`, payload)
            if (data.success) {
                notifySuccess('Event Joined', 'Successfully joined the event!', { eventId: id, type: 'event_joined' })
                setShowJoinModal(false)
                setJoinForm({ skills: '', additionalNotes: '' })
                fetchEventDetails()
            } else {
                notifyError('Failed to Join Event', data.message)
            }
        } catch (error) {
            notifyError('Failed to Join Event', error?.response?.data?.message || 'Failed to join event')
        } finally {
            setIsJoining(false)
        }
    }

    const handleDonate = async () => {
        if (!userData) {
            notifyError('Authentication Required', 'Please log in to donate')
            return
        }
    
        const amount = parseFloat(donationAmount)
        if (!amount || amount <= 0) {
            notifyError('Invalid Amount', 'Please enter a valid donation amount')
            return
        }
    
        setIsDonating(true)
        try {
            axios.defaults.withCredentials = true
    
            // 1. Create donation / payment intent on backend
            const { data } = await axios.post(`${backendUrl}api/donations`, {
                donorName: userData.name,
                donorEmail: userData.email,
                amount,
                message: `Donation for event: ${event?.title}`,
                paymentMethod,
                eventId: id
            })
    
            if (!data.success) {
                notifyError('Donation Failed', data.message || 'Failed to create donation')
                setIsDonating(false)
                return
            }
    
            // 2. Handle GCash (Source flow)
            if (data.type === 'source'||data.type === 'intent') {
                window.location.href = data.checkoutUrl
                return
            } else if (data.type === 'mock') {
                notifySuccess('Donation Successful', data.message || 'Mock donation created successfully', { eventId: id, type: 'donation_success' })
            }
    
            // Reset modal and donation state
            setShowDonationModal(false)
            setDonationAmount('')
            setPaymentMethod('gcash')
            fetchEventDetails()
    
        } catch (error) {
            console.error(error)
            notifyError('Donation Failed', error?.response?.data?.message || error.message || 'Failed to process donation')
        } finally {
            setIsDonating(false)
        }
    }
    

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    const calculateTimeFrame = (event) => {
        if (!event.startDate || !event.endDate) return null
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const diffMs = end - start
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)
        const hours = diffHours % 24
        
        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''}${hours > 0 ? ` and ${hours} hour${hours > 1 ? 's' : ''}` : ''}`
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''}`
        } else {
            const diffMins = Math.floor(diffMs / (1000 * 60))
            return `${diffMins} minute${diffMins > 1 ? 's' : ''}`
        }
    }

    const isUserJoined = () => {
        return event?.volunteers?.some(volunteer => volunteer._id === userData?._id)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading event details..." />
                </main>
                <Footer />
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                    <div className="text-center py-12">
                        <h2 className="text-2xl font-bold text-gray-600 mb-4">Event not found</h2>
                        <Button onClick={() => navigate('/user/events')}>Back to Events</Button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    const status = getEventStatus(event)
    const userJoined = isUserJoined()
    const openForVolunteer = event?.isOpenForVolunteer === true || event?.isOpenForVolunteer === 'true'
    const openForDonation = event?.isOpenForDonation === true || event?.isOpenForDonation === 'true'

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/user/events')}
                    className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Events
                </button>

                {/* Event Header */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
                    {event.image && (
                        <div className="h-64 md:h-80 bg-gray-300 bg-cover bg-center relative" 
                             style={{backgroundImage: `url(data:image/jpeg;base64,${event.image})`}}>
                            <div className="absolute top-4 right-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${status.color}`}>
                                    {status.text}
                                </span>
                            </div>
                        </div>
                    )}
                    
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                            <div className="flex-1">
                                <h1 className="text-3xl md:text-4xl font-bold text-black mb-2">{event.title}</h1>
                                <p className="text-gray-600 text-lg">Organized by {event.createdBy?.name || 'Unknown'}</p>
                            </div>
                            {!event.image && (
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${status.color} mt-4 md:mt-0`}>
                                    {status.text}
                                </span>
                            )}
                        </div>

                        {/* Event Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-red-900 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900">Event Duration</p>
                                        <p className="text-gray-600">{formatDate(event.startDate)}</p>
                                        <p className="text-gray-600">to {formatDate(event.endDate)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-red-900 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900">Location</p>
                                        <p className="text-gray-600">{event.location}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-red-900 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900">Volunteers</p>
                                        <p className="text-gray-600">{event.volunteers?.length || 0} joined</p>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-3">
                                    <svg className="w-6 h-6 text-red-900 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-semibold text-gray-900">Status</p>
                                        <p className="text-gray-600">{event.status || 'Pending Review'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Show based on event status and settings */}
                        {(() => {
                            const isUpcoming = status.text === 'Upcoming' && (event.status === 'Upcoming' || event.status === 'Approved')
                            const isOngoing = status.text === 'Ongoing' || event.status === 'Ongoing'
                            const isCompleted = status.text === 'Completed' || event.status === 'Completed'
                            
                            // Show registration button only for Upcoming events with volunteer allowed
                            const canRegister = isUpcoming && openForVolunteer && !userJoined
                            // Show donation button only for Upcoming events with donation allowed
                            const canDonate = isUpcoming && openForDonation
                            
                            if (isCompleted) {
                                return (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-gray-800 font-medium">This event has been completed.</p>
                                        </div>
                                    </div>
                                )
                            }
                            
                            if (isOngoing) {
                                const timeFrame = calculateTimeFrame(event)
                                return (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-blue-800 font-medium mb-1">Event is currently ongoing</p>
                                                <p className="text-blue-700 text-sm">
                                                    Registration is closed. {timeFrame && `Volunteer duration: ${timeFrame}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                            
                            if (canRegister || canDonate) {
                                return (
                                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                        {openForVolunteer && (
                                            <Button 
                                                onClick={handleJoinEvent}
                                                disabled={isJoining || userJoined || !canRegister}
                                                className="flex-1 flex items-center justify-center"
                                            >
                                                {isJoining ? (
                                                    <>
                                                        <LoadingSpinner size="tiny" inline />
                                                        Joining...
                                                    </>
                                                ) : userJoined ? (
                                                    <>
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Already Joined
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                        </svg>
                                                        Join Event
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        
                                        {openForDonation && (
                                            <Button 
                                                variant="primary"
                                                onClick={() => setShowDonationModal(true)}
                                                disabled={!canDonate}
                                                className="flex-1 flex items-center justify-center"
                                            >
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                </svg>
                                                Make a Donation
                                            </Button>
                                        )}
                                    </div>
                                )
                            }
                            
                            return null
                        })()}

                        {/* Event Status Message for Non-Approved/Non-Upcoming Events */}
                        {!['Approved', 'Upcoming', 'Ongoing', 'Completed'].includes(event.status) && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <p className="text-yellow-800 font-medium">
                                        {event.status === 'Proposed' && 'This event is pending approval and not yet open for participation.'}
                                        {event.status === 'Declined' && 'This event has been declined and is not available for participation.'}
                                        {event.status === 'Pending' && 'This event is pending review and not yet open for participation.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* No Actions Available Message for Upcoming/Approved events without volunteer/donation options */}
                        {['Approved', 'Upcoming'].includes(event.status) && !event.isOpenForVolunteer && !event.isOpenForDonation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-blue-800 font-medium">
                                        This event is not currently open for volunteers or donations.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* QR Scanner Button for Joined Events */}
                        {userJoined && (event.status === 'Ongoing' || event.status === 'Approved' || event.status === 'Upcoming') && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                        <div>
                                            <p className="text-green-800 font-medium">Scan QR Code for Attendance</p>
                                            <p className="text-green-700 text-sm">Record your time in and time out for this event</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => navigate(`/volunteer/qr-scanner/${event._id}`)}
                                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Open Scanner
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Event Description */}
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 mb-8">
                    <h2 className="text-2xl font-bold text-black mb-4">About This Event</h2>
                    <div className="prose max-w-none">
                        {event.description ? (
                            <div 
                                className="text-gray-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ 
                                    __html: event.description
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&amp;/g, '&')
                                }}
                            />
                        ) : (
                            <p className="text-gray-500 italic">No description provided.</p>
                        )}
                    </div>
                </div>

                {/* Volunteers Section */}
                {event.volunteers && event.volunteers.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                        <h2 className="text-2xl font-bold text-black mb-4">Volunteers ({event.volunteers.length})</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {event.volunteers.map((volunteer) => (
                                <div key={volunteer._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                    <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center text-white font-semibold">
                                        {volunteer.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{volunteer.name}</p>
                                        <p className="text-sm text-gray-500">{volunteer.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Donation Modal */}
            {showDonationModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-black">Make a Donation</h3>
                            <button 
                                onClick={() => setShowDonationModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <p className="text-gray-600 mb-4">Support "{event.title}" with your donation.</p>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Donation Amount (₱)
                            </label>
                            <input
                                type="number"
                                value={donationAmount}
                                onChange={(e) => setDonationAmount(e.target.value)}
                                placeholder="Enter amount"
                                min="1"
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                            />
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Method
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* GCash */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('gcash')}
                                    className={`border rounded-lg p-3 flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'gcash' ? 'ring-2 ring-red-900 border-red-900 bg-red-50' : 'hover:border-gray-400 border-gray-300'}`}
                                >
                                    <img src={gcashLogo} alt="GCash" className="h-6 w-auto" />
                                    <span className="text-sm font-medium text-gray-900">GCash</span>
                                </button>

                                {/* PayMaya */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('paymaya')}
                                    className={`border rounded-lg p-3 flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'paymaya' ? 'ring-2 ring-red-900 border-red-900 bg-red-50' : 'hover:border-gray-400 border-gray-300'}`}
                                >
                                    {/* Simple PayMaya leaf icon */}
                                    <svg className="h-6 w-6 text-emerald-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M12 2c5 0 9 4 9 9 0 5.523-4.477 10-10 10-4.97 0-9-4.03-9-9C2 6.477 6.477 2 12 2z" opacity=".15" />
                                        <path d="M11 6c4 0 7 3.134 7 7 0 .69-.56 1.25-1.25 1.25H12A5 5 0 0 1 7 9.25V7.25C7 6.56 7.56 6 8.25 6H11z" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-900">PayMaya</span>
                                </button>

                                {/* Card */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('card')}
                                    className={`border rounded-lg p-3 flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'card' ? 'ring-2 ring-red-900 border-red-900 bg-red-50' : 'hover:border-gray-400 border-gray-300'}`}
                                >
                                    <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m3 0h6M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-900">Card</span>
                                </button>

                                {/* Bank */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('bank')}
                                    className={`border rounded-lg p-3 flex items-center justify-center gap-2 transition-colors ${paymentMethod === 'bank' ? 'ring-2 ring-red-900 border-red-900 bg-red-50' : 'hover:border-gray-400 border-gray-300'}`}
                                >
                                    <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9-7 9 7M4 10h16v10H4V10zm4 10v-6h8v6" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-900">Bank</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex space-x-3">
                            <Button
                                variant="ghostDark"
                                onClick={() => {
                                    setShowDonationModal(false)
                                    setDonationAmount('')
                                    setPaymentMethod('gcash')
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDonate}
                                disabled={isDonating || !donationAmount}
                                className="flex-1"
                            >
                                {isDonating ? 'Processing...' : 'Donate'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join as Volunteer Modal - Registration Form */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-black">Register for Event</h3>
                            <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium">{event?.title}</p>
                            <p className="text-xs text-blue-600 mt-1">Please fill out the registration form below to join this event as a volunteer.</p>
                        </div>
                        
                        {event?.volunteerSettings?.mode === 'with_requirements' && (
                            <div className="mb-4 text-sm text-gray-600 bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                <p className="font-semibold text-gray-800 mb-2">Event Requirements</p>
                                <ul className="list-disc ml-5 space-y-1">
                                    {event.volunteerSettings.minAge && (<li>Minimum age: {event.volunteerSettings.minAge} years old</li>)}
                                    {event.volunteerSettings.maxVolunteers && (
                                        <li>Maximum volunteers: {event.volunteerSettings.maxVolunteers} ({event.volunteers?.length || 0} already registered)</li>
                                    )}
                                    {Array.isArray(event.volunteerSettings.requiredSkills) && event.volunteerSettings.requiredSkills.length > 0 && (
                                        <li className="text-red-600 font-medium">Required skills: {event.volunteerSettings.requiredSkills.join(', ')}</li>
                                    )}
                                    {event.volunteerSettings.departmentRestrictionType === 'specific' && Array.isArray(event.volunteerSettings.allowedDepartments) && event.volunteerSettings.allowedDepartments.length > 0 && (
                                        <li>Allowed departments: {event.volunteerSettings.allowedDepartments.join(', ')}</li>
                                    )}
                                    {event.volunteerSettings.notes && (<li>{event.volunteerSettings.notes}</li>)}
                                </ul>
                            </div>
                        )}
                        
                        {/* Time Schedule Requirements */}
                        {event?.volunteerSettings?.dailySchedule && event.volunteerSettings.dailySchedule.length > 0 && (
                            <div className="mb-4 text-sm text-gray-600 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                <p className="font-semibold text-blue-800 mb-2 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Volunteer Time Schedule
                                </p>
                                <div className="space-y-2">
                                    {event.volunteerSettings.dailySchedule.map((schedule, index) => {
                                        const scheduleDate = new Date(schedule.date)
                                        const isMultiDay = event.volunteerSettings.dailySchedule.length > 1
                                        const dayLabel = isMultiDay 
                                            ? scheduleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                            : 'Event Day'
                                        
                                        return (
                                            <div key={index} className="bg-white rounded p-2 border border-blue-100">
                                                <p className="font-medium text-blue-900 text-xs mb-1">{dayLabel}</p>
                                                <p className="text-xs text-gray-700">
                                                    <span className="font-medium">Time In:</span> {schedule.timeIn || '08:00'} | 
                                                    <span className="font-medium ml-1">Time Out:</span> {schedule.timeOut || '17:00'}
                                                </p>
                                                {schedule.notes && (
                                                    <p className="text-xs text-gray-600 mt-1 italic">{schedule.notes}</p>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-blue-700 mt-2 italic">
                                    {event.volunteerSettings.dailySchedule.length > 1 
                                        ? 'Volunteers must check in/out for each day. Evaluation form will be available after each day\'s time out.'
                                        : 'After time out, you will be asked to complete an evaluation form to finalize your volunteer hours.'}
                                </p>
                            </div>
                        )}
                        
                        <form onSubmit={(e) => { e.preventDefault(); submitJoin(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Skills <span className="text-red-500">*</span>
                                    <span className="text-xs text-gray-500 font-normal ml-1">(comma separated)</span>
                                </label>
                                <input 
                                    type="text" 
                                    value={joinForm.skills} 
                                    onChange={e => setJoinForm({ ...joinForm, skills: e.target.value })} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900" 
                                    placeholder="e.g., First Aid, Logistics, Communication"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">List your relevant skills or experience</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Additional Notes
                                    <span className="text-xs text-gray-500 font-normal ml-1">(optional)</span>
                                </label>
                                <textarea 
                                    rows={4} 
                                    value={joinForm.additionalNotes} 
                                    onChange={e => setJoinForm({ ...joinForm, additionalNotes: e.target.value })} 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900" 
                                    placeholder="Tell us why you want to volunteer or any additional information..."
                                />
                            </div>
                            
                            <div className="pt-2 flex space-x-3">
                                <Button 
                                    variant="ghostDark" 
                                    className="flex-1" 
                                    type="button"
                                    onClick={() => {
                                        setShowJoinModal(false)
                                        setJoinForm({ skills: '', additionalNotes: '' })
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    className="flex-1" 
                                    type="submit"
                                    disabled={isJoining || !joinForm.skills.trim()}
                                >
                                    {isJoining ? (
                                        <>
                                            <LoadingSpinner size="tiny" inline />
                                            Registering...
                                        </>
                                    ) : (
                                        'Register Now'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default EventDetails
