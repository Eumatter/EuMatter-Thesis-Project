import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import { useCache } from '../../../context/CacheContext.jsx'
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
    Area,
    ComposedChart
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
    FaCreditCard,
    FaBriefcase,
    FaPrint
} from 'react-icons/fa'

const Reports = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const { cachedGet } = useCache()
    const [activeTab, setActiveTab] = useState('overview')
    const [isLoading, setIsLoading] = useState(true)
    
    // Expenditure management states
    const [showExpenditureModal, setShowExpenditureModal] = useState(false)
    const [editingExpenditure, setEditingExpenditure] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')
    const [expenditureFormData, setExpenditureFormData] = useState({
        title: '',
        description: '',
        amount: '',
        category: 'other',
        event: '',
        department: '',
        paymentMethod: 'cash',
        receiptNumber: '',
        receiptUrl: '',
        expenseDate: new Date().toISOString().split('T')[0],
        notes: ''
    })
    
    // Data states
    const [events, setEvents] = useState([])
    const [donations, setDonations] = useState([])
    const [users, setUsers] = useState([])
    const [inKindDonations, setInKindDonations] = useState([])
    const [expenditures, setExpenditures] = useState([])
    
    // Fetch all data
    useEffect(() => {
        fetchAllData()
    }, [backendUrl])
    
    const fetchAllData = async () => {
        try {
            setIsLoading(true)
            
            // Declare variables at function scope for use in fallback code
            let eventsData = []
            let donationsData = []
            
            // Fetch events with caching
            try {
                eventsData = await cachedGet('events', 'api/events', { forceRefresh: false })
                setEvents(eventsData || [])
            } catch (error) {
                console.error('Error fetching events:', error)
                setEvents([])
            }
            
            // Fetch donations with caching
            try {
                const donationsResponse = await cachedGet('donations', 'api/donations/all', { forceRefresh: false })
                donationsData = donationsResponse?.donations || []
                setDonations(donationsData)
            } catch (error) {
                console.error('Error fetching donations:', error)
                setDonations([])
            }
            
            // Fetch in-kind donations with caching
            try {
                const inKindResponse = await cachedGet('inKindDonations', 'api/in-kind-donations', { forceRefresh: false })
                setInKindDonations(inKindResponse?.donations || [])
            } catch (error) {
                console.error('Error fetching in-kind donations:', error)
                setInKindDonations([])
            }
            
            // Fetch expenditures with caching
            try {
                const expendituresResponse = await cachedGet('expenditures', 'api/expenditures', { forceRefresh: false })
                // Handle different response formats
                if (expendituresResponse) {
                    if (Array.isArray(expendituresResponse)) {
                        setExpenditures(expendituresResponse)
                    } else if (expendituresResponse.expenditures && Array.isArray(expendituresResponse.expenditures)) {
                        setExpenditures(expendituresResponse.expenditures)
                    } else if (expendituresResponse.success && Array.isArray(expendituresResponse.data)) {
                        setExpenditures(expendituresResponse.data)
                    } else {
                        setExpenditures([])
                    }
                } else {
                    setExpenditures([])
                }
            } catch (error) {
                console.error('Error fetching expenditures:', error)
                // Don't show error toast here as it's part of bulk data fetch
                // User will see empty expenditures section if it fails
                if (error.code === 'ERR_BLOCKED_BY_CLIENT') {
                    console.warn('Expenditures request blocked by browser extension')
                }
                setExpenditures([])
            }
            
            // Fetch users (for demographics) - try multiple endpoints with caching
            let usersData = []
            // Check if user has System Administrator role to access admin endpoints
            const userRole = userData?.role
            
            if (userRole === 'System Administrator') {
                try {
                    // Try admin endpoint first (System Admin only) with caching
                    const adminResponse = await cachedGet('users', 'api/admin/users', { 
                        forceRefresh: false,
                        params: { limit: 10000 }
                    })
                    if (adminResponse?.success && adminResponse?.users) {
                        usersData = adminResponse.users
                    }
                } catch (error) {
                    // Silently fall back if admin endpoint fails
                    try {
                        // Try regular users endpoint (System Admin only) with caching
                        const usersResponse = await cachedGet('users', 'api/users', { 
                            forceRefresh: false,
                            params: { limit: 10000 }
                        })
                        if (usersResponse?.success && usersResponse?.users) {
                            usersData = usersResponse.users
                        } else if (Array.isArray(usersResponse)) {
                            usersData = usersResponse
                        }
                    } catch (altError) {
                        // Silently fall back to extraction method
                    }
                }
            }
            
            // If no users data from API (CRD Staff or API failed), extract from donations and events
            if (usersData.length === 0) {
                // Extract unique users from donations and events
                // Note: These may have limited fields, but we'll use what we have
                const uniqueUsers = new Map()
                
                // Ensure we have arrays
                const safeDonationsData = Array.isArray(donationsData) ? donationsData : []
                const safeEventsData = Array.isArray(eventsData) ? eventsData : []
                
                // From donations - user data is populated but may be limited
                safeDonationsData.forEach(donation => {
                    if (donation && donation.user) {
                        const userId = donation.user._id?.toString() || donation.user.toString()
                        if (!uniqueUsers.has(userId)) {
                            // Store user data, even if incomplete
                            uniqueUsers.set(userId, {
                                _id: donation.user._id || donation.user,
                                name: donation.user.name,
                                email: donation.user.email,
                                profileImage: donation.user.profileImage,
                                department: donation.user.department,
                                // These fields may not be populated, will be undefined
                                userType: donation.user.userType,
                                mseufCategory: donation.user.mseufCategory,
                                outsiderCategory: donation.user.outsiderCategory,
                                role: donation.user.role || 'User'
                            })
                        }
                    }
                })
                
                // From events (volunteers) - user data is populated but may be limited
                safeEventsData.forEach(event => {
                    if (event && event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                        event.volunteerRegistrations.forEach(reg => {
                            if (reg && reg.user) {
                                const userId = reg.user._id?.toString() || reg.user.toString()
                                if (!uniqueUsers.has(userId)) {
                                    // Store user data, even if incomplete
                                    uniqueUsers.set(userId, {
                                        _id: reg.user._id || reg.user,
                                        name: reg.user.name,
                                        email: reg.user.email,
                                        profileImage: reg.user.profileImage,
                                        department: reg.user.department,
                                        course: reg.user.course,
                                        // These fields may not be populated, will be undefined
                                        userType: reg.user.userType,
                                        mseufCategory: reg.user.mseufCategory,
                                        outsiderCategory: reg.user.outsiderCategory,
                                        role: reg.user.role || 'User'
                                    })
                                } else {
                                    // Merge additional data if available
                                    const existing = uniqueUsers.get(userId)
                                    if (existing) {
                                        if (reg.user.userType) existing.userType = reg.user.userType
                                        if (reg.user.mseufCategory) existing.mseufCategory = reg.user.mseufCategory
                                        if (reg.user.outsiderCategory) existing.outsiderCategory = reg.user.outsiderCategory
                                        if (reg.user.role) existing.role = reg.user.role
                                    }
                                }
                            }
                        })
                    }
                })
                
                usersData = Array.from(uniqueUsers.values())
            }
            setUsers(usersData)
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('Failed to load analytics data')
        } finally {
            setIsLoading(false)
        }
    }
    
    // Expenditure management functions
    const handleExpenditureInputChange = (e) => {
        const { name, value } = e.target
        setExpenditureFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleExpenditureSubmit = async (e) => {
        e.preventDefault()
        try {
            axios.defaults.withCredentials = true
            const payload = {
                ...expenditureFormData,
                amount: parseFloat(expenditureFormData.amount),
                event: expenditureFormData.event || null,
                department: expenditureFormData.department || null
            }

            if (editingExpenditure) {
                await axios.put(`${backendUrl}api/expenditures/${editingExpenditure._id}`, payload)
                toast.success('Expenditure updated successfully')
            } else {
                await axios.post(`${backendUrl}api/expenditures`, payload)
                toast.success('Expenditure created successfully')
            }

            setShowExpenditureModal(false)
            setEditingExpenditure(null)
            resetExpenditureForm()
            // Refresh expenditures data
            const expendituresResponse = await cachedGet('expenditures', 'api/expenditures', { forceRefresh: true })
            if (expendituresResponse) {
                if (Array.isArray(expendituresResponse)) {
                    setExpenditures(expendituresResponse)
                } else if (expendituresResponse.expenditures && Array.isArray(expendituresResponse.expenditures)) {
                    setExpenditures(expendituresResponse.expenditures)
                } else if (expendituresResponse.success && Array.isArray(expendituresResponse.data)) {
                    setExpenditures(expendituresResponse.data)
                }
            }
        } catch (error) {
            console.error('Error saving expenditure:', error)
            toast.error(error.response?.data?.message || 'Failed to save expenditure')
        }
    }

    const handleExpenditureEdit = (expenditure) => {
        setEditingExpenditure(expenditure)
        setExpenditureFormData({
            title: expenditure.title || '',
            description: expenditure.description || '',
            amount: expenditure.amount || '',
            category: expenditure.category || 'other',
            event: expenditure.event?._id || expenditure.event || '',
            department: expenditure.department?._id || expenditure.department || '',
            paymentMethod: expenditure.paymentMethod || 'cash',
            receiptNumber: expenditure.receiptNumber || '',
            receiptUrl: expenditure.receiptUrl || '',
            expenseDate: expenditure.expenseDate ? new Date(expenditure.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: expenditure.notes || ''
        })
        setShowExpenditureModal(true)
    }

    const handleExpenditureApprove = async (id) => {
        try {
            axios.defaults.withCredentials = true
            await axios.post(`${backendUrl}api/expenditures/${id}/approve`)
            toast.success('Expenditure approved')
            const expendituresResponse = await cachedGet('expenditures', 'api/expenditures', { forceRefresh: true })
            if (expendituresResponse) {
                if (Array.isArray(expendituresResponse)) {
                    setExpenditures(expendituresResponse)
                } else if (expendituresResponse.expenditures && Array.isArray(expendituresResponse.expenditures)) {
                    setExpenditures(expendituresResponse.expenditures)
                } else if (expendituresResponse.success && Array.isArray(expendituresResponse.data)) {
                    setExpenditures(expendituresResponse.data)
                }
            }
        } catch (error) {
            console.error('Error approving expenditure:', error)
            toast.error(error.response?.data?.message || 'Failed to approve expenditure')
        }
    }

    const handleExpenditureReject = async (id) => {
        const reason = prompt('Please provide a reason for rejection:')
        if (reason) {
            try {
                axios.defaults.withCredentials = true
                await axios.post(`${backendUrl}api/expenditures/${id}/reject`, { rejectionReason: reason })
                toast.success('Expenditure rejected')
                const expendituresResponse = await cachedGet('expenditures', 'api/expenditures', { forceRefresh: true })
                if (expendituresResponse) {
                    if (Array.isArray(expendituresResponse)) {
                        setExpenditures(expendituresResponse)
                    } else if (expendituresResponse.expenditures && Array.isArray(expendituresResponse.expenditures)) {
                        setExpenditures(expendituresResponse.expenditures)
                    } else if (expendituresResponse.success && Array.isArray(expendituresResponse.data)) {
                        setExpenditures(expendituresResponse.data)
                    }
                }
            } catch (error) {
                console.error('Error rejecting expenditure:', error)
                toast.error(error.response?.data?.message || 'Failed to reject expenditure')
            }
        }
    }

    const handleExpenditureMarkAsPaid = async (id) => {
        try {
            axios.defaults.withCredentials = true
            await axios.post(`${backendUrl}api/expenditures/${id}/mark-paid`)
            toast.success('Expenditure marked as paid')
            const expendituresResponse = await cachedGet('expenditures', 'api/expenditures', { forceRefresh: true })
            if (expendituresResponse) {
                if (Array.isArray(expendituresResponse)) {
                    setExpenditures(expendituresResponse)
                } else if (expendituresResponse.expenditures && Array.isArray(expendituresResponse.expenditures)) {
                    setExpenditures(expendituresResponse.expenditures)
                } else if (expendituresResponse.success && Array.isArray(expendituresResponse.data)) {
                    setExpenditures(expendituresResponse.data)
                }
            }
        } catch (error) {
            console.error('Error marking as paid:', error)
            toast.error(error.response?.data?.message || 'Failed to mark as paid')
        }
    }

    const resetExpenditureForm = () => {
        setExpenditureFormData({
            title: '',
            description: '',
            amount: '',
            category: 'other',
            event: '',
            department: '',
            paymentMethod: 'cash',
            receiptNumber: '',
            receiptUrl: '',
            expenseDate: new Date().toISOString().split('T')[0],
            notes: ''
        })
        setEditingExpenditure(null)
    }

    const filteredExpenditures = expenditures.filter(exp => {
        if (filterStatus !== 'all' && exp.status !== filterStatus) return false
        if (filterCategory !== 'all' && exp.category !== filterCategory) return false
        return true
    })

    const expenditureCategories = ['event_expenses', 'operational', 'equipment', 'supplies', 'transportation', 'food', 'other']
    const paymentMethods = ['cash', 'check', 'bank_transfer', 'gcash', 'paymaya', 'other']

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
    
    // Helper function to categorize user
    const categorizeUser = (user) => {
        if (!user) return 'Guest'
        
        // Check if user has role information
        if (user.role === 'CRD Staff' || user.role === 'System Administrator' || user.role === 'Department/Organization') {
            return 'Guest' // These roles are not counted in donor demographics
        }
        
        // Check userType and category
        if (user.userType === 'MSEUF') {
            if (user.mseufCategory === 'Student') return 'Student'
            if (user.mseufCategory === 'Faculty') return 'Faculty'
            if (user.mseufCategory === 'Staff') return 'Staff'
            // Check outsiderCategory for Alumni (some users might have this set)
            if (user.outsiderCategory === 'Alumni') return 'Alumni'
        } else if (user.userType === 'Outsider') {
            if (user.outsiderCategory === 'Alumni') return 'Alumni'
            return 'Guest'
        }
        
        // Fallback: if we have email domain, try to infer
        if (user.email) {
            if (user.email.includes('@mseuf.edu.ph')) {
                // MSEUF email but no category - default to Guest or try to infer from role
                if (user.role === 'User') return 'Guest' // Could be student, but we don't know
            }
        }
        
        return 'Guest'
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
            const category = categorizeUser(user)
            
            demographics[category]++
            const amount = parseFloat(donation.amount) || 0
            demographicsAmounts[category] += amount
        })
        
        // Process in-kind donations (note: field is "user", not "donor")
        inKindDonations.forEach(donation => {
            const user = donation.user || donation.donor // Support both field names
            const category = categorizeUser(user)
            
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
                        const category = categorizeUser(user)
                        demographics[category]++
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
            // Check for special roles first
            if (user.role === 'CRD Staff') {
                demographics['CRD Staff']++
            } else if (user.role === 'System Administrator') {
                demographics['System Administrator']++
            } else if (user.role === 'Department/Organization') {
                demographics['Department/Organization']++
            } else {
                // Use the categorizeUser helper for regular users
                const category = categorizeUser(user)
                demographics[category]++
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
    
    // Chart colors - Maroon and white theme
    const COLORS = {
        maroon: '#800000',
        maroonLight: '#900000',
        maroonDark: '#660000',
        maroonLighter: '#990000',
        white: '#FFFFFF',
        gray: '#F3F4F6',
        grayDark: '#6B7280'
    }
    
    // Maroon gradient colors for charts
    const PIE_COLORS = [
        COLORS.maroon,
        COLORS.maroonLight,
        COLORS.maroonDark,
        COLORS.maroonLighter,
        '#a3001e',
        '#8d001a',
        '#730016',
        '#c40028'
    ]
    
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
    const totalDonations = donations.filter(d => d.status === 'succeeded' || d.status === 'cash_completed' || d.status === 'cash_verified')
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0) +
        inKindDonations.reduce((sum, d) => sum + (parseFloat(d.estimatedValue) || 0), 0)
    const totalExpenditures = expenditures
        .filter(e => e.status === 'approved' || e.status === 'paid')
        .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    const netBalance = totalDonations - totalExpenditures
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
            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @media print {
                        @page {
                            margin: 1.5cm 1cm;
                            size: A4;
                        }
                        
                        /* Hide non-essential elements */
                        header,
                        footer,
                        .no-print,
                        button,
                        nav,
                        .no-print * {
                            display: none !important;
                        }
                        
                        /* Show print-only elements */
                        .print\\:block {
                            display: block !important;
                        }
                        
                        /* Page setup */
                        body {
                            background: white !important;
                            color: #000 !important;
                            font-size: 11pt;
                            line-height: 1.6;
                        }
                        
                        /* Main container */
                        main {
                            max-width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        
                        /* Print header */
                        .print-header {
                            display: block !important;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 3px solid #800000;
                            page-break-after: avoid;
                        }
                        
                        .print-header h1 {
                            color: #800000 !important;
                            font-size: 24pt;
                            font-weight: bold;
                            margin: 0 0 8px 0;
                        }
                        
                        .print-header p {
                            color: #666 !important;
                            font-size: 10pt;
                            margin: 0;
                        }
                        
                        /* Section headers */
                        h2, h3 {
                            color: #800000 !important;
                            page-break-after: avoid;
                            margin-top: 20px;
                            margin-bottom: 12px;
                        }
                        
                        h2 {
                            font-size: 18pt;
                            border-bottom: 2px solid #e5e7eb;
                            padding-bottom: 8px;
                            font-weight: bold;
                        }
                        
                        h3 {
                            font-size: 14pt;
                            font-weight: 600;
                        }
                        
                        /* Print section titles */
                        .print-section-title {
                            color: #800000 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Section content */
                        .print-section-content {
                            page-break-inside: avoid;
                        }
                        
                        .print-section {
                            page-break-inside: avoid;
                            margin-bottom: 20px;
                        }
                        
                        /* Cards and containers */
                        .bg-white,
                        .bg-gray-50,
                        .bg-gradient-to-r {
                            background: white !important;
                            border: 1px solid #e5e7eb !important;
                            page-break-inside: avoid;
                            margin-bottom: 15px;
                            padding: 15px !important;
                        }
                        
                        /* Remove shadows and rounded corners */
                        .shadow-lg,
                        .shadow-md,
                        .shadow-sm,
                        .shadow {
                            box-shadow: none !important;
                        }
                        
                        .rounded-xl,
                        .rounded-2xl,
                        .rounded-lg {
                            border-radius: 0 !important;
                        }
                        
                        /* Tables */
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            page-break-inside: auto;
                            margin-bottom: 15px;
                        }
                        
                        thead {
                            display: table-header-group;
                            background: #f9fafb !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        tbody tr {
                            page-break-inside: avoid;
                            page-break-after: auto;
                        }
                        
                        th, td {
                            border: 1px solid #e5e7eb !important;
                            padding: 8px 12px !important;
                            text-align: left;
                            font-size: 10pt;
                        }
                        
                        th {
                            background: #f9fafb !important;
                            color: #000 !important;
                            font-weight: bold;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        
                        /* Charts and graphs - Enhanced for print - FIX VISIBILITY */
                        canvas {
                            max-width: 100% !important;
                            height: auto !important;
                            page-break-inside: avoid;
                            display: block !important;
                            margin: 0 auto !important;
                            visibility: visible !important;
                        }
                        
                        /* Recharts specific styling - ENSURE VISIBILITY */
                        .recharts-wrapper {
                            width: 100% !important;
                            height: auto !important;
                            min-height: 200px !important;
                            page-break-inside: avoid;
                            margin: 15px 0 !important;
                            display: block !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        
                        .recharts-surface {
                            width: 100% !important;
                            height: auto !important;
                            max-width: 100% !important;
                            visibility: visible !important;
                            display: block !important;
                        }
                        
                        /* Ensure chart SVG is visible */
                        .recharts-wrapper svg,
                        .recharts-surface {
                            visibility: visible !important;
                            display: block !important;
                            opacity: 1 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        .recharts-legend-wrapper {
                            display: block !important;
                            text-align: center !important;
                            margin-top: 10px !important;
                        }
                        
                        .recharts-legend-item {
                            display: inline-block !important;
                            margin: 0 15px !important;
                        }
                        
                        /* Chart text elements */
                        .recharts-text,
                        .recharts-label {
                            font-size: 10pt !important;
                            fill: #000 !important;
                            font-weight: 500 !important;
                        }
                        
                        /* Chart axes */
                        .recharts-cartesian-axis-tick-value {
                            font-size: 9pt !important;
                            fill: #666 !important;
                        }
                        
                        .recharts-cartesian-axis-line {
                            stroke: #000 !important;
                            stroke-width: 1 !important;
                        }
                        
                        .recharts-cartesian-grid line {
                            stroke: #e5e7eb !important;
                            stroke-width: 1 !important;
                        }
                        
                        /* Chart tooltips - hide in print */
                        .recharts-tooltip-wrapper {
                            display: none !important;
                        }
                        
                        /* Chart bars and lines - ensure visibility */
                        .recharts-bar,
                        .recharts-line,
                        .recharts-area,
                        .recharts-bar-rectangle,
                        .recharts-line-curve,
                        .recharts-area-curve {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                            stroke-width: 2 !important;
                        }
                        
                        /* Chart bar rectangles - ensure colors */
                        .recharts-bar-rectangle {
                            fill-opacity: 0.8 !important;
                            stroke: #000 !important;
                            stroke-width: 1 !important;
                        }
                        
                        /* Chart lines - ensure visibility */
                        .recharts-line-curve {
                            stroke-width: 2.5 !important;
                            fill: none !important;
                        }
                        
                        /* Chart areas - ensure visibility */
                        .recharts-area-curve {
                            stroke-width: 2 !important;
                            fill-opacity: 0.6 !important;
                        }
                        
                        /* Pie chart sectors - ensure visibility */
                        .recharts-pie-sector {
                            stroke: #fff !important;
                            stroke-width: 2 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Chart dots - ensure visibility */
                        .recharts-dot {
                            r: 4 !important;
                            stroke-width: 2 !important;
                            fill: #800000 !important;
                            stroke: #800000 !important;
                        }
                        
                        /* Grid layouts */
                        .grid {
                            display: grid !important;
                            gap: 15px !important;
                        }
                        
                        /* Metrics cards - Balanced grid layout */
                        .grid-cols-1,
                        .grid-cols-2,
                        .grid-cols-3,
                        .grid-cols-4,
                        .grid-cols-5 {
                            grid-template-columns: repeat(3, 1fr) !important;
                            gap: 12px !important;
                        }
                        
                        /* Card content alignment */
                        .bg-white > div,
                        .bg-white > .flex {
                            display: flex !important;
                            align-items: center !important;
                            gap: 10px !important;
                        }
                        
                        /* Card text hierarchy */
                        .bg-white p {
                            margin: 4px 0 !important;
                            line-height: 1.4 !important;
                        }
                        
                        /* Card icons - already handled above but ensure visibility */
                        .bg-white svg:not(.recharts-surface):not(.recharts-wrapper *) {
                            width: 20pt !important;
                            height: 20pt !important;
                            color: #800000 !important;
                            fill: #800000 !important;
                            stroke: #800000 !important;
                            flex-shrink: 0 !important;
                            background: rgba(128, 0, 0, 0.1) !important;
                            padding: 6pt !important;
                            border-radius: 6pt !important;
                            display: inline-block !important;
                            visibility: visible !important;
                        }
                        
                        /* Card numbers */
                        .bg-white .text-xl,
                        .bg-white .text-2xl,
                        .bg-white .text-3xl {
                            font-weight: bold !important;
                            color: #800000 !important;
                            line-height: 1.2 !important;
                        }
                        
                        /* Card labels */
                        .bg-white .text-xs,
                        .bg-white .text-sm {
                            color: #666 !important;
                            font-weight: 500 !important;
                        }
                        
                        /* Card content */
                        .bg-white > div {
                            page-break-inside: avoid;
                        }
                        
                        /* Financial summary */
                        .bg-gradient-to-r {
                            background: #800000 !important;
                            color: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            padding: 20px !important;
                            margin-bottom: 20px !important;
                        }
                        
                        .bg-gradient-to-r * {
                            color: white !important;
                        }
                        
                        /* Text colors */
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Ensure maroon colors print */
                        .text-\\[\\#800000\\],
                        [style*="#800000"] {
                            color: #800000 !important;
                        }
                        
                        /* Page breaks */
                        .print-break {
                            page-break-after: always;
                        }
                        
                        .print-no-break {
                            page-break-inside: avoid;
                        }
                        
                        /* Spacing */
                        .mb-6,
                        .mb-8 {
                            margin-bottom: 20px !important;
                        }
                        
                        .mt-6,
                        .mt-8 {
                            margin-top: 20px !important;
                        }
                        
                        /* ResponsiveContainer for charts - Already handled above */
                        
                        /* Better spacing for print */
                        .space-y-6 > * + *,
                        .space-y-8 > * + * {
                            margin-top: 20px !important;
                        }
                        
                        /* Text alignment - Enhanced */
                        .text-right {
                            text-align: right !important;
                        }
                        
                        .text-center {
                            text-align: center !important;
                        }
                        
                        .text-left {
                            text-align: left !important;
                        }
                        
                        /* Flex alignment */
                        .items-center {
                            align-items: center !important;
                        }
                        
                        .items-start {
                            align-items: flex-start !important;
                        }
                        
                        .items-end {
                            align-items: flex-end !important;
                        }
                        
                        .justify-between {
                            justify-content: space-between !important;
                        }
                        
                        .justify-center {
                            justify-content: center !important;
                        }
                        
                        /* Number alignment in cards */
                        .bg-white .text-right,
                        .bg-white .text-center {
                            text-align: right !important;
                        }
                        
                        /* Currency formatting */
                        .font-bold,
                        .font-semibold {
                            font-weight: bold !important;
                        }
                        
                        /* Truncate handling */
                        .truncate {
                            white-space: nowrap !important;
                            overflow: visible !important;
                            text-overflow: clip !important;
                        }
                        
                        /* Remove unnecessary spacing */
                        .gap-4,
                        .gap-6 {
                            gap: 15px !important;
                        }
                        
                        /* Ensure proper font sizes for print */
                        .text-xs {
                            font-size: 9pt !important;
                        }
                        
                        .text-sm {
                            font-size: 10pt !important;
                        }
                        
                        .text-base {
                            font-size: 11pt !important;
                        }
                        
                        .text-lg {
                            font-size: 12pt !important;
                        }
                        
                        .text-xl {
                            font-size: 14pt !important;
                        }
                        
                        .text-2xl {
                            font-size: 18pt !important;
                        }
                        
                        .text-3xl {
                            font-size: 22pt !important;
                        }
                        
                        .text-4xl {
                            font-size: 26pt !important;
                        }
                        
                        /* Icons - Enhanced display for print - FIX VISIBILITY */
                        svg:not(.recharts-surface):not(.recharts-wrapper *):not(.recharts-*) {
                            display: inline-block !important;
                            vertical-align: middle !important;
                            width: 16pt !important;
                            height: 16pt !important;
                            margin-right: 8pt !important;
                            fill: #800000 !important;
                            stroke: #800000 !important;
                            color: #800000 !important;
                            background: transparent !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        
                        /* Override gradient text fill for icons in print */
                        svg:not(.recharts-surface):not(.recharts-wrapper *):not(.recharts-*) * {
                            fill: #800000 !important;
                            stroke: #800000 !important;
                            -webkit-text-fill-color: #800000 !important;
                            background: transparent !important;
                        }
                        
                        /* Remove gradient background from icons */
                        svg[style*="backgroundImage"],
                        svg[style*="linear-gradient"] {
                            background-image: none !important;
                            -webkit-background-clip: unset !important;
                            background-clip: unset !important;
                            -webkit-text-fill-color: #800000 !important;
                            color: #800000 !important;
                        }
                        
                        /* Icon containers with background for visibility */
                        .flex.items-center svg,
                        .flex svg,
                        svg.w-4,
                        svg.w-5,
                        svg.w-6 {
                            flex-shrink: 0 !important;
                            fill: #800000 !important;
                            stroke: #800000 !important;
                            color: #800000 !important;
                            background: rgba(128, 0, 0, 0.1) !important;
                            padding: 4pt !important;
                            border-radius: 4pt !important;
                            display: inline-block !important;
                            visibility: visible !important;
                        }
                        
                        /* Icons in metric cards */
                        .bg-white svg,
                        .bg-white .flex svg {
                            fill: #800000 !important;
                            stroke: #800000 !important;
                            color: #800000 !important;
                            background: rgba(128, 0, 0, 0.08) !important;
                            padding: 6pt !important;
                            border-radius: 6pt !important;
                            width: 20pt !important;
                            height: 20pt !important;
                            display: inline-block !important;
                            visibility: visible !important;
                        }
                        
                        /* Icons in financial summary (white background) */
                        .bg-gradient-to-r svg {
                            fill: white !important;
                            stroke: white !important;
                            color: white !important;
                            background: rgba(255, 255, 255, 0.2) !important;
                            padding: 4pt !important;
                            border-radius: 4pt !important;
                        }
                        
                        /* Hide decorative icons in print if needed */
                        .no-print-icon {
                            display: none !important;
                        }
                        
                        /* Ensure all SVG paths are visible */
                        svg path,
                        svg circle,
                        svg rect,
                        svg polygon,
                        svg line {
                            fill: inherit !important;
                            stroke: inherit !important;
                            stroke-width: 1.5 !important;
                        }
                        
                        /* Better card layout for print */
                        .bg-white {
                            border: 1px solid #e5e7eb !important;
                            padding: 15px !important;
                            break-inside: avoid !important;
                        }
                        
                        /* Chart containers */
                        .bg-gradient-to-br,
                        .bg-gray-50 {
                            background: white !important;
                            border: 1px solid #e5e7eb !important;
                            padding: 15px !important;
                            margin-bottom: 15px !important;
                            page-break-inside: avoid !important;
                        }
                        
                        /* Chart titles */
                        .bg-gradient-to-br h3,
                        .bg-gray-50 h3 {
                            font-size: 12pt !important;
                            font-weight: 600 !important;
                            color: #000 !important;
                            margin-bottom: 10px !important;
                            padding-bottom: 8px !important;
                            border-bottom: 1px solid #e5e7eb !important;
                        }
                        
                        /* ResponsiveContainer - ensure it displays */
                        .recharts-responsive-container {
                            width: 100% !important;
                            height: auto !important;
                            min-height: 250px !important;
                            max-height: 400px !important;
                            display: block !important;
                            visibility: visible !important;
                            position: relative !important;
                        }
                        
                        /* Ensure chart colors are preserved */
                        .recharts-bar-rectangle[fill="#800000"],
                        .recharts-bar-rectangle[fill="#800020"] {
                            fill: #800000 !important;
                            stroke: #000 !important;
                            stroke-width: 1 !important;
                        }
                        
                        .recharts-bar-rectangle[fill="#900000"],
                        .recharts-bar-rectangle[fill="#9c0000"] {
                            fill: #900000 !important;
                            stroke: #000 !important;
                            stroke-width: 1 !important;
                        }
                        
                        /* Pie chart colors */
                        .recharts-pie-sector[fill="#800000"],
                        .recharts-pie-sector[fill="#800020"] {
                            fill: #800000 !important;
                        }
                        
                        .recharts-pie-sector[fill="#900000"],
                        .recharts-pie-sector[fill="#9c0000"] {
                            fill: #900000 !important;
                        }
                        
                        /* Line chart colors */
                        .recharts-line[stroke="#800000"],
                        .recharts-line[stroke="#800020"] {
                            stroke: #800000 !important;
                            stroke-width: 2.5 !important;
                        }
                        
                        /* Area chart colors */
                        .recharts-area[fill="#800000"],
                        .recharts-area[fill="#800020"] {
                            fill: #800000 !important;
                            fill-opacity: 0.6 !important;
                        }
                        
                        /* Ensure chart legends are visible */
                        .recharts-legend-wrapper {
                            display: block !important;
                            visibility: visible !important;
                            margin-top: 15px !important;
                        }
                        
                        .recharts-legend-item-text {
                            color: #000 !important;
                            font-size: 9pt !important;
                            font-weight: 500 !important;
                        }
                        
                        /* Chart legend icons */
                        .recharts-legend-item svg {
                            display: inline-block !important;
                            visibility: visible !important;
                            margin-right: 5px !important;
                        }
                        
                        /* Ensure flex layouts work in print */
                        .flex {
                            display: flex !important;
                        }
                        
                        .flex-col {
                            flex-direction: column !important;
                        }
                        
                        /* Tab content visibility */
                        [role="tabpanel"] {
                            display: block !important;
                        }
                        
                        /* Hide inactive tabs */
                        [role="tab"][aria-selected="false"] {
                            display: none !important;
                        }
                        
                        /* Pie chart labels */
                        .recharts-pie-label-text {
                            font-size: 9pt !important;
                            font-weight: 500 !important;
                            fill: #000 !important;
                        }
                        
                        .recharts-pie-label-line {
                            stroke: #000 !important;
                            stroke-width: 1 !important;
                        }
                        
                        /* Bar chart bars */
                        .recharts-bar-rectangle {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Line chart lines */
                        .recharts-line {
                            stroke-width: 2 !important;
                        }
                        
                        /* Area chart areas */
                        .recharts-area {
                            opacity: 0.6 !important;
                        }
                        
                        /* Table improvements */
                        table {
                            font-size: 10pt !important;
                            border: 1px solid #000 !important;
                        }
                        
                        table thead th {
                            background: #f3f4f6 !important;
                            color: #000 !important;
                            font-weight: bold !important;
                            padding: 10px 8px !important;
                            border: 1px solid #000 !important;
                            text-align: center !important;
                        }
                        
                        table tbody td {
                            padding: 8px !important;
                            border: 1px solid #d1d5db !important;
                            vertical-align: middle !important;
                        }
                        
                        table tbody tr:nth-child(even) {
                            background: #f9fafb !important;
                        }
                        
                        /* List items */
                        ul, ol {
                            margin: 10px 0 !important;
                            padding-left: 25px !important;
                        }
                        
                        li {
                            margin: 5px 0 !important;
                            line-height: 1.5 !important;
                        }
                        
                        /* Spacing improvements */
                        .p-4, .p-6, .p-8 {
                            padding: 15px !important;
                        }
                        
                        .px-4, .px-6, .px-8 {
                            padding-left: 15px !important;
                            padding-right: 15px !important;
                        }
                        
                        .py-4, .py-6, .py-8 {
                            padding-top: 15px !important;
                            padding-bottom: 15px !important;
                        }
                        
                        /* Gap improvements */
                        .gap-2 { gap: 6px !important; }
                        .gap-3 { gap: 9px !important; }
                        .gap-4 { gap: 12px !important; }
                        .gap-6 { gap: 15px !important; }
                        
                        /* Financial summary card text */
                        .bg-gradient-to-r h2 {
                            color: white !important;
                            font-size: 16pt !important;
                            margin-bottom: 15px !important;
                        }
                        
                        .bg-gradient-to-r p {
                            color: white !important;
                            font-size: 11pt !important;
                        }
                        
                        .bg-gradient-to-r .text-2xl,
                        .bg-gradient-to-r .text-3xl {
                            color: white !important;
                            font-weight: bold !important;
                        }
                        
                        /* Ensure all text is readable and elements are visible */
                        * {
                            color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Force visibility for all important elements */
                        main * {
                            visibility: visible !important;
                        }
                        
                        /* Ensure gradients are converted to solid colors for print */
                        [style*="backgroundImage"],
                        [style*="linear-gradient"] {
                            background-image: none !important;
                            -webkit-background-clip: unset !important;
                            background-clip: unset !important;
                        }
                        
                        /* Text with gradient fill - convert to solid */
                        [style*="WebkitTextFillColor"],
                        [style*="-webkit-text-fill-color"] {
                            -webkit-text-fill-color: #800000 !important;
                            color: #800000 !important;
                        }
                        
                        /* Ensure all SVG elements are visible */
                        svg {
                            visibility: visible !important;
                            display: inline-block !important;
                        }
                        
                        svg * {
                            visibility: visible !important;
                        }
                        
                        /* Page break improvements */
                        .print-section,
                        .print-section-content {
                            page-break-inside: avoid !important;
                            orphans: 3 !important;
                            widows: 3 !important;
                        }
                        
                        /* Ensure charts don't break across pages */
                        .recharts-wrapper,
                        .recharts-responsive-container {
                            page-break-inside: avoid !important;
                            page-break-after: auto !important;
                        }
                        
                        /* Pie chart improvements */
                        .recharts-pie {
                            max-width: 100% !important;
                        }
                        
                        .recharts-pie-sector {
                            stroke: white !important;
                            stroke-width: 2 !important;
                        }
                        
                        /* Legend improvements */
                        .recharts-legend-item-text {
                            font-size: 9pt !important;
                            color: #000 !important;
                            margin-left: 5px !important;
                        }
                        
                        /* Ensure chart containers are visible */
                        .recharts-responsive-container {
                            min-height: 200px !important;
                            max-height: 400px !important;
                        }
                        
                        /* Donut chart center text */
                        .recharts-pie-label {
                            font-size: 11pt !important;
                            font-weight: bold !important;
                            fill: #000 !important;
                        }
                        
                        /* Bar chart improvements */
                        .recharts-bar-chart {
                            width: 100% !important;
                        }
                        
                        /* Line chart improvements */
                        .recharts-line-curve {
                            stroke-width: 2.5 !important;
                        }
                        
                        .recharts-dot {
                            r: 4 !important;
                            stroke-width: 2 !important;
                        }
                        
                        /* Area chart improvements */
                        .recharts-area-curve {
                            stroke-width: 2 !important;
                        }
                        
                        /* Composed chart improvements */
                        .recharts-composed {
                            width: 100% !important;
                        }
                        
                        /* Ensure proper spacing around charts */
                        .bg-gradient-to-br > div,
                        .bg-gray-50 > div {
                            margin: 0 !important;
                        }
                        
                        /* Chart wrapper padding */
                        .recharts-wrapper {
                            padding: 10px 0 !important;
                        }
                        
                        /* Number formatting in cards */
                        .bg-white .text-2xl,
                        .bg-white .text-3xl {
                            word-break: keep-all !important;
                            white-space: nowrap !important;
                        }
                        
                        /* Icon and text alignment in flex containers */
                        .flex.items-center {
                            align-items: center !important;
                            gap: 8px !important;
                        }
                        
                        /* Ensure proper display of all content */
                        .hidden {
                            display: none !important;
                        }
                        
                        .print\\:block {
                            display: block !important;
                        }
                        
                        /* Improve readability of small text */
                        .text-xs,
                        .text-sm {
                            line-height: 1.5 !important;
                        }
                        
                        /* Ensure proper contrast */
                        .text-gray-600,
                        .text-gray-500 {
                            color: #666 !important;
                        }
                        
                        .text-gray-900 {
                            color: #000 !important;
                        }
                        
                        /* Remove any transforms that might affect print */
                        * {
                            transform: none !important;
                        }
                        
                        /* Ensure proper width constraints */
                        .max-w-7xl {
                            max-width: 100% !important;
                        }
                        
                        /* Improve list display */
                        .space-y-6 > *,
                        .space-y-8 > * {
                            margin-top: 0 !important;
                            margin-bottom: 15px !important;
                        }
                        
                        .space-y-6 > *:last-child,
                        .space-y-8 > *:last-child {
                            margin-bottom: 0 !important;
                        }
                    }
                `
            }} />
            
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-200 no-print">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Reports & Analytics</h1>
                            <p className="text-gray-600 text-base sm:text-lg">Live analytics and demographics for events, donations, volunteers, and users</p>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#900000] transition-colors duration-200 shadow-md hover:shadow-lg"
                        >
                            <FaPrint className="w-4 h-4" />
                            <span>Print Report</span>
                        </button>
                    </div>
                </div>
                
                {/* Print Header - Only visible when printing */}
                <div className="print-header hidden print:block print-no-break">
                    <h1>Reports & Analytics</h1>
                    <p>Generated: {new Date().toLocaleString()}</p>
                    <p>Manuel S. Enverga University Foundation - Community Relations Department</p>
                </div>
                
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8 print-no-break">
                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 transition-all duration-200 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
                                <p className="text-2xl sm:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{totalEvents}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 transition-all duration-200 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaHandHoldingHeart className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Donations</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{totalDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 transition-all duration-200 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaUsers className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Volunteers</p>
                                <p className="text-2xl sm:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{totalVolunteers.size}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 transition-all duration-200 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaUser className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Users</p>
                                <p className="text-2xl sm:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{totalUsers}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 transition-all duration-200 hover:shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center flex-shrink-0">
                                <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Expenditures</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Financial Summary Card */}
                <div className="bg-gradient-to-r from-[#800000] to-[#900000] rounded-xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 text-white print-no-break">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Financial Summary</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        <div>
                            <p className="text-sm sm:text-base text-white/90 mb-1">Total Donations</p>
                            <p className="text-2xl sm:text-3xl font-bold">₱{totalDonations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="text-sm sm:text-base text-white/90 mb-1">Total Expenditures</p>
                            <p className="text-2xl sm:text-3xl font-bold">₱{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="text-sm sm:text-base text-white/90 mb-1">Net Balance</p>
                            <p className={`text-2xl sm:text-3xl font-bold ${netBalance >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                ₱{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 sm:mb-8 overflow-hidden print-section">
                    <div className="flex flex-wrap border-b border-gray-200 overflow-x-auto no-print">
                        {[
                            { id: 'overview', label: 'Overview', icon: FaChartLine },
                            { id: 'events', label: 'Events', icon: FaCalendarAlt },
                            { id: 'donations', label: 'Donations', icon: FaHandHoldingHeart },
                            { id: 'expenditures', label: 'Expenditures', icon: FaMoneyBillWave },
                            { id: 'volunteers', label: 'Volunteers', icon: FaUsers },
                            { id: 'users', label: 'Users', icon: FaUser },
                            { id: 'donors', label: 'Donor Demographics', icon: FaChartPie }
                        ].map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                                        activeTab === tab.id
                                        ? 'bg-gradient-to-r from-[#800000] to-[#900000] text-white border-b-2 border-[#800000]'
                                        : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4 flex-shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                    
                    {/* Tab Content */}
                    <div className="p-4 sm:p-6 lg:p-8">
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6 sm:space-y-8 print-section-content">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6 print-no-break">
                                    <h2 className="text-xl sm:text-2xl font-bold print-section-title" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Analytics Overview</h2>
                                    <button
                                        onClick={() => navigate('/crd-staff/donations?tab=event-report')}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#900000] transition-colors duration-200 text-sm font-medium"
                                    >
                                        <FaMoneyBillWave className="w-4 h-4" />
                                        View Event Donations Report
                                    </button>
                                </div>
                                
                                {/* Monthly Trends Chart */}
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Monthly Trends ({new Date().getFullYear()})</h3>
                                    <ResponsiveContainer width="100%" height={300} minHeight={300}>
                                        <ComposedChart data={monthlyTrends}>
                                            <defs>
                                                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.maroon} stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor={COLORS.maroon} stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="colorVolunteers" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={COLORS.maroonDark} stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor={COLORS.maroonDark} stopOpacity={0.1}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="month" stroke="#6b7280" />
                                            <YAxis 
                                                yAxisId="left" 
                                                stroke={COLORS.maroon}
                                                label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                                            />
                                            <YAxis 
                                                yAxisId="right" 
                                                orientation="right" 
                                                stroke={COLORS.maroonLight}
                                                label={{ value: 'Amount (₱)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                                            />
                                            <Tooltip 
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                                                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                                                                {payload.map((entry, index) => (
                                                                    <p key={index} className="text-sm" style={{ color: entry.color }}>
                                                                        {entry.name}: {
                                                                            entry.name.includes('Donations') 
                                                                                ? `₱${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                                : entry.value.toLocaleString()
                                                                        }
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        )
                                                    }
                                                    return null
                                                }}
                                            />
                                            <Legend />
                                            <Area 
                                                yAxisId="left"
                                                type="monotone" 
                                                dataKey="events" 
                                                stroke={COLORS.maroon} 
                                                fill="url(#colorEvents)" 
                                                name="Events"
                                                strokeWidth={2}
                                            />
                                            <Area 
                                                yAxisId="left"
                                                type="monotone" 
                                                dataKey="volunteers" 
                                                stroke={COLORS.maroonDark} 
                                                fill="url(#colorVolunteers)" 
                                                name="Volunteers"
                                                strokeWidth={2}
                                            />
                                            <Line 
                                                yAxisId="right"
                                                type="monotone" 
                                                dataKey="donations" 
                                                stroke={COLORS.maroonLight} 
                                                strokeWidth={3} 
                                                name="Donations (₱)"
                                                dot={{ fill: COLORS.maroonLight, r: 4 }}
                                            />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <h4 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Event Status Distribution</h4>
                                        <ResponsiveContainer width="100%" height={220} minHeight={220}>
                                            <PieChart>
                                                <Pie
                                                    data={eventDemographics}
                                                    cx="50%"
                                                    cy="45%"
                                                    labelLine={false}
                                                    outerRadius={65}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {eventDemographics.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value, name, props) => {
                                                        const total = eventDemographics.reduce((sum, e) => sum + e.value, 0)
                                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                                        return [`${value} (${percentage}%)`, props.payload.name]
                                                    }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={50}
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                    formatter={(value, entry) => {
                                                        const total = eventDemographics.reduce((sum, e) => sum + e.value, 0)
                                                        const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0
                                                        return (
                                                            <span style={{ color: '#374151', fontSize: '11px' }}>
                                                                {value}: {percentage}%
                                                            </span>
                                                        )
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <h4 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Donation Methods</h4>
                                        <ResponsiveContainer width="100%" height={220} minHeight={220}>
                                            <PieChart>
                                                <Pie
                                                    data={donationDemographics.counts}
                                                    cx="50%"
                                                    cy="45%"
                                                    labelLine={false}
                                                    outerRadius={65}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {donationDemographics.counts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value, name, props) => {
                                                        const total = donationDemographics.counts.reduce((sum, e) => sum + e.value, 0)
                                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                                        return [`${value} (${percentage}%)`, props.payload.name]
                                                    }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={50}
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                    formatter={(value, entry) => {
                                                        const total = donationDemographics.counts.reduce((sum, e) => sum + e.value, 0)
                                                        const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0
                                                        const displayName = value.charAt(0).toUpperCase() + value.slice(1)
                                                        return (
                                                            <span style={{ color: '#374151', fontSize: '11px' }}>
                                                                {displayName}: {percentage}%
                                                            </span>
                                                        )
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <h4 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">Donor Demographics</h4>
                                        <ResponsiveContainer width="100%" height={220} minHeight={220}>
                                            <PieChart>
                                                <Pie
                                                    data={donorDemographics.counts}
                                                    cx="50%"
                                                    cy="45%"
                                                    labelLine={false}
                                                    outerRadius={65}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {donorDemographics.counts.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value, name, props) => {
                                                        const total = donorDemographics.counts.reduce((sum, e) => sum + e.value, 0)
                                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
                                                        return [`${value} (${percentage}%)`, props.payload.name]
                                                    }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={50}
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                    formatter={(value, entry) => {
                                                        const total = donorDemographics.counts.reduce((sum, e) => sum + e.value, 0)
                                                        const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0
                                                        return (
                                                            <span style={{ color: '#374151', fontSize: '11px' }}>
                                                                {value}: {percentage}%
                                                            </span>
                                                        )
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Expenditures Tab */}
                        {activeTab === 'expenditures' && (
                            <div className="space-y-6 sm:space-y-8">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold print-section-title" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Expenditure Management</h2>
                                    <button
                                        onClick={() => {
                                            resetExpenditureForm()
                                            setShowExpenditureModal(true)
                                        }}
                                        className="inline-flex items-center justify-center bg-gradient-to-r from-[#800000] to-[#900000] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-[#900000] hover:to-[#990000] transition-all duration-200 font-medium shadow-md hover:shadow-lg no-print"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Expenditure
                                    </button>
                                </div>
                                
                                {/* Filters */}
                                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 no-print">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
                                            <select
                                                value={filterStatus}
                                                onChange={(e) => setFilterStatus(e.target.value)}
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                            >
                                                <option value="all">All Status</option>
                                                <option value="pending">Pending</option>
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                                <option value="paid">Paid</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Category</label>
                                            <select
                                                value={filterCategory}
                                                onChange={(e) => setFilterCategory(e.target.value)}
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                            >
                                                <option value="all">All Categories</option>
                                                {expenditureCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Expenditure Summary */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Expenditures</p>
                                        <p className="text-2xl sm:text-3xl font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                            ₱{totalExpenditures.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <p className="text-xs sm:text-sm text-gray-600 mb-1">Pending</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                                            {expenditures.filter(e => e.status === 'pending').length}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <p className="text-xs sm:text-sm text-gray-600 mb-1">Approved</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-green-600">
                                            {expenditures.filter(e => e.status === 'approved' || e.status === 'paid').length}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                        <p className="text-xs sm:text-sm text-gray-600 mb-1">Rejected</p>
                                        <p className="text-2xl sm:text-3xl font-bold text-red-600">
                                            {expenditures.filter(e => e.status === 'rejected').length}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Expenditures by Category */}
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Expenditures by Category</h3>
                                    <ResponsiveContainer width="100%" height={250} minHeight={250}>
                                        <BarChart data={expenditures.reduce((acc, e) => {
                                            const category = e.category || 'other'
                                            const existing = acc.find(item => item.name === category)
                                            if (existing) {
                                                existing.value += parseFloat(e.amount) || 0
                                            } else {
                                                acc.push({ name: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: parseFloat(e.amount) || 0 })
                                            }
                                            return acc
                                        }, [])}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill={COLORS.maroon} radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                {/* Expenditures Table */}
                                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {filteredExpenditures.map((exp) => (
                                                    <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.title || 'Untitled'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{exp.category?.replace(/_/g, ' ') || 'Other'}</td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₱{parseFloat(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{exp.paymentMethod?.replace(/_/g, ' ') || 'Cash'}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                exp.status === 'approved' || exp.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                                exp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {exp.status?.charAt(0).toUpperCase() + exp.status?.slice(1) || 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm no-print">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleExpenditureEdit(exp)}
                                                                    className="text-[#800000] hover:text-[#900000] transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </button>
                                                                {exp.status === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleExpenditureApprove(exp._id)}
                                                                            className="text-green-600 hover:text-green-700 transition-colors"
                                                                            title="Approve"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleExpenditureReject(exp._id)}
                                                                            className="text-red-600 hover:text-red-700 transition-colors"
                                                                            title="Reject"
                                                                        >
                                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                            </svg>
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {exp.status === 'approved' && (
                                                                    <button
                                                                        onClick={() => handleExpenditureMarkAsPaid(exp._id)}
                                                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                                                        title="Mark as Paid"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredExpenditures.length === 0 && (
                                                    <tr>
                                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                            <div className="flex flex-col items-center">
                                                                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                                <p className="text-sm font-medium">No expenditures found</p>
                                                                <p className="text-xs text-gray-400 mt-1">Click "Add Expenditure" to record a new expense</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Events Tab */}
                        {activeTab === 'events' && (
                            <div className="space-y-6 sm:space-y-8">
                                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Event Analytics</h2>
                                
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Events by Status</h3>
                                    <ResponsiveContainer width="100%" height={250} minHeight={250}>
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
                                
                                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Event Statistics</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                        {eventDemographics.map((stat, index) => (
                                            <div key={index} className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                <p className="text-xl sm:text-2xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                                                    {stat.value}
                                                </p>
                                                <p className="text-xs sm:text-sm text-gray-600 mt-1">{stat.name}</p>
                                            </div>
                                        ))}
                    </div>
                </div>
            </div>
                        )}
                        
                        {/* Donations Tab */}
                        {activeTab === 'donations' && (
                            <div className="space-y-6 sm:space-y-8">
                                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Donation Analytics</h2>
                                
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Donation Methods (Amount)</h3>
                                    <ResponsiveContainer width="100%" height={250} minHeight={250}>
                                        <BarChart data={donationDemographics.amounts.filter(d => d.name !== 'in-kind')}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill={COLORS.maroon} radius={[8, 8, 0, 0]}>
                                                {donationDemographics.amounts.filter(d => d.name !== 'in-kind').map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Donation Method Statistics</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {donationDemographics.counts.filter(m => m.name !== 'in-kind').map((method, index) => {
                                            const amountData = donationDemographics.amounts.find(m => m.name === method.name)
                                            return (
                                                <div key={index} className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-center mb-2">
                                                        {method.name === 'wallet' && <FaWallet className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                        {method.name === 'cash' && <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                        {method.name === 'cheque' && <FaCreditCard className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                    </div>
                                                    <p className="text-lg sm:text-xl font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                                        {method.value}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1 capitalize">{method.name}</p>
                                                    {amountData && (
                                                        <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1">
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
                            <div className="space-y-6 sm:space-y-8">
                                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Volunteer Analytics</h2>
                                
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Volunteers by Category</h3>
                                    <ResponsiveContainer width="100%" height={250} minHeight={250}>
                                        <BarChart data={volunteerDemographics}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill={COLORS.maroon} radius={[8, 8, 0, 0]}>
                                                {volunteerDemographics.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Volunteer Statistics</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {volunteerDemographics.map((stat, index) => (
                                            <div key={index} className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                <div className="flex items-center justify-center mb-2">
                                                    {stat.name === 'Student' && <FaUserGraduate className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                    {stat.name === 'Alumni' && <FaUniversity className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                    {stat.name === 'Faculty' && <FaUserTie className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                    {stat.name === 'Staff' && <FaBriefcase className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                    {stat.name === 'Guest' && <FaUser className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                </div>
                                                <p className="text-xl sm:text-2xl font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                                    {stat.value}
                                                </p>
                                                <p className="text-xs sm:text-sm text-gray-600 mt-1">{stat.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div className="space-y-6 sm:space-y-8">
                                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>User Demographics</h2>
                                
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Users by Category</h3>
                                    <ResponsiveContainer width="100%" height={300} minHeight={300}>
                                        <BarChart data={userDemographics.filter(u => u.name !== 'CRD Staff' && u.name !== 'System Administrator')} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" stroke="#6b7280" />
                                            <YAxis dataKey="name" type="category" stroke="#6b7280" width={100} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill={COLORS.maroon} radius={[0, 8, 8, 0]}>
                                                {userDemographics.filter(u => u.name !== 'CRD Staff' && u.name !== 'System Administrator').map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                
                                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">User Statistics</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                                        {userDemographics.filter(u => u.name !== 'CRD Staff' && u.name !== 'System Administrator').map((stat, index) => (
                                            <div key={index} className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                <p className="text-xl sm:text-2xl font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
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
                            <div className="space-y-6 sm:space-y-8">
                                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Donor Demographics</h2>
                                
                                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Donation Amount by Category</h3>
                                    <ResponsiveContainer width="100%" height={250} minHeight={250}>
                                        <BarChart data={donorDemographics.amounts}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="value" fill={COLORS.maroon} radius={[8, 8, 0, 0]}>
                                                {donorDemographics.amounts.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-md">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Donor Statistics</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                                        {donorDemographics.counts.map((stat, index) => {
                                            const amountData = donorDemographics.amounts.find(d => d.name === stat.name)
                                            return (
                                                <div key={index} className="text-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                                                    <div className="flex items-center justify-center mb-2">
                                                        {stat.name === 'Student' && <FaUserGraduate className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                        {stat.name === 'Alumni' && <FaUniversity className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                        {stat.name === 'Faculty' && <FaUserTie className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                        {stat.name === 'Staff' && <FaBriefcase className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                        {stat.name === 'Guest' && <FaUser className="w-5 h-5 sm:w-6 sm:h-6" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} />}
                                                    </div>
                                                    <p className="text-lg sm:text-xl font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                                        {stat.value}
                                                    </p>
                                                    <p className="text-xs text-gray-600 mt-1">{stat.name} Donors</p>
                                                    {amountData && (
                                                        <p className="text-xs sm:text-sm font-semibold text-gray-900 mt-1">
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

            {/* Expenditure Add/Edit Modal */}
            {showExpenditureModal && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-40 backdrop-blur-lg flex items-center justify-center z-[9999] p-4" onClick={() => {
                    setShowExpenditureModal(false)
                    resetExpenditureForm()
                }}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-[10000]" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {editingExpenditure ? 'Edit Expenditure' : 'Add New Expenditure'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowExpenditureModal(false)
                                        resetExpenditureForm()
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleExpenditureSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={expenditureFormData.title}
                                        onChange={handleExpenditureInputChange}
                                        required
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <textarea
                                        name="description"
                                        value={expenditureFormData.description}
                                        onChange={handleExpenditureInputChange}
                                        rows="3"
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₱) *</label>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={expenditureFormData.amount}
                                            onChange={handleExpenditureInputChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                                        <select
                                            name="category"
                                            value={expenditureFormData.category}
                                            onChange={handleExpenditureInputChange}
                                            required
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        >
                                            {expenditureCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                                        <select
                                            name="paymentMethod"
                                            value={expenditureFormData.paymentMethod}
                                            onChange={handleExpenditureInputChange}
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        >
                                            {paymentMethods.map(method => (
                                                <option key={method} value={method}>{method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Date *</label>
                                        <input
                                            type="date"
                                            name="expenseDate"
                                            value={expenditureFormData.expenseDate}
                                            onChange={handleExpenditureInputChange}
                                            required
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Number</label>
                                        <input
                                            type="text"
                                            name="receiptNumber"
                                            value={expenditureFormData.receiptNumber}
                                            onChange={handleExpenditureInputChange}
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt URL</label>
                                        <input
                                            type="url"
                                            name="receiptUrl"
                                            value={expenditureFormData.receiptUrl}
                                            onChange={handleExpenditureInputChange}
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                    <textarea
                                        name="notes"
                                        value={expenditureFormData.notes}
                                        onChange={handleExpenditureInputChange}
                                        rows="2"
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowExpenditureModal(false)
                                            resetExpenditureForm()
                                        }}
                                        className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-lg hover:from-[#900000] hover:to-[#990000] transition-all duration-200 font-medium shadow-md"
                                    >
                                        {editingExpenditure ? 'Update' : 'Create'} Expenditure
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default Reports
