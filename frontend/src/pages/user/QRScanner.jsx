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
    const [scanning, setScanning] = useState(false)
    const [cameraError, setCameraError] = useState(null)
    const scannerRef = useRef(null)
    const html5QrCodeRef = useRef(null)

    useEffect(() => {
        fetchEventData()
    }, [eventId])

    // Auto check-in via deeplink token (?token=...)
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const token = params.get('token')
        if (token && !processing) {
            ;(async () => {
                setProcessing(true)
                try {
                    const response = await axios.post(`${backendUrl}api/attendance/check-in`, { token }, { withCredentials: true })
                    toast.success(response.data?.message || 'Attendance recorded')
                    const status = response.data?.status
                    if (status === 'timein') setAttendanceStatus('timeout')
                    else if (status === 'timeout') setAttendanceStatus('completed')
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Failed to check in')
                } finally {
                    setProcessing(false)
                }
            })()
        }
    }, [location.search, backendUrl])

    const fetchEventData = async () => {
        try {
            const response = await axios.get(`${backendUrl}api/events/${eventId}`, { withCredentials: true })
            setEvent(response.data.event)
        } catch (error) {
            console.error('Error fetching event data:', error)
            toast.error('Failed to load event data')
            navigate('/user/events')
        } finally {
            setLoading(false)
        }
    }

    const handleQRScan = async (qrCode) => {
        if (processing) return // Prevent duplicate scans
        
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
                action = attendanceStatus === 'timein' ? 'timeout' : 'timein'
            }
            
            const response = await axios.post(`${backendUrl}api/volunteers/attendance/record`, 
                { qrCode, action }, 
                { withCredentials: true }
            )
            
            toast.success(response.data.message || 'Attendance recorded successfully!')
            
            // Update attendance status for UI
            if (action === 'timein') {
                setAttendanceStatus('timeout')
            } else {
                setAttendanceStatus('completed')
            }
            
            // Resume scanning after a short delay
            setTimeout(() => {
                startScanning()
            }, 2000)
            
        } catch (error) {
            console.error('Error recording attendance:', error)
            toast.error(error.response?.data?.message || 'Failed to record attendance')
            
            // Resume scanning on error
            setTimeout(() => {
                startScanning()
            }, 2000)
        } finally {
            setProcessing(false)
        }
    }
    
    const startScanning = async () => {
        if (processing) return // Don't start if processing a scan
        
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
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    disableFlip: false
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
            setCameraError('Failed to access camera. Please ensure camera permissions are granted.')
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading QR scanner..." />
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
                            onClick={() => navigate('/user/events')}
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
            
            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/user/events')}
                                className="mr-4 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-black mb-2">Attendance Scanner</h1>
                                <p className="text-gray-600">{event.title}</p>
                                <p className="text-sm text-gray-500">
                                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scanner Section */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Scan QR Code</h2>
                        <div className="flex gap-2">
                            {!scanning ? (
                                <button
                                    onClick={startScanning}
                                    disabled={processing}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Start Camera
                                </button>
                            ) : (
                                <button
                                    onClick={stopScanning}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
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
                    
                    <div className="text-center">
                        {/* QR Code Scanner */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black"></div>
                            {cameraError && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-800 text-sm">{cameraError}</p>
                                    <button
                                        onClick={handleManualQR}
                                        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    >
                                        Enter QR Code Manually
                                    </button>
                                </div>
                            )}
                            {!scanning && !cameraError && (
                                <div className="mt-4">
                                    <p className="text-gray-600 mb-4">
                                        Click "Start Camera" to begin scanning QR codes
                                    </p>
                                    <button
                                        onClick={handleManualQR}
                                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Enter QR Code Manually
                                    </button>
                                </div>
                            )}
                            {scanning && (
                                <p className="mt-4 text-sm text-gray-600">
                                    Point your camera at the QR code. Scanning will pause automatically when a code is detected.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Attendance Status */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Attendance Status</h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                                <span className="text-gray-700">Time In</span>
                            </div>
                            <span className="text-sm text-gray-500">
                                {attendanceStatus === 'timeout' || attendanceStatus === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <div className={`w-3 h-3 rounded-full mr-3 ${
                                    attendanceStatus === 'completed' ? 'bg-green-500' : 'bg-gray-400'
                                }`}></div>
                                <span className="text-gray-700">Time Out</span>
                            </div>
                            <span className="text-sm text-gray-500">
                                {attendanceStatus === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                    </div>
                    
                    {attendanceStatus && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-green-800">
                                    {attendanceStatus === 'completed' 
                                        ? 'Attendance recorded successfully!' 
                                        : 'Time in recorded. Remember to scan again for time out.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
                    <ul className="space-y-2 text-blue-800">
                        <li className="flex items-start">
                            <span className="font-semibold mr-2">1.</span>
                            Scan the QR code when you arrive at the event (Time In)
                        </li>
                        <li className="flex items-start">
                            <span className="font-semibold mr-2">2.</span>
                            Scan the QR code again when you leave (Time Out)
                        </li>
                        <li className="flex items-start">
                            <span className="font-semibold mr-2">3.</span>
                            Your volunteer hours will be calculated automatically
                        </li>
                        <li className="flex items-start">
                            <span className="font-semibold mr-2">4.</span>
                            If you forget to scan Time Out, your hours will be invalidated
                        </li>
                    </ul>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default QRScanner
