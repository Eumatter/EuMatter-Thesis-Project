import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { 
    FaHandHoldingHeart, 
    FaUsers, 
    FaCalendarAlt, 
    FaCheckCircle, 
    FaClock,
    FaFilter,
    FaChevronLeft,
    FaChevronRight,
    FaMoneyBillWave,
    FaUserCheck,
    FaChartLine
} from 'react-icons/fa'
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Area,
    AreaChart
} from 'recharts'

const CRDDashboard = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [stats, setStats] = useState({
        pendingEvents: 0,
        approvedEvents: 0,
        totalDonations: 0,
        activeVolunteers: 0
    })
    const [allEvents, setAllEvents] = useState([]) // For display (limited to 4)
    const [allEventsData, setAllEventsData] = useState([]) // All events for calculations
    const [donations, setDonations] = useState([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isLoading, setIsLoading] = useState(true)
    
    // Donations chart filters
    const [donationFilter, setDonationFilter] = useState('monthly') // weekly, monthly, yearly
    const [donationDateRange, setDonationDateRange] = useState({
        start: new Date(new Date().getFullYear(), 0, 1), // January 1st
        end: new Date()
    })

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            
            // Fetch events
            let events = []
            try {
            const eventsResponse = await axios.get(backendUrl + 'api/events')
                events = eventsResponse.data || []
            } catch (error) {
                console.error('Error fetching events:', error)
                // Continue with empty events array
            }
            
            // Fetch donations
            let donationsData = []
            try {
                const donationsResponse = await axios.get(backendUrl + 'api/donations/all')
                donationsData = donationsResponse.data?.donations || []
            } catch (error) {
                console.error('Error fetching donations:', error)
                // Continue with empty donations array
            }
            setDonations(donationsData)
            
            // Calculate stats
            const pendingEvents = events.filter(event => event.status === 'Pending').length
            const approvedEvents = events.filter(event => event.status === 'Approved').length
            const totalDonations = donationsData
                .filter(d => d.status === 'succeeded')
                .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
            
            // Calculate active volunteers from events (users who registered as volunteers)
            let activeVolunteers = 0
            const volunteerUserIds = new Set()
            events.forEach(event => {
                if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                    event.volunteerRegistrations.forEach(reg => {
                        const userId = reg.user?._id || reg.user
                        if (userId) volunteerUserIds.add(userId.toString())
                    })
                }
            })
            activeVolunteers = volunteerUserIds.size
            
            setStats({
                pendingEvents,
                approvedEvents,
                totalDonations,
                activeVolunteers
            })
            
            // Store all events for calculations
            setAllEventsData(events)
            // Set all events (limit to 4 for display)
            setAllEvents(events.slice(0, 4))
            
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
            
            // Provide more specific error messages
            if (error.code === 'ERR_NETWORK' || error.message.includes('ERR_CONNECTION_REFUSED')) {
                toast.error('Cannot connect to server. Please ensure the backend is running.')
            } else if (error.response?.status === 403) {
                toast.error('Access denied. Please check your permissions.')
            } else if (error.response?.status === 401) {
                toast.error('Please log in again.')
            } else {
                toast.error(error.response?.data?.message || 'Failed to load dashboard data')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleQuickAction = (action) => {
        switch (action) {
            case 'review-events':
                navigate('/crd-staff/events')
                break
            case 'generate-reports':
                navigate('/crd-staff/reports')
                break
            case 'view-donations':
                navigate('/crd-staff/donations')
                break
            case 'manage-volunteers':
                navigate('/crd-staff/volunteers')
                break
            default:
                break
        }
    }

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() + direction)
            return newDate
        })
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()
        
        const days = []
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day)
        }
        return days
    }

    // Process donations data for chart
    const getDonationsChartData = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthData = months.map(() => 0)
        
        donations
            .filter(d => d.status === 'succeeded')
            .forEach(donation => {
                const date = new Date(donation.createdAt)
                const month = date.getMonth()
                monthData[month] += parseFloat(donation.amount) || 0
            })
        
        return months.map((month, index) => ({
            month,
            amount: monthData[index]
        }))
    }

    // Get users data for chart
    const getUsersChartData = () => {
        // Get unique volunteer user IDs from events
        const volunteerUserIds = new Set()
        allEventsData.forEach(event => {
            if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                event.volunteerRegistrations.forEach(reg => {
                    const userId = reg.user?._id || reg.user
                    if (userId) volunteerUserIds.add(userId.toString())
                })
            }
        })
        
        // Get unique donator user IDs from donations
        const donatorUserIds = new Set(
            donations
                .filter(d => d.status === 'succeeded' && d.user)
                .map(d => {
                    const userId = d.user?._id || d.user
                    return userId ? userId.toString() : null
                })
                .filter(Boolean)
        )
        
        const volunteers = volunteerUserIds.size
        const donators = donatorUserIds.size
        
        // Total is the union of volunteers and donators (unique users)
        const totalUserIds = new Set([...volunteerUserIds, ...donatorUserIds])
        const total = totalUserIds.size
        
        return {
            volunteers: Math.max(volunteers, 0),
            donators: Math.max(donators, 0),
            total: Math.max(total, 0)
        }
    }

    // Chart colors
    const CHART_COLORS = {
        primary: '#800020',
        primaryLight: '#9c0000',
        secondary: '#fbbf24',
        volunteer: '#800020',
        donator: '#fbbf24',
        gradientStart: '#800020',
        gradientEnd: '#9c0000'
    }

    // Custom tooltip for line chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
                return (
                <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
                    <p className="text-base font-bold text-[#800020]">
                        ₱{payload[0].value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            )
        }
        return null
    }

    // Custom tooltip for pie chart
    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
                return (
                <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{payload[0].name}</p>
                    <p className="text-base font-bold" style={{ color: payload[0].payload.fill }}>
                        {payload[0].value} users
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {((payload[0].value / usersChartData.total) * 100).toFixed(1)}% of total
                    </p>
                </div>
            )
        }
        return null
    }

    const donationsChartData = getDonationsChartData()
    const usersChartData = getUsersChartData()

    // Prepare pie chart data
    const pieChartData = [
        { 
            name: 'Volunteers', 
            value: usersChartData.volunteers, 
            fill: CHART_COLORS.volunteer,
            percentage: usersChartData.total > 0 ? ((usersChartData.volunteers / usersChartData.total) * 100).toFixed(1) : 0
        },
        { 
            name: 'Donators', 
            value: usersChartData.donators, 
            fill: CHART_COLORS.donator,
            percentage: usersChartData.total > 0 ? ((usersChartData.donators / usersChartData.total) * 100).toFixed(1) : 0
        }
    ].filter(item => item.value > 0) // Only show segments with data

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Welcome Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                CRD Operations Dashboard
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Welcome back, {userData?.name || 'CRD Staff'}! Manage campaigns, reviews, and reports.
                            </p>
                        </div>
                            <Button 
                                variant="outlineLight" 
                                onClick={() => navigate('/user/profile')}
                            className="border-[#800020] text-[#800020] hover:bg-[#800020] hover:text-white transition-all"
                            >
                                Profile Settings
                            </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="bg-gradient-to-br from-white to-yellow-50 rounded-2xl shadow-lg p-5 sm:p-6 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-yellow-100 group">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <FaClock className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">{stats.pendingEvents}</p>
                                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Pending Reviews</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-lg p-5 sm:p-6 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-green-100 group">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <FaCheckCircle className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.approvedEvents}</p>
                                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Approved Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg p-5 sm:p-6 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-blue-100 group">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <FaMoneyBillWave className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">₱{(stats.totalDonations / 1000).toFixed(0)}k</p>
                                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Total Donations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl shadow-lg p-5 sm:p-6 transform transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl border border-purple-100 group">
                        <div className="flex items-center space-x-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                                <FaUserCheck className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.activeVolunteers}</p>
                                <p className="text-xs sm:text-sm text-gray-600 font-semibold">Active Volunteers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                    {/* Left Column - Donations Chart */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center shadow-md">
                                        <FaHandHoldingHeart className="w-6 h-6 text-[#800020]" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Donations</h3>
                                        <p className="text-xs sm:text-sm text-gray-500">Monthly donation trends</p>
                                    </div>
                                </div>
                                
                                {/* Filter Buttons */}
                                <div className="flex items-center space-x-2 bg-gray-100 rounded-xl p-1.5 shadow-inner">
                                    <button
                                        onClick={() => setDonationFilter('weekly')}
                                        className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                                            donationFilter === 'weekly'
                                                ? 'bg-gradient-to-r from-[#800020] to-[#9c0000] text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                        }`}
                                    >
                                        Weekly
                                    </button>
                                    <button
                                        onClick={() => setDonationFilter('monthly')}
                                        className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                                            donationFilter === 'monthly'
                                                ? 'bg-gradient-to-r from-[#800020] to-[#9c0000] text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                        }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setDonationFilter('yearly')}
                                        className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                                            donationFilter === 'yearly'
                                                ? 'bg-gradient-to-r from-[#800020] to-[#9c0000] text-white shadow-md'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                                        }`}
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </div>
                            
                            {/* Date Range Selector */}
                            <div className="mb-6 flex items-center space-x-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <FaCalendarAlt className="w-4 h-4 text-[#800020]" />
                                    <span className="text-sm font-semibold text-gray-700">
                                        {donationDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {donationDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Chart */}
                            {isLoading ? (
                                <div className="h-[300px] flex items-center justify-center">
                                    <LoadingSpinner size="medium" />
                                </div>
                            ) : (
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={donationsChartData}
                                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                        >
                                            <defs>
                                                <linearGradient id="colorDonation" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={CHART_COLORS.gradientStart} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={CHART_COLORS.gradientEnd} stopOpacity={0.05}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                                            <XAxis 
                                                dataKey="month" 
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px', fontWeight: 500 }}
                                                tick={{ fill: '#6b7280' }}
                                            />
                                            <YAxis 
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px', fontWeight: 500 }}
                                                tick={{ fill: '#6b7280' }}
                                                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="amount"
                                                stroke={CHART_COLORS.primary}
                                                strokeWidth={3}
                                                fill="url(#colorDonation)"
                                                dot={{ fill: CHART_COLORS.primary, r: 5, strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Users Chart */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shadow-md">
                                    <FaUsers className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Users</h3>
                                    <p className="text-xs sm:text-sm text-gray-500">User distribution</p>
                                </div>
                                </div>

                            {isLoading ? (
                                <div className="h-[400px] flex items-center justify-center">
                                    <LoadingSpinner size="medium" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-center mb-6 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 relative">
                                        <ResponsiveContainer width="100%" height={250}>
                                            <PieChart>
                                                <defs>
                                                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                                                    </filter>
                                                </defs>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    animationBegin={0}
                                                    animationDuration={1500}
                                                    animationEasing="ease-out"
                                                >
                                                    {pieChartData.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={entry.fill}
                                                            stroke={entry.fill}
                                                            strokeWidth={2}
                                                            style={{ filter: 'url(#shadow)' }}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center label */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <div className="text-3xl font-bold text-gray-900">{usersChartData.total}</div>
                                                <div className="text-sm text-gray-600 font-semibold">Total Users</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className="space-y-3">
                                        {pieChartData.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 group"
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div 
                                                        className="w-5 h-5 rounded-full shadow-md group-hover:scale-125 transition-transform duration-200"
                                                        style={{ backgroundColor: item.fill }}
                                                    ></div>
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-900 block">{item.name}</span>
                                                        <span className="text-xs text-gray-500">{item.percentage}%</span>
                                                    </div>
                                                </div>
                                                <span 
                                                    className="text-xl font-bold"
                                                    style={{ color: item.fill }}
                                                >
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Calendar, Events, and Quick Actions (3 Column Layout) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column - Calendar */}
                    <div className="lg:col-span-3 order-2 lg:order-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="w-10 h-10 bg-gradient-to-br from-[#800020] to-[#9c0000] rounded-xl flex items-center justify-center shadow-md">
                                    <FaCalendarAlt className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Calendar</h3>
                            </div>
                            
                            <div className="flex items-center justify-between mb-5 bg-gray-50 rounded-lg p-2">
                                <button
                                    onClick={() => navigateMonth(-1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-[#800020] hover:text-white hover:border-[#800020] transition-all duration-200 shadow-sm"
                                >
                                    <FaChevronLeft className="w-3 h-3" />
                                </button>
                                <h4 className="text-sm font-bold text-gray-900 px-3">
                                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h4>
                                <button
                                    onClick={() => navigateMonth(1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:bg-[#800020] hover:text-white hover:border-[#800020] transition-all duration-200 shadow-sm"
                                >
                                    <FaChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-3">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-xs font-bold text-gray-600 py-2">
                                        {day}
                                        </div>
                                    ))}
                                </div>
                                
                            <div className="grid grid-cols-7 gap-1 mb-6">
                                    {getDaysInMonth(currentDate).map((day, index) => (
                                        <div
                                            key={index}
                                        className={`text-center py-2 text-xs rounded-lg transition-all duration-200 ${
                                            day ? 'hover:bg-[#800020] hover:text-white cursor-pointer font-medium' : ''
                                            } ${
                                                day === new Date().getDate() && 
                                                currentDate.getMonth() === new Date().getMonth() && 
                                                currentDate.getFullYear() === new Date().getFullYear()
                                                ? 'bg-gradient-to-br from-[#800020] to-[#9c0000] text-white font-bold shadow-md scale-110' 
                                                : day ? 'text-gray-700' : 'text-transparent'
                                            }`}
                                        >
                                            {day}
                                        </div>
                                    ))}
                </div>

                {/* Quick Actions */}
                            <div className="pt-6 border-t border-gray-200">
                                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                                    <span className="w-1 h-4 bg-gradient-to-b from-[#800020] to-[#9c0000] rounded-full mr-2"></span>
                                    Quick Actions
                                </h4>
                                <div className="space-y-2.5">
                                    <button
                                onClick={() => handleQuickAction('review-events')}
                                        className="w-full h-11 flex items-center justify-center space-x-2.5 text-sm font-semibold bg-gradient-to-r from-[#800020] to-[#9c0000] text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                            >
                                        <FaCheckCircle className="w-4 h-4" />
                                            <span>Review Events</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => handleQuickAction('view-donations')}
                                        className="w-full h-11 flex items-center justify-center space-x-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                                    >
                                        <FaHandHoldingHeart className="w-4 h-4" />
                                        <span>View Donations</span>
                                    </button>
                                    
                                    <button
                                        onClick={() => handleQuickAction('manage-volunteers')}
                                        className="w-full h-11 flex items-center justify-center space-x-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                                    >
                                        <FaUsers className="w-4 h-4" />
                                        <span>Manage Volunteers</span>
                                    </button>
                                    
                                    <button
                                onClick={() => handleQuickAction('generate-reports')}
                                        className="w-full h-11 flex items-center justify-center space-x-2.5 text-sm font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                            >
                                        <FaChartLine className="w-4 h-4" />
                                            <span>Generate Reports</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Events Feed */}
                    <div className="lg:col-span-9 order-1 lg:order-2">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100 hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                        <FaCalendarAlt className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">All Events Feed</h3>
                                        <p className="text-xs text-gray-500">Recent event activities</p>
                                    </div>
                                </div>
                                <button 
                                onClick={() => navigate('/crd-staff/events')}
                                    className="px-4 py-2 text-sm font-semibold text-[#800020] border-2 border-[#800020] rounded-xl hover:bg-[#800020] hover:text-white transition-all duration-200"
                            >
                                View All
                                </button>
                        </div>
                        
                        {isLoading ? (
                            <div className="py-12">
                                <LoadingSpinner size="medium" text="Loading events..." />
                            </div>
                                        ) : allEvents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {allEvents.map((event, index) => (
                                        <div 
                                            key={event._id} 
                                            className="group border border-gray-200 rounded-xl p-5 transition-all duration-300 hover:shadow-xl hover:border-[#800020] hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50"
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h4 className="font-bold text-gray-900 text-base sm:text-lg truncate group-hover:text-[#800020] transition-colors">
                                                            {event.title}
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                                        {String(event.description || '').replace(/<[^>]*>/g, '').substring(0, 120)}...
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-lg">
                                                            <FaCalendarAlt className="w-3 h-3" />
                                                            <span>{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                </span>
                                                        {event.location && (
                                                            <span className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-lg truncate max-w-[150px]">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    </svg>
                                                                <span className="truncate">{event.location}</span>
                                                                </span>
                                                        )}
                                                    </div>
                                                            </div>
                                        </div>
                                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                                                    event.status === 'Approved' ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200' :
                                                    event.status === 'Pending' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200' :
                                                    'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
                                        }`}>
                                            {event.status || 'Pending'}
                                        </span>
                                                <button
                                                                onClick={() => navigate('/crd-staff/events')}
                                                    className="px-4 py-1.5 text-xs font-semibold text-[#800020] border border-[#800020] rounded-lg hover:bg-[#800020] hover:text-white transition-all duration-200"
                                                            >
                                                    Review →
                                                </button>
                                                        </div>
                                    </div>
                                    ))}
                            </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaCalendarAlt className="w-10 h-10 text-gray-400" />
                            </div>
                                    <p className="text-gray-500 font-medium text-lg">No events found</p>
                                    <p className="text-gray-400 text-sm mt-1">Events will appear here once created</p>
                                </div>
                                                )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default CRDDashboard
