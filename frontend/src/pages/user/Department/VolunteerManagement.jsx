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
    const [activeTab, setActiveTab] = useState('volunteers') // 'volunteers', 'attendance', 'qr', 'feedback', 'exceptions'
    const [feedbackData, setFeedbackData] = useState(null)
    const [feedbackLoading, setFeedbackLoading] = useState(false)
    const [feedbackError, setFeedbackError] = useState(null)
    const [exceptionRequests, setExceptionRequests] = useState([])
    const [exceptionLoading, setExceptionLoading] = useState(false)
    const [selectedException, setSelectedException] = useState(null)
    const [reviewNotes, setReviewNotes] = useState('')
    const [reviewing, setReviewing] = useState(false)
    
    // QR Code states
    const [qrGeneratingCheckIn, setQrGeneratingCheckIn] = useState(false)
    const [qrGeneratingCheckOut, setQrGeneratingCheckOut] = useState(false)
    const [showAttendanceModal, setShowAttendanceModal] = useState(false)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [autoApprove, setAutoApprove] = useState(false)
    const [inviting, setInviting] = useState(false)
    const [selectedVolunteer, setSelectedVolunteer] = useState(null)

    useEffect(() => {
        fetchEventData()
        fetchQRStatus()
    }, [eventId])

    useEffect(() => {
        if (activeTab === 'feedback' && !feedbackData && !feedbackLoading) {
            fetchFeedbackData()
        }
        if (activeTab === 'exceptions' && exceptionRequests.length === 0 && !exceptionLoading) {
            fetchExceptionRequests()
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
        // Set the appropriate loading state based on type
        if (type === 'checkIn') {
            setQrGeneratingCheckIn(true)
        } else {
            setQrGeneratingCheckOut(true)
        }
        
        try {
            const response = await axios.post(`${backendUrl}api/volunteers/event/${eventId}/qr/generate`, 
                { type }, 
                { withCredentials: true }
            )
            
            // Immediately update qrStatus with the QR code from the response
            if (response.data.success && response.data.qrCode) {
                setQrStatus(prevStatus => ({
                    ...prevStatus,
                    [`${type === 'checkIn' ? 'checkIn' : 'checkOut'}QR`]: response.data.qrCode,
                    [`has${type === 'checkIn' ? 'CheckIn' : 'CheckOut'}QR`]: true,
                    [`${type === 'checkIn' ? 'checkIn' : 'checkOut'}Active`]: response.data.isActive !== false,
                    generatedAt: response.data.date ? new Date().toISOString() : (prevStatus?.generatedAt || new Date().toISOString()),
                    expiresAt: response.data.expiresAt || prevStatus?.expiresAt,
                    hasQR: true
                }))
            }
            
            toast.success(`${type === 'checkIn' ? 'Check-in' : 'Evaluation/Check-out'} QR code generated successfully`)
            // Fetch updated QR status to get the complete status (for other metadata)
            await fetchQRStatus()
        } catch (error) {
            console.error('Error generating QR code:', error)
            toast.error(error.response?.data?.message || 'Failed to generate QR code')
        } finally {
            // Clear the appropriate loading state based on type
            if (type === 'checkIn') {
                setQrGeneratingCheckIn(false)
            } else {
                setQrGeneratingCheckOut(false)
            }
        }
    }

    // Download QR code as PDF
    const downloadQRAsPDF = async (qrImageSrc, qrType) => {
        try {
            // Dynamically import jsPDF and html2canvas
            const [{ default: jsPDF }, html2canvas] = await Promise.all([
                import('jspdf'),
                import('html2canvas')
            ])
            
            // Create a temporary image element to get the QR code
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            await new Promise((resolve, reject) => {
                img.onload = resolve
                img.onerror = reject
                img.src = qrImageSrc
            })
            
            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [210, 297] // A4 size
            })
            
            // Calculate dimensions to center the QR code
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            const qrSize = 150 // QR code size in mm
            const x = (pdfWidth - qrSize) / 2
            const y = (pdfHeight - qrSize) / 2 - 20
            
            // Add title
            pdf.setFontSize(18)
            pdf.text(`${qrType === 'checkIn' ? 'Check-In' : 'Check-Out'} QR Code`, pdfWidth / 2, 30, { align: 'center' })
            
            // Add event title if available
            if (event?.title) {
                pdf.setFontSize(14)
                pdf.text(event.title, pdfWidth / 2, 40, { align: 'center' })
            }
            
            // Add QR code image
            pdf.addImage(img, 'PNG', x, y, qrSize, qrSize)
            
            // Add instructions
            pdf.setFontSize(12)
            pdf.text('Scan this QR code to record your attendance', pdfWidth / 2, y + qrSize + 15, { align: 'center' })
            
            // Generate filename
            const eventTitle = event?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'event'
            const filename = `${eventTitle}_${qrType}_qr_code.pdf`
            
            // Save PDF
            pdf.save(filename)
            toast.success('QR code downloaded as PDF')
        } catch (error) {
            console.error('Error downloading QR code as PDF:', error)
            toast.error('Failed to download QR code as PDF. Please try again.')
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

    const fetchExceptionRequests = async () => {
        setExceptionLoading(true)
        try {
            const response = await axios.get(`${backendUrl}api/attendance/exception-requests`, {
                withCredentials: true
            })
            if (response.data?.success) {
                // Filter to only show requests for this event
                const eventRequests = response.data.requests.filter(req => 
                    String(req.event?.id) === String(eventId)
                )
                setExceptionRequests(eventRequests)
            }
        } catch (error) {
            console.error('Error fetching exception requests:', error)
            toast.error('Failed to fetch exception requests')
        } finally {
            setExceptionLoading(false)
        }
    }

    const handleReviewException = async (action) => {
        if (!selectedException) return

        setReviewing(true)
        try {
            const response = await axios.put(
                `${backendUrl}api/attendance/${selectedException.attendanceId}/exception-request`,
                {
                    action,
                    reviewNotes: reviewNotes.trim() || undefined
                },
                { withCredentials: true }
            )

            if (response.data?.success) {
                toast.success(`Exception request ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
                setSelectedException(null)
                setReviewNotes('')
                fetchExceptionRequests()
                fetchEventData() // Refresh attendance data
            }
        } catch (error) {
            console.error('Error reviewing exception:', error)
            toast.error(error.response?.data?.message || 'Failed to review exception request')
        } finally {
            setReviewing(false)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'registered': return 'bg-amber-50 text-amber-700'
            case 'approved': return 'bg-emerald-50 text-emerald-700'
            case 'accepted': return 'bg-emerald-50 text-emerald-700'
            case 'rejected': return 'bg-red-50 text-red-700'
            case 'invited': return 'bg-violet-50 text-violet-700 border border-violet-200/80'
            default: return 'bg-gray-100 text-gray-600'
        }
    }

    const handleInviteVolunteer = async () => {
        if (!inviteEmail || !inviteEmail.trim()) {
            toast.error('Please enter an email address')
            return
        }

        setInviting(true)
        try {
            const response = await axios.post(
                `${backendUrl}api/volunteers/event/${eventId}/invite`,
                { email: inviteEmail.trim(), autoApprove },
                { withCredentials: true }
            )
            
            toast.success(response.data.message || 'Invitation sent successfully')
            setShowInviteModal(false)
            setInviteEmail('')
            setAutoApprove(false)
            fetchEventData() // Refresh volunteers list
        } catch (error) {
            console.error('Error inviting volunteer:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Failed to send invitation'
            
            // Provide more helpful error messages
            if (error.response?.status === 404) {
                if (errorMessage.includes('not found') || errorMessage.includes('not verified')) {
                    toast.error(errorMessage)
                } else {
                    toast.error('User not found or account not verified. Please ensure the user has registered and verified their email address.')
                }
            } else if (error.response?.status === 400) {
                toast.error(errorMessage)
            } else {
                toast.error(errorMessage)
            }
        } finally {
            setInviting(false)
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
            <div className="min-h-screen bg-[#F5F5F5]">
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
            <div className="min-h-screen bg-[#F5F5F5]">
                <Header />
                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <div className="w-14 h-14 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 mb-2">Event Not Found</h1>
                        <p className="text-sm text-gray-600 mb-6">This event doesn’t exist or you don’t have access.</p>
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
        )
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            <Header />

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <button
                    type="button"
                    onClick={() => navigate('/department/events')}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#800000] mb-4 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">Back to Events</span>
                </button>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight mb-1">Volunteer Management</h1>
                            <p className="font-medium text-gray-900 truncate">{event.title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
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
                            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200/80 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-amber-800 font-medium mb-1">QR Code Generation Rules</p>
                                        <ul className="text-amber-700 text-sm space-y-1 list-disc list-inside">
                                            <li><strong>Check-In QR:</strong> {isSingleDay ? 'Can be generated 1 day before event starts or during the event' : 'Can be generated during the event'}</li>
                                            <li><strong>Evaluation QR:</strong> Available 5 minutes before event end, or generated during the event</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    if (!canGenerateCheckInQR() && now < eventStart) {
                        return (
                            <div className="rounded-xl border border-blue-200/80 bg-blue-50/80 p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200/80 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-blue-800 font-medium mb-1">Check-In QR Available</p>
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

                <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
                    {[
                        { id: 'volunteers', label: 'Volunteers', count: volunteers.length },
                        { id: 'attendance', label: 'Attendance', count: attendance.length },
                        { id: 'exceptions', label: 'Exception Requests', count: exceptionRequests.length },
                        { id: 'feedback', label: 'Feedback', count: feedbackData?.records?.length || 0 },
                        { id: 'qr', label: 'QR Code', count: qrStatus?.hasQR ? 1 : 0 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-3 px-4 border-b-2 -mb-px font-medium text-sm shrink-0 transition ${
                                activeTab === tab.id
                                    ? 'border-[#800000] text-[#800000]'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Volunteers Tab */}
                    {activeTab === 'volunteers' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Registered Volunteers</h2>
                                        <p className="text-sm text-gray-500">{volunteers.filter(v => v.status === 'approved' || v.status === 'accepted').length} approved, {volunteers.length} total</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(true)}
                                    className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Invite Volunteer
                                </button>
                            </div>

                            {volunteers.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-700 mb-2">No volunteers registered</h3>
                                    <p className="text-sm text-gray-500">Volunteers will appear here once they register for your event.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {volunteers.map(volunteer => (
                                        <div key={volunteer._id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 hover:bg-gray-50 transition">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="flex items-center space-x-4 min-w-0">
                                                    <div className="w-12 h-12 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        {volunteer.user?.profileImage ? (
                                                            <img
                                                                src={volunteer.user.profileImage}
                                                                alt={volunteer.name}
                                                                className="w-12 h-12 rounded-xl object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-[#800000] font-semibold text-sm">
                                                                {(volunteer.name || volunteer.user?.name || 'V').charAt(0).toUpperCase()}
                                                            </span>
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
                                                <div className="flex items-center space-x-3 flex-wrap gap-2">
                                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getStatusColor(volunteer.status)}`}>
                                                        {volunteer.status}
                                                    </span>
                                                    {(volunteer.status === 'registered' || volunteer.status === 'invited') && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {volunteer.status === 'registered' && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleVolunteerStatusChange(volunteer.user._id, 'approved')}
                                                                        className="px-3 py-1.5 bg-[#800000] text-white text-xs font-medium rounded-xl hover:bg-[#6b0000] transition"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleVolunteerStatusChange(volunteer.user._id, 'rejected')}
                                                                        className="px-3 py-1.5 border border-red-200 text-red-700 text-xs font-medium rounded-xl hover:bg-red-50 transition"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            {volunteer.status === 'invited' && (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs rounded-lg border border-violet-200/80 font-medium inline-flex items-center gap-1">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                        </svg>
                                                                        Invitation Sent
                                                                    </span>
                                                                    <p className="text-xs text-violet-600">Waiting for user to accept</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveVolunteer(volunteer.user._id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
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
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">Feedback & Evaluation Management</h2>
                                            <p className="text-sm text-gray-500">Review and manage volunteer feedback, ratings, and hours.</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3">
                                        <p className="text-xs font-semibold text-amber-800 mb-1">Feedback Deadline Policy</p>
                                        <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                                            <li>Volunteers must submit feedback within <strong>24 hours after the event ends</strong></li>
                                            <li>Missing the deadline <strong>voids volunteer hours</strong>; organizers can override to reinstate</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-[#800000]/20 bg-[#F5E6E8] p-4">
                                    <div className="text-xs font-medium text-[#800000]/80 uppercase tracking-wide mb-1">Average Rating</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-[#800000]">
                                            {feedbackData?.event?.feedbackSummary?.averageRating
                                                ? feedbackData.event.feedbackSummary.averageRating.toFixed(1)
                                                : '0.0'}
                                        </span>
                                        <span className="text-base text-[#800000]/80">/ 5</span>
                                    </div>
                                    {feedbackData?.event?.feedbackSummary?.totalResponses ? (
                                        <div className="text-xs mt-1 text-gray-600">
                                            {feedbackData.event.feedbackSummary.totalResponses} response{feedbackData.event.feedbackSummary.totalResponses !== 1 ? 's' : ''}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {feedbackData?.records && feedbackData.records.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                                        <div className="text-sm text-gray-600 mb-1">Total Records</div>
                                        <div className="text-xl font-bold text-gray-900">{feedbackData.records.length}</div>
                                    </div>
                                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-4">
                                        <div className="text-sm text-amber-700 mb-1">Pending Feedback</div>
                                        <div className="text-xl font-bold text-amber-800">{feedbackData.records.filter(r => r.status === 'pending').length}</div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-4">
                                        <div className="text-sm text-emerald-700 mb-1">Submitted</div>
                                        <div className="text-xl font-bold text-emerald-800">{feedbackData.records.filter(r => r.status === 'submitted' || r.status === 'overridden').length}</div>
                                    </div>
                                    <div className="rounded-xl border border-red-200/80 bg-red-50/80 p-4">
                                        <div className="text-sm text-red-700 mb-1">Missed/Voided</div>
                                        <div className="text-xl font-bold text-red-800">{feedbackData.records.filter(r => r.status === 'missed' || r.status === 'voided').length}</div>
                                    </div>
                                </div>
                            )}

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
                                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l9-5-9-5-9 5 9 5zm0 0V10m0 10l-9-5m9-5l9 5" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-700 mb-2">No feedback records yet</h3>
                                    <p className="text-sm text-gray-500">Feedback will appear here once volunteers submit their ratings.</p>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Volunteer</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date & Time</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Hours</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rating</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Feedback</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deadline</th>
                                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                                {(feedbackData?.records || []).map(record => {
                                                    const deadline = record.deadlineAt ? new Date(record.deadlineAt) : null;
                                                    const now = new Date();
                                                    const isOverdue = deadline && now > deadline && record.status === 'pending';
                                                    const hoursWorked = record.hoursWorked || record.totalHours || 0;
                                                    
                                                    return (
                                                        <tr key={record._id} className={`hover:bg-gray-50 transition-colors ${
                                                            isOverdue ? 'bg-red-50/50' : ''
                                                        }`}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden bg-[#F5E6E8] border border-[#800000]/10">
                                                                        {record.volunteer?.profileImage ? (
                                                                            <img 
                                                                                src={record.volunteer.profileImage} 
                                                                                alt={record.volunteer?.name || 'Volunteer'}
                                                                                className="w-10 h-10 rounded-full object-cover"
                                                                                onError={(e) => {
                                                                                    // Fallback to initials if image fails to load
                                                                                    e.target.style.display = 'none';
                                                                                    const parent = e.target.parentElement;
                                                                                    if (parent && !parent.querySelector('.initials')) {
                                                                                        const initials = (record.volunteer?.name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                                                                                        const initialsDiv = document.createElement('div');
                                                                                        initialsDiv.className = 'initials text-white text-xs font-semibold';
                                                                                        initialsDiv.textContent = initials;
                                                                                        parent.appendChild(initialsDiv);
                                                                                    }
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <span className="text-[#800000] text-xs font-semibold">
                                                                                {(record.volunteer?.name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900">{record.volunteer?.name || 'Volunteer'}</div>
                                                                        <div className="text-xs text-gray-500">{record.volunteer?.email || ''}</div>
                                                                    </div>
                                                                </div>
                                                    </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm text-gray-900">
                                                                    {record.date ? new Date(record.date).toLocaleDateString('en-US', { 
                                                                        month: 'short', 
                                                                        day: 'numeric', 
                                                                        year: 'numeric' 
                                                                    }) : '—'}
                                                                </div>
                                                                <div className="text-xs text-gray-500">
                                                                    {record.checkInTime ? `In: ${new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                                    {record.checkOutTime ? ` | Out: ${new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                                </div>
                                                    </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className={`text-sm font-semibold ${record.voidedHours ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                                                                    {record.voidedHours ? '0.0' : hoursWorked.toFixed(1)} hrs
                                                                </div>
                                                                {record.voidedHours && (
                                                                    <div className="text-xs text-red-600 font-medium mt-1">
                                                                        {record.status === 'missed' ? 'Voided (Deadline Missed)' : 'Voided'}
                                                                    </div>
                                                                )}
                                                                {!record.voidedHours && isOverdue && record.status === 'pending' && (
                                                                    <div className="text-xs text-yellow-600 font-medium mt-1">
                                                                        Will be voided if not submitted
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                                    record.status === 'submitted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                                    record.status === 'pending' ? isOverdue 
                                                                        ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' 
                                                                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                                                                    record.status === 'missed' ? 'bg-red-100 text-red-800 border border-red-200' :
                                                                    record.status === 'overridden' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                                    record.status === 'voided' ? 'bg-gray-200 text-gray-700 border border-gray-300' :
                                                                    'bg-gray-100 text-gray-600 border border-gray-200'
                                                                }`}>
                                                                    {record.status === 'pending' && isOverdue ? 'Overdue' : record.status}
                                                        </span>
                                                    </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {record.feedback?.rating ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="flex">
                                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                                <svg
                                                                                    key={star}
                                                                                    className={`w-4 h-4 ${
                                                                                        star <= record.feedback.rating
                                                                                            ? 'text-yellow-400 fill-current'
                                                                                            : 'text-gray-300'
                                                                                    }`}
                                                                                    fill="currentColor"
                                                                                    viewBox="0 0 20 20"
                                                                                >
                                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                                </svg>
                                                                            ))}
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-700 ml-1">
                                                                            {record.feedback.rating}/5
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">—</span>
                                                                )}
                                                    </td>
                                                            <td className="px-6 py-4">
                                                        {record.feedback?.comment ? (
                                                                    <div className="max-w-xs">
                                                                        <p className="text-sm text-gray-700 line-clamp-2">
                                                                {record.feedback.comment}
                                                                        </p>
                                                                        {record.feedback.overridden && record.feedback.overrideReason && (
                                                                            <p className="text-xs text-blue-600 mt-1 italic">
                                                                                Override: {record.feedback.overrideReason}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">No feedback</span>
                                                        )}
                                                    </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {deadline ? (
                                                                    <div>
                                                                        <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                                                                            {deadline.toLocaleDateString('en-US', { 
                                                                                month: 'short', 
                                                                                day: 'numeric',
                                                                                year: 'numeric'
                                                                            })}
                                                                        </div>
                                                                        <div className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                                                                            {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                        {isOverdue && record.status === 'pending' && (
                                                                            <div className="text-xs text-red-600 font-semibold mt-1 bg-red-50 px-2 py-1 rounded">
                                                                                ⚠️ Overdue - Hours will be voided
                                                                            </div>
                                                                        )}
                                                                        {isOverdue && record.status === 'missed' && (
                                                                            <div className="text-xs text-red-600 font-semibold mt-1 bg-red-50 px-2 py-1 rounded">
                                                                                ❌ Deadline Missed - Hours Voided
                                                                            </div>
                                                                        )}
                                                                        {!isOverdue && record.status === 'pending' && (
                                                                            <div className="text-xs text-yellow-600 font-medium mt-1">
                                                                                {Math.ceil((deadline - now) / (1000 * 60 * 60))}h remaining
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400 text-sm">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                                <div className="flex flex-col gap-2">
                                                                    {record.status === 'missed' || record.status === 'voided' ? (
                                                        <button
                                                                            onClick={() => {
                                                                                if (window.confirm(`Reinstate hours for ${record.volunteer?.name || 'this volunteer'}? This will restore ${hoursWorked.toFixed(1)} hours.`)) {
                                                                                    handleOverrideFeedback(record._id, true);
                                                                                }
                                                                            }}
                                                                            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Reinstate Hours
                                                        </button>
                                                                    ) : record.status === 'pending' && isOverdue ? (
                                                                        <>
                                                        <button
                                                                                onClick={() => {
                                                                                    if (window.confirm(`Reinstate hours for ${record.volunteer?.name || 'this volunteer'}? This will restore ${hoursWorked.toFixed(1)} hours despite missing the 24-hour feedback deadline. The volunteer can still submit feedback.`)) {
                                                                                        handleOverrideFeedback(record._id, true);
                                                                                    }
                                                                                }}
                                                                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm"
                                                                            >
                                                                                Override & Reinstate Hours
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (window.confirm(`Void hours for ${record.volunteer?.name || 'this volunteer'}? This will permanently remove ${hoursWorked.toFixed(1)} hours due to missing the feedback deadline.`)) {
                                                                                        handleOverrideFeedback(record._id, false);
                                                                                    }
                                                                                }}
                                                                                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                                                        >
                                                            Void Hours (Enforce Deadline)
                                                        </button>
                                                                        </>
                                                                    ) : record.status === 'submitted' || record.status === 'overridden' ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (window.confirm(`Void hours for ${record.volunteer?.name || 'this volunteer'}? This will remove ${hoursWorked.toFixed(1)} hours.`)) {
                                                                                    handleOverrideFeedback(record._id, false);
                                                                                }
                                                                            }}
                                                                            className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                                                                        >
                                                                            Void Hours
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                    </td>
                                                </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Attendance Tab */}
                    {activeTab === 'attendance' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Attendance Records</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={validateAttendance}
                                    className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition w-full sm:w-auto flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Validate Attendance
                                </button>
                            </div>

                            {attendance.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-700 mb-2">No attendance records</h3>
                                    <p className="text-sm text-gray-500">Attendance will appear here once volunteers check in.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-100">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50/80 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Volunteer</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Check In</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Check Out</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Hours</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">Total Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {attendance.map((record, volunteerIndex) => {
                                                const hasMultipleDates = record.attendanceByDate && record.attendanceByDate.length > 1;
                                                const totalRows = record.attendanceByDate 
                                                    ? record.attendanceByDate.reduce((sum, dateEntry) => sum + dateEntry.records.length, 0)
                                                    : (record.validRecords?.length || 0) + (record.invalidRecords?.length || 0);
                                                
                                                return record.attendanceByDate && record.attendanceByDate.length > 0 ? (
                                                    record.attendanceByDate.map((dateEntry, dateIndex) => 
                                                        dateEntry.records.map((attendanceRecord, recordIndex) => {
                                                            const isFirstRow = dateIndex === 0 && recordIndex === 0;
                                                            const showVolunteerCell = isFirstRow;
                                                            const showTotalHours = isFirstRow && recordIndex === 0;
                                                            
                                                            // Format date
                                                            const formatDate = (dateStr) => {
                                                                if (!dateStr || dateStr === 'Unknown') return 'N/A';
                                                                try {
                                                                    const date = new Date(dateStr);
                                                                    return date.toLocaleDateString('en-US', { 
                                                                        year: 'numeric', 
                                                                        month: 'short', 
                                                                        day: 'numeric' 
                                                                    });
                                                                } catch {
                                                                    return dateStr;
                                                                }
                                                            };
                                                            
                                                            // Format time
                                                            const formatTime = (isoString) => {
                                                                if (!isoString) return '-';
                                                                try {
                                                                    const date = new Date(isoString);
                                                                    return date.toLocaleTimeString('en-US', { 
                                                                        hour: '2-digit', 
                                                                        minute: '2-digit',
                                                                        hour12: true 
                                                                    });
                                                                } catch {
                                                                    return '-';
                                                                }
                                                            };
                                                            
                                                            return (
                                                                <tr 
                                                                    key={`${record.volunteer._id}-${dateEntry.date}-${recordIndex}`}
                                                                    className={`hover:bg-gray-50 ${!attendanceRecord.isValid || attendanceRecord.voidedHours ? 'bg-red-50' : ''}`}
                                                                >
                                                                    {showVolunteerCell && (
                                                                        <td 
                                                                            className="px-4 py-3 whitespace-nowrap border-r border-gray-200" 
                                                                            rowSpan={totalRows}
                                                                        >
                                                                            <div className="flex items-center space-x-3">
                                                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#F5E6E8] border border-[#800000]/10">
                                                                                    {record.volunteer.profileImage ? (
                                                                                        <img 
                                                                                            src={record.volunteer.profileImage} 
                                                                                            alt={record.volunteer.name}
                                                                                            className="w-10 h-10 rounded-full object-cover"
                                                                                            onError={(e) => {
                                                                                                // Fallback to initials if image fails to load
                                                                                                e.target.style.display = 'none';
                                                                                                const parent = e.target.parentElement;
                                                                                                if (parent && !parent.querySelector('.initials')) {
                                                                                                    const initials = (record.volunteer.name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                                                                                                    const initialsDiv = document.createElement('div');
                                                                                                    initialsDiv.className = 'initials text-white text-xs font-semibold';
                                                                                                    initialsDiv.textContent = initials;
                                                                                                    parent.appendChild(initialsDiv);
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    ) : (
                                                                                        <span className="text-[#800000] text-xs font-semibold">
                                                                                            {(record.volunteer.name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="font-semibold text-gray-900 text-sm">{record.volunteer.name}</div>
                                                                                    <div className="text-xs text-gray-500 truncate">{record.volunteer.email}</div>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    )}
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                                        {formatDate(dateEntry.date)}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                                        {formatTime(attendanceRecord.checkIn || attendanceRecord.timeIn)}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                                        {formatTime(attendanceRecord.checkOut || attendanceRecord.timeOut)}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                                        {attendanceRecord.voidedHours ? (
                                                                            <span className="text-red-600">0.0</span>
                                                                        ) : (
                                                                            (attendanceRecord.hours || 0).toFixed(1)
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                        {!attendanceRecord.isValid || attendanceRecord.voidedHours ? (
                                                                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-700">
                                                                                Invalid
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700">
                                                                                Valid
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    {showTotalHours && (
                                                                        <td 
                                                                            className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border-l border-gray-200" 
                                                                            rowSpan={totalRows}
                                                                        >
                                                                            {record.totalHours.toFixed(1)} hrs
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })
                                                    )
                                                ) : (
                                                    // Fallback for old data format (without attendanceByDate)
                                                    <tr key={record.volunteer._id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#F5E6E8] border border-[#800000]/10">
                                                                    {record.volunteer.profileImage ? (
                                                                        <img 
                                                                            src={record.volunteer.profileImage} 
                                                                            alt={record.volunteer.name}
                                                                            className="w-10 h-10 rounded-full object-cover"
                                                                            onError={(e) => {
                                                                                // Fallback to initials if image fails to load
                                                                                e.target.style.display = 'none';
                                                                                const parent = e.target.parentElement;
                                                                                if (parent && !parent.querySelector('.initials')) {
                                                                                    const initials = (record.volunteer.name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                                                                                    const initialsDiv = document.createElement('div');
                                                                                    initialsDiv.className = 'initials text-white text-xs font-semibold';
                                                                                    initialsDiv.textContent = initials;
                                                                                    parent.appendChild(initialsDiv);
                                                                                }
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <span className="text-[#800000] text-xs font-semibold">
                                                                            {(record.volunteer.name || 'V').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-semibold text-gray-900 text-sm">{record.volunteer.name}</div>
                                                                    <div className="text-xs text-gray-500 truncate">{record.volunteer.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">-</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
                                                                No Records
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                            {record.totalHours.toFixed(1)} hrs
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* QR Code Tab */}
                    {activeTab === 'qr' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">QR Codes for Attendance</h2>
                                </div>
                                {qrStatus?.hasCheckOutQR && qrStatus?.checkOutActive && (
                                    <button
                                        type="button"
                                        onClick={closeEvaluationQR}
                                        className="px-4 py-2.5 border border-red-200 text-red-700 text-sm font-medium rounded-xl hover:bg-red-50 transition"
                                    >
                                        Close Evaluation QR
                                    </button>
                                )}
                            </div>

                            <div className="mb-8">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Check-In QR Code (Time In)</h3>
                                {qrStatus?.hasCheckInQR && qrStatus?.checkInActive ? (
                                <div className="text-center">
                                    <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-6 mb-4">
                                        <img 
                                                src={qrStatus.checkInQR} 
                                                alt="Check-In QR Code" 
                                            className="mx-auto mb-4 max-w-full"
                                            style={{ maxWidth: '400px', minHeight: '300px' }}
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
                                                type="button"
                                                onClick={() => downloadQRAsPDF(qrStatus.checkInQR, 'checkIn')}
                                                className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download PDF
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 rounded-xl border border-gray-100 bg-gray-50/80">
                                        <p className="text-gray-600 mb-4 text-sm">No check-in QR code generated yet</p>
                                        <button
                                            type="button"
                                            onClick={() => generateQRCode('checkIn')}
                                            disabled={!canGenerateCheckInQR() || qrGeneratingCheckIn}
                                            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                                                canGenerateCheckInQR() && !qrGeneratingCheckIn
                                                    ? 'bg-[#800000] text-white hover:bg-[#6b0000]'
                                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {qrGeneratingCheckIn ? 'Generating...' : 'Generate Check-In QR'}
                                        </button>
                                    </div>
                                )}
                                </div>

                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Evaluation QR Code (Time Out)</h3>
                                {qrStatus?.hasCheckOutQR && qrStatus?.checkOutActive ? (
                                    <div className="text-center">
                                        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-6 mb-4">
                                            <img 
                                                src={qrStatus.checkOutQR} 
                                                alt="Evaluation QR Code" 
                                                className="mx-auto mb-4 max-w-full"
                                                style={{ maxWidth: '400px', minHeight: '300px' }}
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
                                                type="button"
                                                onClick={() => downloadQRAsPDF(qrStatus.checkOutQR, 'checkOut')}
                                                className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download PDF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={closeEvaluationQR}
                                                className="px-4 py-2.5 border border-red-200 text-red-700 text-sm font-medium rounded-xl hover:bg-red-50 transition"
                                            >
                                                Close Evaluation QR
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 rounded-xl border border-gray-100 bg-gray-50/80">
                                        <p className="text-gray-600 mb-4 text-sm">
                                            {(() => {
                                                const now = new Date()
                                                const eventEnd = new Date(event.endDate)
                                                const fiveMinutesBeforeEnd = new Date(eventEnd.getTime() - (5 * 60 * 1000))
                                                if (now < fiveMinutesBeforeEnd) {
                                                    return 'Evaluation QR will appear 5 minutes before event end'
                                                }
                                                return 'No evaluation QR code generated yet'
                                            })()}
                                        </p>
                                        {canGenerateCheckOutQR() && (
                                            <button
                                                type="button"
                                                onClick={() => generateQRCode('checkOut')}
                                                disabled={qrGeneratingCheckOut}
                                                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                                                    !qrGeneratingCheckOut
                                                        ? 'bg-[#800000] text-white hover:bg-[#6b0000]'
                                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                {qrGeneratingCheckOut ? 'Generating...' : 'Generate Evaluation QR'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Exception Requests Tab */}
                    {activeTab === 'exceptions' && (
                        <div className="px-4 sm:px-6 py-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900">Exception Requests</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchExceptionRequests}
                                    disabled={exceptionLoading}
                                    className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition flex items-center gap-2 disabled:opacity-50"
                                >
                                    <svg className={`w-4 h-4 ${exceptionLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>

                            {exceptionLoading ? (
                                <div className="text-center py-12">
                                    <LoadingSpinner size="medium" />
                                    <p className="mt-4 text-sm text-gray-600">Loading exception requests...</p>
                                </div>
                            ) : exceptionRequests.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-700 mb-2">No pending exception requests</h3>
                                    <p className="text-sm text-gray-500">All requests have been reviewed or none submitted yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {exceptionRequests.map((request) => (
                                        <div key={request.attendanceId} className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 hover:bg-gray-50/50 transition">
                                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-4 mb-4">
                                                        {request.volunteer?.profileImage ? (
                                                            <img 
                                                                src={request.volunteer.profileImage} 
                                                                alt={request.volunteer.name}
                                                                className="w-12 h-12 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center">
                                                                <span className="text-[#800000] font-semibold text-sm">
                                                                    {request.volunteer?.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'V'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <h3 className="text-base font-semibold text-gray-900">{request.volunteer?.name || 'Unknown Volunteer'}</h3>
                                                            <p className="text-sm text-gray-600">{request.volunteer?.email || ''}</p>
                                                            <p className="text-sm text-gray-500 mt-1">Event: {request.event?.title || 'Unknown Event'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="mb-4 p-4 rounded-xl border border-amber-200/80 bg-amber-50/80">
                                                        <p className="text-sm font-semibold text-amber-900 mb-2">Reason for Exception</p>
                                                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{request.exceptionRequest?.reason || 'No reason provided'}</p>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-gray-500">Date:</p>
                                                            <p className="font-semibold text-gray-900">
                                                                {new Date(request.date).toLocaleDateString(undefined, {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric'
                                                                })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Time In:</p>
                                                            <p className="font-semibold text-gray-900">
                                                                {request.timeIn ? new Date(request.timeIn).toLocaleTimeString([], { 
                                                                    hour: 'numeric', 
                                                                    minute: '2-digit' 
                                                                }) : 'Not recorded'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Requested At:</p>
                                                            <p className="font-semibold text-gray-900">
                                                                {request.exceptionRequest?.requestedAt 
                                                                    ? new Date(request.exceptionRequest.requestedAt).toLocaleString()
                                                                    : 'N/A'}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                                                request.exceptionRequest?.status === 'pending'
                                                                    ? 'bg-amber-50 text-amber-700'
                                                                    : request.exceptionRequest?.status === 'approved'
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'bg-red-50 text-red-700'
                                                            }`}>
                                                                {request.exceptionRequest?.status || 'pending'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {request.exceptionRequest?.status === 'pending' && (
                                                    <div className="flex flex-col gap-2 lg:flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedException(request)}
                                                            className="px-4 py-2.5 bg-[#800000] text-white text-sm font-medium rounded-xl hover:bg-[#6b0000] transition"
                                                        >
                                                            Review Request
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {selectedException && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900">Review Exception Request</h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedException(null)
                                        setReviewNotes('')
                                    }}
                                    className="p-2 hover:bg-gray-50 rounded-xl transition"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Volunteer Information</h4>
                                <p className="text-gray-700">{selectedException.volunteer?.name}</p>
                                <p className="text-sm text-gray-600">{selectedException.volunteer?.email}</p>
                            </div>
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Reason Provided</h4>
                                <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/80">
                                    <p className="text-sm text-amber-800 whitespace-pre-wrap">
                                        {selectedException.exceptionRequest?.reason || 'No reason provided'}
                                    </p>
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Review Notes (Optional)</label>
                                <textarea
                                    rows={4}
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none resize-none transition"
                                    placeholder="Add any notes about your decision (e.g., reason for rejection)..."
                                    maxLength={500}
                                />
                                <div className="mt-2 text-xs text-gray-400 text-right">{reviewNotes.length}/500</div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedException(null)
                                        setReviewNotes('')
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReviewException('reject')}
                                    disabled={reviewing}
                                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {reviewing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            <span>Reject</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReviewException('approve')}
                                    disabled={reviewing}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {reviewing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Approve</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Invite Volunteer</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowInviteModal(false)
                                    setInviteEmail('')
                                    setAutoApprove(false)
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000] outline-none transition"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !inviting) handleInviteVolunteer()
                                    }}
                                />
                                <p className="mt-2 text-xs text-gray-500">
                                    User must have a registered and verified account with this email.
                                </p>
                            </div>
                            <div className="mb-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoApprove}
                                        onChange={(e) => setAutoApprove(e.target.checked)}
                                        className="w-4 h-4 text-[#800000] border-gray-300 rounded focus:ring-[#800000]"
                                    />
                                    <span className="text-sm text-gray-700">Auto-approve when accepted</span>
                                </label>
                                <p className="mt-1 text-xs text-gray-500 ml-6">Volunteer will be approved automatically when they accept.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInviteModal(false)
                                        setInviteEmail('')
                                        setAutoApprove(false)
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition"
                                    disabled={inviting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleInviteVolunteer}
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="flex-1 px-4 py-2.5 bg-[#800000] text-white rounded-xl font-medium text-sm hover:bg-[#6b0000] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {inviting ? 'Sending...' : 'Send Invitation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default VolunteerManagement