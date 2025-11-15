import React, { useState, useContext, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FaStar } from 'react-icons/fa'

const EventAttendance = () => {
    const { backendUrl, userData } = useContext(AppContent)
    const { eventId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [attendanceStatus, setAttendanceStatus] = useState(null)
    const [attendanceData, setAttendanceData] = useState(null)
    const [pendingFeedback, setPendingFeedback] = useState(null)
    const [feedbackLoading, setFeedbackLoading] = useState(false)
    const [feedbackForm, setFeedbackForm] = useState({
        rating: 0,
        comment: ''
    })
    const [submittingFeedback, setSubmittingFeedback] = useState(false)

    // Fetch event data
    const fetchEventData = useCallback(async () => {
        if (!eventId) return
        try {
            setLoading(true)
            const response = await axios.get(`${backendUrl}api/events/${eventId}`, { 
                withCredentials: true 
            })
            const eventData = response.data.event || response.data
            if (!eventData) {
                throw new Error('Event data not found in response')
            }
            if (eventData.volunteerRegistrations && eventData.volunteerRegistrations.length > 0) {
                eventData.volunteerRegistrations = eventData.volunteerRegistrations.map(reg => ({
                    ...reg,
                    user: reg.user?._id ? reg.user : reg.user
                }))
            }
            setEvent(eventData)
        } catch (error) {
            console.error('Error fetching event data:', error)
            if (error.response?.status === 404) {
                toast.error('Event not found')
            } else if (error.response?.status === 403) {
                toast.error('You do not have access to this event')
            } else {
                toast.error(error.response?.data?.message || 'Failed to load event data')
            }
        } finally {
            setLoading(false)
        }
    }, [eventId, backendUrl])

    // Fetch attendance status
    const fetchAttendanceStatus = useCallback(() => {
        if (!event || !userData?._id) return
        
        if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
            const userReg = event.volunteerRegistrations.find(reg => 
                String(reg.user?._id || reg.user) === String(userData._id)
            )
            if (userReg?.attendanceRecords && userReg.attendanceRecords.length > 0) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const todayRecord = userReg.attendanceRecords.find(record => {
                    const recordDate = new Date(record.date)
                    recordDate.setHours(0, 0, 0, 0)
                    return recordDate.getTime() === today.getTime()
                }) || userReg.attendanceRecords[userReg.attendanceRecords.length - 1]
                
                if (todayRecord) {
                    if (todayRecord.timeOut) {
                        setAttendanceStatus('completed')
                        setAttendanceData({
                            _id: todayRecord._id,
                            checkInTime: todayRecord.timeIn,
                            checkOutTime: todayRecord.timeOut,
                            hoursWorked: todayRecord.totalHours || 0
                        })
                    } else if (todayRecord.timeIn) {
                        setAttendanceStatus('timeout')
                        setAttendanceData({
                            _id: todayRecord._id,
                            checkInTime: todayRecord.timeIn,
                            hoursWorked: 0
                        })
                    }
                }
            }
        }
    }, [event, userData?._id])

    useEffect(() => {
        if (eventId) {
            fetchEventData()
        }
    }, [eventId, fetchEventData])

    // Fetch pending feedback for this event
    const fetchPendingFeedback = useCallback(async () => {
        if (!eventId || !userData?._id) return
        try {
            setFeedbackLoading(true)
            const response = await axios.get(`${backendUrl}api/feedback/me/pending`, { 
                withCredentials: true 
            })
            if (response.data?.success) {
                // Filter feedback for this specific event
                const eventFeedback = response.data.records?.find(record => 
                    String(record.event?._id || record.event) === String(eventId)
                )
                setPendingFeedback(eventFeedback || null)
            }
        } catch (error) {
            console.error('Error fetching pending feedback:', error)
        } finally {
            setFeedbackLoading(false)
        }
    }, [eventId, userData?._id, backendUrl])

    useEffect(() => {
        if (event && userData?._id) {
            fetchAttendanceStatus()
            fetchPendingFeedback()
        }
    }, [event?._id, userData?._id, fetchAttendanceStatus, fetchPendingFeedback])

    // Check if redirected from QR scanner and refresh pending feedback
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search)
        const fromQR = urlParams.get('fromQR')
        if (fromQR === 'true') {
            // Refresh pending feedback when coming from QR scanner
            fetchPendingFeedback()
            // Clean up URL
            window.history.replaceState({}, '', `/volunteer/attendance/${eventId}`)
        }
    }, [location.search, eventId, fetchPendingFeedback])

    // Scroll to feedback section when pending feedback is available
    useEffect(() => {
        if (pendingFeedback) {
            setTimeout(() => {
                const feedbackSection = document.getElementById('pending-feedback-section')
                if (feedbackSection) {
                    feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 300)
        }
    }, [pendingFeedback])

    const handleFeedbackChange = (field, value) => {
        setFeedbackForm(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSubmitFeedback = async () => {
        if (!pendingFeedback?._id) {
            toast.error('Feedback record not found')
            console.error('Pending feedback missing:', pendingFeedback)
            return
        }

        if (!feedbackForm.rating || feedbackForm.rating < 1 || feedbackForm.rating > 5) {
            toast.error('Please select a rating from 1 to 5 stars')
            console.error('Invalid rating:', feedbackForm.rating)
            return
        }

        if (!feedbackForm.comment || feedbackForm.comment.trim().length === 0) {
            toast.error('Please provide feedback message')
            console.error('Empty comment:', feedbackForm.comment)
            return
        }

        setSubmittingFeedback(true)
        try {
            console.log('Submitting feedback:', {
                attendanceId: pendingFeedback._id,
                rating: feedbackForm.rating,
                comment: feedbackForm.comment
            })
            const response = await axios.post(
                `${backendUrl}api/feedback/${pendingFeedback._id}`,
                {
                    rating: Number(feedbackForm.rating),
                    comment: feedbackForm.comment.trim()
                },
                { withCredentials: true }
            )

            if (response.data?.success) {
                toast.success('Thank you for your feedback!')
                setPendingFeedback(null)
                setFeedbackForm({ rating: 0, comment: '' })
                // Refresh attendance status and feedback
                fetchAttendanceStatus()
                fetchPendingFeedback()
            }
        } catch (error) {
            console.error('Error submitting feedback:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Failed to submit feedback'
            
            // Show more specific error messages
            if (error.response?.status === 400) {
                if (errorMessage.includes('not completed')) {
                    toast.error('Please complete your attendance (Time Out) before submitting feedback')
                } else if (errorMessage.includes('already submitted')) {
                    toast.error('Feedback has already been submitted for this attendance')
                } else if (errorMessage.includes('Rating must be')) {
                    toast.error('Please select a valid rating from 1 to 5 stars')
                } else if (errorMessage.includes('Feedback message is required')) {
                    toast.error('Please provide feedback message')
                } else {
                    toast.error(errorMessage)
                }
            } else if (error.response?.status === 403) {
                toast.error('You do not have permission to submit feedback for this attendance')
            } else if (error.response?.status === 404) {
                toast.error('Attendance record not found. Please refresh the page.')
            } else {
                toast.error(errorMessage)
            }
        } finally {
            setSubmittingFeedback(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[70vh]">
                    <LoadingSpinner size="large" text="Loading attendance..." />
                </div>
                <Footer />
            </div>
        )
    }

    if (!event) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <Header />
                <main className="max-w-4xl mx-auto px-6 py-12">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Event Not Found</h1>
                        <p className="text-gray-600 mb-8">The event you're looking for doesn't exist or you don't have access to it.</p>
                        <button 
                            onClick={() => navigate('/user/events')}
                            className="bg-gradient-to-r from-[#800000] to-[#a00000] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Header />
            
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Pending Volunteer Feedback Section - First Priority */}
                {(feedbackLoading || pendingFeedback) && (
                    <section id="pending-feedback-section" className="mb-6 sm:mb-8">
                        <div className="bg-gradient-to-br from-white via-yellow-50/30 to-amber-50/50 rounded-2xl shadow-xl border-2 border-yellow-200/60 p-6 sm:p-8 relative overflow-hidden">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-200/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-200/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-start justify-between gap-4 mb-6">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-4.215A2 2 0 0016.695 11H16V7a4 4 0 10-8 0v4h-.695a2 2 0 00-1.9 1.318L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-2xl sm:text-3xl font-bold text-[#800000] mb-2">Pending Volunteer Feedback</h2>
                                            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                                Submit your feedback within the deadline to keep your volunteer hours valid.
                                            </p>
                                        </div>
                                    </div>
                                    {pendingFeedback && (
                                        <span className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-sm ${
                                            pendingFeedback.overdue 
                                                ? 'bg-red-100 text-red-700 border-2 border-red-300' 
                                                : 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                                        }`}>
                                            {pendingFeedback.overdue ? 'Overdue' : 'Pending'}
                                        </span>
                                    )}
                                </div>

                                {feedbackLoading && (
                                    <div className="flex items-center justify-center gap-3 py-12">
                                        <LoadingSpinner size="medium" />
                                        <span className="text-gray-600 font-medium">Loading feedback form...</span>
                                    </div>
                                )}

                                {!feedbackLoading && pendingFeedback && (
                                    <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-yellow-200/60 p-6 sm:p-8 shadow-lg">
                                        {/* Warning if attendance not completed */}
                                        {pendingFeedback.status === 'pending' && !pendingFeedback.timeOut && !pendingFeedback.checkOutTime && (
                                            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                                                <p className="text-sm text-amber-800 font-semibold flex items-center gap-2">
                                                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    You need to complete your attendance (Time Out) before submitting feedback. Please scan the Time Out QR code first.
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Event Info */}
                                        <div className="mb-6 pb-6 border-b-2 border-gray-100">
                                            <h3 className="text-xl sm:text-2xl font-bold text-[#800000] mb-2">{event?.title || 'Event'}</h3>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>
                                                        Attended on {new Date(pendingFeedback.date).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                                {pendingFeedback.deadlineAt && (
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className={pendingFeedback.overdue ? 'text-red-600 font-semibold' : ''}>
                                                            Deadline: {new Date(pendingFeedback.deadlineAt).toLocaleString(undefined, {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: 'numeric',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Rating Section */}
                                        <div className="mb-6">
                                            <label className="block text-base sm:text-lg font-bold text-gray-900 mb-4">
                                                Rate your experience <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-3 sm:gap-4 justify-center sm:justify-start">
                                                {[1, 2, 3, 4, 5].map(value => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => handleFeedbackChange('rating', value)}
                                                        className="focus:outline-none transform transition-all duration-200 hover:scale-125 active:scale-95"
                                                    >
                                                        <FaStar
                                                            className={`w-10 h-10 sm:w-12 sm:h-12 transition-all duration-200 ${
                                                                feedbackForm.rating >= value 
                                                                    ? 'text-[#FFD700] fill-[#FFD700] drop-shadow-lg' 
                                                                    : 'text-gray-300 hover:text-yellow-200'
                                                            }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            {feedbackForm.rating > 0 && (
                                                <p className="text-center sm:text-left mt-3 text-sm text-gray-600">
                                                    {feedbackForm.rating === 5 && 'Excellent! ⭐⭐⭐⭐⭐'}
                                                    {feedbackForm.rating === 4 && 'Great! ⭐⭐⭐⭐'}
                                                    {feedbackForm.rating === 3 && 'Good! ⭐⭐⭐'}
                                                    {feedbackForm.rating === 2 && 'Fair ⭐⭐'}
                                                    {feedbackForm.rating === 1 && 'Poor ⭐'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Feedback Comment Section */}
                                        <div className="mb-6">
                                            <label className="block text-base sm:text-lg font-bold text-gray-900 mb-3">
                                                Feedback <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <textarea
                                                    rows={5}
                                                    value={feedbackForm.comment}
                                                    onChange={(e) => handleFeedbackChange('comment', e.target.value)}
                                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm sm:text-base focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] outline-none resize-none transition-all duration-200 bg-white/90"
                                                    placeholder="Share highlights, challenges, or suggestions about your volunteer experience..."
                                                    maxLength={2000}
                                                    required
                                                />
                                                <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
                                                    {feedbackForm.comment.length}/2000
                                                </div>
                                            </div>
                                            {(!feedbackForm.comment || feedbackForm.comment.trim().length === 0) && (
                                                <p className="text-xs text-red-600 mt-1">Feedback message is required</p>
                                            )}
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            onClick={handleSubmitFeedback}
                                            disabled={submittingFeedback || !feedbackForm.rating || !feedbackForm.comment || feedbackForm.comment.trim().length === 0}
                                            className="w-full bg-gradient-to-r from-[#800000] to-[#a00000] text-white px-8 py-4 rounded-xl font-bold text-base sm:text-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                                            title={
                                                submittingFeedback ? 'Submitting...' :
                                                !feedbackForm.rating ? 'Please select a rating' :
                                                !feedbackForm.comment || feedbackForm.comment.trim().length === 0 ? 'Please provide feedback message' :
                                                'Submit feedback'
                                            }
                                        >
                                            {submittingFeedback ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Submitting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span>Submit Feedback</span>
                                                </>
                                            )}
                                        </button>

                                        {pendingFeedback.overdue && (
                                            <div className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                                                <p className="text-sm text-amber-700 font-semibold flex items-center gap-2">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Note: The original feedback deadline has passed, but you can still submit your feedback anytime.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!feedbackLoading && !pendingFeedback && (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-600 font-medium">No pending feedback for this event. Thank you!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Header Section */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/user/events/${eventId}`)}
                                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Event Attendance</h1>
                                <p className="text-lg font-semibold text-[#800000]">{event.title}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    {new Date(event.startDate).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                    })} - {new Date(event.endDate).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Status Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#800000] to-[#a00000] rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        Attendance Status
                    </h2>
                    
                    <div className="space-y-4">
                        {/* Time In Status */}
                        <div className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
                            attendanceStatus === 'timeout' || attendanceStatus === 'completed' 
                                ? 'bg-green-50 border-green-300' 
                                : 'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    attendanceStatus === 'timeout' || attendanceStatus === 'completed'
                                        ? 'bg-green-500'
                                        : 'bg-gray-400'
                                }`}>
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Time In</p>
                                    {attendanceData?.checkInTime && (
                                        <p className="text-sm text-gray-600">
                                            {new Date(attendanceData.checkInTime).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                                attendanceStatus === 'timeout' || attendanceStatus === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                {attendanceStatus === 'timeout' || attendanceStatus === 'completed' ? '✓ Completed' : 'Pending'}
                            </span>
                        </div>
                        
                        {/* Time Out Status */}
                        <div className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
                            attendanceStatus === 'completed'
                                ? 'bg-green-50 border-green-300'
                                : 'bg-gray-50 border-gray-200'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    attendanceStatus === 'completed'
                                        ? 'bg-green-500'
                                        : 'bg-gray-400'
                                }`}>
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Time Out</p>
                                    {attendanceData?.checkOutTime && (
                                        <p className="text-sm text-gray-600">
                                            {new Date(attendanceData.checkOutTime).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                                attendanceStatus === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                {attendanceStatus === 'completed' ? '✓ Completed' : 'Pending'}
                            </span>
                        </div>

                        {/* Hours Worked */}
                        {attendanceData?.hoursWorked && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Hours Worked</p>
                                            <p className="text-2xl font-bold text-[#800000]">
                                                {attendanceData.hoursWorked.toFixed(2)} hours
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* QR Scanner Section */}
                {(event.status === 'Ongoing' || event.status === 'Approved' || event.status === 'Upcoming') && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-green-900 mb-1">Scan QR Code for Attendance</h3>
                                    <p className="text-green-700 text-sm">Record your time in and time out for this event</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate(`/volunteer/qr-scanner/${eventId}`)}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Open Scanner
                            </button>
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How to Record Attendance
                    </h3>
                    <ul className="space-y-3 text-blue-900">
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">1.</span>
                            <span>Click "Open Scanner" to access the QR code scanner</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">2.</span>
                            <span>Scan the QR code when you arrive (Time In)</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">3.</span>
                            <span>Scan the QR code again when you leave (Time Out)</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">4.</span>
                            <span>Your volunteer hours will be calculated automatically</span>
                        </li>
                    </ul>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default EventAttendance

