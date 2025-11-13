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
    FaChartLine,
    FaListAlt,
    FaNewspaper
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
            // Set all events (limit to 6 for display)
            setAllEvents(events.slice(0, 6))
            
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

    // Color Theme: 60% White, 30% Maroon, 10% Gold
    const THEME_COLORS = {
        white: '#FFFFFF',
        whiteLight: '#F9FAFB',
        whiteBg: '#F5F5F5',
        maroon: '#800020',
        maroonDark: '#660018',
        maroonLight: '#9c0000',
        maroonBg: '#F5E6E8',
        gold: '#D4AF37',
        goldDark: '#B8941F',
        goldLight: '#E5C866',
        goldBg: '#FDF8E8',
        gray: '#6B7280',
        grayLight: '#9CA3AF',
        grayBg: '#F3F4F6'
    }

    // Chart colors using theme
    const CHART_COLORS = {
        primary: THEME_COLORS.maroon,
        primaryLight: THEME_COLORS.maroonLight,
        secondary: THEME_COLORS.gold,
        volunteer: THEME_COLORS.maroon,
        donator: THEME_COLORS.gold,
        gradientStart: THEME_COLORS.maroon,
        gradientEnd: THEME_COLORS.maroonLight
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
        <div className="min-h-screen" style={{ backgroundColor: THEME_COLORS.whiteBg }}>
            <Header />
            
            <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                {/* Welcome Section */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 mb-4 sm:mb-6 lg:mb-8 border" style={{ borderColor: THEME_COLORS.maroonBg }}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2" style={{ color: THEME_COLORS.maroon }}>
                                CRD Operations Dashboard
                            </h1>
                            <p className="text-xs sm:text-sm lg:text-base" style={{ color: THEME_COLORS.gray }}>
                                Welcome back, {userData?.name || 'CRD Staff'}! Manage campaigns, reviews, and reports.
                            </p>
                        </div>
                        <button 
                                onClick={() => navigate('/user/profile')}
                            className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border-2 transition-all whitespace-nowrap"
                            style={{ 
                                borderColor: THEME_COLORS.maroon, 
                                color: THEME_COLORS.maroon,
                                backgroundColor: 'transparent'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = THEME_COLORS.maroon;
                                e.target.style.color = THEME_COLORS.white;
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = THEME_COLORS.maroon;
                            }}
                            >
                                Profile Settings
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.maroon }}>
                                <FaClock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>{stats.pendingEvents}</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Pending Reviews</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.maroon }}>
                                <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>{stats.approvedEvents}</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Approved Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.maroon }}>
                                <FaMoneyBillWave className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>₱{(stats.totalDonations / 1000).toFixed(0)}k</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Total Donations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.maroon }}>
                                <FaUserCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>{stats.activeVolunteers}</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Active Volunteers</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid - Aligned Heights */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    {/* Left Column - Donations Chart */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border hover:shadow-xl transition-all duration-300 h-full flex flex-col" style={{ borderColor: THEME_COLORS.maroonBg }}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                        <FaHandHoldingHeart className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: THEME_COLORS.maroon }} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: THEME_COLORS.maroon }}>Donations</h3>
                                        <p className="text-xs sm:text-sm" style={{ color: THEME_COLORS.gray }}>Monthly donation trends</p>
                                    </div>
                                </div>
                                
                                {/* Filter Buttons */}
                                <div className="flex items-center space-x-1 sm:space-x-2 rounded-lg sm:rounded-xl p-1 sm:p-1.5" style={{ backgroundColor: THEME_COLORS.grayBg }}>
                                    <button
                                        onClick={() => setDonationFilter('weekly')}
                                        className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg transition-all duration-200 ${
                                            donationFilter === 'weekly'
                                                ? 'text-white shadow-md'
                                                : 'hover:bg-white'
                                        }`}
                                        style={donationFilter === 'weekly' ? { backgroundColor: THEME_COLORS.maroon } : { color: THEME_COLORS.gray }}
                                    >
                                        Weekly
                                    </button>
                                    <button
                                        onClick={() => setDonationFilter('monthly')}
                                        className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg transition-all duration-200 ${
                                            donationFilter === 'monthly'
                                                ? 'text-white shadow-md'
                                                : 'hover:bg-white'
                                        }`}
                                        style={donationFilter === 'monthly' ? { backgroundColor: THEME_COLORS.maroon } : { color: THEME_COLORS.gray }}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setDonationFilter('yearly')}
                                        className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md sm:rounded-lg transition-all duration-200 ${
                                            donationFilter === 'yearly'
                                                ? 'text-white shadow-md'
                                                : 'hover:bg-white'
                                        }`}
                                        style={donationFilter === 'yearly' ? { backgroundColor: THEME_COLORS.maroon } : { color: THEME_COLORS.gray }}
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </div>
                            
                            {/* Date Range Selector */}
                            <div className="mb-4 sm:mb-6 flex items-center space-x-2 sm:space-x-4 rounded-lg sm:rounded-xl p-2 sm:p-3 border" style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg }}>
                                <div className="flex items-center space-x-2">
                                    <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: THEME_COLORS.maroon }} />
                                    <span className="text-xs sm:text-sm font-semibold" style={{ color: THEME_COLORS.gray }}>
                                        {donationDateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {donationDateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Chart - Flex grow to fill space */}
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center min-h-[250px] sm:min-h-[300px]">
                                    <LoadingSpinner size="medium" />
                                </div>
                            ) : (
                                <div className="flex-1 w-full min-h-[250px] sm:min-h-[300px]">
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

                    {/* Right Column - Users Chart - Same height as Donations */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border hover:shadow-xl transition-all duration-300 h-full flex flex-col" style={{ borderColor: THEME_COLORS.maroonBg }}>
                            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                    <FaUsers className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: THEME_COLORS.maroon }} />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: THEME_COLORS.maroon }}>Users</h3>
                                    <p className="text-xs sm:text-sm" style={{ color: THEME_COLORS.gray }}>User distribution</p>
                                </div>
                            </div>
                            
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center min-h-[250px] sm:min-h-[300px]">
                                    <LoadingSpinner size="medium" />
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-center mb-4 sm:mb-6 rounded-xl p-4 sm:p-6 border relative flex-1 min-h-[200px] sm:min-h-[250px]" style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg }}>
                                        <ResponsiveContainer width="100%" height="100%">
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
                                                <div className="text-2xl sm:text-3xl font-bold" style={{ color: THEME_COLORS.maroon }}>{usersChartData.total}</div>
                                                <div className="text-xs sm:text-sm font-semibold" style={{ color: THEME_COLORS.gray }}>Total Users</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Legend */}
                                    <div className="space-y-2 sm:space-y-3">
                                        {pieChartData.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl border hover:shadow-md hover:scale-[1.01] transition-all duration-200 group"
                                                style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg }}
                                            >
                                                <div className="flex items-center space-x-2 sm:space-x-3">
                                                    <div 
                                                        className="w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-sm group-hover:scale-125 transition-transform duration-200"
                                                        style={{ backgroundColor: item.fill }}
                                                    ></div>
                                                    <div>
                                                        <span className="text-xs sm:text-sm font-bold block" style={{ color: THEME_COLORS.maroon }}>{item.name}</span>
                                                        <span className="text-xs" style={{ color: THEME_COLORS.gray }}>{item.percentage}%</span>
                                                    </div>
                                                </div>
                                                <span 
                                                    className="text-lg sm:text-xl font-bold"
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    {/* Left Column - Calendar + Quick Actions - Wider */}
                    <div className="lg:col-span-4 order-2 lg:order-1 flex flex-col gap-4 sm:gap-6">
                        {/* Calendar Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border hover:shadow-xl transition-all duration-300" style={{ borderColor: THEME_COLORS.maroonBg }}>
                            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                    <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: THEME_COLORS.maroon }} />
                                </div>
                                <h3 className="text-base sm:text-lg font-bold" style={{ color: THEME_COLORS.maroon }}>Calendar</h3>
                            </div>

                            <div className="flex items-center justify-between mb-4 sm:mb-5 rounded-lg p-2" style={{ backgroundColor: THEME_COLORS.whiteLight }}>
                                <button
                                    onClick={() => navigateMonth(-1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border transition-all duration-200 shadow-sm hover:scale-110"
                                    style={{ 
                                        backgroundColor: THEME_COLORS.white,
                                        borderColor: THEME_COLORS.maroonBg,
                                        color: THEME_COLORS.maroon
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.borderColor = THEME_COLORS.maroon;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.white;
                                        e.target.style.borderColor = THEME_COLORS.maroonBg;
                                    }}
                                >
                                    <FaChevronLeft className="w-3 h-3" style={{ color: 'inherit' }} />
                                </button>
                                <h4 className="text-xs sm:text-sm font-bold px-2 sm:px-3" style={{ color: THEME_COLORS.maroon }}>
                                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h4>
                                <button
                                    onClick={() => navigateMonth(1)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border transition-all duration-200 shadow-sm hover:scale-110"
                                    style={{ 
                                        backgroundColor: THEME_COLORS.maroon,
                                        borderColor: THEME_COLORS.maroon,
                                        color: THEME_COLORS.white
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroonDark;
                                        e.target.style.borderColor = THEME_COLORS.maroonDark;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.borderColor = THEME_COLORS.maroon;
                                    }}
                                >
                                    <FaChevronRight className="w-3 h-3" style={{ color: THEME_COLORS.white }} />
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-2 sm:mb-3">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-center text-xs font-bold py-1 sm:py-2" style={{ color: THEME_COLORS.gray }}>
                                        {day}
                                    </div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 mb-4 sm:mb-6">
                                {getDaysInMonth(currentDate).map((day, index) => (
                                    <div
                                        key={index}
                                        className={`text-center py-1 sm:py-2 text-xs rounded-lg transition-all duration-200 ${
                                            day ? 'cursor-pointer font-medium hover:scale-110' : ''
                                        }`}
                                        style={day === new Date().getDate() && 
                                            currentDate.getMonth() === new Date().getMonth() && 
                                            currentDate.getFullYear() === new Date().getFullYear()
                                                ? { 
                                                    backgroundColor: THEME_COLORS.maroon, 
                                                    color: THEME_COLORS.white,
                                                    fontWeight: 'bold',
                                                    transform: 'scale(1.1)'
                                                }
                                                : day ? { 
                                                    color: THEME_COLORS.gray 
                                                } : { 
                                                    color: 'transparent' 
                                                }}
                                        onMouseEnter={(e) => {
                                            if (day) {
                                                e.target.style.backgroundColor = THEME_COLORS.maroon;
                                                e.target.style.color = THEME_COLORS.white;
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (day && !(day === new Date().getDate() && 
                                                currentDate.getMonth() === new Date().getMonth() && 
                                                currentDate.getFullYear() === new Date().getFullYear())) {
                                                e.target.style.backgroundColor = 'transparent';
                                                e.target.style.color = THEME_COLORS.gray;
                                            }
                                        }}
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Actions Card */}
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border hover:shadow-xl transition-all duration-300 flex-1" style={{ borderColor: THEME_COLORS.maroonBg }}>
                            <h4 className="text-sm font-bold mb-3 sm:mb-4 flex items-center">
                                <span className="w-1 h-3 sm:h-4 rounded-full mr-2" style={{ backgroundColor: THEME_COLORS.maroon }}></span>
                                <span style={{ color: THEME_COLORS.maroon }}>Quick Actions</span>
                            </h4>
                            <div className="space-y-2 sm:space-y-2.5">
                                <button
                                    onClick={() => handleQuickAction('review-events')}
                                    className="w-full h-10 sm:h-11 flex items-center justify-center space-x-2 sm:space-x-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    style={{ 
                                        backgroundColor: THEME_COLORS.maroon,
                                        boxShadow: '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroonDark;
                                        e.target.style.boxShadow = '0 10px 15px -3px rgba(128, 0, 32, 0.4), 0 4px 6px -2px rgba(128, 0, 32, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.boxShadow = '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)';
                                    }}
                                >
                                    <FaCheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Review Events</span>
                                </button>
                                
                                <button
                                    onClick={() => handleQuickAction('view-donations')}
                                    className="w-full h-10 sm:h-11 flex items-center justify-center space-x-2 sm:space-x-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    style={{ 
                                        backgroundColor: THEME_COLORS.maroon,
                                        boxShadow: '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroonDark;
                                        e.target.style.boxShadow = '0 10px 15px -3px rgba(128, 0, 32, 0.4), 0 4px 6px -2px rgba(128, 0, 32, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.boxShadow = '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)';
                                    }}
                                >
                                    <FaHandHoldingHeart className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>View Donations</span>
                                </button>
                                
                                <button
                                    onClick={() => handleQuickAction('manage-volunteers')}
                                    className="w-full h-10 sm:h-11 flex items-center justify-center space-x-2 sm:space-x-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    style={{ 
                                        backgroundColor: THEME_COLORS.maroon,
                                        boxShadow: '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroonDark;
                                        e.target.style.boxShadow = '0 10px 15px -3px rgba(128, 0, 32, 0.4), 0 4px 6px -2px rgba(128, 0, 32, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.boxShadow = '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)';
                                    }}
                                >
                                    <FaUsers className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Manage Volunteers</span>
                                </button>
                                
                                <button
                                    onClick={() => handleQuickAction('generate-reports')}
                                    className="w-full h-10 sm:h-11 flex items-center justify-center space-x-2 sm:space-x-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                                    style={{ 
                                        backgroundColor: THEME_COLORS.maroon,
                                        boxShadow: '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroonDark;
                                        e.target.style.boxShadow = '0 10px 15px -3px rgba(128, 0, 32, 0.4), 0 4px 6px -2px rgba(128, 0, 32, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.boxShadow = '0 4px 6px -1px rgba(128, 0, 32, 0.3), 0 2px 4px -1px rgba(128, 0, 32, 0.2)';
                                    }}
                                >
                                    <FaChartLine className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Generate Reports</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Events Feed - Height matches Calendar + Quick Actions - Narrower */}
                    <div className="lg:col-span-8 order-1 lg:order-2">
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border hover:shadow-xl transition-all duration-300 h-full" style={{ borderColor: THEME_COLORS.maroonBg }}>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                        <FaListAlt className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: THEME_COLORS.maroon }} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold" style={{ color: THEME_COLORS.maroon }}>All Events Feed</h3>
                                        <p className="text-xs" style={{ color: THEME_COLORS.gray }}>Recent event activities</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/crd-staff/events')}
                                    className="px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold border-2 rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-200 whitespace-nowrap"
                                    style={{ 
                                        borderColor: THEME_COLORS.maroon, 
                                        color: THEME_COLORS.maroon,
                                        backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                        e.target.style.color = THEME_COLORS.white;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.backgroundColor = 'transparent';
                                        e.target.style.color = THEME_COLORS.maroon;
                                    }}
                                >
                                    View All
                                </button>
                            </div>
                        
                            {isLoading ? (
                                <div className="py-8 sm:py-12 flex items-center justify-center min-h-[200px]">
                                    <LoadingSpinner size="medium" text="Loading events..." />
                                </div>
                            ) : allEvents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {allEvents.map((event, index) => (
                                        <div 
                                            key={event._id} 
                                            className="group border rounded-lg sm:rounded-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                            style={{ 
                                                borderColor: THEME_COLORS.maroonBg,
                                                backgroundColor: THEME_COLORS.whiteLight,
                                                animationDelay: `${index * 100}ms` 
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h4 className="font-bold text-sm sm:text-base lg:text-lg truncate transition-colors" style={{ color: THEME_COLORS.maroon }}>
                                                            {event.title}
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed" style={{ color: THEME_COLORS.gray }}>
                                                        {String(event.description || '').replace(/<[^>]*>/g, '').substring(0, 100)}...
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs" style={{ color: THEME_COLORS.gray }}>
                                                        <span className="flex items-center space-x-1 px-2 py-1 rounded-lg" style={{ backgroundColor: THEME_COLORS.white }}>
                                                            <FaCalendarAlt className="w-3 h-3" />
                                                            <span>{new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                        </span>
                                                        {event.location && (
                                                            <span className="flex items-center space-x-1 px-2 py-1 rounded-lg truncate max-w-[120px] sm:max-w-[150px]" style={{ backgroundColor: THEME_COLORS.white }}>
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
                                            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: THEME_COLORS.maroonBg }}>
                                                <span className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold shadow-sm border ${
                                                    event.status === 'Approved' ? 'text-green-800 border-green-200' :
                                                    event.status === 'Pending' ? 'text-yellow-800 border-yellow-200' :
                                                    'text-red-800 border-red-200'
                                                }`}
                                                style={event.status === 'Approved' ? { backgroundColor: '#D1FAE5' } :
                                                    event.status === 'Pending' ? { backgroundColor: THEME_COLORS.goldBg } :
                                                    { backgroundColor: '#FEE2E2' }}
                                                >
                                                    {event.status || 'Pending'}
                                                </span>
                                                <button
                                                    onClick={() => navigate('/crd-staff/events')}
                                                    className="px-3 sm:px-4 py-1 sm:py-1.5 text-xs font-semibold border rounded-lg hover:scale-105 transition-all duration-200"
                                                    style={{ 
                                                        borderColor: THEME_COLORS.maroon, 
                                                        color: THEME_COLORS.maroon,
                                                        backgroundColor: 'transparent'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.backgroundColor = THEME_COLORS.maroon;
                                                        e.target.style.color = THEME_COLORS.white;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.backgroundColor = 'transparent';
                                                        e.target.style.color = THEME_COLORS.maroon;
                                                    }}
                                                >
                                                    Review →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 sm:py-16">
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: THEME_COLORS.grayBg }}>
                                        <FaListAlt className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: THEME_COLORS.grayLight }} />
                                    </div>
                                    <p className="font-medium text-base sm:text-lg mb-1" style={{ color: THEME_COLORS.gray }}>No events found</p>
                                    <p className="text-sm" style={{ color: THEME_COLORS.grayLight }}>Events will appear here once created</p>
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
