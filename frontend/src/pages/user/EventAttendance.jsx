import React, { useState, useContext, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContent } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import LoadingSpinner from '../../components/LoadingSpinner'

const EventAttendance = () => {
    const { backendUrl, userData } = useContext(AppContent)
    const { eventId } = useParams()
    const navigate = useNavigate()
    
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [attendanceStatus, setAttendanceStatus] = useState(null)
    const [attendanceData, setAttendanceData] = useState(null)

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

    useEffect(() => {
        if (event && userData?._id) {
            fetchAttendanceStatus()
        }
    }, [event?._id, userData?._id, fetchAttendanceStatus])

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

