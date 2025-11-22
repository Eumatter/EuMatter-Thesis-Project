import React, { useState, useContext, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/LoadingSpinner'
import { FaStar } from 'react-icons/fa'
import { Html5Qrcode } from 'html5-qrcode'
import { detectBrowser, getCameraConstraints } from '../../utils/browserCompatibility.js'
import { 
    isOnline, 
    storeAttendanceOffline, 
    initDB,
    getPendingCount 
} from '../../utils/offlineStorage.js'
import { 
    startAutoSync, 
    syncPendingRecords,
    onSyncStatusUpdate,
    getSyncStatus
} from '../../utils/offlineSync.js'

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
    const [exceptionRequest, setExceptionRequest] = useState(null)
    const [showExceptionModal, setShowExceptionModal] = useState(false)
    const [exceptionReason, setExceptionReason] = useState('')
    const [submittingException, setSubmittingException] = useState(false)
    const [processing, setProcessing] = useState(false)
    
    // QR Scanning states
    const [scanning, setScanning] = useState(false)
    const [cameraError, setCameraError] = useState(null)
    const [activeScanner, setActiveScanner] = useState(null) // 'timein' or 'timeout' or null
    const [isMobile, setIsMobile] = useState(false)
    const [showCameraModal, setShowCameraModal] = useState(false)
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [pendingSyncCount, setPendingSyncCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    
    const html5QrCodeRef = useRef(null)
    const lastScannedCode = useRef('')
    const timeInFileInputRef = useRef(null)
    const timeOutFileInputRef = useRef(null)

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
    const fetchAttendanceStatus = useCallback(async () => {
        if (!event || !userData?._id || !eventId) return
        
        try {
            // Fetch attendance summary to get proper attendance record IDs
            const summaryResponse = await axios.get(`${backendUrl}api/attendance/me/summary`, { 
                withCredentials: true 
            })
            
            if (summaryResponse.data?.success && summaryResponse.data.events) {
                // Find the event in the summary
                const eventSummary = summaryResponse.data.events.find(e => 
                    String(e.eventId) === String(eventId)
                )
                
                if (eventSummary?.records && eventSummary.records.length > 0) {
                    // Get today's record or the most recent record
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const todayRecord = eventSummary.records.find(record => {
                        const recordDate = new Date(record.date)
                        recordDate.setHours(0, 0, 0, 0)
                        return recordDate.getTime() === today.getTime()
                    }) || eventSummary.records[eventSummary.records.length - 1]
                    
                    if (todayRecord && todayRecord.attendanceId) {
                        // Fetch exception request if attendance record exists
                        try {
                            const exceptionResponse = await axios.get(
                                `${backendUrl}api/attendance/${todayRecord.attendanceId}/exception-request`, 
                                { withCredentials: true }
                            )
                            if (exceptionResponse.data?.success && exceptionResponse.data.exceptionRequest) {
                                setExceptionRequest(exceptionResponse.data.exceptionRequest)
                            }
                        } catch (error) {
                            // Exception request doesn't exist or error - that's okay, just log it
                            if (error.response?.status !== 404) {
                                console.log('Error fetching exception request:', error.response?.status)
                            }
                        }

                        if (todayRecord.timeOut) {
                            setAttendanceStatus('completed')
                            setAttendanceData({
                                _id: todayRecord.attendanceId,
                                checkInTime: todayRecord.timeIn,
                                checkOutTime: todayRecord.timeOut,
                                hoursWorked: todayRecord.totalHours || 0
                            })
                        } else if (todayRecord.timeIn) {
                            setAttendanceStatus('timeout')
                            setAttendanceData({
                                _id: todayRecord.attendanceId,
                                checkInTime: todayRecord.timeIn,
                                hoursWorked: 0
                            })
                        }
                    }
                }
            }
        } catch (error) {
            // Fallback to using embedded attendance records if summary API fails
            console.log('Error fetching attendance summary, using fallback:', error.response?.status)
            
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
                                _id: null, // No ID available in embedded records
                                checkInTime: todayRecord.timeIn,
                                checkOutTime: todayRecord.timeOut,
                                hoursWorked: todayRecord.totalHours || 0
                            })
                        } else if (todayRecord.timeIn) {
                            setAttendanceStatus('timeout')
                            setAttendanceData({
                                _id: null, // No ID available in embedded records
                                checkInTime: todayRecord.timeIn,
                                hoursWorked: 0
                            })
                        }
                    }
                }
            }
        }
    }, [event, userData?._id, eventId, backendUrl])

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

    const handleSubmitExceptionRequest = async () => {
        if (!exceptionReason.trim()) {
            toast.error('Please provide a reason for your exception request')
            return
        }

        if (!attendanceData?._id) {
            toast.error('Attendance record not found. Please try refreshing the page.')
            return
        }

        setSubmittingException(true)
        try {
            const response = await axios.post(
                `${backendUrl}api/attendance/${attendanceData._id}/exception-request`,
                { reason: exceptionReason.trim() },
                { withCredentials: true }
            )

            if (response.data?.success) {
                toast.success('Exception request submitted successfully. The event organizer will review it.')
                setExceptionRequest(response.data.exceptionRequest)
                setShowExceptionModal(false)
                setExceptionReason('')
                // Refresh attendance status to get updated data
                fetchAttendanceStatus()
            }
        } catch (error) {
            console.error('Error submitting exception request:', error)
            const errorMessage = error.response?.data?.message || 'Failed to submit exception request'
            if (error.response?.status === 400 && errorMessage.includes('already exists')) {
                toast.error('An exception request already exists for this attendance record.')
                // Refresh to get the existing request
                fetchAttendanceStatus()
            } else {
                toast.error(errorMessage)
            }
        } finally {
            setSubmittingException(false)
        }
    }

    const handleSubmitFeedback = async () => {
        // Prevent duplicate submissions
        if (submittingFeedback) {
            toast.warning('Feedback submission in progress. Please wait...')
            return
        }

        if (!pendingFeedback?._id) {
            toast.error('Feedback record not found')
            console.error('Pending feedback missing:', pendingFeedback)
            return
        }

        // Check if feedback was already submitted (status should be 'submitted' or 'overridden')
        if (pendingFeedback.status === 'submitted' || pendingFeedback.status === 'overridden') {
            toast.error('Feedback has already been submitted for this attendance')
            // Refresh to get updated status
            fetchPendingFeedback()
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

        // Ensure attendance is completed before allowing feedback
        if (!pendingFeedback.timeOut && !pendingFeedback.checkOutTime) {
            toast.error('Please complete your attendance (Time Out) before submitting feedback')
            fetchAttendanceStatus()
            fetchPendingFeedback()
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
                // Clear feedback form immediately to prevent duplicate submission
                setFeedbackForm({ rating: 0, comment: '' })
                setPendingFeedback(null)
                // Refresh attendance status and feedback
                await fetchAttendanceStatus()
                await fetchPendingFeedback()
            }
        } catch (error) {
            console.error('Error submitting feedback:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Failed to submit feedback'
            
            // Show more specific error messages
            if (error.response?.status === 400) {
                if (errorMessage.includes('not completed')) {
                    toast.error('Please complete your attendance (Time Out) before submitting feedback')
                    // Refresh status to check completion
                    fetchAttendanceStatus()
                    fetchPendingFeedback()
                } else if (errorMessage.includes('already submitted') || errorMessage.includes('Feedback already submitted')) {
                    toast.error('Feedback has already been submitted for this attendance')
                    // Refresh to get updated status
                    fetchPendingFeedback()
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
                fetchPendingFeedback()
            } else {
                toast.error(errorMessage)
            }
        } finally {
            setSubmittingFeedback(false)
        }
    }

    // Initialize offline storage
    useEffect(() => {
        const initializeOffline = async () => {
            await initDB()
            const count = await getPendingCount()
            setPendingSyncCount(count)
            
            // Set up sync status listener
            onSyncStatusUpdate((status) => {
                setIsSyncing(status.syncing)
                if (status.pendingCount !== undefined) {
                    setPendingSyncCount(status.pendingCount)
                }
            })
            
            // Start auto-sync if online
            if (isOnline()) {
                startAutoSync()
            }
        }
        initializeOffline()
    }, [])

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Handle QR scan
    const handleQRScan = async (qrCode, action) => {
        // Prevent duplicate scans
        if (processing || qrCode === lastScannedCode.current) return
        
        lastScannedCode.current = qrCode
        setProcessing(true)
        
        // Stop scanning temporarily
        if (html5QrCodeRef.current && scanning) {
            try {
                await html5QrCodeRef.current.stop()
                setScanning(false)
                setActiveScanner(null)
            } catch (err) {
                console.error('Error stopping scanner:', err)
            }
        }
        
        try {
            // Parse QR code to validate type
            let qrData
            try {
                qrData = JSON.parse(qrCode)
            } catch (e) {
                toast.error('Invalid QR code format. Please scan a valid QR code.')
                await stopScanning()
                return
            }
            
            // Validate QR code type matches the intended action
            if (qrData.type) {
                const qrType = qrData.type.toLowerCase()
                const expectedType = action === 'timein' ? 'checkin' : 'checkout'
                
                if ((qrType === 'checkout' && action === 'timein') || (qrType === 'checkin' && action === 'timeout')) {
                    toast.error(`This QR code is for ${qrType === 'checkout' ? 'Time Out' : 'Time In'}, but you're trying to record ${action === 'timein' ? 'Time In' : 'Time Out'}. Please use the correct QR code.`)
                    await stopScanning()
                    return
                }
            }
            
            const finalAction = action
            
            // Check if device is online
            const online = isOnline()
            
            if (!online) {
                // Store offline
                try {
                    await storeAttendanceOffline({
                        qrCode: qrCode.trim(),
                        action: finalAction,
                        eventId: eventId,
                        userId: userData?._id
                    })
                    
                    const count = await getPendingCount()
                    setPendingSyncCount(count)
                    
                    toast.success('Attendance saved offline! It will sync automatically when you reconnect.', {
                        autoClose: 5000
                    })
                    
                    // Update UI optimistically
                    if (finalAction === 'timein') {
                        setAttendanceStatus('timeout')
                        setAttendanceData({
                            _id: 'offline-pending',
                            checkInTime: new Date().toISOString(),
                            hoursWorked: 0,
                            offline: true
                        })
                    } else {
                        setAttendanceStatus('completed')
                        setAttendanceData({
                            _id: 'offline-pending',
                            checkInTime: attendanceData?.checkInTime || new Date().toISOString(),
                            checkOutTime: new Date().toISOString(),
                            hoursWorked: 0,
                            offline: true
                        })
                    }
                    
                    if (scanning) {
                        await stopScanning()
                    }
                    
                    return
                } catch (error) {
                    console.error('Error storing offline:', error)
                    toast.error('Failed to save attendance offline. Please try again when you have internet connection.')
                    await stopScanning()
                    return
                }
            }
            
            // Online - proceed with normal API call
            const response = await axios.post(`${backendUrl}api/volunteers/attendance/record`, 
                { qrCode: qrCode.trim(), action: finalAction }, 
                { withCredentials: true }
            )
            
            toast.success(response.data.message || 'Attendance recorded successfully!')
            
            // Refresh attendance status
            await fetchAttendanceStatus()
            await fetchEventData()
            
        } catch (error) {
            console.error('Error recording attendance:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Failed to record attendance'
            
            if (error.response?.status === 400) {
                if (errorMessage.includes('already recorded')) {
                    toast.error('You have already recorded attendance for this event')
                } else if (errorMessage.includes('must record time in')) {
                    toast.error('Please record time in before time out')
                } else if (errorMessage.includes('Invalid QR code')) {
                    toast.error('Invalid QR code. Please scan the correct QR code for this event.')
                } else {
                    toast.error(errorMessage)
                }
            } else if (error.response?.status === 404) {
                toast.error('Event not found. Please check the QR code.')
            } else if (error.response?.status === 403) {
                toast.error('You do not have permission to record attendance for this event')
            } else {
                toast.error(errorMessage)
            }
        } finally {
            // Always close camera modal after scan attempt (success or failure)
            if (scanning || showCameraModal) {
                await stopScanning()
            }
            setProcessing(false)
            lastScannedCode.current = ''
            setTimeout(() => {
                lastScannedCode.current = ''
            }, 3000)
        }
    }

    // Start scanning
    const startScanning = async (action) => {
        if (processing || scanning) return
        
        setShowCameraModal(true)
        setActiveScanner(action)
        
        await new Promise(resolve => setTimeout(resolve, 300))
        
        let qrReaderElement = document.getElementById("qr-reader-modal")
        if (!qrReaderElement) {
            await new Promise(resolve => setTimeout(resolve, 200))
            qrReaderElement = document.getElementById("qr-reader-modal")
            if (!qrReaderElement) {
                toast.error('QR scanner element not found. Please refresh the page.')
                setShowCameraModal(false)
                return
            }
        }
        
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop()
                await html5QrCodeRef.current.clear()
            } catch (err) {
                // Ignore stop errors
            }
        }
        
        try {
            const html5QrCode = new Html5Qrcode("qr-reader-modal")
            html5QrCodeRef.current = html5QrCode
            
            const browser = detectBrowser()
            const config = {
                fps: 10,
                qrbox: { width: isMobile ? 250 : 280, height: isMobile ? 250 : 280 },
                aspectRatio: 1.0,
                disableFlip: false
            }
            
            if (browser.isSafariIOS) {
                config.qrbox = { width: 250, height: 250 }
            }
            
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        handleQRScan(decodedText, action)
                    },
                    (errorMessage) => {
                        // Ignore scan errors
                    }
                )
                setScanning(true)
                setCameraError(null)
            } catch (envError) {
                console.log('Environment camera failed, trying user camera:', envError.message)
                try {
                    await html5QrCode.start(
                        { facingMode: "user" },
                        config,
                        (decodedText) => {
                            handleQRScan(decodedText, action)
                        },
                        (errorMessage) => {
                            // Ignore scan errors
                        }
                    )
                    setScanning(true)
                    setCameraError(null)
                } catch (userError) {
                    console.log('User camera failed, trying default camera:', userError.message)
                    try {
                        await html5QrCode.start(
                            null,
                            config,
                            (decodedText) => {
                                handleQRScan(decodedText, action)
                            },
                            (errorMessage) => {
                                // Ignore scan errors
                            }
                        )
                        setScanning(true)
                        setCameraError(null)
                    } catch (finalError) {
                        console.error('Error starting camera:', finalError)
                        setCameraError(finalError.message || 'Failed to start camera')
                        toast.error(`Error starting camera: ${finalError.message || 'Please check camera permissions and try again'}`)
                        html5QrCodeRef.current = null
                        setScanning(false)
                        setActiveScanner(null)
                    }
                }
            }
        } catch (err) {
            console.error('Error starting camera:', err)
            setCameraError(err.message || 'Failed to access camera')
            setScanning(false)
            setActiveScanner(null)
            html5QrCodeRef.current = null
            toast.error(`Failed to access camera: ${err.message || 'Please ensure camera permissions are granted and try again'}`)
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
        setActiveScanner(null)
        setShowCameraModal(false)
    }
    
    const closeCameraModal = async () => {
        await stopScanning()
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                stopScanning()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Helper function to preprocess image for better QR code detection
    const preprocessImage = (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            let objectUrl = null
            
            img.onload = () => {
                try {
                    const maxDimension = 2000
                    let width = img.width
                    let height = img.height
                    
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = (height * maxDimension) / width
                            width = maxDimension
                        } else {
                            width = (width * maxDimension) / height
                            height = maxDimension
                        }
                    }
                    
                    canvas.width = width
                    canvas.height = height
                    
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = 'high'
                    ctx.drawImage(img, 0, 0, width, height)
                    
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl)
                    }
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Failed to process image'))
                        }
                    }, file.type || 'image/jpeg', 0.95)
                } catch (error) {
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl)
                    }
                    reject(error)
                }
            }
            
            img.onerror = () => {
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl)
                }
                reject(new Error('Failed to load image'))
            }
            
            objectUrl = URL.createObjectURL(file)
            img.src = objectUrl
        })
    }

    const handleImageUpload = async (event, action) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        try {
            setProcessing(true)
            
            let qrReaderElement = document.getElementById("qr-reader")
            let tempElement = null
            
            if (!qrReaderElement) {
                tempElement = document.createElement('div')
                tempElement.id = 'temp-qr-reader'
                tempElement.style.display = 'none'
                tempElement.style.position = 'absolute'
                tempElement.style.visibility = 'hidden'
                document.body.appendChild(tempElement)
                qrReaderElement = tempElement
            }
            
            const html5QrCodeInstance = new Html5Qrcode(qrReaderElement.id)
            
            let decodedText = null
            let lastError = null
            
            try {
                decodedText = await html5QrCodeInstance.scanFile(file, false)
            } catch (error) {
                lastError = error
            }
            
            if (!decodedText) {
                try {
                    const processedImage = await preprocessImage(file)
                    decodedText = await html5QrCodeInstance.scanFile(processedImage, false)
                } catch (error) {
                    lastError = error
                }
            }
            
            if (!decodedText) {
                try {
                    const reader = new FileReader()
                    const imageDataUrl = await new Promise((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target.result)
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                    })
                    
                    decodedText = await html5QrCodeInstance.scanFile(imageDataUrl, false)
                } catch (error) {
                    lastError = error
                    
                    try {
                        const processedImage = await preprocessImage(file)
                        const reader = new FileReader()
                        const processedDataUrl = await new Promise((resolve, reject) => {
                            reader.onload = (e) => resolve(e.target.result)
                            reader.onerror = reject
                            reader.readAsDataURL(processedImage)
                        })
                        decodedText = await html5QrCodeInstance.scanFile(processedDataUrl, false)
                    } catch (finalError) {
                        lastError = finalError
                    }
                }
            }
            
            if (tempElement && document.body.contains(tempElement)) {
                document.body.removeChild(tempElement)
            }
            
            try {
                await html5QrCodeInstance.clear()
            } catch (e) {
                // Ignore cleanup errors
            }
            
            if (decodedText) {
                await handleQRScan(decodedText, action)
            } else {
                if (lastError?.message?.includes('No QR code found') || lastError?.message?.includes('not found')) {
                    toast.error('No QR code found in the image. Please ensure the image contains a clear QR code.')
                } else {
                    toast.error('Failed to scan QR code from image. Please ensure the image contains a valid QR code and try again.')
                }
            }
        } catch (error) {
            console.error('Error scanning image:', error)
            const tempElement = document.getElementById('temp-qr-reader')
            if (tempElement && document.body.contains(tempElement)) {
                document.body.removeChild(tempElement)
            }
            
            if (error.message?.includes('No QR code found') || error.message?.includes('not found')) {
                toast.error('No QR code found in the image. Please ensure the image contains a clear QR code.')
            } else {
                toast.error('Failed to scan QR code from image. Please ensure the image contains a valid QR code.')
            }
        } finally {
            setProcessing(false)
            const fileInput = action === 'timein' ? timeInFileInputRef.current : timeOutFileInputRef.current
            if (fileInput) {
                fileInput.value = ''
            }
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

                                {!feedbackLoading && pendingFeedback && (() => {
                                    // Check if attendance is completed - need both time in and time out
                                    const hasTimeIn = !!(pendingFeedback.timeIn || pendingFeedback.checkInTime)
                                    const hasTimeOut = !!(pendingFeedback.timeOut || pendingFeedback.checkOutTime)
                                    const isAttendanceComplete = hasTimeIn && hasTimeOut
                                    
                                    // Also check if feedback was already submitted
                                    const isAlreadySubmitted = pendingFeedback.status === 'submitted' || pendingFeedback.status === 'overridden'
                                    
                                    // Show warning if attendance not completed
                                    if (!isAttendanceComplete && !isAlreadySubmitted) {
                                        return (
                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-amber-200/60 p-6 sm:p-8 shadow-lg">
                                                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                                                    <p className="text-sm text-amber-800 font-semibold flex items-center gap-2">
                                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                        </svg>
                                                        You need to complete your attendance (both Time In and Time Out) before submitting feedback. Please scan both QR codes first.
                                                    </p>
                                                </div>
                                                <div className="text-center py-4">
                                                    <p className="text-gray-600">Complete your attendance to unlock the feedback form.</p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    
                                    // Show success message if already submitted
                                    if (isAlreadySubmitted) {
                                        return (
                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-green-200/60 p-6 sm:p-8 shadow-lg">
                                                <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                                                    <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
                                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Feedback has already been submitted for this attendance.
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    
                                    // Show feedback form only if attendance is complete AND not already submitted
                                    return (
                                        <div className="bg-white/80 backdrop-blur-sm rounded-xl border-2 border-yellow-200/60 p-6 sm:p-8 shadow-lg">
                                        
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
                                    )
                                })()}

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
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">Time Out</p>
                                    {attendanceData?.checkOutTime && (
                                        <p className="text-sm text-gray-600">
                                            {new Date(attendanceData.checkOutTime).toLocaleString()}
                                        </p>
                                    )}
                                    {!attendanceData?.checkOutTime && exceptionRequest && (
                                        <div className="mt-2">
                                            {exceptionRequest.status === 'pending' && (
                                                <p className="text-sm text-amber-600 font-medium">
                                                    Exception request pending review
                                                </p>
                                            )}
                                            {exceptionRequest.status === 'approved' && (
                                                <p className="text-sm text-green-600 font-medium">
                                                    Exception request approved
                                                </p>
                                            )}
                                            {exceptionRequest.status === 'rejected' && (
                                                <p className="text-sm text-red-600 font-medium">
                                                    Exception request rejected
                                                    {exceptionRequest.reviewNotes && `: ${exceptionRequest.reviewNotes}`}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!attendanceData?.checkOutTime && !exceptionRequest && attendanceStatus === 'timeout' && attendanceData?._id && (
                                    <button
                                        onClick={() => setShowExceptionModal(true)}
                                        className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold text-sm hover:bg-amber-600 transition-all duration-200"
                                    >
                                        Request Exception
                                    </button>
                                )}
                                <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                                    attendanceStatus === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {attendanceStatus === 'completed' ? '✓ Completed' : 'Pending'}
                                </span>
                            </div>
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

                {/* Time In Recording Section */}
                {(event.status === 'Ongoing' || event.status === 'Approved' || event.status === 'Upcoming') && 
                 attendanceStatus !== 'timeout' && attendanceStatus !== 'completed' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            Record Time In
                        </h2>
                        
                        <div className="space-y-4">
                            {/* QR Scanner Option */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-blue-900">Scan QR Code</h3>
                                            <p className="text-sm text-blue-700">Use your camera to scan the QR code</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startScanning('timein')}
                                        disabled={processing || (scanning && activeScanner === 'timein')}
                                        className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {scanning && activeScanner === 'timein' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Start Camera
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Image Upload Option */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-green-900">Upload QR Image</h3>
                                        <p className="text-sm text-green-700">Upload an image containing the QR code</p>
                                    </div>
                                </div>
                                <input
                                    ref={timeInFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'timein')}
                                    className="hidden"
                                    id="timein-image-upload"
                                />
                                <label
                                    htmlFor="timein-image-upload"
                                    className="w-full bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Upload Image
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Time Out Recording Section */}
                {(event.status === 'Ongoing' || event.status === 'Approved' || event.status === 'Upcoming') && 
                 attendanceStatus === 'timeout' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            Record Time Out
                        </h2>
                        
                        <div className="space-y-4">
                            {/* QR Scanner Option */}
                            <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-orange-900">Scan QR Code</h3>
                                            <p className="text-sm text-orange-700">Use your camera to scan the QR code</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startScanning('timeout')}
                                        disabled={processing || (scanning && activeScanner === 'timeout')}
                                        className="w-full sm:w-auto bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {scanning && activeScanner === 'timeout' ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Start Camera
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Image Upload Option */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-green-900">Upload QR Image</h3>
                                        <p className="text-sm text-green-700">Upload an image containing the QR code</p>
                                    </div>
                                </div>
                                <input
                                    ref={timeOutFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, 'timeout')}
                                    className="hidden"
                                    id="timeout-image-upload"
                                />
                                <label
                                    htmlFor="timeout-image-upload"
                                    className="w-full bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Upload Image
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Exception Request Modal */}
                {showExceptionModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-gray-900">Request Exception for Missed Time-Out</h3>
                                    <button
                                        onClick={() => {
                                            setShowExceptionModal(false)
                                            setExceptionReason('')
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                                    <p className="text-sm text-amber-800 font-semibold flex items-start gap-2">
                                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>
                                            If you missed your time-out due to an emergency or other valid reason, you can submit an exception request. 
                                            The event organizer will review your request and may approve it to record your attendance hours.
                                        </span>
                                    </p>
                                </div>
                                <div className="mb-6">
                                    <label className="block text-base font-bold text-gray-900 mb-3">
                                        Reason for Exception <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={exceptionReason}
                                        onChange={(e) => setExceptionReason(e.target.value)}
                                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] outline-none resize-none transition-all duration-200"
                                        placeholder="Please provide a detailed explanation for missing your time-out (e.g., medical emergency, family emergency, transportation issues, etc.)..."
                                        maxLength={1000}
                                        required
                                    />
                                    <div className="mt-2 text-xs text-gray-400 text-right">
                                        {exceptionReason.length}/1000
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowExceptionModal(false)
                                            setExceptionReason('')
                                        }}
                                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitExceptionRequest}
                                        disabled={submittingException || !exceptionReason.trim()}
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-[#800000] to-[#a00000] text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {submittingException ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Submitting...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Submit Request</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Camera Scanner Modal */}
                {showCameraModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-white">
                                            {activeScanner === 'timein' ? 'Scan QR Code for Time In' : 'Scan QR Code for Time Out'}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-blue-100">Position QR code within the frame</p>
                                    </div>
                                </div>
                                <button
                                    onClick={closeCameraModal}
                                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all duration-200 text-white"
                                    aria-label="Close camera"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Camera View */}
                            <div className="relative flex-1 bg-black flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
                                <div id="qr-reader-modal" className="w-full h-full"></div>
                                
                                {/* Scanning Overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 border-4 border-green-500 rounded-2xl animate-pulse"></div>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-green-400 rounded-xl"></div>
                                    </div>
                                    <div className="absolute bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2">
                                        <div className="bg-black/70 backdrop-blur-sm text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full">
                                            <p className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                Scanning...
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Camera Error Display */}
                                {cameraError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 max-w-md mx-4">
                                            <p className="text-red-800 font-semibold mb-2 text-lg">Camera Error</p>
                                            <p className="text-red-700 text-sm mb-4">{cameraError}</p>
                                            <button
                                                onClick={closeCameraModal}
                                                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-sm text-gray-600 text-center sm:text-left">
                                        Point your camera at the QR code. Make sure it's well-lit and in focus.
                                    </p>
                                    <button
                                        onClick={closeCameraModal}
                                        className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Stop Camera
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Processing Overlay */}
                {processing && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
                            <div className="w-16 h-16 border-4 border-[#800000] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-lg font-semibold text-gray-900">Processing...</p>
                            <p className="text-sm text-gray-600 mt-2">Please wait while we record your attendance</p>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}

export default EventAttendance

