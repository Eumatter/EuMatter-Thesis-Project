import React, { useState, useContext, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/LoadingSpinner'
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
    
    // Separate states for Time In and Time Out
    const [activeScanner, setActiveScanner] = useState(null) // 'timein' or 'timeout' or null
    const [isMobile, setIsMobile] = useState(false)
    const [showCameraModal, setShowCameraModal] = useState(false) // Modal state for camera
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [pendingSyncCount, setPendingSyncCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    
    const scannerRef = useRef(null)
    const html5QrCodeRef = useRef(null)
    const lastScannedCode = useRef('')
    const isProcessingRef = useRef(false) // Ref to track processing state immediately
    const fileInputRef = useRef(null)
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

    // Fetch attendance status from event data
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

    // Initialize offline storage and sync
    useEffect(() => {
        let cleanup = null;
        let unsubscribe = null;
        let countInterval = null;
        
        const initializeOffline = async () => {
            try {
                await initDB();
                
                // Start auto-sync
                cleanup = startAutoSync(backendUrl);
                
                // Get initial pending count
                const count = await getPendingCount();
                setPendingSyncCount(count);
                
                // Subscribe to sync status updates
                unsubscribe = onSyncStatusUpdate((status) => {
                    setPendingSyncCount(status.pendingCount || 0);
                    setIsSyncing(status.syncing || false);
                });
                
                // Periodic check for pending count
                countInterval = setInterval(async () => {
                    const count = await getPendingCount();
                    setPendingSyncCount(count);
                }, 5000);
            } catch (error) {
                console.error('Error initializing offline storage:', error);
            }
        };
        
        initializeOffline();
        
        return () => {
            if (cleanup) cleanup();
            if (unsubscribe) unsubscribe();
            if (countInterval) clearInterval(countInterval);
        };
    }, [backendUrl]);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Try to sync when coming back online
            syncPendingRecords(backendUrl, true);
        };
        
        const handleOffline = () => {
            setIsOffline(true);
        };
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        setIsOffline(!navigator.onLine);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [backendUrl]);

    // Detect mobile/tablet using browser compatibility utility
    useEffect(() => {
        const browser = detectBrowser()
        const checkMobile = () => {
            setIsMobile(browser.isMobile || window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        window.addEventListener('orientationchange', checkMobile)
        return () => {
            window.removeEventListener('resize', checkMobile)
            window.removeEventListener('orientationchange', checkMobile)
        }
    }, [])

    useEffect(() => {
        if (eventId) {
        fetchEventData()
        }
    }, [eventId, fetchEventData])

    useEffect(() => {
        if (event && userData?._id) {
            fetchAttendanceStatus()
        }
    }, [event?._id, userData?._id, fetchAttendanceStatus])

    // Auto check-in via deeplink token
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const token = params.get('token')
        if (token && !processing && event?._id) {
            const handleAutoCheckIn = async () => {
                setProcessing(true)
                try {
                    const response = await axios.post(`${backendUrl}api/attendance/check-in`, { token }, { withCredentials: true })
                    toast.success(response.data?.message || 'Attendance recorded')
                    const status = response.data?.status
                    const attendance = response.data?.attendance
                    
                    // Verify attendance completion before showing feedback
                    if (status === 'timein') {
                        setAttendanceStatus('timeout')
                    } else if (status === 'timeout') {
                        // Check if both time in and time out are complete
                        const hasTimeIn = !!(attendance?.timeIn || attendance?.checkInTime)
                        const hasTimeOut = !!(attendance?.timeOut || attendance?.checkOutTime)
                        const isComplete = hasTimeIn && hasTimeOut
                        
                        if (isComplete) {
                            setAttendanceStatus('completed')
                            // Redirect to attendance page for feedback instead of showing modal
                            setTimeout(() => {
                                navigate(`/volunteer/attendance/${eventId}?fromQR=true`)
                            }, 1500)
                        } else {
                            setAttendanceStatus('timeout')
                            toast.warning('Please complete both Time In and Time Out before submitting feedback.')
                        }
                    }
                    if (eventId && userData?._id) {
                        fetchAttendanceStatus()
                    }
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Failed to check in')
                } finally {
                    setProcessing(false)
                }
            }
            handleAutoCheckIn()
        }
    }, [location.search, backendUrl, event?._id, processing, eventId, userData?._id, fetchAttendanceStatus])

    const handleQRScan = async (qrCode, action) => {
        // Prevent duplicate scans - check immediately using ref
        if (isProcessingRef.current || qrCode === lastScannedCode.current) {
            return
        }
        
        // Set processing flags IMMEDIATELY to prevent duplicates
        isProcessingRef.current = true
        setProcessing(true)
        lastScannedCode.current = qrCode
        setScannedCode(qrCode)
        
        // Stop scanning IMMEDIATELY to prevent multiple scans
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
                // If not JSON, treat as legacy format or primary key
                qrData = { code: qrCode }
            }
            
            // Validate QR code type matches the intended action
            if (qrData.type) {
                const qrType = qrData.type.toLowerCase()
                const expectedType = action === 'timein' ? 'checkin' : 'checkout'
                
                if (qrType !== expectedType && qrType !== 'checkin' && qrType !== 'checkout') {
                    // If QR has a type but doesn't match, show error
                    toast.error(`This QR code is for ${qrType === 'checkout' ? 'Time Out' : 'Time In'}, but you're trying to record ${action === 'timein' ? 'Time In' : 'Time Out'}. Please use the correct QR code.`)
                    await stopScanning()
                    return
                }
                
                if ((qrType === 'checkout' && action === 'timein') || (qrType === 'checkin' && action === 'timeout')) {
                    toast.error(`This QR code is for ${qrType === 'checkout' ? 'Time Out' : 'Time In'}, but you're trying to record ${action === 'timein' ? 'Time In' : 'Time Out'}. Please use the correct QR code.`)
                    await stopScanning()
                    return
                }
            }
            
            // Use the provided action (don't auto-detect from QR code)
            // This ensures users scan the correct QR for the correct action
            const finalAction = action || (attendanceStatus === 'timeout' || attendanceStatus === 'completed' ? 'timeout' : 'timein')
            
            console.log('Recording attendance:', { 
                qrCode: qrCode.substring(0, 50) + '...', 
                qrType: qrData.type,
                action: finalAction, 
                eventId 
            })
            
            // Validate qrCode before sending
            if (!qrCode || qrCode.trim().length === 0) {
                toast.error('Invalid QR code. Please scan again.')
                await stopScanning()
                return
            }
            
            // Check if device is online
            const online = isOnline();
            
            if (!online) {
                // Store offline
                try {
                    await storeAttendanceOffline({
                        qrCode: qrCode.trim(),
                        action: finalAction,
                        eventId: eventId,
                        userId: userData?._id
                    });
                    
                    const count = await getPendingCount();
                    setPendingSyncCount(count);
                    
                    toast.success('Attendance saved offline! It will sync automatically when you reconnect.', {
                        autoClose: 5000
                    });
                    
                    // Update UI to show timeout status (optimistic update)
                    if (finalAction === 'timein') {
                        setAttendanceStatus('timeout');
                        setAttendanceData({
                            _id: 'offline-pending',
                            checkInTime: new Date().toISOString(),
                            hoursWorked: 0,
                            offline: true
                        });
                    } else {
                        setAttendanceStatus('completed');
                        setAttendanceData({
                            _id: 'offline-pending',
                            checkInTime: attendanceData?.checkInTime || new Date().toISOString(),
                            checkOutTime: new Date().toISOString(),
                            hoursWorked: 0,
                            offline: true
                        });
                    }
                    
                    // Close camera modal after successful scan
                    if (scanning) {
                        await stopScanning();
                    }
                    
                    return; // Exit early - don't try to sync yet
                } catch (error) {
                    console.error('Error storing offline:', error);
                    toast.error('Failed to save attendance offline. Please try again when you have internet connection.');
                    await stopScanning();
                    return;
                }
            }
            
            // Online - proceed with normal API call
            const response = await axios.post(`${backendUrl}api/volunteers/attendance/record`, 
                { qrCode: qrCode.trim(), action: finalAction }, 
                { withCredentials: true }
            )
            
            // Close camera modal immediately after successful scan
            if (scanning || showCameraModal) {
                await stopScanning()
            }
            
            toast.success(response.data.message || 'Attendance recorded successfully!')
            
            // Update attendance status for UI
            if (finalAction === 'timein') {
                setAttendanceStatus('timeout')
                if (response.data.attendance) {
                    setAttendanceData({
                        _id: response.data.attendance._id,
                        checkInTime: response.data.attendance.checkInTime || response.data.attendance.timeIn,
                        hoursWorked: 0
                    })
                }
                fetchEventData()
            } else {
                setAttendanceStatus('completed')
                setAttendanceData(response.data.attendance || null)
                
                // Verify attendance is complete before redirecting
                const attendance = response.data.attendance
                const hasTimeIn = !!(attendance?.timeIn || attendance?.checkInTime)
                const hasTimeOut = !!(attendance?.timeOut || attendance?.checkOutTime)
                const isComplete = hasTimeIn && hasTimeOut
                
                if (isComplete) {
                    fetchEventData().then(() => {
                        // Only redirect if attendance is fully complete
                        setTimeout(() => {
                            toast.success('Time out recorded successfully! Redirecting to submit feedback...')
                            navigate(`/volunteer/attendance/${eventId}?fromQR=true`)
                        }, 1500)
                    })
                } else {
                    // Attendance not complete yet - don't redirect
                    toast.warning('Please complete both Time In and Time Out before submitting feedback.')
                    fetchEventData()
                }
            }
            
        } catch (error) {
            console.error('Error recording attendance:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Failed to record attendance'
            
            // Close camera modal immediately on error to prevent multiple scans
            if (scanning || showCameraModal) {
                await stopScanning()
            }
            
            // Provide more specific error messages (only show once)
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
            // Ensure camera is stopped and modal is closed
            if (scanning || showCameraModal) {
                await stopScanning()
            }
            isProcessingRef.current = false
            setProcessing(false)
            // Clear last scanned code after a delay to prevent immediate re-scans
            setTimeout(() => {
                lastScannedCode.current = ''
            }, 5000) // Increased delay to prevent duplicate scans
        }
    }
    
    const startScanning = async (action) => {
        if (processing || scanning) return
        
        // Open camera modal first
        setShowCameraModal(true)
        setActiveScanner(action)
        
        // Wait a bit to ensure DOM is ready and modal is rendered
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Check if qr-reader-modal element exists (in modal)
        let qrReaderElement = document.getElementById("qr-reader-modal")
        if (!qrReaderElement) {
            // Try again after a short delay
            await new Promise(resolve => setTimeout(resolve, 200))
            qrReaderElement = document.getElementById("qr-reader-modal")
            if (!qrReaderElement) {
                toast.error('QR scanner element not found. Please refresh the page.')
                console.error('QR reader element not found')
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
            scannerRef.current = true
            
            // Get browser-compatible camera constraints
            const browser = detectBrowser()
            const cameraConstraints = getCameraConstraints(true) // Prefer back camera
            
            // More flexible camera constraints to avoid OverconstrainedError
            const config = {
                    fps: 10,
                qrbox: { width: isMobile ? 250 : 280, height: isMobile ? 250 : 280 },
                    aspectRatio: 1.0,
                disableFlip: false
            }
            
            // Safari iOS needs simpler constraints
            if (browser.isSafariIOS) {
                config.qrbox = { width: 250, height: 250 }
            }
            
            // Try environment camera first (back camera on mobile)
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        // Prevent multiple simultaneous scans using ref for immediate check
                        if (!isProcessingRef.current && decodedText !== lastScannedCode.current) {
                            handleQRScan(decodedText, action)
                        }
                    },
                    (errorMessage) => {
                        // Ignore scan errors (they're just scanning attempts)
                    }
                )
                setScanning(true)
                setCameraError(null)
                // Don't show toast in modal - it's already visible
            } catch (envError) {
                console.log('Environment camera failed, trying user camera:', envError.message)
                // If environment camera fails, try user camera (front camera)
                if (envError.message?.includes('OverconstrainedError') || 
                    envError.message?.includes('NotReadableError') ||
                    envError.message?.includes('NotFoundError') ||
                    envError.message?.includes('Permission denied')) {
                    try {
                        await html5QrCode.start(
                            { facingMode: "user" },
                            config,
                (decodedText) => {
                                // Prevent multiple simultaneous scans using ref for immediate check
                                if (!isProcessingRef.current && decodedText !== lastScannedCode.current) {
                                    handleQRScan(decodedText, action)
                                }
                },
                (errorMessage) => {
                                // Ignore scan errors
                }
            )
                        setScanning(true)
                        setCameraError(null)
                        // Don't show toast in modal - it's already visible
                    } catch (userError) {
                        console.log('User camera failed, trying default camera:', userError.message)
                        // If user camera also fails, try without facingMode constraint
                        try {
                            await html5QrCode.start(
                                null, // Let browser choose any available camera
                                config,
                                (decodedText) => {
                                    // Prevent multiple simultaneous scans using ref for immediate check
                                    if (!isProcessingRef.current && decodedText !== lastScannedCode.current) {
                                        handleQRScan(decodedText, action)
                                    }
                                },
                                (errorMessage) => {
                                    // Ignore scan errors
                                }
                            )
                        setScanning(true)
                        setCameraError(null)
                        // Don't show toast in modal - it's already visible
                        } catch (finalError) {
                            console.error('Error starting camera:', finalError)
                            setCameraError(finalError.message || 'Failed to start camera')
                            toast.error(`Error starting camera: ${finalError.message || 'Please check camera permissions and try again'}`)
                            html5QrCodeRef.current = null
                            setScanning(false)
                            setActiveScanner(null)
                        }
                    }
                } else {
                    console.error('Error starting camera:', envError)
                    setCameraError(envError.message || 'Failed to start camera')
                    toast.error(`Error starting camera: ${envError.message || 'Please check camera permissions and try again'}`)
                    html5QrCodeRef.current = null
                    setScanning(false)
                    setActiveScanner(null)
                }
            }
        } catch (err) {
            console.error('Error starting camera:', err)
            setCameraError(err.message || 'Failed to access camera')
            setScanning(false)
            setActiveScanner(null)
            html5QrCodeRef.current = null
            scannerRef.current = null
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
                    // Calculate optimal size (keep aspect ratio, max dimension 2000px for quality)
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
                    
                    // Set canvas size
                    canvas.width = width
                    canvas.height = height
                    
                    // Draw image with smoothing
                    ctx.imageSmoothingEnabled = true
                    ctx.imageSmoothingQuality = 'high'
                    ctx.drawImage(img, 0, 0, width, height)
                    
                    // Clean up object URL
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl)
                    }
                    
                    // Convert to blob
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
            
            // Create or use qr-reader element for file scanning
            let qrReaderElement = document.getElementById("qr-reader")
            let tempElement = null
            
            if (!qrReaderElement) {
                // Create a temporary hidden element for file scanning
                tempElement = document.createElement('div')
                tempElement.id = 'temp-qr-reader'
                tempElement.style.display = 'none'
                tempElement.style.position = 'absolute'
                tempElement.style.visibility = 'hidden'
                document.body.appendChild(tempElement)
                qrReaderElement = tempElement
            }
            
            // Create Html5Qrcode instance
            const html5QrCodeInstance = new Html5Qrcode(qrReaderElement.id)
            
            let decodedText = null
            let lastError = null
            
            // Try scanning with original file first
            try {
                decodedText = await html5QrCodeInstance.scanFile(file, false)
            } catch (error) {
                lastError = error
                console.log('First scan attempt failed, trying with preprocessed image...')
            }
            
            // If first attempt failed, try with preprocessed image
            if (!decodedText) {
                try {
                    const processedImage = await preprocessImage(file)
                    decodedText = await html5QrCodeInstance.scanFile(processedImage, false)
                } catch (error) {
                    lastError = error
                    console.log('Preprocessed scan attempt failed, trying with different options...')
                }
            }
            
            // If still failed, try with data URL (different format might work better)
            if (!decodedText) {
                try {
                    const reader = new FileReader()
                    const imageDataUrl = await new Promise((resolve, reject) => {
                        reader.onload = (e) => resolve(e.target.result)
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                    })
                    
                    // Try scanning with data URL directly
                    decodedText = await html5QrCodeInstance.scanFile(imageDataUrl, false)
                } catch (error) {
                    lastError = error
                    console.log('Data URL scan attempt failed')
                    
                    // Last attempt: try with preprocessed image as data URL
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
                        console.log('All scan attempts failed')
                    }
                }
            }
            
            // Clean up temporary element if created
            if (tempElement && document.body.contains(tempElement)) {
                document.body.removeChild(tempElement)
            }
            
            // Clean up Html5Qrcode instance
            try {
                await html5QrCodeInstance.clear()
            } catch (e) {
                // Ignore cleanup errors
            }
            
            if (decodedText) {
                // Validate QR code type matches action before processing
                try {
                    const qrData = JSON.parse(decodedText)
                    if (qrData.type) {
                        const qrType = qrData.type.toLowerCase()
                        if ((qrType === 'checkout' && action === 'timein') || (qrType === 'checkin' && action === 'timeout')) {
                            toast.error(`This QR code is for ${qrType === 'checkout' ? 'Time Out' : 'Time In'}, but you're trying to record ${action === 'timein' ? 'Time In' : 'Time Out'}. Please use the correct QR code.`)
                            return
                        }
                    }
                } catch (e) {
                    // If not JSON, it might be a primary key - let backend handle validation
                }
                
                await handleQRScan(decodedText, action)
            } else {
                // Provide more specific error message
                if (lastError?.message?.includes('No QR code found') || lastError?.message?.includes('not found')) {
                    toast.error('No QR code found in the image. Please ensure the image contains a clear QR code.')
                } else {
                    toast.error('Failed to scan QR code from image. Please ensure the image contains a valid QR code and try again.')
                }
            }
        } catch (error) {
            console.error('Error scanning image:', error)
            // Clean up temporary element on error
            const tempElement = document.getElementById('temp-qr-reader')
            if (tempElement && document.body.contains(tempElement)) {
                document.body.removeChild(tempElement)
            }
            
            // Provide more specific error message
            if (error.message?.includes('No QR code found') || error.message?.includes('not found')) {
                toast.error('No QR code found in the image. Please ensure the image contains a clear QR code.')
            } else {
                toast.error('Failed to scan QR code from image. Please ensure the image contains a valid QR code.')
            }
        } finally {
            setProcessing(false)
            // Reset file input
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
                    <LoadingSpinner size="large" text="Loading QR scanner..." />
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

    const timeInCompleted = attendanceStatus === 'timeout' || attendanceStatus === 'completed'
    const timeOutCompleted = attendanceStatus === 'completed'
    const showTimeInOptions = !timeInCompleted
    const showTimeOutOptions = timeInCompleted && !timeOutCompleted

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Header />
            
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
                {/* Offline Indicator */}
                {isOffline && (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-yellow-900">Offline Mode</p>
                                <p className="text-sm text-yellow-700">Your attendance will be saved locally and synced when you reconnect.</p>
                            </div>
                        </div>
                        {pendingSyncCount > 0 && (
                            <div className="flex items-center gap-2 bg-yellow-200 px-3 py-1.5 rounded-lg">
                                <span className="text-sm font-bold text-yellow-900">{pendingSyncCount}</span>
                                <span className="text-xs text-yellow-800">pending</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Pending Sync Indicator (when online) */}
                {!isOffline && pendingSyncCount > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                {isSyncing ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <p className="font-semibold text-blue-900">
                                    {isSyncing ? 'Syncing...' : `${pendingSyncCount} attendance record(s) pending sync`}
                                </p>
                                <p className="text-sm text-blue-700">
                                    {isSyncing ? 'Please wait while we sync your attendance records.' : 'Your offline attendance records will sync automatically.'}
                                </p>
                            </div>
                        </div>
                        {!isSyncing && (
                            <button
                                onClick={() => syncPendingRecords(backendUrl, true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
                            >
                                Sync Now
                            </button>
                        )}
                    </div>
                )}

                {/* Header Section */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <button
                                onClick={() => navigate(`/volunteer/attendance/${eventId}`)}
                                className="p-2 sm:p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">QR Code Scanner</h1>
                                <p className="text-base sm:text-lg font-semibold text-[#800000]">{event.title}</p>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1">
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

                {/* Time In Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                                timeInCompleted ? 'bg-green-500' : 'bg-blue-500'
                            }`}>
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Time In</h2>
                                <p className="text-xs sm:text-sm text-gray-600">Record your arrival time</p>
                            </div>
                        </div>
                        {timeInCompleted && (
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                <span className="font-semibold text-sm sm:text-base">Completed</span>
                            </div>
                        )}
                    </div>
                    
                    {timeInCompleted ? (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-green-900 mb-1">Time In Recorded</p>
                                        {attendanceData?.offline && (
                                            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                                                Offline
                                            </span>
                                        )}
                                    </div>
                                    {attendanceData?.checkInTime && (
                                        <p className="text-sm text-green-700">
                                            {new Date(attendanceData.checkInTime).toLocaleString()}
                                        </p>
                                    )}
                                        </div>
                                    </div>
                                </div>
                    ) : (
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
                            )}
                        </div>

                {/* Time Out Section */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                                timeOutCompleted ? 'bg-green-500' : timeInCompleted ? 'bg-orange-500' : 'bg-gray-300'
                            }`}>
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </div>
                                <div>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Time Out</h2>
                                <p className="text-xs sm:text-sm text-gray-600">Record your departure time</p>
                        </div>
                                </div>
                        {timeOutCompleted && (
                            <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 sm:px-4 py-2 rounded-lg">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="font-semibold text-sm sm:text-base">Completed</span>
                            </div>
                        )}
                </div>

                    {!timeInCompleted ? (
                        <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-700 mb-1">Complete Time In First</p>
                                    <p className="text-sm text-gray-600">Please record your time in before recording time out</p>
                                </div>
                            </div>
                        </div>
                    ) : timeOutCompleted ? (
                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 sm:p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-green-900 mb-1">Time Out Recorded</p>
                                        {attendanceData?.offline && (
                                            <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full">
                                                Offline
                                            </span>
                                        )}
                                    </div>
                                    {attendanceData?.checkOutTime && (
                                        <p className="text-sm text-green-700">
                                            {new Date(attendanceData.checkOutTime).toLocaleString()}
                                        </p>
                                    )}
                                    {attendanceData?.hoursWorked && (
                                        <p className="text-sm font-semibold text-green-800 mt-2">
                                            Total Hours: {attendanceData.hoursWorked.toFixed(2)} hours
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
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
                    )}
                </div>

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

export default QRScanner
