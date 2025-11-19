import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts'
import {
    FaUsers,
    FaHandHoldingHeart,
    FaCalendarAlt,
    FaChartLine,
    FaChartPie,
    FaChartBar,
    FaUserGraduate,
    FaUserTie,
    FaUser,
    FaUniversity,
    FaWallet,
    FaMoneyBillWave,
    FaBoxOpen,
    FaCreditCard
} from 'react-icons/fa'

const Reports = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    const [activeTab, setActiveTab] = useState('overview')
    const [isLoading, setIsLoading] = useState(true)
    
    // Data states
    const [events, setEvents] = useState([])
    const [donations, setDonations] = useState([])
    const [users, setUsers] = useState([])
    const [inKindDonations, setInKindDonations] = useState([])
    
    // Fetch all data
    useEffect(() => {
        fetchAllData()
    }, [backendUrl])
    
    const fetchAllData = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            
            // Fetch events
            const eventsResponse = await axios.get(backendUrl + 'api/events')
            const eventsData = eventsResponse.data || []
            setEvents(eventsData)
            
            // Fetch donations
            const donationsResponse = await axios.get(backendUrl + 'api/donations/all')
            const donationsData = donationsResponse.data?.donations || []
            setDonations(donationsData)
            
            // Fetch in-kind donations
            try {
                const inKindResponse = await axios.get(backendUrl + 'api/in-kind-donations')
                setInKindDonations(inKindResponse.data?.donations || [])
            } catch (error) {
                console.error('Error fetching in-kind donations:', error)
                setInKindDonations([])
            }
            
            // Fetch users (for demographics) - try multiple endpoints
            let usersData = []
            try {
                // Try admin endpoint first
                const adminResponse = await axios.get(backendUrl + 'api/admin/users?limit=10000')
                if (adminResponse.data?.success && adminResponse.data?.users) {
                    usersData = adminResponse.data.users
                }
            } catch (error) {
                console.log('Admin users endpoint not accessible, trying alternative...')
                try {
                    // Try regular users endpoint
                    const usersResponse = await axios.get(backendUrl + 'api/users?limit=10000')
                    if (usersResponse.data?.success && usersResponse.data?.users) {
                        usersData = usersResponse.data.users
                    } else if (Array.isArray(usersResponse.data)) {
                        usersData = usersResponse.data
                    }
                } catch (altError) {
                    console.log('Users endpoint not accessible, calculating from available data...')
                    // Extract unique users from donations and events
                    const uniqueUsers = new Map()
                    
                    // From donations
                    donationsData.forEach(donation => {
                        if (donation.user && donation.user._id) {
                            const userId = donation.user._id.toString()
                            if (!uniqueUsers.has(userId)) {
                                uniqueUsers.set(userId, donation.user)
                            }
                        }
                    })
                    
                    // From events (volunteers)
                    eventsData.forEach(event => {
                        if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                            event.volunteerRegistrations.forEach(reg => {
                                if (reg.user && reg.user._id) {
                                    const userId = reg.user._id.toString()
                                    if (!uniqueUsers.has(userId)) {
                                        uniqueUsers.set(userId, reg.user)
                                    }
                                }
                            })
                        }
                    })
                    
                    usersData = Array.from(uniqueUsers.values())
                }
            }
            setUsers(usersData)
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load analytics data')
        } finally {
            setIsLoading(false)
        }
    }
    
    // Calculate event demographics
    const getEventDemographics = () => {
        const statusCounts = {
            Proposed: 0,
            Pending: 0,
            Approved: 0,
            Declined: 0,
            Upcoming: 0,
            Ongoing: 0,
            Completed: 0
        }
        
        events.forEach(event => {
            if (statusCounts.hasOwnProperty(event.status)) {
                statusCounts[event.status]++
            }
        })
        
        return Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
    }
    
    // Calculate donation demographics
    const getDonationDemographics = () => {
        const methodCounts = {
            wallet: 0,
            cash: 0,
            cheque: 0,
            'in-kind': 0
        }
        
        const methodAmounts = {
            wallet: 0,
            cash: 0,
            cheque: 0,
            'in-kind': 0
        }
        
        // Process regular donations
        donations.forEach(donation => {
            const method = donation.paymentMethod?.toLowerCase() || 'wallet'
            const amount = parseFloat(donation.amount) || 0
            
            if (methodCounts.hasOwnProperty(method)) {
                methodCounts[method]++
                methodAmounts[method] += amount
            } else {
                methodCounts.wallet++
                methodAmounts.wallet += amount
            }
        })
        
        // Process in-kind donations
        if (inKindDonations.length > 0) {
            methodCounts['in-kind'] += inKindDonations.length
            inKindDonations.forEach(donation => {
                const value = parseFloat(donation.estimatedValue) || 0
                methodAmounts['in-kind'] += value
            })
        }
        
        return {
            counts: Object.entries(methodCounts).map(([name, value]) => ({ name, value })),
            amounts: Object.entries(methodAmounts).map(([name, value]) => ({ name, value }))
        }
    }
    
    // Calculate donor demographics
    const getDonorDemographics = () => {
        const demographics = {
            Student: 0,
            Alumni: 0,
            Faculty: 0,
            Staff: 0,
            Guest: 0
        }
        
        const demographicsAmounts = {
            Student: 0,
            Alumni: 0,
            Faculty: 0,
            Staff: 0,
            Guest: 0
        }
        
        donations.forEach(donation => {
            const user = donation.user
            if (!user) {
                demographics.Guest++
                return
            }
            
            let category = 'Guest'
            if (user.userType === 'MSEUF') {
                if (user.mseufCategory === 'Student') category = 'Student'
                else if (user.mseufCategory === 'Alumni') category = 'Alumni'
                else if (user.mseufCategory === 'Faculty') category = 'Faculty'
                else if (user.mseufCategory === 'Staff') category = 'Staff'
            } else if (user.userType === 'Outsider') {
                category = 'Guest'
            }
            
            demographics[category]++
            const amount = parseFloat(donation.amount) || 0
            demographicsAmounts[category] += amount
        })
        
        // Process in-kind donations
        inKindDonations.forEach(donation => {
            const user = donation.donor
            if (!user) {
                demographics.Guest++
                return
            }
            
            let category = 'Guest'
            if (user.userType === 'MSEUF') {
                if (user.mseufCategory === 'Student') category = 'Student'
                else if (user.mseufCategory === 'Alumni') category = 'Alumni'
                else if (user.mseufCategory === 'Faculty') category = 'Faculty'
                else if (user.mseufCategory === 'Staff') category = 'Staff'
            } else if (user.userType === 'Outsider') {
                category = 'Guest'
            }
            
            demographics[category]++
            const value = parseFloat(donation.estimatedValue) || 0
            demographicsAmounts[category] += value
        })
        
        return {
            counts: Object.entries(demographics).map(([name, value]) => ({ name, value })),
            amounts: Object.entries(demographicsAmounts).map(([name, value]) => ({ name, value }))
        }
    }
    
    // Calculate volunteer demographics
    const getVolunteerDemographics = () => {
        const demographics = {
            Student: 0,
            Alumni: 0,
            Faculty: 0,
            Staff: 0,
            Guest: 0
        }
        
        const volunteerUserIds = new Set()
        
        events.forEach(event => {
            if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                event.volunteerRegistrations.forEach(reg => {
                    const userId = reg.user?._id || reg.user
                    if (userId && !volunteerUserIds.has(userId.toString())) {
                        volunteerUserIds.add(userId.toString())
                        
                        const user = reg.user
                        if (user) {
                            let category = 'Guest'
                            if (user.userType === 'MSEUF') {
                                if (user.mseufCategory === 'Student') category = 'Student'
                                else if (user.mseufCategory === 'Alumni') category = 'Alumni'
                                else if (user.mseufCategory === 'Faculty') category = 'Faculty'
                                else if (user.mseufCategory === 'Staff') category = 'Staff'
                            } else if (user.userType === 'Outsider') {
                                category = 'Guest'
                            }
                            
                            demographics[category]++
                        }
                    }
                })
            }
        })
        
        return Object.entries(demographics).map(([name, value]) => ({ name, value }))
    }
    
    // Calculate user demographics
    const getUserDemographics = () => {
        const demographics = {
            Student: 0,
            Alumni: 0,
            Faculty: 0,
            Staff: 0,
            Guest: 0,
            'CRD Staff': 0,
            'System Administrator': 0,
            'Department/Organization': 0
        }
        
        users.forEach(user => {
            if (user.role === 'CRD Staff' || user.role === 'System Administrator' || user.role === 'Department/Organization') {
                demographics[user.role]++
            } else if (user.userType === 'MSEUF') {
                if (user.mseufCategory === 'Student') demographics.Student++
                else if (user.mseufCategory === 'Alumni') demographics.Alumni++
                else if (user.mseufCategory === 'Faculty') demographics.Faculty++
                else if (user.mseufCategory === 'Staff') demographics.Staff++
            } else if (user.userType === 'Outsider') {
                demographics.Guest++
            }
        })
        
        return Object.entries(demographics).map(([name, value]) => ({ name, value }))
    }
    
    // Calculate monthly trends
    const getMonthlyTrends = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const currentYear = new Date().getFullYear()
        const trends = months.map(month => ({
            month,
            events: 0,
            donations: 0,
            volunteers: 0
        }))
        
        events.forEach(event => {
            const eventDate = new Date(event.createdAt || event.startDate)
            if (eventDate.getFullYear() === currentYear) {
                const monthIndex = eventDate.getMonth()
                trends[monthIndex].events++
            }
        })
        
        donations.forEach(donation => {
            if (donation.status === 'succeeded' || donation.status === 'cash_completed') {
                const donationDate = new Date(donation.createdAt)
                if (donationDate.getFullYear() === currentYear) {
                    const monthIndex = donationDate.getMonth()
                    trends[monthIndex].donations += parseFloat(donation.amount) || 0
                }
            }
        })
        
        events.forEach(event => {
            if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                const eventDate = new Date(event.createdAt || event.startDate)
                if (eventDate.getFullYear() === currentYear) {
                    const monthIndex = eventDate.getMonth()
                    trends[monthIndex].volunteers += event.volunteerRegistrations.length
                }
            }
        })
        
        return trends
    }
    
    // Chart colors
    const COLORS = {
        maroon: '#800020',
        maroonLight: '#9c0000',
        gold: '#D4AF37',
        goldLight: '#E5C866',
        blue: '#3B82F6',
        green: '#10B981',
        purple: '#8B5CF6',
        orange: '#F59E0B',
        pink: '#EC4899',
        teal: '#14B8A6'
    }
    
    const PIE_COLORS = [COLORS.maroon, COLORS.gold, COLORS.blue, COLORS.green, COLORS.purple, COLORS.orange, COLORS.pink, COLORS.teal]
    
    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Amount') || entry.name.includes('Donations') 
                                ? `₱${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : entry.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            )
        }
        return null
    }
    
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading analytics data..." />
                </div>
                <Footer />
            </div>
        )
    }
    
    const eventDemographics = getEventDemographics()
    const donationDemographics = getDonationDemographics()
    const donorDemographics = getDonorDemographics()
    const volunteerDemographics = getVolunteerDemographics()
    const userDemographics = getUserDemographics()
    const monthlyTrends = getMonthlyTrends()
    
    // Calculate totals
    const totalEvents = events.length
    const totalDonations = donations.filter(d => d.status === 'succeeded' || d.status === 'cash_completed')
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) +
        inKindDonations.reduce((sum, d) => sum + (parseFloat(d.estimatedValue) || 0), 0)
    const totalVolunteers = new Set()
    events.forEach(event => {
        if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
            event.volunteerRegistrations.forEach(reg => {
                const userId = reg.user?._id || reg.user
                if (userId) totalVolunteers.add(userId.toString())
            })
        }
    })
    const totalUsers = users.length
    const totalDonors = new Set()
    donations.forEach(d => {
        const userId = d.user?._id || d.user
        if (userId) totalDonors.add(userId.toString())
    })
    inKindDonations.forEach(d => {
        const userId = d.donor?._id || d.donor
        if (userId) totalDonors.add(userId.toString())
    })
    
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports</h1>
                            <p className="text-gray-600 text-lg">Live analytics and demographics for events, donations, volunteers, and users</p>
                        </div>
                    </div>
                </div>
                
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 mb-1">Total Events</p>
                                <p className="text-3xl font-bold text-blue-900">{totalEvents}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                                <FaCalendarAlt className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 mb-1">Total Donations</p>
                                <p className="text-3xl font-bold text-green-900">₱{totalDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                                <FaHandHoldingHeart className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border border-purple-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 mb-1">Total Volunteers</p>
                                <p className="text-3xl font-bold text-purple-900">{totalVolunteers.size}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                                <FaUsers className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-lg p-6 border border-orange-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-600 mb-1">Total Users</p>
                                <p className="text-3xl font-bold text-orange-900">{totalUsers}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                                <FaUser className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-8 overflow-hidden">
                    <div className="flex flex-wrap border-b border-gray-200">
                        {[
                            { id: 'overview', label: 'Overview', icon: FaChartLine },
                            { id: 'events', label: 'Events', icon: FaCalendarAlt },
                            { id: 'donations', label: 'Donations', icon: FaHandHoldingHeart },
                            { id: 'volunteers', label: 'Volunteers', icon: FaUsers },
                            { id: 'users', label: 'Users', icon: FaUser },
                            { id: 'donors', label: 'Donor Demographics', icon: FaChartPie }
                        ].map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-200 ${
                                        activeTab === tab.id
                                            ? 'bg-gradient-to-r from-[#800020] to-[#9c0000] text-white border-b-2 border-[#800020]'
                                            : 'text-gray-600 hover:text-[#800020] hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Tab Content */}
                    <div className="p-8">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Overview</h2>
                                
                                {/* Monthly Trends Chart */}
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends ({new Date().getFullYear()})</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={monthlyTrends}>
                                            <defs>
                                                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.maroon} stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor={COLORS.maroon} stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="colorDonations" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="colorVolunteers" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="month" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Legend />
                                            <Area type="monotone" dataKey="events" stackId="1" stroke={COLORS.maroon} fill="url(#colorEvents)" name="Events" />
                                            <Area type="monotone" dataKey="volunteers" stackId="2" stroke={COLORS.blue} fill="url(#colorVolunteers)" name="Volunteers" />
                                            <Line type="monotone" dataKey="donations" stroke={COLORS.gold} strokeWidth={3} name="Donations (₱)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h4 className="text-sm font-medium text-gray-600 mb-2">Event Status Distribution</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={eventDemographics}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={70}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {eventDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h4 className="text-sm font-medium text-gray-600 mb-2">Donation Methods</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={donationDemographics.counts}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={70}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {donationDemographics.counts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h4 className="text-sm font-medium text-gray-600 mb-2">Donor Demographics</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={donorDemographics.counts}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={70}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {donorDemographics.counts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Events Tab */}
                        {activeTab === 'events' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Analytics</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Status Distribution</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={eventDemographics}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {eventDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Events by Status</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={eventDemographics} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis type="number" stroke="#6b7280" />
                                                <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" fill={COLORS.maroon} radius={[0, 8, 8, 0]}>
                                                    {eventDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {eventDemographics.map((stat, index) => (
                                            <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                <p className="text-2xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                                    {stat.value}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
                        )}
                        
                        {/* Donations Tab */}
                        {activeTab === 'donations' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Donation Analytics</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Methods (Count)</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={donationDemographics.counts}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {donationDemographics.counts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                            </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Methods (Amount)</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={donationDemographics.amounts}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" />
                                                <YAxis stroke="#6b7280" />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" fill={COLORS.gold} radius={[8, 8, 0, 0]}>
                                                    {donationDemographics.amounts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                        </div>
                    </div>

                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Method Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {donationDemographics.counts.map((method, index) => {
                                            const amountData = donationDemographics.amounts.find(m => m.name === method.name)
                                            return (
                                                <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-center mb-2">
                                                        {method.name === 'wallet' && <FaWallet className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {method.name === 'cash' && <FaMoneyBillWave className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {method.name === 'cheque' && <FaCreditCard className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {method.name === 'in-kind' && <FaBoxOpen className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                            </div>
                                                    <p className="text-xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                                        {method.value}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">{method.name}</p>
                                                    {amountData && (
                                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                                            ₱{amountData.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    )}
                            </div>
                                            )
                                        })}
                        </div>
                    </div>
                            </div>
                        )}
                        
                        {/* Volunteers Tab */}
                        {activeTab === 'volunteers' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Volunteer Analytics</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Demographics</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={volunteerDemographics}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {volunteerDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                            </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteers by Category</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={volunteerDemographics}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" />
                                                <YAxis stroke="#6b7280" />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" fill={COLORS.purple} radius={[8, 8, 0, 0]}>
                                                    {volunteerDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                    </div>
                </div>

                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Volunteer Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {volunteerDemographics.map((stat, index) => (
                                            <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                <div className="flex items-center justify-center mb-2">
                                                    {stat.name === 'Student' && <FaUserGraduate className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                    {stat.name === 'Alumni' && <FaUniversity className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                    {stat.name === 'Faculty' && <FaUserTie className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                    {stat.name === 'Staff' && <FaUserTie className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                    {stat.name === 'Guest' && <FaUser className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                </div>
                                                <p className="text-2xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                                    {stat.value}
                                                </p>
                                                <p className="text-sm text-gray-600 mt-1">{stat.name}</p>
                                </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">User Demographics</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <PieChart>
                                                <Pie
                                                    data={userDemographics}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                                    outerRadius={120}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {userDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Users by Category</h3>
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={userDemographics} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis type="number" stroke="#6b7280" />
                                                <YAxis dataKey="name" type="category" stroke="#6b7280" width={120} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" fill={COLORS.orange} radius={[0, 8, 8, 0]}>
                                                    {userDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                
                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                                        {userDemographics.map((stat, index) => (
                                            <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                <p className="text-2xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                                    {stat.value}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-1">{stat.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
                        )}
                        
                        {/* Donor Demographics Tab */}
                        {activeTab === 'donors' && (
                            <div className="space-y-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Donor Demographics</h2>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Donors by Category (Count)</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={donorDemographics.counts}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {donorDemographics.counts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                        </div>
                                    
                                    <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-md">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Amount by Category</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={donorDemographics.amounts}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" stroke="#6b7280" />
                                                <YAxis stroke="#6b7280" />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" fill={COLORS.gold} radius={[8, 8, 0, 0]}>
                                                    {donorDemographics.amounts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                    </div>
                </div>

                                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Donor Statistics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {donorDemographics.counts.map((stat, index) => {
                                            const amountData = donorDemographics.amounts.find(d => d.name === stat.name)
                                            return (
                                                <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-center mb-2">
                                                        {stat.name === 'Student' && <FaUserGraduate className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {stat.name === 'Alumni' && <FaUniversity className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {stat.name === 'Faculty' && <FaUserTie className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {stat.name === 'Staff' && <FaUserTie className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                                                        {stat.name === 'Guest' && <FaUser className="w-6 h-6" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }} />}
                        </div>
                                                    <p className="text-xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                                        {stat.value}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">{stat.name} Donors</p>
                                                    {amountData && (
                                                        <p className="text-sm font-semibold text-gray-900 mt-1">
                                                            ₱{amountData.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                            )}
                        </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default Reports
