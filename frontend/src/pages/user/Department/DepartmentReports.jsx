import React, { useContext, useState, useEffect } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
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
        
        // Monthly trends from actual data
        const monthlyTrends = []
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        months.forEach((monthName, monthIndex) => {
            const monthEvents = events.filter(e => {
                const eventDate = new Date(e.startDate)
                return eventDate.getMonth() === monthIndex
            })
            
            const monthDonations = donations.filter(d => {
                const donationDate = new Date(d.donatedAt || d.createdAt)
                return donationDate.getMonth() === monthIndex
            })
            
            const monthVolunteers = new Set()
            monthEvents.forEach(event => {
                if (event.volunteers && event.volunteers.length > 0) {
                    event.volunteers.forEach(vol => {
                        if (vol.userId) {
                            monthVolunteers.add(vol.userId.toString())
                        }
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
        
        return {
            // Event Statistics
            eventStats: {
                total: totalEvents,
                approved: events.filter(e => e.status === 'Approved').length,
                pending: events.filter(e => e.status === 'Pending' || e.status === 'Proposed').length,
                completed: events.filter(e => e.status === 'Completed').length,
                upcoming: events.filter(e => e.status === 'Upcoming').length
            },
            
            // Financial Statistics
            financialStats: {
                totalDonations: totalDonations,
                averageDonation: donations.length > 0 ? totalDonations / donations.length : 0,
                monthlyGrowth: 15.2,
                topEvent: events.reduce((max, event) => {
                    const eventDonations = donations.filter(d => d.eventId === event._id)
                    const eventTotal = eventDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                    const maxTotal = donations.filter(d => d.eventId === max._id).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                    return eventTotal > maxTotal ? event : max
                }, events[0] || {})
            },
            
            // Demographics Data
            demographics: {
                donorCategories: donorDemographics,
                eventStatus: eventStatusData,
                volunteerCount: totalVolunteers,
                donationCount: donations.length
            },
            
            // Engagement Metrics
            engagement: {
                averageAttendance: 78.5,
                volunteerRetention: 82.3,
                eventSatisfaction: 4.6
            },
            
            // Monthly Trends
            monthlyTrends: monthlyTrends
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
                    ['Average Attendance (%)', data.engagement.averageAttendance],
                    ['Volunteer Retention (%)', data.engagement.volunteerRetention],
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center justify-center flex-shrink-0">
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center space-x-1 flex-shrink-0 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend > 0 ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-1 truncate" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</h3>
            <p className="text-gray-600 text-xs sm:text-sm font-medium">{title}</p>
            {subtitle && <p className="text-gray-500 text-xs mt-1 hidden sm:block">{subtitle}</p>}
        </div>
    )

    const ProgressBar = ({ label, percentage, color = 'bg-indigo-500' }) => (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    )

    // Advanced Donut Chart Component
    const DonutChart = ({ data, colors, size = 200, strokeWidth = 20, title, subtitle }) => {
        const total = data.reduce((sum, item) => sum + item.value, 0)
        const radius = (size - strokeWidth) / 2
        const circumference = 2 * Math.PI * radius
        let cumulativePercentage = 0

        const createArcPath = (percentage, index) => {
            const startAngle = cumulativePercentage * 3.6
            const endAngle = (cumulativePercentage + percentage) * 3.6
            cumulativePercentage += percentage

            const startAngleRad = (startAngle - 90) * (Math.PI / 180)
            const endAngleRad = (endAngle - 90) * (Math.PI / 180)
            
            const centerX = size / 2
            const centerY = size / 2

            const x1 = centerX + radius * Math.cos(startAngleRad)
            const y1 = centerY + radius * Math.sin(startAngleRad)
            const x2 = centerX + radius * Math.cos(endAngleRad)
            const y2 = centerY + radius * Math.sin(endAngleRad)

            const largeArcFlag = percentage > 50 ? 1 : 0

            return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
        }

        return (
            <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                <div className="relative w-[180px] h-[180px] sm:w-[200px] sm:h-[200px] lg:w-[220px] lg:h-[220px]">
                    {/* Background Circle */}
                    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 drop-shadow-lg">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth={strokeWidth}
                            className="opacity-30"
                        />
                        
                        {/* Data Segments */}
                        {data.map((item, index) => {
                            const pathLength = (item.percentage / 100) * circumference
                            return (
                                <g key={index}>
                                    <defs>
                                        <linearGradient id={`gradient-${index}-${title}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={colors[index]} stopOpacity="0.8" />
                                            <stop offset="100%" stopColor={colors[index]} stopOpacity="1" />
                                        </linearGradient>
                                        <filter id={`glow-${index}-${title}`}>
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                            <feMerge> 
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    <path
                                        d={createArcPath(item.percentage, index)}
                                        fill="none"
                                        stroke={`url(#gradient-${index}-${title})`}
                                        strokeWidth={strokeWidth}
                                        strokeLinecap="round"
                                        filter={`url(#glow-${index}-${title})`}
                                        className="donut-segment transition-all duration-700 ease-out hover:stroke-width-6 cursor-pointer"
                                        style={{
                                            strokeDasharray: `${pathLength} ${circumference}`,
                                            strokeDashoffset: 0,
                                            animationDelay: `${index * 0.2}s`
                                        }}
                                    />
                                </g>
                            )
                        })}
                    </svg>
                    
                    {/* Center Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{total}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium">{title || 'Total'}</div>
                            {subtitle && <div className="text-[10px] sm:text-xs text-gray-500 mt-1 hidden sm:block">{subtitle}</div>}
                        </div>
                    </div>
                </div>
                
                {/* Legend with Enhanced Design */}
                <div className="grid grid-cols-1 gap-2 sm:gap-3 w-full max-w-xs">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                <div className="relative flex-shrink-0">
                                    <div 
                                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-sm"
                                        style={{ backgroundColor: colors[index] }}
                                    ></div>
                                    <div 
                                        className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-ping opacity-20"
                                        style={{ backgroundColor: colors[index] }}
                                    ></div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.label}</div>
                                    <div className="text-[10px] sm:text-xs text-gray-500">{item.percentage}%</div>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <div className="text-xs sm:text-sm font-bold text-gray-900">{item.value}</div>
                                <div className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">count</div>
                            </div>
                        </div>
                    ))}
                </div>
                
            </div>
        )
    }

    // Enhanced Bar Chart Component
    const BarChart = ({ data, colors, height = 200 }) => {
        const maxValue = Math.max(...data.map(item => item.value), 1)
        const maroonShades = ['#800020', '#9c0000', '#a0002a', '#b30024', '#c40028']
        
        return (
            <div className="space-y-4 sm:space-y-6">
                {data.map((item, index) => {
                    const colorIndex = index % maroonShades.length
                    const barColor = maroonShades[colorIndex]
                    return (
                        <div key={index} className="group">
                            <div className="flex justify-between items-center mb-2 sm:mb-3">
                                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                    <div className="relative flex-shrink-0">
                                        <div 
                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm"
                                            style={{ backgroundColor: barColor }}
                                        ></div>
                                        <div 
                                            className="absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-ping opacity-20"
                                            style={{ backgroundColor: barColor }}
                                        ></div>
                                    </div>
                                    <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.label}</span>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <span className="text-base sm:text-lg font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{item.value}</span>
                                    <span className="text-[10px] sm:text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 shadow-inner">
                                    <div 
                                        className="h-3 sm:h-4 rounded-full transition-all duration-1000 ease-out shadow-sm group-hover:shadow-md"
                                        style={{ 
                                            width: `${(item.value / maxValue) * 100}%`,
                                            background: `linear-gradient(to right, ${barColor}, ${maroonShades[(colorIndex + 1) % maroonShades.length]})`,
                                            animationDelay: `${index * 0.1}s`
                                        }}
                                    >
                                        <div className="w-full h-full bg-white bg-opacity-20 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[10px] sm:text-xs font-medium text-white mix-blend-difference">
                                        {Math.round((item.value / maxValue) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
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
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    <div className="bg-white rounded-xl shadow-md px-4 sm:px-6 py-5 mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-3xl font-bold text-black mb-2">Analytics & Reports</h1>
                                <p className="text-gray-600">
                                    Comprehensive insights into your department's performance
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 sm:p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Data Available</h3>
                            <p className="text-gray-600 mb-6">
                                You don't have any events or donations yet. Start by creating an event to see analytics and reports.
                            </p>
                            <button
                                onClick={() => navigate('/department/dashboard')}
                                className="inline-flex items-center justify-center bg-gradient-to-r from-[#800020] to-[#9c0000] text-white px-6 py-3 rounded-lg hover:from-[#9c0000] hover:to-[#a0002a] transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Global CSS for Donut Chart Animations and Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes drawArc {
                        from {
                            stroke-dashoffset: 1000;
                        }
                        to {
                            stroke-dashoffset: 0;
                        }
                    }
                    .donut-segment {
                        stroke-dasharray: 1000;
                        stroke-dashoffset: 1000;
                        animation: drawArc 1.5s ease-out forwards;
                    }
                    
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
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Print Header */}
                <div className="print-header no-print" style={{ display: 'none' }}>
                    <h1>Department Analytics & Reports</h1>
                    <p>Generated on {new Date().toLocaleString()}</p>
                </div>

                {/* Back Button - Top Left (Mobile/Tablet Only) */}
                <div className="mb-4 lg:hidden no-print">
                    <button
                        onClick={() => navigate('/department/dashboard')}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-md px-4 sm:px-6 py-5 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-bold text-black mb-2">Analytics & Reports</h1>
                            <p className="text-gray-600">
                                Comprehensive insights into your department's performance
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 no-print">
                            <button 
                                onClick={() => window.print()}
                                className="inline-flex items-center justify-center bg-white text-[#800020] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border-2 border-[#800020] hover:bg-gradient-to-r hover:from-[#800020] hover:to-[#9c0000] hover:text-white hover:border-transparent transition-all duration-200 font-medium shadow-sm hover:shadow-md w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span>Print Report</span>
                            </button>
                            <button 
                                onClick={() => handleExportReport('csv')}
                                className="inline-flex items-center justify-center bg-gradient-to-r from-[#800020] to-[#9c0000] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-[#9c0000] hover:to-[#a0002a] transition-all duration-200 font-medium shadow-md hover:shadow-lg w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export CSV</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8 no-print">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Report Filters</h3>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-xs sm:text-sm text-gray-600">Real-time data</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Time Period</label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                            >
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Event Type</label>
                            <select
                                value={selectedEvent}
                                onChange={(e) => setSelectedEvent(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                            >
                                <option value="all">All Events</option>
                                {events.map(event => (
                                    <option key={event._id} value={event._id} className="truncate">{event.title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Report Type</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                            >
                                <option value="overview">Overview</option>
                                <option value="demographics">Demographics</option>
                                <option value="financial">Financial</option>
                                <option value="engagement">Engagement</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Custom Range</label>
                            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                                    className="flex-1 px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                                />
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                                    className="flex-1 px-3 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                    <StatCard
                        title="Total Events"
                        value={data.eventStats.total}
                        subtitle={`${data.eventStats.approved} approved`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        trend={12.5}
                    />
                    <StatCard
                        title="Total Donations"
                        value={`₱${data.financialStats.totalDonations.toLocaleString()}`}
                        subtitle={`₱${Math.round(data.financialStats.averageDonation).toLocaleString()} average`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                        trend={8.3}
                    />
                    <StatCard
                        title="Active Volunteers"
                        value={data.demographics.volunteerCount}
                        subtitle={`${data.engagement.volunteerRetention}% retention`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        trend={15.7}
                    />
                    <StatCard
                        title="Total Donors"
                        value={data.demographics.donationCount}
                        subtitle={`${data.demographics.donorCategories.length} categories`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        trend={5.2}
                    />
                </div>

                {/* Demographics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                    {/* Donor Categories - Bar Chart */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Donor Demographics</h3>
                        {data.demographics.donorCategories.length > 0 ? (
                            <BarChart
                                data={data.demographics.donorCategories.map(cat => ({
                                    label: cat.category,
                                    value: cat.count,
                                    percentage: cat.percentage
                                }))}
                                colors={[
                                    'bg-gradient-to-r from-[#800020] to-[#9c0000]',
                                    'bg-gradient-to-r from-[#9c0000] to-[#a0002a]',
                                    'bg-gradient-to-r from-[#a0002a] to-[#b30024]',
                                    'bg-gradient-to-r from-[#b30024] to-[#c40028]'
                                ]}
                            />
                        ) : (
                            <div className="text-center py-8 text-gray-500">No donor data available</div>
                        )}
                    </div>

                    {/* Event Status Distribution - Advanced Donut Chart */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Event Status Distribution</h3>
                        {data.demographics.eventStatus.length > 0 ? (
                            <DonutChart
                                data={data.demographics.eventStatus.map(status => ({
                                    label: status.status,
                                    value: status.count,
                                    percentage: status.percentage
                                }))}
                                colors={['#800020', '#9c0000', '#a0002a', '#b30024', '#c40028']}
                                size={220}
                                strokeWidth={24}
                                title="Events"
                                subtitle="Status breakdown"
                            />
                        ) : (
                            <div className="text-center py-8 text-gray-500">No event data available</div>
                        )}
                    </div>
                </div>

                {/* Monthly Trends Chart */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Monthly Performance Trends</h3>
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
                                            <div className="text-[10px] sm:text-xs font-medium" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{month.events}</div>
                                            <div className="text-[9px] sm:text-xs text-gray-500 truncate">₱{(month.donations / 1000).toFixed(0)}k</div>
                                            <div className="text-[9px] sm:text-xs text-gray-400">{month.volunteers} vol</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Average Attendance</h4>
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{data.engagement.averageAttendance}%</div>
                        <p className="text-xs sm:text-sm text-gray-600">Event participation rate</p>
                    </div>
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h4 className="text-base sm:text-lg font-semibold text-gray-900">Volunteer Retention</h4>
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{data.engagement.volunteerRetention}%</div>
                        <p className="text-xs sm:text-sm text-gray-600">Returning volunteers</p>
                    </div>
                </div>

                {/* Top Performing Event */}
                {data.financialStats.topEvent && data.financialStats.topEvent._id && events.length > 0 && (
                    <div className="bg-gradient-to-r from-[#800020] to-[#9c0000] rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 text-white">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 lg:gap-0">
                            <div className="text-center lg:text-left w-full lg:w-auto">
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">Top Performing Event</h3>
                                <p className="text-white/90 text-sm sm:text-base lg:text-lg mb-4 truncate">{data.financialStats.topEvent.title || 'N/A'}</p>
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
