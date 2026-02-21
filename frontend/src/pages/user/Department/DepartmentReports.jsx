import React, { useContext, useState, useEffect } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import axios from 'axios'
import { toast } from 'react-toastify'

const DepartmentReports = () => {
    const navigate = useNavigate()
    const { userData, backendUrl } = useContext(AppContent)
    const [events, setEvents] = useState([])
    const [donations, setDonations] = useState([])
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedPeriod, setSelectedPeriod] = useState('month')
    const [selectedEvent, setSelectedEvent] = useState('all')
    const [reportType, setReportType] = useState('overview')
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (userData?._id) {
            fetchData()
        }
    }, [userData?._id])

    const fetchData = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            
            // Declare variables in outer scope to avoid reference errors
            let departmentEvents = []
            let allDonations = []
            
            // Fetch events
            try {
                const eventsRes = await axios.get(`${backendUrl}api/events`)
                if (eventsRes.data && Array.isArray(eventsRes.data)) {
                    departmentEvents = eventsRes.data.filter(e => e?.createdBy?._id === userData?._id)
                    setEvents(departmentEvents)
                    
                    // Extract donations from events
                    departmentEvents.forEach(event => {
                        if (event.donations && Array.isArray(event.donations) && event.donations.length > 0) {
                            event.donations.forEach(donation => {
                                // Only include successful donations
                                if (donation.status === 'succeeded' || donation.status === 'cash_completed' || donation.status === 'completed') {
                                    allDonations.push({
                                        ...donation,
                                        eventId: event._id,
                                        eventTitle: event.title
                                    })
                                }
                            })
                        }
                    })
                    setDonations(allDonations)
                }
            } catch (eventsError) {
                console.error('Error fetching events:', eventsError)
                if (eventsError.response?.status !== 404) {
                    toast.error('Failed to fetch events')
                }
            }
            
            // Try to fetch users (may fail if no access)
            try {
                const usersRes = await axios.get(`${backendUrl}api/users`, { withCredentials: true })
                if (usersRes.data && Array.isArray(usersRes.data)) {
                    setUsers(usersRes.data)
                }
            } catch (userError) {
                // If users API fails, extract unique users from donations and departmentEvents
                if (userError.response?.status === 404) {
                    console.log('Users API not available, extracting from events and donations')
                }
                
                const uniqueUsers = new Map()
                
                // Extract users from events volunteers
                if (departmentEvents && departmentEvents.length > 0) {
                    departmentEvents.forEach(event => {
                        if (event.volunteers && Array.isArray(event.volunteers) && event.volunteers.length > 0) {
                            event.volunteers.forEach(vol => {
                                if (vol.userId && !uniqueUsers.has(vol.userId.toString())) {
                                    uniqueUsers.set(vol.userId.toString(), {
                                        _id: vol.userId,
                                        name: vol.name || 'Unknown User',
                                        mseufCategory: vol.mseufCategory || 'Guest'
                                    })
                                }
                            })
                        }
                    })
                }
                
                // Extract users from donations
                if (allDonations && allDonations.length > 0) {
                    allDonations.forEach(donation => {
                        if (donation.donor) {
                            const donorId = donation.donor._id?.toString() || donation.donor.toString()
                            if (!uniqueUsers.has(donorId)) {
                                uniqueUsers.set(donorId, {
                                    _id: donation.donor._id || donation.donor,
                                    name: donation.donor.name || 'Anonymous Donor',
                                    mseufCategory: donation.donor.mseufCategory || 'Guest'
                                })
                            }
                        }
                    })
                }
                
                setUsers(Array.from(uniqueUsers.values()))
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            if (error.response?.status === 404) {
                toast.error('Resource not found. Please check your connection.')
            } else {
                toast.error('Failed to fetch data. Please try again.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    // Generate data from actual events, donations, and users
    const generateData = () => {
        const totalEvents = events.length
        const totalDonations = donations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
        const uniqueVolunteers = new Set()
        events.forEach(event => {
            if (event.volunteers && event.volunteers.length > 0) {
                event.volunteers.forEach(vol => {
                    if (vol.userId) {
                        uniqueVolunteers.add(vol.userId.toString())
                    }
                })
            }
        })
        const totalVolunteers = uniqueVolunteers.size
        
        // Calculate demographics from actual data
        const donorCategories = {
            'Student': 0,
            'Alumni': 0,
            'Faculty/Staff': 0,
            'Guest': 0
        }
        
        donations.forEach(donation => {
            if (donation.donor) {
                const donor = typeof donation.donor === 'object' ? donation.donor : users.find(u => u._id === donation.donor)
                if (donor) {
                    if (donor.mseufCategory === 'Student') donorCategories['Student']++
                    else if (donor.mseufCategory === 'Alumni') donorCategories['Alumni']++
                    else if (donor.mseufCategory === 'Faculty/Staff') donorCategories['Faculty/Staff']++
                    else donorCategories['Guest']++
                } else {
                    donorCategories['Guest']++
                }
            } else {
                donorCategories['Guest']++
            }
        })
        
        const totalDonors = Object.values(donorCategories).reduce((sum, count) => sum + count, 0)
        const donorDemographics = Object.entries(donorCategories)
            .filter(([_, count]) => count > 0)
            .map(([category, count]) => ({
                category,
                count,
                percentage: totalDonors > 0 ? Math.round((count / totalDonors) * 100 * 10) / 10 : 0
            }))
        
        // Event status distribution
        const eventStatusCounts = {
            'Approved': events.filter(e => e.status === 'Approved').length,
            'Pending': events.filter(e => e.status === 'Pending' || e.status === 'Proposed').length,
            'Completed': events.filter(e => e.status === 'Completed').length,
            'Upcoming': events.filter(e => e.status === 'Upcoming').length,
            'Ongoing': events.filter(e => e.status === 'Ongoing').length
        }
        
        const eventStatusData = Object.entries(eventStatusCounts)
            .filter(([_, count]) => count > 0)
            .map(([status, count]) => ({
                status,
                count,
                percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100 * 10) / 10 : 0
            }))
        
        // Monthly trends: current year only (accurate)
        const currentYear = new Date().getFullYear()
        const monthlyTrends = []
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        months.forEach((monthName, monthIndex) => {
            const monthEvents = events.filter(e => {
                const eventDate = new Date(e.startDate)
                return eventDate.getFullYear() === currentYear && eventDate.getMonth() === monthIndex
            })
            const monthDonations = donations.filter(d => {
                const donationDate = new Date(d.donatedAt || d.createdAt)
                return donationDate.getFullYear() === currentYear && donationDate.getMonth() === monthIndex
            })
            const monthVolunteers = new Set()
            monthEvents.forEach(event => {
                if (event.volunteers && event.volunteers.length > 0) {
                    event.volunteers.forEach(vol => {
                        if (vol.userId) monthVolunteers.add(vol.userId.toString())
                    })
                }
            })
            monthlyTrends.push({
                month: monthName,
                events: monthEvents.length,
                donations: monthDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
                volunteers: monthVolunteers.size
            })
        })

        // Month-over-month donation growth (this month vs last month) – real data
        const now = new Date()
        const thisMonthDonations = donations
            .filter(d => {
                const dte = new Date(d.donatedAt || d.createdAt)
                return dte.getFullYear() === now.getFullYear() && dte.getMonth() === now.getMonth()
            })
            .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
        const lastMonthDonations = donations
            .filter(d => {
                const dte = new Date(d.donatedAt || d.createdAt)
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                return dte.getFullYear() === lastMonth.getFullYear() && dte.getMonth() === lastMonth.getMonth()
            })
            .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
        const monthlyGrowth = lastMonthDonations > 0
            ? Math.round(((thisMonthDonations - lastMonthDonations) / lastMonthDonations) * 1000) / 10
            : (thisMonthDonations > 0 ? 100 : 0)

        // Volunteer retention: volunteers who appear in more than one event / total volunteers (when we have data)
        let volunteerRetention = null
        if (totalVolunteers > 0) {
            const volunteerEventCount = new Map()
            events.forEach(event => {
                if (event.volunteers && event.volunteers.length > 0) {
                    event.volunteers.forEach(vol => {
                        if (vol.userId) {
                            const id = vol.userId.toString()
                            volunteerEventCount.set(id, (volunteerEventCount.get(id) || 0) + 1)
                        }
                    })
                }
            })
            const returningVolunteers = [...volunteerEventCount.values()].filter(c => c > 1).length
            volunteerRetention = Math.round((returningVolunteers / totalVolunteers) * 1000) / 10
        }

        // Top event by donation total (only when we have events)
        let topEvent = null
        if (events.length > 0) {
            topEvent = events.reduce((max, event) => {
                const eventTotal = donations
                    .filter(d => d.eventId === event._id)
                    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                const maxTotal = donations
                    .filter(d => d.eventId === max._id)
                    .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                return eventTotal > maxTotal ? event : max
            }, events[0])
        }

        return {
            eventStats: {
                total: totalEvents,
                approved: events.filter(e => e.status === 'Approved').length,
                pending: events.filter(e => e.status === 'Pending' || e.status === 'Proposed').length,
                completed: events.filter(e => e.status === 'Completed').length,
                upcoming: events.filter(e => e.status === 'Upcoming').length
            },
            financialStats: {
                totalDonations: totalDonations,
                averageDonation: donations.length > 0 ? totalDonations / donations.length : 0,
                monthlyGrowth,
                topEvent
            },
            demographics: {
                donorCategories: donorDemographics,
                eventStatus: eventStatusData,
                volunteerCount: totalVolunteers,
                donationCount: donations.length
            },
            engagement: {
                volunteerRetention
            },
            monthlyTrends
        }
    }

    const data = generateData()

    const handleExportReport = (format) => {
        const reportData = {
            period: selectedPeriod,
            eventType: selectedEvent,
            reportType: reportType,
            generatedAt: new Date().toISOString(),
            data: data
        }

        if (format === 'pdf') {
            // Trigger browser print dialog for PDF
            window.print()
            toast.success('Opening print dialog for PDF export')
        } else if (format === 'excel') {
            toast.info('Excel export feature coming soon!')
        } else if (format === 'csv') {
            try {
                const csvContent = [
                    ['Department Report', ''],
                    ['Generated At', new Date().toLocaleString()],
                    ['Period', selectedPeriod],
                    ['Event Type', selectedEvent === 'all' ? 'All Events' : events.find(e => e._id === selectedEvent)?.title || 'All Events'],
                    [''],
                    ['Report Type', 'Value'],
                    ['Total Events', data.eventStats.total],
                    ['Approved Events', data.eventStats.approved],
                    ['Pending Events', data.eventStats.pending],
                    ['Completed Events', data.eventStats.completed],
                    ['Total Donations (₱)', data.financialStats.totalDonations.toFixed(2)],
                    ['Average Donation (₱)', data.financialStats.averageDonation.toFixed(2)],
                    ['Total Volunteers', data.demographics.volunteerCount],
                    ['Total Donors', data.demographics.donationCount],
                    ['Volunteer Retention (%)', data.engagement.volunteerRetention != null ? data.engagement.volunteerRetention : 'N/A'],
                    [''],
                    ['Donor Categories', 'Count', 'Percentage'],
                    ...data.demographics.donorCategories.map(cat => [cat.category, cat.count, `${cat.percentage}%`]),
                    [''],
                    ['Event Status', 'Count', 'Percentage'],
                    ...data.demographics.eventStatus.map(status => [status.status, status.count, `${status.percentage}%`])
                ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `department-report-${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
                toast.success('Report exported successfully!')
            } catch (error) {
                console.error('Error exporting CSV:', error)
                toast.error('Failed to export report')
            }
        }
    }

    const StatCard = ({ title, value, subtitle, icon, trend }) => (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center flex-shrink-0">
                    {icon}
                </div>
                {trend != null && (
                    <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-[#800000] truncate">{value}</p>
            <p className="text-gray-600 text-sm font-medium">{title}</p>
            {subtitle && <p className="text-gray-500 text-xs mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>
    )

    // Minimal list with thin solid bar – no gradients, no donut
    const SimpleBreakdownList = ({ data, totalLabel }) => {
        const total = data.reduce((sum, item) => sum + item.value, 0)
        return (
            <div className="space-y-4">
                {totalLabel && total > 0 && (
                    <p className="text-sm text-gray-500">{total} {totalLabel}</p>
                )}
                <ul className="space-y-4">
                    {data.map((item, index) => (
                        <li key={index} className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="w-2 h-2 rounded-full bg-[#800000] flex-shrink-0" aria-hidden />
                                    <span className="text-sm font-medium text-gray-900 truncate">{item.label}</span>
                                </div>
                                <div className="flex items-baseline gap-1.5 flex-shrink-0">
                                    <span className="text-sm font-semibold text-[#800000]">{item.value}</span>
                                    <span className="text-xs text-gray-500">{item.percentage}%</span>
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#800000] rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F5F5F5]">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading reports..." />
                </div>
                <Footer />
            </div>
        )
    }

    // Empty state check
    const hasData = events.length > 0 || donations.length > 0

    if (!hasData && !isLoading) {
        return (
            <div className="min-h-screen bg-[#F5F5F5]">
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-5 mb-6">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">Analytics & Reports</h1>
                        <p className="text-sm text-gray-600 mt-0.5">Insights into your department&apos;s performance.</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#F5E6E8] border border-[#800000]/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Create events and receive donations to see analytics and reports.</p>
                        <button
                            type="button"
                            onClick={() => navigate('/department/dashboard')}
                            className="inline-flex items-center justify-center bg-[#800000] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6b0000] transition"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            {/* Global CSS for Donut Chart Animations and Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @media print {
                        @page {
                            margin: 1cm;
                        }
                        body * {
                            visibility: hidden;
                        }
                        main, main * {
                            visibility: visible;
                        }
                        main {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print {
                            display: none !important;
                        }
                        .print-header {
                            display: block;
                            margin-bottom: 20px;
                            padding-bottom: 10px;
                            border-bottom: 2px solid #800020;
                        }
                        .print-header h1 {
                            color: #800020;
                            font-size: 24px;
                            margin: 0;
                        }
                        .print-header p {
                            color: #666;
                            font-size: 12px;
                            margin: 5px 0 0 0;
                        }
                        .bg-white {
                            background: white !important;
                        }
                        .shadow-lg, .shadow-md, .shadow-sm {
                            box-shadow: none !important;
                        }
                        button {
                            display: none !important;
                        }
                    }
                `
            }} />
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Print Header */}
                <div className="print-header no-print" style={{ display: 'none' }}>
                    <h1>Department Analytics & Reports</h1>
                    <p>Generated on {new Date().toLocaleString()}</p>
                </div>

                <div className="mb-4 lg:hidden no-print">
                    <button
                        type="button"
                        onClick={() => navigate('/department/dashboard')}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Dashboard
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 sm:py-5 mb-6 no-print">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">Analytics & Reports</h1>
                            <p className="text-sm text-gray-600 mt-0.5">Insights into your department&apos;s performance.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center justify-center gap-2 bg-white text-[#800000] px-4 py-2.5 rounded-xl text-sm font-medium border border-[#800000] hover:bg-[#800000] hover:text-white transition w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print
                            </button>
                            <button
                                type="button"
                                onClick={() => handleExportReport('csv')}
                                className="inline-flex items-center justify-center gap-2 bg-[#800000] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#6b0000] transition w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6 no-print">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Filters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Time period</label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition bg-white"
                            >
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Event</label>
                            <select
                                value={selectedEvent}
                                onChange={(e) => setSelectedEvent(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition bg-white"
                            >
                                <option value="all">All Events</option>
                                {events.map(event => (
                                    <option key={event._id} value={event._id} className="truncate">{event.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Report type</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition bg-white"
                            >
                                <option value="overview">Overview</option>
                                <option value="demographics">Demographics</option>
                                <option value="financial">Financial</option>
                                <option value="engagement">Engagement</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">Date range</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition bg-white"
                                />
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition bg-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <StatCard
                        title="Total Events"
                        value={data.eventStats.total}
                        subtitle={`${data.eventStats.approved} approved`}
                        icon={<svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                    <StatCard
                        title="Total Donations"
                        value={`₱${data.financialStats.totalDonations.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        subtitle={`₱${Math.round(data.financialStats.averageDonation).toLocaleString()} avg`}
                        icon={<svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                        trend={data.financialStats.monthlyGrowth}
                    />
                    <StatCard
                        title="Active Volunteers"
                        value={data.demographics.volunteerCount}
                        subtitle={data.engagement.volunteerRetention != null ? `${data.engagement.volunteerRetention}% in 2+ events` : 'Across events'}
                        icon={<svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                    <StatCard
                        title="Total Donors"
                        value={data.demographics.donationCount}
                        subtitle={`${data.demographics.donorCategories.length} categories`}
                        icon={<svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                        <h3 className="text-base sm:text-lg font-bold text-[#800000] mb-4">Donor demographics</h3>
                        {data.demographics.donorCategories.length > 0 ? (
                            <SimpleBreakdownList
                                data={data.demographics.donorCategories.map(cat => ({
                                    label: cat.category,
                                    value: cat.count,
                                    percentage: cat.percentage
                                }))}
                                totalLabel="donors"
                            />
                        ) : (
                            <p className="text-sm text-gray-500 py-4">No donor data available.</p>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
                        <h3 className="text-base sm:text-lg font-bold text-[#800000] mb-4">Event status</h3>
                        {data.demographics.eventStatus.length > 0 ? (
                            <SimpleBreakdownList
                                data={data.demographics.eventStatus.map(status => ({
                                    label: status.status,
                                    value: status.count,
                                    percentage: status.percentage
                                }))}
                                totalLabel="events"
                            />
                        ) : (
                            <p className="text-sm text-gray-500 py-4">No event data available.</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-[#800000] mb-4">Monthly trends ({new Date().getFullYear()})</h3>
                    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                        <div className="grid grid-cols-12 gap-1 sm:gap-2 lg:gap-4 min-w-[600px] sm:min-w-0">
                            {data.monthlyTrends.map((month, index) => {
                                const maxEvents = Math.max(...data.monthlyTrends.map(m => m.events), 1)
                                const maxDonations = Math.max(...data.monthlyTrends.map(m => m.donations), 1)
                                const maxVolunteers = Math.max(...data.monthlyTrends.map(m => m.volunteers), 1)
                                return (
                                    <div key={month.month} className="text-center">
                                        <div className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1 sm:mb-2">{month.month}</div>
                                        <div className="space-y-0.5 sm:space-y-1">
                                            <div 
                                                className="bg-gradient-to-t from-[#800020] to-[#9c0000] rounded-t transition-all duration-300 hover:from-[#9c0000] hover:to-[#a0002a]" 
                                                style={{
                                                    height: `${Math.max(20, (month.events / maxEvents) * 80)}px`,
                                                    minHeight: '20px'
                                                }}
                                            ></div>
                                            <div className="text-[10px] sm:text-xs font-medium text-[#800000]">{month.events}</div>
                                            <div className="text-[9px] sm:text-xs text-gray-500 truncate">₱{(month.donations / 1000).toFixed(0)}k</div>
                                            <div className="text-[9px] sm:text-xs text-gray-400">{month.volunteers} vol</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Volunteer retention (only when we have data) */}
                {data.engagement.volunteerRetention != null && data.demographics.volunteerCount > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-base font-semibold text-gray-900">Volunteer retention</h4>
                                <p className="text-sm text-gray-500 mt-0.5">Volunteers who joined 2+ events</p>
                            </div>
                            <p className="text-2xl font-bold text-[#800000]">{data.engagement.volunteerRetention}%</p>
                        </div>
                    </div>
                )}

                {/* Top Performing Event */}
                {data.financialStats.topEvent && data.financialStats.topEvent._id && (
                    <div className="bg-[#800000] rounded-2xl border border-[#800000] shadow-sm p-4 sm:p-6 text-white">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-center sm:text-left w-full sm:w-auto">
                                <h3 className="text-lg font-bold mb-2">Top performing event</h3>
                                <p className="text-white/90 text-sm sm:text-base mb-4 truncate">{data.financialStats.topEvent.title || 'N/A'}</p>
                                <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                                    <div className="text-center lg:text-left">
                                        <p className="text-white/80 text-xs sm:text-sm">Total Donations</p>
                                        <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                                            ₱{donations.filter(d => d.eventId === data.financialStats.topEvent._id).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-center lg:text-left">
                                        <p className="text-white/80 text-xs sm:text-sm">Volunteers</p>
                                        <p className="text-lg sm:text-xl lg:text-2xl font-bold">{data.financialStats.topEvent.volunteers?.length || 0}</p>
                                    </div>
                                    <div className="text-center lg:text-left">
                                        <p className="text-white/80 text-xs sm:text-sm">Status</p>
                                        <p className="text-base sm:text-lg lg:text-xl font-bold truncate">{data.financialStats.topEvent.status || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}

export default DepartmentReports
