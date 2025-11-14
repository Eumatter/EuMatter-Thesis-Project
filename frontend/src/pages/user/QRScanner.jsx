import React, { useState, useContext, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Html5Qrcode } from 'html5-qrcode'

const QRScanner = () => {
    const { backendUrl, userData } = useContext(AppContent)
    const { eventId } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [scannedCode, setScannedCode] = useState('')
    const [processing, setProcessing] = useState(false)
    const [attendanceStatus, setAttendanceStatus] = useState(null)
    const [attendanceData, setAttendanceData] = useState(null)
    const [scanning, setScanning] = useState(false)
    const [cameraError, setCameraError] = useState(null)
    const [showFeedbackModal, setShowFeedbackModal] = useState(false)
    const [feedbackForm, setFeedbackForm] = useState({
        rating: 0,
        comment: ''
    })
    const [submittingFeedback, setSubmittingFeedback] = useState(false)
    const scannerRef = useRef(null)
    const html5QrCodeRef = useRef(null)
    const lastScannedCode = useRef('')

    useEffect(() => {
        if (eventId) {
            fetchEventData()
            fetchAttendanceStatus()
        }
    }, [eventId])

    // Auto check-in via deeplink token (?token=...)
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const token = params.get('token')
        if (token && !processing && event) {
            ;(async () => {
                setProcessing(true)
                try {
                    const response = await axios.post(`${backendUrl}api/attendance/check-in`, { token }, { withCredentials: true })
                    toast.success(response.data?.message || 'Attendance recorded')
                    const status = response.data?.status
                    if (status === 'timein') setAttendanceStatus('timeout')
                    else if (status === 'timeout') {
                        setAttendanceStatus('completed')
                        setShowFeedbackModal(true)
                    }
                    fetchAttendanceStatus()
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Failed to check in')
                } finally {
                    setProcessing(false)
                }
            })()
        }
    }, [location.search, backendUrl, event])

    const fetchEventData = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${backendUrl}api/events/${eventId}`, { withCredentials: true })
            // Handle both response formats: response.data.event or response.data
            const eventData = response.data.event || response.data
            if (!eventData) {
                throw new Error('Event data not found in response')
            }
            setEvent(eventData)
        } catch (error) {
            console.error('Error fetching event data:', error)
            toast.error(error.response?.data?.message || 'Failed to load event data')
            // Don't navigate immediately, show error state
        } finally {
            setLoading(false)
        }
    }

    const fetchAttendanceStatus = async () => {
        if (!eventId || !userData?._id) return
        try {
            // Try to get attendance from the event's volunteer attendance records
            const response = await axios.get(`${backendUrl}api/volunteers/attendance/event/${eventId}`, {
                withCredentials: true
            })
            if (response.data?.attendance && Array.isArray(response.data.attendance)) {
                // Find the current user's attendance record
                const userAttendance = response.data.attendance.find(att => 
                    (att.userId && String(att.userId) === String(userData._id)) ||
                    (att.volunteer && String(att.volunteer._id || att.volunteer) === String(userData._id))
                )
                if (userAttendance) {
                    const att = userAttendance
                    if (att.checkOutTime || att.timeOut) {
                        setAttendanceStatus('completed')
                        setAttendanceData(att)
                    } else if (att.checkInTime || att.timeIn) {
                        setAttendanceStatus('timeout')
                        setAttendanceData(att)
                    }
                }
            }
        } catch (error) {
            // Silently fail - user might not have attendance yet
            console.log('No attendance record found yet:', error.message)
        }
    }

    const handleQRScan = async (qrCode) => {
        // Prevent duplicate scans
        if (processing || qrCode === lastScannedCode.current) return
        
        lastScannedCode.current = qrCode
        setScannedCode(qrCode)
        setProcessing(true)
        
        // Stop scanning temporarily
        if (html5QrCodeRef.current && scanning) {
            try {
                await html5QrCodeRef.current.stop()
                setScanning(false)
            } catch (err) {
                console.error('Error stopping scanner:', err)
            }
        }
        
        try {
            // Parse QR code to determine action
            let qrData
            try {
                qrData = JSON.parse(qrCode)
            } catch (e) {
                // If not JSON, treat as legacy format
                qrData = { code: qrCode }
            }
            
            // Determine action based on QR code type
            let action = 'timein'
            if (qrData.type === 'checkOut' || qrData.type === 'checkout') {
                action = 'timeout'
            } else if (qrData.type === 'checkIn' || qrData.type === 'checkin') {
                action = 'timein'
            } else {
                // Fallback: determine based on current status
                action = attendanceStatus === 'timeout' || attendanceStatus === 'completed' ? 'timeout' : 'timein'
            }
            
            const response = await axios.post(`${backendUrl}api/volunteers/attendance/record`, 
                { qrCode, action }, 
                { withCredentials: true }
            )
            
            toast.success(response.data.message || 'Attendance recorded successfully!')
            
            // Update attendance status for UI
            if (action === 'timein') {
                setAttendanceStatus('timeout')
                // Resume scanning after a short delay
                setTimeout(() => {
                    startScanning()
                }, 2000)
            } else {
                setAttendanceStatus('completed')
                setAttendanceData(response.data.attendance || null)
                // Show feedback modal after checkout
                setTimeout(() => {
                    setShowFeedbackModal(true)
                }, 1000)
            }
            
        } catch (error) {
            console.error('Error recording attendance:', error)
            toast.error(error.response?.data?.message || 'Failed to record attendance')
            
            // Resume scanning on error
            setTimeout(() => {
                startScanning()
            }, 2000)
        } finally {
            setProcessing(false)
            lastScannedCode.current = '' // Reset after delay
            setTimeout(() => {
                lastScannedCode.current = ''
            }, 3000)
        }
    }
    
    const startScanning = async () => {
        if (processing || scanning) return
        
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop()
                await html5QrCodeRef.current.clear()
            } catch (err) {
                // Ignore stop errors
            }
        }
        
        try {
            const html5QrCode = new Html5Qrcode("qr-reader")
            html5QrCodeRef.current = html5QrCode
            scannerRef.current = true
            
            await html5QrCode.start(
                { facingMode: "environment" }, // Use back camera
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1.0,
                    disableFlip: false,
                    videoConstraints: {
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                (decodedText) => {
                    handleQRScan(decodedText)
                },
                (errorMessage) => {
                    // Ignore scan errors (they're frequent during scanning)
                }
            )
            setScanning(true)
            setCameraError(null)
        } catch (err) {
            console.error('Error starting camera:', err)
            setCameraError('Failed to access camera. Please ensure camera permissions are granted and try again.')
            setScanning(false)
            html5QrCodeRef.current = null
            scannerRef.current = null
        }
    }
    
    const stopScanning = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop()
                await html5QrCodeRef.current.clear()
                html5QrCodeRef.current = null
            } catch (err) {
                console.error('Error stopping scanner:', err)
            }
        }
        setScanning(false)
    }
    
    useEffect(() => {
        return () => {
            stopScanning()
        }
    }, [])

    const handleManualQR = () => {
        const qrCode = prompt('Enter QR code data:')
        if (qrCode) {
            handleQRScan(qrCode)
        }
    }

    const handleSubmitFeedback = async () => {
        if (!feedbackForm.rating || feedbackForm.rating < 1 || feedbackForm.rating > 5) {
            toast.error('Please select a rating from 1 to 5 stars')
            return
        }

        if (!attendanceData?._id) {
            toast.error('Attendance record not found')
            return
        }

        setSubmittingFeedback(true)
        try {
            const response = await axios.post(
                `${backendUrl}api/feedback/${attendanceData._id}`,
                {
                    rating: feedbackForm.rating,
                    comment: feedbackForm.comment
                },
                { withCredentials: true }
            )

            toast.success('Thank you for your feedback!')
            setShowFeedbackModal(false)
            setFeedbackForm({ rating: 0, comment: '' })
            fetchAttendanceStatus()
        } catch (error) {
            console.error('Error submitting feedback:', error)
            toast.error(error.response?.data?.message || 'Failed to submit feedback')
        } finally {
            setSubmittingFeedback(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[70vh]">
                    <div className="text-center">
                        <LoadingSpinner size="large" text="Loading QR scanner..." />
                    </div>
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
                {/* Header Section - Modern Design */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/user/events')}
                                className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">QR Code Scanner</h1>
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

                {/* Scanner Section - Modern Full-Screen Style */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            Camera Scanner
                        </h2>
                        <div className="flex gap-3">
                            {!scanning ? (
                                <button
                                    onClick={startScanning}
                                    disabled={processing}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Start Camera
                                </button>
                            ) : (
                                <button
                                    onClick={stopScanning}
                                    className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                    </svg>
                                    Stop Camera
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* QR Code Scanner - Full Width Modern Design */}
                    <div className="relative">
                        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden shadow-2xl">
                            <div id="qr-reader" className="w-full min-h-[400px] sm:min-h-[500px] rounded-2xl"></div>
                            
                            {/* Scanning Overlay */}
                            {scanning && (
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 border-4 border-green-500 rounded-2xl animate-pulse"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <div className="w-64 h-64 border-2 border-green-400 rounded-xl"></div>
                                    </div>
                                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
                                        <div className="bg-black/70 backdrop-blur-sm text-white px-6 py-3 rounded-full">
                                            <p className="text-sm font-semibold flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                Scanning...
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Processing Overlay */}
                            {processing && (
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                                    <div className="text-center text-white">
                                        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-lg font-semibold">Processing...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Camera Error Message */}
                        {cameraError && (
                            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-xl p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-red-800 font-semibold mb-2">Camera Access Error</p>
                                        <p className="text-red-700 text-sm mb-4">{cameraError}</p>
                                        <button
                                            onClick={handleManualQR}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                        >
                                            Enter QR Code Manually
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Instructions when not scanning */}
                        {!scanning && !cameraError && (
                            <div className="mt-6 text-center">
                                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                                    <p className="text-gray-700 font-medium mb-4">
                                        Click "Start Camera" to begin scanning QR codes for attendance
                                    </p>
                                    <button
                                        onClick={handleManualQR}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95"
                                    >
                                        Enter QR Code Manually
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Attendance Status - Modern Card Design */}
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
                    
                    {/* Success Message */}
                    {attendanceStatus && (
                        <div className={`mt-6 p-5 rounded-xl border-2 ${
                            attendanceStatus === 'completed'
                                ? 'bg-green-50 border-green-300'
                                : 'bg-blue-50 border-blue-300'
                        }`}>
                            <div className="flex items-start gap-3">
                                <svg className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                                    attendanceStatus === 'completed' ? 'text-green-600' : 'text-blue-600'
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className={`font-semibold ${
                                    attendanceStatus === 'completed' ? 'text-green-800' : 'text-blue-800'
                                }`}>
                                    {attendanceStatus === 'completed' 
                                        ? 'Attendance recorded successfully! Thank you for volunteering.' 
                                        : 'Time in recorded. Remember to scan again for time out.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Instructions - Modern Design */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How to Use
                    </h3>
                    <ul className="space-y-3 text-blue-900">
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">1.</span>
                            <span>Click "Start Camera" to activate your device camera</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">2.</span>
                            <span>Point your camera at the QR code when you arrive (Time In)</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">3.</span>
                            <span>Scan the QR code again when you leave (Time Out)</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">4.</span>
                            <span>Your volunteer hours will be calculated automatically</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-blue-600 mt-1">5.</span>
                            <span>After checkout, you'll be asked to provide feedback</span>
                        </li>
                    </ul>
                </div>
            </main>

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-[#800000] to-[#a00000] p-6 text-white">
                            <h3 className="text-2xl font-bold">Event Feedback</h3>
                            <p className="text-white/90 mt-1">Please share your experience</p>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Rating <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2 justify-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                                            className="focus:outline-none transform hover:scale-110 transition-transform"
                                        >
                                            <svg
                                                className={`w-10 h-10 ${
                                                    star <= feedbackForm.rating
                                                        ? 'text-yellow-400 fill-current'
                                                        : 'text-gray-300'
                                                }`}
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Comments (Optional)
                                </label>
                                <textarea
                                    value={feedbackForm.comment}
                                    onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                                    placeholder="Share your thoughts about the event..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000] resize-none"
                                    rows="4"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowFeedbackModal(false)
                                        setFeedbackForm({ rating: 0, comment: '' })
                                    }}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Skip
                                </button>
                                <button
                                    onClick={handleSubmitFeedback}
                                    disabled={submittingFeedback || !feedbackForm.rating}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-[#800000] to-[#a00000] text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
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

export default QRScanner
