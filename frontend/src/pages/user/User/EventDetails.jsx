import React, { useContext, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import gcashLogo from '../../../assets/gcashLogo.png'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { stripHtml } from '../../../utils/stripHtml'
import { notifyError, notifySuccess } from '../../../utils/notify'

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
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-[60vh]">
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
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center py-10">
                        <p className="text-sm font-medium text-gray-700 mb-4">Event not found.</p>
                        <button onClick={() => navigate('/user/events')} className="text-sm font-medium text-[#800000] hover:underline">Back to events</button>
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
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <button
                    onClick={() => navigate('/user/events')}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#800000] mb-4"
                    aria-label="Back to events"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Back to Events
                </button>

                {/* Event card */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                    {event.image && (
                        <div className="h-48 sm:h-56 bg-gray-200 bg-cover bg-center relative" style={{ backgroundImage: `url(data:image/jpeg;base64,${event.image})` }}>
                            <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>{status.text}</span>
                        </div>
                    )}
                    <div className="p-4 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{event.title}</h1>
                                <p className="text-sm text-gray-500 mt-0.5">Organized by {event.createdBy?.name || 'Unknown'}</p>
                            </div>
                            {!event.image && (
                                <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${status.color}`}>{status.text}</span>
                            )}
                        </div>

                        {/* Info grid — compact */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date & time</p>
                                    <p className="text-sm text-gray-900 mt-0.5">{formatDate(event.startDate)}</p>
                                    <p className="text-sm text-gray-600">to {formatDate(event.endDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
                                    <p className="text-sm text-gray-900 mt-0.5">{event.location}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Volunteers</p>
                                    <p className="text-sm text-gray-900 mt-0.5">{event.volunteers?.length || 0} joined</p>
                                </div>
                                {openForDonation && (
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Donations</p>
                                        <p className="text-sm text-gray-900 mt-0.5">
                                            ₱{parseFloat(event.totalDonations || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} raised
                                            {event.donations?.length > 0 && <span className="text-gray-500"> · {event.donations.length} donor{event.donations.length !== 1 ? 's' : ''}</span>}
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                                    <p className="text-sm text-gray-900 mt-0.5">{event.status || 'Pending'}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Donation progress */}
                        {openForDonation && event.donationTarget && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Donation goal</p>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-700">₱{parseFloat(event.totalDonations || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="text-gray-500">/ ₱{parseFloat(event.donationTarget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-[#800000] transition-all"
                                        style={{ width: `${Math.min(((event.totalDonations || 0) / event.donationTarget) * 100, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">
                                    {((event.totalDonations || 0) / event.donationTarget * 100).toFixed(0)}% · {event.donations?.length ? `${event.donations.length} donor${event.donations.length !== 1 ? 's' : ''}` : 'Be the first to donate'}
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        {(() => {
                            const isUpcoming = status.text === 'Upcoming' && (event.status === 'Upcoming' || event.status === 'Approved')
                            const isOngoing = status.text === 'Ongoing' || event.status === 'Ongoing'
                            const isCompleted = status.text === 'Completed' || event.status === 'Completed'
                            const canRegister = isUpcoming && openForVolunteer && !userJoined
                            const canDonate = isUpcoming && openForDonation

                            if (isCompleted) {
                                return <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">This event has been completed.</div>
                            }
                            if (isOngoing) {
                                const timeFrame = calculateTimeFrame(event)
                                return (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                        Event is ongoing. Registration closed.{timeFrame && ` Duration: ${timeFrame}.`}
                                    </div>
                                )
                            }
                            if (canRegister || canDonate) {
                                return (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {openForVolunteer && (
                                            <button
                                                type="button"
                                                onClick={handleJoinEvent}
                                                disabled={isJoining || userJoined || !canRegister}
                                                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {isJoining ? <><LoadingSpinner size="tiny" inline /> Joining...</> : userJoined ? 'Already joined' : 'Join as volunteer'}
                                            </button>
                                        )}
                                        {openForDonation && (
                                            <button
                                                type="button"
                                                onClick={() => setShowDonationModal(true)}
                                                disabled={!canDonate}
                                                className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#800000] text-white hover:bg-[#9c0000] disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-2"
                                            >
                                                Donate
                                            </button>
                                        )}
                                    </div>
                                )
                            }
                            return null
                        })()}

                        {!['Approved', 'Upcoming', 'Ongoing', 'Completed'].includes(event.status) && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                {event.status === 'Proposed' && 'Pending approval. Not open for participation yet.'}
                                {event.status === 'Declined' && 'This event has been declined.'}
                                {event.status === 'Pending' && 'Pending review. Not open for participation yet.'}
                            </div>
                        )}

                        {['Approved', 'Upcoming'].includes(event.status) && !event.isOpenForVolunteer && !event.isOpenForDonation && (
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">Not open for volunteers or donations.</div>
                        )}

                        {userJoined && (event.status === 'Ongoing' || event.status === 'Approved' || event.status === 'Upcoming') && (
                            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <p className="text-sm text-gray-700">Record your attendance for this event.</p>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/volunteer/attendance/${event._id}`)}
                                    className="shrink-0 py-2 px-4 rounded-lg text-sm font-medium bg-[#800000] text-white hover:bg-[#9c0000] focus:ring-2 focus:ring-[#800000] focus:ring-offset-2"
                                >
                                    View attendance
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* About */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">About this event</h2>
                    {event.description ? (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{stripHtml(event.description)}</p>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No description provided.</p>
                    )}
                </div>

                {/* Volunteers */}
                {event.volunteers && event.volunteers.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-3">Volunteers ({event.volunteers.length})</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {event.volunteers.map((volunteer) => (
                                <div key={volunteer._id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                                    <div className="w-9 h-9 rounded-full bg-[#800000] flex items-center justify-center text-white text-sm font-medium shrink-0">
                                        {volunteer.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{volunteer.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{volunteer.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Donation Modal */}
            {showDonationModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="donation-modal-title">
                    <div className="bg-white rounded-xl border border-gray-200 max-w-md w-full p-4 sm:p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                            <h3 id="donation-modal-title" className="text-lg font-semibold text-gray-900">Donate</h3>
                            <button type="button" onClick={() => { setShowDonationModal(false); setDonationAmount(''); setPaymentMethod('gcash'); }} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Close">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">Support this event with your donation.</p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₱)</label>
                            <input
                                type="number"
                                value={donationAmount}
                                onChange={(e) => setDonationAmount(e.target.value)}
                                placeholder="e.g. 100"
                                min="1"
                                step="0.01"
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment method</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'gcash', label: 'GCash', el: <img src={gcashLogo} alt="" className="h-5 w-auto" /> },
                                    { value: 'paymaya', label: 'PayMaya', el: <svg className="h-5 w-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor"><path d="M11 6c4 0 7 3 7 7 0 .7-.6 1.25-1.25 1.25H12A5 5 0 017 9.25V7.25C7 6.56 7.56 6 8.25 6H11z" /></svg> },
                                    { value: 'card', label: 'Card', el: <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m3 0h6M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg> },
                                    { value: 'bank', label: 'Bank', el: <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10l9-7 9 7M4 10h16v10H4V10z" /></svg> }
                                ].map(({ value, label, el }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setPaymentMethod(value)}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${paymentMethod === value ? 'border-[#800000] bg-red-50 text-[#800000]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        {el}
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => { setShowDonationModal(false); setDonationAmount(''); setPaymentMethod('gcash'); }} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="button" onClick={handleDonate} disabled={isDonating || !donationAmount} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#800000] text-white hover:bg-[#9c0000] disabled:opacity-50">
                                {isDonating ? 'Processing...' : 'Donate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Join as Volunteer Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="join-modal-title">
                    <div className="bg-white rounded-xl border border-gray-200 max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex items-center justify-between mb-3">
                            <h3 id="join-modal-title" className="text-lg font-semibold text-gray-900">Join as volunteer</h3>
                            <button type="button" onClick={() => { setShowJoinModal(false); setJoinForm({ skills: '', additionalNotes: '' }); }} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Close">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">Fill out the form to register for this event.</p>

                        {event?.volunteerSettings?.mode === 'with_requirements' && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                                <p className="font-medium text-gray-900 mb-1.5">Requirements</p>
                                <ul className="list-disc ml-4 space-y-0.5 text-xs">
                                    {event.volunteerSettings.minAge && <li>Minimum age: {event.volunteerSettings.minAge}</li>}
                                    {event.volunteerSettings.maxVolunteers && <li>Max volunteers: {event.volunteerSettings.maxVolunteers} ({event.volunteers?.length || 0} registered)</li>}
                                    {Array.isArray(event.volunteerSettings.requiredSkills) && event.volunteerSettings.requiredSkills.length > 0 && (
                                        <li className="text-[#800000] font-medium">Required skills: {event.volunteerSettings.requiredSkills.join(', ')}</li>
                                    )}
                                    {event.volunteerSettings.departmentRestrictionType === 'specific' && event.volunteerSettings.allowedDepartments?.length > 0 && (
                                        <li>Departments: {event.volunteerSettings.allowedDepartments.join(', ')}</li>
                                    )}
                                    {event.volunteerSettings.notes && <li>{event.volunteerSettings.notes}</li>}
                                </ul>
                            </div>
                        )}

                        {event?.volunteerSettings?.dailySchedule?.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                                <p className="font-medium text-gray-900 mb-1.5">Schedule</p>
                                {event.volunteerSettings.dailySchedule.map((schedule, i) => {
                                    const d = new Date(schedule.date)
                                    const label = event.volunteerSettings.dailySchedule.length > 1 ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Event day'
                                    return (
                                        <div key={i} className="mb-1 last:mb-0"> {label}: {schedule.timeIn || '08:00'} – {schedule.timeOut || '17:00'}</div>
                                    )
                                })}
                            </div>
                        )}

                        <form onSubmit={(e) => { e.preventDefault(); submitJoin(); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Skills <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={joinForm.skills}
                                    onChange={e => setJoinForm({ ...joinForm, skills: e.target.value })}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                    placeholder="e.g. First Aid, Logistics (comma separated)"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional notes (optional)</label>
                                <textarea
                                    rows={3}
                                    value={joinForm.additionalNotes}
                                    onChange={e => setJoinForm({ ...joinForm, additionalNotes: e.target.value })}
                                    className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent resize-y"
                                    placeholder="Why you want to volunteer..."
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={() => { setShowJoinModal(false); setJoinForm({ skills: '', additionalNotes: '' }); }} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isJoining || !joinForm.skills.trim()} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-[#800000] text-white hover:bg-[#9c0000] disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isJoining ? <><LoadingSpinner size="tiny" inline /> Registering...</> : 'Register'}
                                </button>
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
