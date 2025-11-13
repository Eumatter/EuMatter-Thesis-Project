import React, { useState, useContext, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/LoadingSpinner'

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
        setScannedCode(qrCode)
        setProcessing(true)
        
        try {
            // Determine action based on current attendance status
            const action = attendanceStatus === 'timein' ? 'timeout' : 'timein'
            
            // Legacy/manual input path not using token; keep for fallback UX
            const response = await axios.post(`${backendUrl}api/volunteers/attendance/record`, 
                { qrCode, action }, 
                { withCredentials: true }
            )
            
            toast.success(response.data.message)
            setAttendanceStatus(action)
            
            // Update attendance status for UI
            if (action === 'timein') {
                setAttendanceStatus('timeout')
            } else {
                setAttendanceStatus('completed')
            }
            
        } catch (error) {
            console.error('Error recording attendance:', error)
            toast.error(error.response?.data?.message || 'Failed to record attendance')
        } finally {
            setProcessing(false)
        }
    }

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
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Scan QR Code</h2>
                    
                    <div className="text-center">
                        <div className="bg-gray-50 rounded-lg p-8 mb-6">
                            <div className="w-64 h-64 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <p className="text-gray-600 mb-4">
                                Point your camera at the QR code to scan attendance
                            </p>
                            <button
                                onClick={handleManualQR}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Enter QR Code Manually
                            </button>
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
