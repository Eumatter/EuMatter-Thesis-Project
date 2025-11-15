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
    const [allEvents, setAllEvents] = useState([]) // For display (limited to 4 events)
    const [allEventsData, setAllEventsData] = useState([]) // All events for calculations
    const [donations, setDonations] = useState([])
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isLoading, setIsLoading] = useState(true)
    
    // Donations chart filters
    const [donationFilter, setDonationFilter] = useState('monthly') // weekly, monthly, yearly
    const [selectedWeekDate, setSelectedWeekDate] = useState(new Date()) // For weekly filter - date to determine which week
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()) // For monthly filter - year to display
    const [selectedYearForYearly, setSelectedYearForYearly] = useState(new Date().getFullYear()) // For yearly filter - specific year

    useEffect(() => {
        fetchDashboardData()
    }, [])

    // Recalculate chart data when filter or date changes
    useEffect(() => {
        // Chart data will be recalculated on render via getDonationsChartData()
    }, [donationFilter, selectedWeekDate, selectedYear, donations])

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
                .filter(d => d.status === 'succeeded' || d.status === 'cash_completed')
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

    // Get start of week (Sunday)
    const getStartOfWeek = (date) => {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day
        return new Date(d.setDate(diff))
    }

    // Get end of week (Saturday)
    const getEndOfWeek = (date) => {
        const start = getStartOfWeek(date)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return end
    }

    // Get all weeks in a month
    const getWeeksInMonth = (year, month) => {
        const weeks = []
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startOfFirstWeek = getStartOfWeek(firstDay)
        const endOfLastWeek = getEndOfWeek(lastDay)
        
        let currentWeekStart = new Date(startOfFirstWeek)
        
        while (currentWeekStart <= endOfLastWeek) {
            const weekEnd = new Date(currentWeekStart)
            weekEnd.setDate(currentWeekStart.getDate() + 6)
            
            weeks.push({
                start: new Date(currentWeekStart),
                end: new Date(weekEnd),
                label: `${currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            })
            
            currentWeekStart.setDate(currentWeekStart.getDate() + 7)
        }
        
        return weeks
    }

    // Get all years from donations
    const getAvailableYears = () => {
        const years = new Set()
        donations
            .filter(d => d.status === 'succeeded' || d.status === 'cash_completed')
            .forEach(donation => {
                const date = new Date(donation.createdAt)
                years.add(date.getFullYear())
            })
        // If no years found, include current year
        if (years.size === 0) {
            years.add(new Date().getFullYear())
        }
        return Array.from(years).sort((a, b) => b - a) // Sort descending
    }

    // Process donations data for chart
    const getDonationsChartData = () => {
        const successfulDonations = donations.filter(d => 
            d.status === 'succeeded' || d.status === 'cash_completed'
        )

        if (donationFilter === 'weekly') {
            // Get the week containing selectedWeekDate
            const weekStart = getStartOfWeek(selectedWeekDate)
            const weekEnd = getEndOfWeek(selectedWeekDate)
            
            // Get all weeks in the month of selectedWeekDate
            const year = selectedWeekDate.getFullYear()
            const month = selectedWeekDate.getMonth()
            const weeks = getWeeksInMonth(year, month)
            
            // Filter to show only weeks that have data or the selected week
            const weekData = weeks.map(week => {
                const weekDonations = successfulDonations.filter(donation => {
                    const donationDate = new Date(donation.createdAt)
                    return donationDate >= week.start && donationDate <= week.end
                })
                
                const total = weekDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                
                return {
                    label: week.label,
                    amount: total,
                    weekStart: week.start,
                    weekEnd: week.end
                }
            }).filter(week => week.amount > 0 || 
                (week.weekStart <= weekEnd && week.weekEnd >= weekStart)) // Include selected week even if no data
            
            return weekData.length > 0 ? weekData : [{
                label: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                amount: 0,
                weekStart,
                weekEnd
            }]
        } else if (donationFilter === 'monthly') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            const monthData = months.map(() => 0)
            
            successfulDonations.forEach(donation => {
                const date = new Date(donation.createdAt)
                if (date.getFullYear() === selectedYear) {
                    const month = date.getMonth()
                    monthData[month] += parseFloat(donation.amount) || 0
                }
            })
            
            return months.map((month, index) => ({
                label: month,
                amount: monthData[index]
            }))
        } else if (donationFilter === 'yearly') {
            const availableYears = getAvailableYears()
            
            if (availableYears.length === 0) {
                return [{
                    label: selectedYearForYearly.toString(),
                    amount: 0
                }]
            }
            
            const yearData = availableYears.map(year => {
                const yearDonations = successfulDonations.filter(donation => {
                    const date = new Date(donation.createdAt)
                    return date.getFullYear() === year
                })
                
                const total = yearDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                
                return {
                    label: year.toString(),
                    amount: total
                }
            })
            
            return yearData
        }
        
        // Default to monthly
        return []
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
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                <FaClock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: THEME_COLORS.maroon }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>{stats.pendingEvents}</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Pending Reviews</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: THEME_COLORS.maroon }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>{stats.approvedEvents}</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Approved Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                <FaMoneyBillWave className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: THEME_COLORS.maroon }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold transition-colors" style={{ color: THEME_COLORS.maroon }}>₱{(stats.totalDonations / 1000).toFixed(0)}k</p>
                                <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: THEME_COLORS.gray }}>Total Donations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-4 lg:p-5 xl:p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border group" style={{ borderColor: THEME_COLORS.maroonBg }}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                <FaUserCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" style={{ color: THEME_COLORS.maroon }} />
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
                                        <p className="text-xs sm:text-sm" style={{ color: THEME_COLORS.gray }}>
                                            {donationFilter === 'weekly' ? 'Weekly donation trends' :
                                             donationFilter === 'monthly' ? 'Monthly donation trends' :
                                             'Yearly donation trends'}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Filter Buttons */}
                                <div className="flex items-center space-x-1 sm:space-x-2 rounded-lg sm:rounded-xl p-1 sm:p-1.5" style={{ backgroundColor: THEME_COLORS.grayBg }}>
                                    <button
                                        onClick={() => {
                                            setDonationFilter('weekly')
                                            setSelectedWeekDate(new Date())
                                        }}
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
                                        onClick={() => {
                                            setDonationFilter('monthly')
                                            const years = getAvailableYears()
                                            if (years.length > 0) {
                                                setSelectedYear(years[0]) // Set to most recent year
                                            } else {
                                                setSelectedYear(new Date().getFullYear())
                                            }
                                        }}
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
                                        onClick={() => {
                                            setDonationFilter('yearly')
                                            const years = getAvailableYears()
                                            if (years.length > 0) {
                                                setSelectedYearForYearly(years[0])
                                            }
                                        }}
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
                            
                            {/* Date/Year Selector */}
                            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-lg sm:rounded-xl p-2 sm:p-3 border" style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg }}>
                                {donationFilter === 'weekly' && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                        <div className="flex items-center space-x-2">
                                            <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: THEME_COLORS.maroon }} />
                                            <span className="text-xs sm:text-sm font-semibold" style={{ color: THEME_COLORS.gray }}>Select Date:</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="month"
                                                value={`${selectedWeekDate.getFullYear()}-${String(selectedWeekDate.getMonth() + 1).padStart(2, '0')}`}
                                                onChange={(e) => {
                                                    const [year, month] = e.target.value.split('-')
                                                    setSelectedWeekDate(new Date(parseInt(year), parseInt(month) - 1, 1))
                                                }}
                                                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020]"
                                                style={{ borderColor: THEME_COLORS.maroonBg }}
                                            />
                                            <input
                                                type="date"
                                                value={selectedWeekDate.toISOString().split('T')[0]}
                                                onChange={(e) => setSelectedWeekDate(new Date(e.target.value))}
                                                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020]"
                                                style={{ borderColor: THEME_COLORS.maroonBg }}
                                            />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium" style={{ color: THEME_COLORS.gray }}>
                                            Week: {getStartOfWeek(selectedWeekDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {getEndOfWeek(selectedWeekDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                
                                {donationFilter === 'monthly' && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                        <div className="flex items-center space-x-2">
                                            <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: THEME_COLORS.maroon }} />
                                            <span className="text-xs sm:text-sm font-semibold" style={{ color: THEME_COLORS.gray }}>Select Year:</span>
                                        </div>
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800020] bg-white"
                                            style={{ borderColor: THEME_COLORS.maroonBg }}
                                        >
                                            {getAvailableYears().map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                            {getAvailableYears().length === 0 && (
                                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                                            )}
                                        </select>
                                        <span className="text-xs sm:text-sm font-medium" style={{ color: THEME_COLORS.gray }}>
                                            Showing: {selectedYear}
                                        </span>
                                    </div>
                                )}
                                
                                {donationFilter === 'yearly' && (
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                                        <div className="flex items-center space-x-2">
                                            <FaCalendarAlt className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: THEME_COLORS.maroon }} />
                                            <span className="text-xs sm:text-sm font-semibold" style={{ color: THEME_COLORS.gray }}>All Years:</span>
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium" style={{ color: THEME_COLORS.gray }}>
                                            {getAvailableYears().length > 0 
                                                ? `Showing ${getAvailableYears().length} year(s): ${getAvailableYears().join(', ')}`
                                                : 'No donation data available'}
                                        </span>
                                    </div>
                                )}
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
                                                dataKey="label" 
                                                stroke="#6b7280"
                                                style={{ fontSize: '12px', fontWeight: 500 }}
                                                tick={{ fill: '#6b7280' }}
                                                angle={donationFilter === 'weekly' ? -45 : 0}
                                                textAnchor={donationFilter === 'weekly' ? 'end' : 'middle'}
                                                height={donationFilter === 'weekly' ? 60 : 30}
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
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                                <div className="flex items-center space-x-2 sm:space-x-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md flex-shrink-0" style={{ backgroundColor: THEME_COLORS.white, border: `2px solid ${THEME_COLORS.maroon}` }}>
                                        <FaUsers className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: THEME_COLORS.maroon }} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold truncate" style={{ color: THEME_COLORS.maroon }}>Users</h3>
                                        <p className="text-xs sm:text-sm truncate" style={{ color: THEME_COLORS.gray }}>User distribution</p>
                                    </div>
                                </div>
                                
                                {/* Summary Stats - Mobile View */}
                                {!isLoading && pieChartData.length > 0 && (
                                    <div className="flex sm:hidden items-center gap-2 w-full">
                                        <div className="flex-1 bg-gradient-to-r from-[#800020] to-[#9c0000] rounded-lg p-2.5 text-center shadow-sm">
                                            <div className="text-lg font-bold text-white">{usersChartData.total}</div>
                                            <div className="text-[10px] text-white/90 font-medium">Total</div>
                                        </div>
                                        <div className="flex-1 bg-blue-50 rounded-lg p-2.5 text-center border border-blue-200 shadow-sm">
                                            <div className="text-base font-bold text-blue-700">{usersChartData.volunteers}</div>
                                            <div className="text-[10px] text-blue-600 font-medium">Volunteers</div>
                                        </div>
                                        <div className="flex-1 bg-amber-50 rounded-lg p-2.5 text-center border border-amber-200 shadow-sm">
                                            <div className="text-base font-bold text-amber-700">{usersChartData.donators}</div>
                                            <div className="text-[10px] text-amber-600 font-medium">Donators</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center min-h-[200px] sm:min-h-[250px] lg:min-h-[300px]">
                                    <LoadingSpinner size="medium" />
                                </div>
                            ) : pieChartData.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] sm:min-h-[250px] lg:min-h-[300px] rounded-xl p-6 border" style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg }}>
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: THEME_COLORS.grayBg }}>
                                        <FaUsers className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: THEME_COLORS.grayLight }} />
                                    </div>
                                    <p className="text-sm sm:text-base font-medium mb-1" style={{ color: THEME_COLORS.gray }}>No user data available</p>
                                    <p className="text-xs sm:text-sm text-center" style={{ color: THEME_COLORS.grayLight }}>User statistics will appear here once users register</p>
                                </div>
                            ) : (
                                <>
                                    {/* Chart Container - Responsive - Larger Size */}
                                    <div className="flex justify-center mb-4 sm:mb-6 rounded-xl p-4 sm:p-6 lg:p-8 border-2 relative flex-1 min-h-[250px] sm:min-h-[300px] md:min-h-[350px] lg:min-h-[400px]" style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg, boxShadow: '0 2px 8px rgba(128, 0, 32, 0.08)' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <defs>
                                                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                                        <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.25"/>
                                                    </filter>
                                                </defs>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius="35%"
                                                    outerRadius="75%"
                                                    paddingAngle={4}
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
                                                            strokeWidth={3}
                                                            style={{ filter: 'url(#shadow)' }}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomPieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        {/* Center label - Responsive - Larger */}
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center px-2">
                                                <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold" style={{ color: THEME_COLORS.maroon }}>{usersChartData.total}</div>
                                                <div className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold mt-1" style={{ color: THEME_COLORS.gray }}>Total Users</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Legend - Responsive Grid Layout */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        {pieChartData.map((item, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center justify-between p-2.5 sm:p-3 lg:p-4 rounded-lg sm:rounded-xl border hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group cursor-pointer"
                                                style={{ backgroundColor: THEME_COLORS.whiteLight, borderColor: THEME_COLORS.maroonBg }}
                                            >
                                                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                                    <div 
                                                        className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 rounded-full shadow-sm group-hover:scale-125 transition-transform duration-200 flex-shrink-0"
                                                        style={{ backgroundColor: item.fill }}
                                                    ></div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-xs sm:text-sm font-bold block truncate" style={{ color: THEME_COLORS.maroon }}>{item.name}</span>
                                                        <span className="text-[10px] sm:text-xs truncate" style={{ color: THEME_COLORS.gray }}>{item.percentage}% of total</span>
                                                    </div>
                                                </div>
                                                <span 
                                                    className="text-base sm:text-lg lg:text-xl font-bold ml-2 flex-shrink-0"
                                                    style={{ color: item.fill }}
                                                >
                                                    {item.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Additional Stats - Desktop View */}
                                    <div className="hidden sm:grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-gradient-to-br from-[#800020]/10 to-[#800020]/5 rounded-lg p-3 border" style={{ borderColor: THEME_COLORS.maroonBg }}>
                                            <div className="text-xs font-semibold mb-1" style={{ color: THEME_COLORS.gray }}>Total Users</div>
                                            <div className="text-xl font-bold" style={{ color: THEME_COLORS.maroon }}>{usersChartData.total}</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 rounded-lg p-3 border" style={{ borderColor: THEME_COLORS.goldBg }}>
                                            <div className="text-xs font-semibold mb-1" style={{ color: THEME_COLORS.gray }}>Active</div>
                                            <div className="text-xl font-bold" style={{ color: THEME_COLORS.gold }}>
                                                {usersChartData.volunteers + usersChartData.donators}
                                            </div>
                                        </div>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                    {allEvents.map((event, index) => {
                                        const startDate = new Date(event.startDate)
                                        const endDate = event.endDate ? new Date(event.endDate) : null
                                        const isMultiDay = endDate && startDate.toDateString() !== endDate.toDateString()
                                        const volunteersCount = event.volunteerRegistrations?.filter(v => ['approved', 'accepted'].includes(v.status)).length || 0
                                        const donationsCount = event.donations?.filter(d => d.status === 'succeeded' || d.status === 'cash_completed').length || 0
                                        
                                        return (
                                            <div 
                                                key={event._id} 
                                                className="group bg-gradient-to-br from-white to-gray-50 border-2 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
                                                style={{ 
                                                    borderColor: THEME_COLORS.maroonBg,
                                                    boxShadow: '0 2px 8px rgba(128, 0, 32, 0.08)'
                                                }}
                                            >
                                                {/* Header Section */}
                                                <div className="mb-4">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <h4 className="font-bold text-base sm:text-lg lg:text-xl line-clamp-2 flex-1 transition-colors group-hover:text-[#9c0000]" style={{ color: THEME_COLORS.maroon }}>
                                                            {event.title}
                                                        </h4>
                                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border-2 flex-shrink-0 whitespace-nowrap ${
                                                            event.status === 'Approved' ? 'text-green-800 border-green-300 bg-green-50' :
                                                            event.status === 'Pending' ? 'text-yellow-800 border-yellow-300 bg-yellow-50' :
                                                            event.status === 'Upcoming' ? 'text-blue-800 border-blue-300 bg-blue-50' :
                                                            'text-red-800 border-red-300 bg-red-50'
                                                        }`}>
                                                            {event.status || 'Pending'}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-sm sm:text-base mb-4 line-clamp-2 leading-relaxed" style={{ color: THEME_COLORS.gray, minHeight: '3rem' }}>
                                                        {String(event.description || 'No description available').replace(/<[^>]*>/g, '').substring(0, 120)}
                                                        {String(event.description || '').replace(/<[^>]*>/g, '').length > 120 ? '...' : ''}
                                                    </p>
                                                </div>
                                                
                                                {/* Event Details */}
                                                <div className="space-y-3 mb-4 flex-1">
                                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white border" style={{ borderColor: THEME_COLORS.maroonBg }}>
                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: THEME_COLORS.maroonBg }}>
                                                            <FaCalendarAlt className="w-5 h-5" style={{ color: THEME_COLORS.maroon }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs font-semibold mb-0.5" style={{ color: THEME_COLORS.gray }}>Event Date</div>
                                                            <div className="text-sm font-bold truncate" style={{ color: THEME_COLORS.maroon }}>
                                                                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                {isMultiDay && ` - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {event.location && (
                                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border" style={{ borderColor: THEME_COLORS.maroonBg }}>
                                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: THEME_COLORS.maroonBg }}>
                                                                <svg className="w-5 h-5" style={{ color: THEME_COLORS.maroon }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-semibold mb-0.5" style={{ color: THEME_COLORS.gray }}>Location</div>
                                                                <div className="text-sm font-bold truncate" style={{ color: THEME_COLORS.maroon }}>{event.location}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Stats Row */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                                                            <div className="text-[10px] font-semibold mb-1 text-blue-700">Volunteers</div>
                                                            <div className="text-lg font-bold text-blue-800">{volunteersCount}</div>
                                                        </div>
                                                        <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
                                                            <div className="text-[10px] font-semibold mb-1 text-amber-700">Donations</div>
                                                            <div className="text-lg font-bold text-amber-800">{donationsCount}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Action Button */}
                                                <button
                                                    onClick={() => navigate('/crd-staff/events')}
                                                    className="w-full px-4 py-3 text-sm font-bold border-2 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
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
                                                    <span>Review Event</span>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    })}
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
