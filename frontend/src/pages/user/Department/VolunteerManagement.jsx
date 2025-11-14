import React, { useState, useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContent } from '../../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'

const VolunteerManagement = () => {
    const { backendUrl } = useContext(AppContent)
    const { eventId } = useParams()
    const navigate = useNavigate()
    
    const [event, setEvent] = useState(null)
    const [volunteers, setVolunteers] = useState([])
    const [attendance, setAttendance] = useState([])
    const [qrStatus, setQrStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('volunteers') // 'volunteers', 'attendance', 'qr'
    const [feedbackData, setFeedbackData] = useState(null)
    const [feedbackLoading, setFeedbackLoading] = useState(false)
    const [feedbackError, setFeedbackError] = useState(null)
    
    // QR Code states
    const [qrCode, setQrCode] = useState(null)
    const [qrGenerating, setQrGenerating] = useState(false)
    
    // Modal states
    const [showQRModal, setShowQRModal] = useState(false)
    const [showAttendanceModal, setShowAttendanceModal] = useState(false)
    const [selectedVolunteer, setSelectedVolunteer] = useState(null)

    useEffect(() => {
        fetchEventData()
        fetchQRStatus()
    }, [eventId])

    useEffect(() => {
        if (activeTab === 'feedback' && !feedbackData && !feedbackLoading) {
            fetchFeedbackData()
        }
    }, [activeTab])

    const fetchEventData = async () => {
        try {
            console.log('Fetching event data for ID:', eventId)
            console.log('Backend URL:', backendUrl)
            
            // Fetch event data first
            const eventRes = await axios.get(`${backendUrl}api/events/${eventId}`, { withCredentials: true })
            console.log('Event response:', eventRes.data)
            setEvent(eventRes.data)
            
            // Try to fetch volunteer data (may fail if no volunteers yet)
            try {
                const token = localStorage.getItem('token')
                const volunteersRes = await axios.get(`${backendUrl}api/volunteers/event/${eventId}`, {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                setVolunteers(volunteersRes.data.volunteers || [])
            } catch (volunteerError) {
                // Only show error toast for actual errors (not 404 for no volunteers)
                if (volunteerError.response?.status === 403) {
                    console.error('Access denied to volunteer data:', volunteerError.response?.data)
                    toast.error('Access denied. You may not have permission to view volunteers.')
                } else if (volunteerError.response?.status !== 404) {
                    console.error('Error fetching volunteers:', volunteerError.response?.data)
                    toast.error(volunteerError.response?.data?.message || 'Failed to fetch volunteers')
                }
                // Silently handle 404 (no volunteers yet) - this is expected
                setVolunteers([])
            }
            
            // Try to fetch attendance data (may fail if no attendance yet)
            try {
                const token = localStorage.getItem('token')
                const attendanceRes = await axios.get(`${backendUrl}api/volunteers/event/${eventId}/attendance`, {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                setAttendance(attendanceRes.data.attendance || [])
            } catch (attendanceError) {
                // Only show error toast for actual errors (not 404 for no attendance)
                if (attendanceError.response?.status === 403) {
                    console.error('Access denied to attendance data:', attendanceError.response?.data)
                    toast.error('Access denied. You may not have permission to view attendance.')
                } else if (attendanceError.response?.status !== 404) {
                    console.error('Error fetching attendance:', attendanceError.response?.data)
                    // Don't show toast for missing attendance - it's expected if no one has checked in yet
                }
                // Silently handle 404 (no attendance yet) - this is expected
                setAttendance([])
            }
            
        } catch (error) {
            console.error('Error fetching event data:', error)
            console.error('Error response:', error.response?.data)
            toast.error('Failed to load event data')
        } finally {
            setLoading(false)
        }
    }

    const fetchQRStatus = async () => {
        try {
            const token = localStorage.getItem('token')
            const response = await axios.get(`${backendUrl}api/volunteers/event/${eventId}/qr/status`, {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            setQrStatus(response.data)
            if (response.data.qrCode) {
                setQrCode(response.data.qrCode)
            }
        } catch (error) {
            console.error('Error fetching QR status:', error)
            console.log('QR status error (this is normal if no QR generated yet):', error.response?.data)
            // Don't show error toast for QR status as it's optional
        }
    }

    const fetchFeedbackData = async () => {
        try {
            setFeedbackLoading(true)
            setFeedbackError(null)
            const token = localStorage.getItem('token')
            const response = await axios.get(`${backendUrl}api/feedback/event/${eventId}`, {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            setFeedbackData(response.data)
        } catch (error) {
            console.error('Error fetching feedback data:', error)
            setFeedbackError(error.response?.data?.message || 'Failed to load feedback data')
        } finally {
            setFeedbackLoading(false)
        }
    }

    const handleOverrideFeedback = async (attendanceId, reinstateHours) => {
        try {
            const reason = window.prompt('Provide a reason for this action (optional):') || ''
            const token = localStorage.getItem('token')
            await axios.post(`${backendUrl}api/feedback/${attendanceId}/override`, {
                reinstateHours,
                reason
            }, {
                withCredentials: true,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            toast.success(reinstateHours ? 'Attendance reinstated' : 'Attendance voided')
            fetchFeedbackData()
        } catch (error) {
            console.error('Override feedback error:', error)
            toast.error(error.response?.data?.message || 'Failed to update feedback status')
        }
    }

    const handleVolunteerStatusChange = async (volunteerId, status) => {
        try {
            await axios.put(`${backendUrl}api/volunteers/event/${eventId}/volunteer/${volunteerId}/status`, 
                { status }, 
                { withCredentials: true }
            )
            
            toast.success(`Volunteer ${status} successfully`)
            fetchEventData() // Refresh data
        } catch (error) {
            console.error('Error updating volunteer status:', error)
            toast.error('Failed to update volunteer status')
        }
    }

    const handleRemoveVolunteer = async (volunteerId) => {
        if (!window.confirm('Are you sure you want to remove this volunteer?')) return
        
        try {
            await axios.delete(`${backendUrl}api/volunteers/event/${eventId}/volunteer/${volunteerId}`, 
                { withCredentials: true }
            )
            
            toast.success('Volunteer removed successfully')
            fetchEventData() // Refresh data
        } catch (error) {
            console.error('Error removing volunteer:', error)
            toast.error('Failed to remove volunteer')
        }
    }

    const generateQRCode = async (type = 'checkIn') => {
        setQrGenerating(true)
        try {
            const response = await axios.post(`${backendUrl}api/volunteers/event/${eventId}/qr/generate`, 
                { type }, 
                { withCredentials: true }
            )
            
            setQrCode(response.data.qrCode)
            setQrStatus(response.data)
            setShowQRModal(true)
            toast.success(`${type === 'checkIn' ? 'Check-in' : 'Evaluation/Check-out'} QR code generated successfully`)
            fetchQRStatus() // Refresh QR status
        } catch (error) {
            console.error('Error generating QR code:', error)
            toast.error(error.response?.data?.message || 'Failed to generate QR code')
        } finally {
            setQrGenerating(false)
        }
    }

    const closeEvaluationQR = async () => {
        if (!window.confirm('Are you sure you want to close the evaluation QR code? This will prevent volunteers from checking out.')) return
        
        try {
            const response = await axios.post(`${backendUrl}api/volunteers/event/${eventId}/qr/close-evaluation`, 
                {}, 
                { withCredentials: true }
            )
            
            toast.success(response.data.message || 'Evaluation QR code closed')
            fetchQRStatus() // Refresh QR status
        } catch (error) {
            console.error('Error closing evaluation QR:', error)
            toast.error(error.response?.data?.message || 'Failed to close evaluation QR code')
        }
    }

    const validateAttendance = async () => {
        try {
            const response = await axios.post(`${backendUrl}api/volunteers/event/${eventId}/attendance/validate`, 
                {}, 
                { withCredentials: true }
            )
            
            toast.success(response.data.message)
            fetchEventData() // Refresh attendance data
        } catch (error) {
            console.error('Error validating attendance:', error)
            toast.error('Failed to validate attendance')
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'registered': return 'bg-yellow-100 text-yellow-800'
            case 'approved': return 'bg-green-100 text-green-800'
            case 'rejected': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const formatTime = (time) => {
        if (!time) return 'N/A'
        return new Date(time).toLocaleTimeString()
    }

    const formatDate = (date) => {
        if (!date) return 'N/A'
        return new Date(date).toLocaleDateString()
    }

    const canGenerateCheckInQR = () => {
        if (!event) return false
        const now = new Date()
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const oneDayBefore = new Date(eventStart.getTime() - (24 * 60 * 60 * 1000))
        
        // Calculate if event is single-day or multi-day
        const eventDuration = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24))
        const isSingleDay = eventDuration <= 1
        
        // For single-day: allow 1 day before start
        // For ongoing events: always allow during event
        if (isSingleDay) {
            return now >= oneDayBefore && now <= eventEnd
        } else {
            // Multi-day: allow during event
            return now >= eventStart && now <= eventEnd
        }
    }

    const canGenerateCheckOutQR = () => {
        if (!event) return false
        const now = new Date()
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const fiveMinutesBeforeEnd = new Date(eventEnd.getTime() - (5 * 60 * 1000))
        
        // Allow if 5 minutes before end or during event
        return (now >= fiveMinutesBeforeEnd || (now >= eventStart && now <= eventEnd)) && now <= eventEnd
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading volunteer management..." />
                </div>
                <Footer />
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="max-w-7xl mx-auto px-6 py-8">
                    <div className="text-center py-12">
                        <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
                        <button 
                            onClick={() => navigate('/department/events')}
                            className="bg-red-900 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors"
                        >
                            Back to Events
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Top Back Link */}
                <div className="mb-4">
                    <button
                        onClick={() => navigate('/department/events')}
                        className="px-2 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 underline-offset-2 hover:underline rounded"
                    >
                        Back
                    </button>
                </div>

                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-md px-4 sm:px-6 py-5 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center min-w-0">
                            <div>
                                <h1 className="text-3xl font-bold text-black mb-2">Volunteer Management</h1>
                                <p className="text-gray-600">{event.title}</p>
                                <p className="text-sm text-gray-500">
                                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={validateAttendance}
                                className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full md:w-auto"
                            >
                                Validate Attendance
                            </button>
                            <button
                                onClick={() => generateQRCode('checkIn')}
                                disabled={!canGenerateCheckInQR() || qrGenerating}
                                className={`px-4 sm:px-5 py-2 rounded-lg transition-colors w-full md:w-auto ${
                                    canGenerateCheckInQR() && !qrGenerating
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {qrGenerating ? 'Generating...' : 'Generate Check-In QR'}
                            </button>
                            <button
                                onClick={() => generateQRCode('checkOut')}
                                disabled={!canGenerateCheckOutQR() || qrGenerating}
                                className={`px-4 sm:px-5 py-2 rounded-lg transition-colors w-full md:w-auto ${
                                    canGenerateCheckOutQR() && !qrGenerating
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {qrGenerating ? 'Generating...' : 'Generate Evaluation QR'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* QR Code Generation Info */}
                {(() => {
                    const now = new Date()
                    const eventStart = new Date(event.startDate)
                    const eventEnd = new Date(event.endDate)
                    const eventDuration = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24))
                    const isSingleDay = eventDuration <= 1
                    const oneDayBefore = new Date(eventStart.getTime() - (24 * 60 * 60 * 1000))
                    const fiveMinutesBeforeEnd = new Date(eventEnd.getTime() - (5 * 60 * 1000))
                    
                    if (!canGenerateCheckInQR() && !canGenerateCheckOutQR()) {
                        return (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <p className="text-yellow-800 font-medium mb-1">QR Code Generation Rules:</p>
                                        <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                                            <li><strong>Check-In QR:</strong> {isSingleDay ? 'Can be generated 1 day before event starts or during the event' : 'Can be generated during the event'}</li>
                                            <li><strong>Evaluation QR:</strong> Automatically appears 5 minutes before event end, or can be manually generated during the event</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    
                    if (!canGenerateCheckInQR() && now < eventStart) {
                        return (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-blue-800 font-medium mb-1">Check-In QR Available:</p>
                                        <p className="text-blue-700 text-sm">
                                            {isSingleDay 
                                                ? `Check-in QR can be generated starting ${oneDayBefore.toLocaleString()}.`
                                                : 'Check-in QR can be generated once the event starts.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    
                    return null
                })()}

                {/* Tab Navigation */}
                <div className="bg-white rounded-xl shadow-md mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex gap-6 px-4 sm:px-6 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'volunteers', label: 'Volunteers', count: volunteers.length },
                                { id: 'attendance', label: 'Attendance', count: attendance.length },
                                { id: 'feedback', label: 'Feedback', count: feedbackData?.records?.length || 0 },
                                { id: 'qr', label: 'QR Code', count: qrStatus?.hasQR ? 1 : 0 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm shrink-0 ${
                                        activeTab === tab.id
                                            ? 'border-red-500 text-red-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-xl shadow-md">
                    {/* Volunteers Tab */}
                    {activeTab === 'volunteers' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Registered Volunteers</h2>
                                <span className="text-sm text-gray-500">
                                    {volunteers.filter(v => v.status === 'approved').length} approved, {volunteers.length} total
                                </span>
                            </div>
                            
                            {volunteers.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No volunteers registered</h3>
                                    <p className="text-gray-500">Volunteers will appear here once they register for your event.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {volunteers.map(volunteer => (
                                        <div key={volunteer._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex items-center space-x-4 min-w-0">
                                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                                        {volunteer.user?.profileImage ? (
                                                            <img 
                                                                src={volunteer.user.profileImage} 
                                                                alt={volunteer.name}
                                                                className="w-12 h-12 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-gray-900">{volunteer.name}</h3>
                                                        <p className="text-sm text-gray-600 truncate">{volunteer.user?.email}</p>
                                                        <p className="text-xs text-gray-500">
                                                            Joined: {formatDate(volunteer.joinedAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(volunteer.status)}`}>
                                                        {volunteer.status}
                                                    </span>
                                                    {volunteer.status === 'registered' && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button
                                                                onClick={() => handleVolunteerStatusChange(volunteer.user._id, 'approved')}
                                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleVolunteerStatusChange(volunteer.user._id, 'rejected')}
                                                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveVolunteer(volunteer.user._id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Remove volunteer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Feedback Tab */}
                    {activeTab === 'feedback' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Volunteer Feedback</h2>
                                    <p className="text-sm text-gray-500">
                                        Review ratings and comments for each volunteer attendance day.
                                    </p>
                                </div>
                                <div className="text-sm text-gray-600">
                                    Average rating:{' '}
                                    <span className="font-semibold text-[#800000]">
                                        {feedbackData?.event?.feedbackSummary?.averageRating
                                            ? `${feedbackData.event.feedbackSummary.averageRating.toFixed(1)} / 5`
                                            : 'No ratings yet'}
                                    </span>
                                    {feedbackData?.event?.feedbackSummary?.totalResponses ? (
                                        <span className="ml-2 text-gray-500">
                                            ({feedbackData.event.feedbackSummary.totalResponses} responses)
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {feedbackLoading ? (
                                <div className="py-12 flex items-center justify-center">
                                    <LoadingSpinner size="medium" text="Loading feedback..." />
                                </div>
                            ) : feedbackError ? (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                    {feedbackError}
                                </div>
                            ) : (feedbackData?.records || []).length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l9-5-9-5-9 5 9 5zm0 0V10m0 10l-9-5m9-5l9 5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No feedback records yet</h3>
                                    <p className="text-gray-500">Feedback will appear here once volunteers submit their ratings.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Volunteer</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Rating</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Feedback</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Deadline</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {(feedbackData?.records || []).map(record => (
                                                <tr key={record._id}>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{record.volunteer?.name || 'Volunteer'}</div>
                                                        <div className="text-xs text-gray-500 truncate">{record.volunteer?.email}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        {record.date ? new Date(record.date).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                            record.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' :
                                                            record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            record.status === 'missed' ? 'bg-red-100 text-red-700' :
                                                            record.status === 'overridden' ? 'bg-blue-100 text-blue-700' :
                                                            record.status === 'voided' ? 'bg-gray-200 text-gray-600' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        {record.feedback?.rating ? `${record.feedback.rating}/5` : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {record.feedback?.comment ? (
                                                            <span className="block max-w-[260px] whitespace-pre-line break-words">
                                                                {record.feedback.comment}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">No feedback</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        {record.deadlineAt
                                                            ? new Date(record.deadlineAt).toLocaleString()
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 space-y-2">
                                                        <button
                                                            onClick={() => handleOverrideFeedback(record._id, true)}
                                                            className="w-full px-3 py-1.5 text-xs font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                                                        >
                                                            Reinstate Hours
                                                        </button>
                                                        <button
                                                            onClick={() => handleOverrideFeedback(record._id, false)}
                                                            className="w-full px-3 py-1.5 text-xs font-semibold bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                                                        >
                                                            Void Hours
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attendance Tab */}
                    {activeTab === 'attendance' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Attendance Records</h2>
                                <button
                                    onClick={() => setShowAttendanceModal(true)}
                                    className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                                >
                                    View Details
                                </button>
                            </div>
                            
                            {attendance.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No attendance records</h3>
                                    <p className="text-gray-500">Attendance records will appear here once volunteers start checking in.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {attendance.map(record => (
                                        <div key={record.volunteer._id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex items-center space-x-4 min-w-0">
                                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                                        {record.volunteer.profileImage ? (
                                                            <img 
                                                                src={record.volunteer.profileImage} 
                                                                alt={record.volunteer.name}
                                                                className="w-12 h-12 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold text-gray-900">{record.volunteer.name}</h3>
                                                        <p className="text-sm text-gray-600 truncate">{record.volunteer.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <div className="text-lg font-semibold text-gray-900">
                                                        {record.totalHours.toFixed(1)} hours
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {record.validRecords.length} valid, {record.invalidRecords.length} invalid
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* QR Code Tab */}
                    {activeTab === 'qr' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">QR Codes for Attendance</h2>
                                {qrStatus?.hasCheckOutQR && qrStatus?.checkOutActive && (
                                    <button
                                        onClick={closeEvaluationQR}
                                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Close Evaluation QR
                                    </button>
                                )}
                            </div>
                            
                            {/* Check-In QR Code */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Check-In QR Code (Time In)</h3>
                                {qrStatus?.hasCheckInQR && qrStatus?.checkInActive ? (
                                    <div className="text-center">
                                        <div className="bg-gray-50 rounded-lg p-6 mb-4">
                                            <img 
                                                src={qrStatus.checkInQR} 
                                                alt="Check-In QR Code" 
                                                className="mx-auto mb-4 max-w-full"
                                                style={{ maxWidth: '300px' }}
                                            />
                                            <p className="text-sm text-gray-600 mb-2">
                                                Generated: {qrStatus.generatedAt ? formatDate(qrStatus.generatedAt) : 'N/A'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Expires: {qrStatus.expiresAt ? formatDate(qrStatus.expiresAt) : 'N/A'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setQrCode(qrStatus.checkInQR)
                                                setShowQRModal(true)
                                            }}
                                            className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            View Full Size
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <p className="text-gray-600 mb-4">No check-in QR code generated yet</p>
                                        <button
                                            onClick={() => generateQRCode('checkIn')}
                                            disabled={!canGenerateCheckInQR() || qrGenerating}
                                            className={`px-6 py-3 rounded-lg transition-colors ${
                                                canGenerateCheckInQR() && !qrGenerating
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {qrGenerating ? 'Generating...' : 'Generate Check-In QR'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Check-Out/Evaluation QR Code */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Evaluation QR Code (Time Out)</h3>
                                {qrStatus?.hasCheckOutQR && qrStatus?.checkOutActive ? (
                                    <div className="text-center">
                                        <div className="bg-purple-50 rounded-lg p-6 mb-4">
                                            <img 
                                                src={qrStatus.checkOutQR} 
                                                alt="Evaluation QR Code" 
                                                className="mx-auto mb-4 max-w-full"
                                                style={{ maxWidth: '300px' }}
                                            />
                                            <p className="text-sm text-gray-600 mb-2">
                                                Generated: {qrStatus.generatedAt ? formatDate(qrStatus.generatedAt) : 'N/A'}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Expires: {qrStatus.expiresAt ? formatDate(qrStatus.expiresAt) : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row justify-center gap-3">
                                            <button
                                                onClick={() => {
                                                    setQrCode(qrStatus.checkOutQR)
                                                    setShowQRModal(true)
                                                }}
                                                className="bg-blue-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                View Full Size
                                            </button>
                                            <button
                                                onClick={closeEvaluationQR}
                                                className="bg-red-600 text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                Close Evaluation QR
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <p className="text-gray-600 mb-4">
                                            {(() => {
                                                const now = new Date()
                                                const eventEnd = new Date(event.endDate)
                                                const fiveMinutesBeforeEnd = new Date(eventEnd.getTime() - (5 * 60 * 1000))
                                                if (now < fiveMinutesBeforeEnd) {
                                                    return 'Evaluation QR will automatically appear 5 minutes before event end'
                                                }
                                                return 'No evaluation QR code generated yet'
                                            })()}
                                        </p>
                                        {canGenerateCheckOutQR() && (
                                            <button
                                                onClick={() => generateQRCode('checkOut')}
                                                disabled={qrGenerating}
                                                className={`px-6 py-3 rounded-lg transition-colors ${
                                                    !qrGenerating
                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                {qrGenerating ? 'Generating...' : 'Generate Evaluation QR'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* QR Code Modal */}
            {showQRModal && qrCode && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Attendance QR Code</h3>
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <img 
                                src={qrCode} 
                                alt="Attendance QR Code" 
                                className="mx-auto mb-4"
                                style={{ maxWidth: '100%' }}
                            />
                            <p className="text-sm text-gray-600">
                                Volunteers can scan this QR code to record their attendance
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default VolunteerManagement