import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaMoneyBillWave, FaCalendarAlt, FaPrint, FaFileExcel } from 'react-icons/fa'
import { motion } from 'framer-motion'

const EventDonationsReport = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    const [isLoading, setIsLoading] = useState(true)
    const [eventsData, setEventsData] = useState([])
    const [overallTotal, setOverallTotal] = useState(0)
    const [totalEvents, setTotalEvents] = useState(0)

    useEffect(() => {
        fetchEventDonations()
    }, [backendUrl])

    const fetchEventDonations = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(backendUrl + 'api/donations/totals/per-event')
            
            if (data.success) {
                setEventsData(data.events || [])
                setOverallTotal(data.overallTotal || 0)
                setTotalEvents(data.totalEvents || 0)
            } else {
                toast.error(data.message || 'Failed to fetch event donations')
            }
        } catch (error) {
            console.error('Error fetching event donations:', error)
            toast.error('Failed to load event donations report')
        } finally {
            setIsLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExportExcel = () => {
        // Create CSV content
        const headers = ['Event Title', 'Start Date', 'End Date', 'Total Donations (₱)', 'Donation Count', 'Target (₱)', 'Progress (%)']
        const rows = eventsData.map(event => [
            event.eventTitle || 'N/A',
            event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A',
            event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A',
            event.totalDonations.toFixed(2),
            event.donationCount,
            event.donationTarget ? event.donationTarget.toFixed(2) : 'N/A',
            event.donationTarget ? ((event.totalDonations / event.donationTarget) * 100).toFixed(2) + '%' : 'N/A'
        ])
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `event-donations-report-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Report exported successfully!')
    }

    const formatCurrency = (amount) => {
        return `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const calculateProgress = (total, target) => {
        if (!target || target === 0) return null
        return Math.min(100, (total / target) * 100).toFixed(1)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <LoadingSpinner size="large" text="Loading event donations report..." />
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-200 no-print">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/crd-staff/reports')}
                                className="p-2 text-[#800000] hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FaArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Event Donations Report
                                </h1>
                                <p className="text-gray-600 text-base sm:text-lg">Total donations received per event</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-[#800020] text-white rounded-lg hover:bg-[#9c0000] transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                <FaPrint className="w-4 h-4" />
                                <span>Print</span>
                            </button>
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                <FaFileExcel className="w-4 h-4" />
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Print Header - Only visible when printing */}
                <div className="hidden print:block mb-4">
                    <h1 className="text-2xl font-bold text-[#800020] mb-2">Event Donations Report</h1>
                    <p className="text-gray-600">Generated: {new Date().toLocaleString()}</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Donations</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800020]">
                                    {formatCurrency(overallTotal)}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800020]">
                                    {totalEvents}
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Average per Event</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800020]">
                                    {formatCurrency(totalEvents > 0 ? overallTotal / totalEvents : 0)}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Events Table */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-[#800020] to-[#9c0000] text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Event Title</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">End Date</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">Total Donations</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Count</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">Target</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {eventsData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12">
                                            <div className="text-center">
                                                <FaCalendarAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                <p className="text-gray-500 text-lg font-medium mb-2">No events with donations found</p>
                                                <p className="text-gray-400 text-sm">There are no events that have received donations yet</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    eventsData.map((event, index) => {
                                        const progress = calculateProgress(event.totalDonations, event.donationTarget)
                                        return (
                                            <tr key={event.eventId || index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {event.eventTitle || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-[#800020] text-right">
                                                    {formatCurrency(event.totalDonations)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                                    {event.donationCount}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                    {event.donationTarget ? formatCurrency(event.donationTarget) : 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {progress ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className="bg-[#800020] h-2 rounded-full"
                                                                    style={{ width: `${Math.min(100, progress)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-700">{progress}%</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                            {eventsData.length > 0 && (
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-gray-900">
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-[#800020] text-right">
                                            {formatCurrency(overallTotal)}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">
                                            {eventsData.reduce((sum, e) => sum + e.donationCount, 0)}
                                        </td>
                                        <td colSpan="2" className="px-4 py-3"></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default EventDonationsReport

