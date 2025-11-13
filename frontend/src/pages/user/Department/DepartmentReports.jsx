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
    const [isLoading, setIsLoading] = useState(true)
    const [selectedPeriod, setSelectedPeriod] = useState('month')
    const [selectedEvent, setSelectedEvent] = useState('all')
    const [reportType, setReportType] = useState('overview')
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(backendUrl + 'api/events')
            if (data) {
                const departmentEvents = data.filter(e => e?.createdBy?._id === userData?._id)
                setEvents(departmentEvents)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to fetch data')
        } finally {
            setIsLoading(false)
        }
    }

    // Generate realistic mock data for demographics and analytics
    const generateMockData = () => {
        const totalEvents = events.length
        const totalDonations = events.reduce((sum, event) => sum + (event.totalDonations || 0), 0)
        const totalVolunteers = events.reduce((sum, event) => sum + (event.volunteers?.length || 0), 0)
        
        return {
            // Event Statistics
            eventStats: {
                total: totalEvents,
                approved: events.filter(e => e.status === 'Approved').length,
                pending: events.filter(e => e.status === 'Proposed').length,
                completed: events.filter(e => e.status === 'Completed').length,
                upcoming: events.filter(e => e.status === 'Upcoming').length
            },
            
            // Financial Statistics
            financialStats: {
                totalDonations: totalDonations,
                averageDonation: totalDonations > 0 ? totalDonations / events.filter(e => e.donations?.length > 0).length : 0,
                monthlyGrowth: 15.2,
                topEvent: events.reduce((max, event) => 
                    (event.totalDonations || 0) > (max.totalDonations || 0) ? event : max, events[0] || {}
                )
            },
            
            // Demographics Data
            demographics: {
                ageGroups: [
                    { range: '18-25', count: 45, percentage: 28 },
                    { range: '26-35', count: 62, percentage: 38 },
                    { range: '36-45', count: 38, percentage: 23 },
                    { range: '46-55', count: 18, percentage: 11 }
                ],
                genderDistribution: [
                    { gender: 'Female', count: 89, percentage: 54.6 },
                    { gender: 'Male', count: 74, percentage: 45.4 }
                ],
                locationDistribution: [
                    { location: 'Metro Manila', count: 78, percentage: 47.9 },
                    { location: 'Cavite', count: 32, percentage: 19.6 },
                    { location: 'Laguna', count: 28, percentage: 17.2 },
                    { location: 'Rizal', count: 15, percentage: 9.2 },
                    { location: 'Others', count: 10, percentage: 6.1 }
                ],
                volunteerTypes: [
                    { type: 'Regular Volunteers', count: 95, percentage: 58.3 },
                    { type: 'Event Coordinators', count: 28, percentage: 17.2 },
                    { type: 'Technical Support', count: 22, percentage: 13.5 },
                    { type: 'First Aid', count: 18, percentage: 11.0 }
                ]
            },
            
            // Engagement Metrics
            engagement: {
                averageAttendance: 78.5,
                volunteerRetention: 82.3,
                socialMediaReach: 15420,
                emailOpenRate: 67.8,
                eventSatisfaction: 4.6
            },
            
            // Monthly Trends
            monthlyTrends: [
                { month: 'Jan', events: 3, donations: 12500, volunteers: 45 },
                { month: 'Feb', events: 5, donations: 18750, volunteers: 62 },
                { month: 'Mar', events: 4, donations: 15200, volunteers: 58 },
                { month: 'Apr', events: 6, donations: 22300, volunteers: 78 },
                { month: 'May', events: 7, donations: 28900, volunteers: 89 },
                { month: 'Jun', events: 5, donations: 19800, volunteers: 65 },
                { month: 'Jul', events: 8, donations: 31200, volunteers: 95 },
                { month: 'Aug', events: 6, donations: 25600, volunteers: 72 },
                { month: 'Sep', events: 9, donations: 34500, volunteers: 108 },
                { month: 'Oct', events: 7, donations: 27800, volunteers: 84 },
                { month: 'Nov', events: 5, donations: 20100, volunteers: 61 },
                { month: 'Dec', events: 4, donations: 16800, volunteers: 52 }
            ]
        }
    }

    const data = generateMockData()

    const handleExportReport = (format) => {
        const reportData = {
            period: selectedPeriod,
            eventType: selectedEvent,
            reportType: reportType,
            generatedAt: new Date().toISOString(),
            data: data
        }

        if (format === 'pdf') {
            toast.info('PDF export feature coming soon!')
        } else if (format === 'excel') {
            toast.info('Excel export feature coming soon!')
        } else if (format === 'csv') {
            const csvContent = [
                ['Report Type', 'Value'],
                ['Total Events', data.eventStats.total],
                ['Total Donations', data.financialStats.totalDonations],
                ['Total Volunteers', data.demographics.ageGroups.reduce((sum, group) => sum + group.count, 0)],
                ['Average Attendance', data.engagement.averageAttendance],
                ['Volunteer Retention', data.engagement.volunteerRetention]
            ].map(row => row.join(',')).join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `department-report-${new Date().toISOString().split('T')[0]}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
            toast.success('Report exported successfully!')
        }
    }

    const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
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
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 truncate">{value}</h3>
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
        const maxValue = Math.max(...data.map(item => item.value))
        
        return (
            <div className="space-y-4 sm:space-y-6">
                {data.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex justify-between items-center mb-2 sm:mb-3">
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                <div className="relative flex-shrink-0">
                                    <div 
                                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm ${colors[index].includes('indigo') ? 'bg-indigo-500' : colors[index].includes('purple') ? 'bg-purple-500' : colors[index].includes('pink') ? 'bg-pink-500' : colors[index].includes('orange') ? 'bg-orange-500' : colors[index].includes('emerald') ? 'bg-emerald-500' : colors[index].includes('blue') ? 'bg-blue-500' : 'bg-gray-500'}`}
                                    ></div>
                                    <div 
                                        className={`absolute inset-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full animate-ping opacity-20 ${colors[index].includes('indigo') ? 'bg-indigo-500' : colors[index].includes('purple') ? 'bg-purple-500' : colors[index].includes('pink') ? 'bg-pink-500' : colors[index].includes('orange') ? 'bg-orange-500' : colors[index].includes('emerald') ? 'bg-emerald-500' : colors[index].includes('blue') ? 'bg-blue-500' : 'bg-gray-500'}`}
                                    ></div>
                                </div>
                                <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{item.label}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <span className="text-base sm:text-lg font-bold text-gray-900">{item.value}</span>
                                <span className="text-[10px] sm:text-xs text-gray-500 ml-1">({item.percentage}%)</span>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 shadow-inner">
                                <div 
                                    className={`${colors[index]} h-3 sm:h-4 rounded-full transition-all duration-1000 ease-out shadow-sm group-hover:shadow-md`}
                                    style={{ 
                                        width: `${(item.value / maxValue) * 100}%`,
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
                ))}
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Global CSS for Donut Chart Animations */}
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
                `
            }} />
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Back Button - Top Left (Mobile/Tablet Only) */}
                <div className="mb-4 lg:hidden">
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
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Analytics & Reports</h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-2">Comprehensive insights into your department's performance</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                            <Button 
                                variant="primary" 
                                onClick={() => handleExportReport('pdf')}
                                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export PDF</span>
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={() => handleExportReport('csv')}
                                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export CSV</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
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
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                        color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                        trend={12.5}
                    />
                    <StatCard
                        title="Total Donations"
                        value={`₱${data.financialStats.totalDonations.toLocaleString()}`}
                        subtitle={`₱${data.financialStats.averageDonation.toLocaleString()} average`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>}
                        color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                        trend={8.3}
                    />
                    <StatCard
                        title="Active Volunteers"
                        value={data.demographics.ageGroups.reduce((sum, group) => sum + group.count, 0)}
                        subtitle={`${data.engagement.volunteerRetention}% retention`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                        color="bg-gradient-to-br from-purple-500 to-purple-600"
                        trend={15.7}
                    />
                    <StatCard
                        title="Satisfaction Rate"
                        value={`${data.engagement.eventSatisfaction}/5.0`}
                        subtitle={`${data.engagement.averageAttendance}% attendance`}
                        icon={<svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                        color="bg-gradient-to-br from-orange-500 to-orange-600"
                        trend={5.2}
                    />
                </div>

                {/* Demographics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                    {/* Age Distribution - Bar Chart */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Age Distribution</h3>
                        <BarChart
                            data={data.demographics.ageGroups.map(group => ({
                                label: `${group.range} years`,
                                value: group.count,
                                percentage: group.percentage
                            }))}
                            colors={[
                                'bg-gradient-to-r from-indigo-500 to-indigo-600',
                                'bg-gradient-to-r from-purple-500 to-purple-600',
                                'bg-gradient-to-r from-pink-500 to-pink-600',
                                'bg-gradient-to-r from-orange-500 to-orange-600'
                            ]}
                        />
                    </div>

                    {/* Gender Distribution - Advanced Donut Chart */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Gender Distribution</h3>
                        <DonutChart
                            data={data.demographics.genderDistribution.map(gender => ({
                                label: gender.gender,
                                value: gender.count,
                                percentage: gender.percentage
                            }))}
                            colors={['#ec4899', '#3b82f6']}
                            size={220}
                            strokeWidth={24}
                            title="Volunteers"
                            subtitle="Gender breakdown"
                        />
                    </div>
                </div>

                {/* Location & Volunteer Types */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
                    {/* Location Distribution - Bar Chart */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Geographic Distribution</h3>
                        <BarChart
                            data={data.demographics.locationDistribution.map(location => ({
                                label: location.location,
                                value: location.count,
                                percentage: location.percentage
                            }))}
                            colors={[
                                'bg-gradient-to-r from-emerald-500 to-emerald-600',
                                'bg-gradient-to-r from-blue-500 to-blue-600',
                                'bg-gradient-to-r from-purple-500 to-purple-600',
                                'bg-gradient-to-r from-pink-500 to-pink-600',
                                'bg-gradient-to-r from-gray-500 to-gray-600'
                            ]}
                        />
                    </div>

                    {/* Volunteer Types - Advanced Donut Chart */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Volunteer Categories</h3>
                        <DonutChart
                            data={data.demographics.volunteerTypes.map(type => ({
                                label: type.type,
                                value: type.count,
                                percentage: type.percentage
                            }))}
                            colors={['#6366f1', '#8b5cf6', '#ec4899', '#f97316']}
                            size={220}
                            strokeWidth={24}
                            title="Volunteers"
                            subtitle="Category breakdown"
                        />
                    </div>
                </div>

                {/* Monthly Trends Chart */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Monthly Performance Trends</h3>
                    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                        <div className="grid grid-cols-12 gap-1 sm:gap-2 lg:gap-4 min-w-[600px] sm:min-w-0">
                            {data.monthlyTrends.map((month, index) => (
                                <div key={month.month} className="text-center">
                                    <div className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1 sm:mb-2">{month.month}</div>
                                    <div className="space-y-0.5 sm:space-y-1">
                                        <div className="h-12 sm:h-16 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t transition-all duration-300 hover:from-indigo-600 hover:to-indigo-500" style={{height: `${(month.events / 9) * 48}px`}}></div>
                                        <div className="text-[10px] sm:text-xs text-gray-600">{month.events} events</div>
                                        <div className="text-[9px] sm:text-xs text-gray-500 truncate">₱{(month.donations / 1000).toFixed(0)}k</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Social Media Reach</h4>
                        <div className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-2">{data.engagement.socialMediaReach.toLocaleString()}</div>
                        <p className="text-xs sm:text-sm text-gray-600">Total followers across platforms</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Email Open Rate</h4>
                        <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mb-2">{data.engagement.emailOpenRate}%</div>
                        <p className="text-xs sm:text-sm text-gray-600">Average email engagement</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Average Attendance</h4>
                        <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">{data.engagement.averageAttendance}%</div>
                        <p className="text-xs sm:text-sm text-gray-600">Event participation rate</p>
                    </div>
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Volunteer Retention</h4>
                        <div className="text-2xl sm:text-3xl font-bold text-orange-600 mb-2">{data.engagement.volunteerRetention}%</div>
                        <p className="text-xs sm:text-sm text-gray-600">Returning volunteers</p>
                    </div>
                </div>

                {/* Top Performing Event */}
                {data.financialStats.topEvent && (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 text-white">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 lg:gap-0">
                            <div className="text-center lg:text-left w-full lg:w-auto">
                                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">Top Performing Event</h3>
                                <p className="text-indigo-100 text-sm sm:text-base lg:text-lg mb-4 truncate">{data.financialStats.topEvent.title}</p>
                                <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                                    <div className="text-center lg:text-left">
                                        <p className="text-indigo-200 text-xs sm:text-sm">Total Donations</p>
                                        <p className="text-lg sm:text-xl lg:text-2xl font-bold truncate">₱{data.financialStats.topEvent.totalDonations?.toLocaleString() || '0'}</p>
                                    </div>
                                    <div className="text-center lg:text-left">
                                        <p className="text-indigo-200 text-xs sm:text-sm">Volunteers</p>
                                        <p className="text-lg sm:text-xl lg:text-2xl font-bold">{data.financialStats.topEvent.volunteers?.length || 0}</p>
                                    </div>
                                    <div className="text-center lg:text-left">
                                        <p className="text-indigo-200 text-xs sm:text-sm">Status</p>
                                        <p className="text-base sm:text-lg lg:text-xl font-bold truncate">{data.financialStats.topEvent.status}</p>
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
