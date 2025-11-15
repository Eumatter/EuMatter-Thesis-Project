import React, { useEffect, useState, useContext } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { 
    FaHandHoldingHeart, 
    FaFilter, 
    FaSearch, 
    FaCheckCircle, 
    FaClock, 
    FaTimesCircle,
    FaMoneyBillWave,
    FaBoxOpen,
    FaCreditCard,
    FaWallet,
    FaCalendarAlt,
    FaInfoCircle,
    FaFilePdf,
    FaArrowLeft,
    FaCheck
} from 'react-icons/fa'

const DonationHistory = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [activeTab, setActiveTab] = useState('history') // 'history', 'donate', 'inkind'
    const [donations, setDonations] = useState([])
    const [filteredDonations, setFilteredDonations] = useState([])
    const [loading, setLoading] = useState(true)
    const [donating, setDonating] = useState(false)
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
    const [dateFilter, setDateFilter] = useState('all')
    const [showFilters, setShowFilters] = useState(false)
    
    // Donation form
    const [donationForm, setDonationForm] = useState({
        amount: '',
        message: '',
        paymentMethod: 'gcash',
        eventId: null,
        recipientType: 'crd', // 'crd', 'department', 'event'
        departmentId: null
    })
    const [departments, setDepartments] = useState([])
    const [inKindDonations, setInKindDonations] = useState([])
    const [inKindForm, setInKindForm] = useState({
        donationType: 'food',
        itemDescription: '',
        quantity: '',
        estimatedValue: '',
        condition: 'good',
        message: '',
        eventId: null,
        deliveryMethod: 'pending',
        preferredDate: '',
        preferredTime: '',
        address: '',
        notes: '',
        donorPhone: ''
    })
    const [submittingInKind, setSubmittingInKind] = useState(false)
    const [events, setEvents] = useState([])

    useEffect(() => {
        fetchDonations()
        fetchEvents()
        fetchInKindDonations()
        fetchDepartments()
    }, [backendUrl])

    const fetchDepartments = async () => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/users/departments`)
            if (data.success) {
                setDepartments(data.departments || [])
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err)
            // Fallback: departments will be empty, user can still donate to CRD or events
        }
    }

    useEffect(() => {
        filterDonations()
    }, [donations, searchTerm, statusFilter, paymentMethodFilter, dateFilter])

    const fetchDonations = async () => {
            try {
            setLoading(true)
                axios.defaults.withCredentials = true
                const { data } = await axios.get(`${backendUrl}api/donations/me`)
            if (data.success) {
                setDonations(data.donations || [])
            }
            } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load donations')
            } finally {
                setLoading(false)
            }
        }

    const fetchEvents = async () => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/events`)
            if (data && Array.isArray(data)) {
                // Filter only events open for donations
                const openEvents = data.filter(e => e.isOpenForDonation && new Date(e.endDate) > new Date())
                setEvents(openEvents)
            }
        } catch (err) {
            console.error('Failed to fetch events:', err)
        }
    }

    const fetchInKindDonations = async () => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/in-kind-donations/me`)
            if (data.success) {
                setInKindDonations(data.donations || [])
            }
        } catch (err) {
            console.error('Failed to fetch in-kind donations:', err)
        }
    }

    const handleInKindSubmit = async (e) => {
        e.preventDefault()
        
        if (!inKindForm.itemDescription || inKindForm.itemDescription.trim() === '') {
            toast.error('Please provide a description of the items you wish to donate')
            return
        }

        setSubmittingInKind(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(`${backendUrl}api/in-kind-donations`, {
                donorName: userData?.name || '',
                donorEmail: userData?.email || '',
                donorPhone: inKindForm.donorPhone || '',
                donationType: inKindForm.donationType,
                itemDescription: inKindForm.itemDescription,
                quantity: inKindForm.quantity || '',
                estimatedValue: inKindForm.estimatedValue ? parseFloat(inKindForm.estimatedValue) : 0,
                condition: inKindForm.condition,
                message: inKindForm.message || '',
                eventId: inKindForm.eventId || null,
                deliveryMethod: inKindForm.deliveryMethod,
                preferredDate: inKindForm.preferredDate || null,
                preferredTime: inKindForm.preferredTime || '',
                address: inKindForm.address || '',
                notes: inKindForm.notes || ''
            })

            if (data.success) {
                toast.success(data.message || 'In-kind donation request submitted successfully!')
                setInKindForm({
                    donationType: 'food',
                    itemDescription: '',
                    quantity: '',
                    estimatedValue: '',
                    condition: 'good',
                    message: '',
                    eventId: null,
                    deliveryMethod: 'pending',
                    preferredDate: '',
                    preferredTime: '',
                    address: '',
                    notes: '',
                    donorPhone: ''
                })
                fetchInKindDonations()
                setActiveTab('history')
            } else {
                throw new Error(data.message || 'Failed to submit in-kind donation')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to submit in-kind donation request')
        } finally {
            setSubmittingInKind(false)
        }
    }

    const getInKindStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            under_review: 'bg-blue-100 text-blue-800 border-blue-200',
            approved: 'bg-green-100 text-green-800 border-green-200',
            scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
            received: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            completed: 'bg-green-100 text-green-800 border-green-200',
            rejected: 'bg-red-100 text-red-800 border-red-200',
            cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
        }
        return colors[status] || colors.pending
    }

    const getDonationTypeLabel = (type) => {
        const labels = {
            food: 'Food & Beverages',
            clothing: 'Clothing & Textiles',
            school_supplies: 'School Supplies & Books',
            medical_supplies: 'Medical Supplies',
            equipment: 'Equipment & Tools',
            services: 'Services & Expertise',
            other: 'Other'
        }
        return labels[type] || type
    }

    const filterDonations = () => {
        // Filter out pending donations - only show successful/completed donations
        // Include cash donations in all statuses (they have their own workflow)
        let filtered = donations.filter(d => {
            // Show all cash donations regardless of status
            if (d.paymentMethod === 'cash') return true
            // For other payment methods, exclude pending
            return d.status !== 'pending'
        })

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(d => 
                d.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d._id?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => d.status === statusFilter)
        }

        // Donation method filter
        if (paymentMethodFilter !== 'all') {
            filtered = filtered.filter(d => d.paymentMethod === paymentMethodFilter)
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date()
            const filterDate = new Date()
            
            switch (dateFilter) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0)
                    filtered = filtered.filter(d => new Date(d.createdAt) >= filterDate)
                    break
                case 'week':
                    filterDate.setDate(now.getDate() - 7)
                    filtered = filtered.filter(d => new Date(d.createdAt) >= filterDate)
                    break
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1)
                    filtered = filtered.filter(d => new Date(d.createdAt) >= filterDate)
                    break
                case 'year':
                    filterDate.setFullYear(now.getFullYear() - 1)
                    filtered = filtered.filter(d => new Date(d.createdAt) >= filterDate)
                    break
                default:
                    break
            }
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        setFilteredDonations(filtered)
    }


    const handleDonate = async (e) => {
        e.preventDefault()
        
        if (!donationForm.amount || parseFloat(donationForm.amount) <= 0) {
            toast.error('Please enter a valid donation amount')
            return
        }

        setDonating(true)
        try {
            axios.defaults.withCredentials = true
            // Determine recipient type
            let recipientType = 'crd'
            let departmentId = null
            let eventId = null

            if (donationForm.eventId) {
                recipientType = 'event'
                eventId = donationForm.eventId
            } else if (donationForm.recipientType === 'department' && donationForm.departmentId) {
                recipientType = 'department'
                departmentId = donationForm.departmentId
            } else {
                recipientType = 'crd'
            }

            const { data } = await axios.post(`${backendUrl}api/donations`, {
                donorName: userData?.name || '',
                donorEmail: userData?.email || '',
                amount: donationForm.amount,
                message: donationForm.message || '',
                paymentMethod: donationForm.paymentMethod,
                eventId: eventId,
                recipientType: recipientType,
                departmentId: departmentId
            })

            if (!data.success) {
                throw new Error(data.message || 'Failed to create donation')
            }

            if (data.type === 'source' || data.type === 'intent') {
                window.location.href = data.checkoutUrl
                return
            }

            if (data.type === 'cash') {
                toast.success(data.message || 'Cash donation submitted successfully. It will be verified by the recipient.')
            } else {
                toast.success('Donation created successfully')
            }

            setDonationForm({ 
                amount: '', 
                message: '', 
                paymentMethod: 'gcash', 
                eventId: null,
                recipientType: 'crd',
                departmentId: null
            })
            fetchDonations()
            setActiveTab('history')
        } catch (err) {
            // Extract error message from various possible locations
            let errorMessage = 'Failed to process donation. Please check your connection and try again.';
            
            if (err?.response?.data) {
                // Check for error message in response
                errorMessage = err.response.data.message || 
                              err.response.data.error?.message || 
                              err.response.data.error ||
                              errorMessage;
                
                // If it's a 500 error, provide more context
                if (err.response.status === 500) {
                    console.error('❌ Server Error (500):', {
                        message: err.response.data.message,
                        error: err.response.data.error,
                        fullResponse: err.response.data
                    });
                    
                    // Check for specific error types
                    if (err.response.data.error?.includes('PAYMONGO_SECRET_KEY')) {
                        errorMessage = 'Payment service is not configured. Please contact support.';
                    } else if (err.response.data.message?.includes('configuration')) {
                        errorMessage = err.response.data.message;
                    }
                }
            } else if (err?.message) {
                errorMessage = err.message;
            }
            
            console.error('Donation error:', {
                message: errorMessage,
                status: err?.response?.status,
                response: err?.response?.data,
                error: err
            });
            
            toast.error(errorMessage);
        } finally {
            setDonating(false)
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'succeeded':
            case 'cash_completed':
                return <FaCheckCircle className="text-green-500" />
            case 'pending':
            case 'cash_pending_verification':
                return <FaClock className="text-yellow-500" />
            case 'cash_verified':
                return <FaCheckCircle className="text-blue-500" />
            case 'failed':
            case 'canceled':
                return <FaTimesCircle className="text-red-500" />
            default:
                return <FaClock className="text-gray-500" />
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'succeeded':
            case 'cash_completed':
                return 'bg-green-100 text-green-800 border-green-200'
            case 'pending':
            case 'cash_pending_verification':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200'
            case 'cash_verified':
                return 'bg-blue-100 text-blue-800 border-blue-200'
            case 'failed':
            case 'canceled':
                return 'bg-red-100 text-red-800 border-red-200'
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200'
        }
    }

    const getPaymentMethodIcon = (method) => {
        switch (method) {
            case 'gcash':
                return <FaWallet className="text-green-600" />
            case 'paymaya':
                return <FaCreditCard className="text-blue-600" />
            case 'card':
                return <FaCreditCard className="text-purple-600" />
            case 'bank':
                return <FaMoneyBillWave className="text-indigo-600" />
            default:
                return <FaMoneyBillWave className="text-gray-600" />
        }
    }

    const getPaymentMethodLabel = (method) => {
        const labels = {
            gcash: 'GCash',
            paymaya: 'PayMaya',
            card: 'Debit/Credit Card',
            bank: 'Bank Transfer',
            cash: 'Cash'
        }
        return labels[method] || method
    }
    
    const getRecipientLabel = (donation) => {
        if (donation.recipientType === 'event' && donation.event) {
            return `Event: ${donation.event.title}`
        }
        if (donation.recipientType === 'department' && donation.department) {
            return `Department: ${donation.department.name}`
        }
        return 'CRD'
    }

    const formatDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount)
    }

    const totalDonated = donations
        .filter(d => d.status === 'succeeded' || d.status === 'cash_completed')
        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)

    // Only count non-pending donations in stats
    const nonPendingDonations = donations.filter(d => d.status !== 'pending' && d.status !== 'cash_pending_verification')
    const stats = {
        total: nonPendingDonations.length,
        succeeded: nonPendingDonations.filter(d => d.status === 'succeeded' || d.status === 'cash_completed').length,
        pending: 0, // Don't show pending count
        failed: nonPendingDonations.filter(d => d.status === 'failed' || d.status === 'canceled').length
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Header />
            
            <main className="pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="flex items-center space-x-2 text-gray-600 hover:text-[#800000] transition-colors mb-4 lg:hidden"
                    >
                        <FaArrowLeft className="text-sm" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                My Donations
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Manage your donations and view donation history
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2">
                                <div className="text-xs text-gray-500">Total Donated</div>
                                <div className="text-lg font-bold text-[#800000]">{formatCurrency(totalDonated)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Total</div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Succeeded</div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.succeeded}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Failed/Canceled</div>
                        <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.failed}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8 overflow-hidden">
                    <div className="border-b border-gray-200">
                        <div 
                            className="flex flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible gap-1 sm:gap-0 -mx-4 px-2 sm:mx-0 sm:px-0 scrollbar-hide"
                            style={{ 
                                WebkitOverflowScrolling: 'touch',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}
                        >
                        <button
                            onClick={() => setActiveTab('history')}
                            title="My Donations"
                            className={`flex-1 sm:flex-1 min-w-[60px] sm:min-w-0 px-2 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-medium transition-all duration-200 rounded-lg sm:rounded-none touch-manipulation whitespace-nowrap min-h-[50px] sm:min-h-[44px] relative ${
                                activeTab === 'history'
                                    ? 'text-[#800000] border-b-2 sm:border-b-2 border-[#800000] bg-red-50 sm:bg-transparent shadow-sm sm:shadow-none'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50 active:bg-gray-100'
                            }`}
                        >
                            <div className="flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-2">
                                <FaHandHoldingHeart className="text-xl sm:text-base md:text-lg flex-shrink-0" />
                                <span className="hidden sm:inline truncate text-xs md:text-sm">My Donations</span>
                            </div>
                            {/* Active indicator for mobile */}
                            {activeTab === 'history' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:hidden bg-[#800000]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('donate')}
                            title="Make a Donation"
                            className={`flex-1 sm:flex-1 min-w-[60px] sm:min-w-0 px-2 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-medium transition-all duration-200 rounded-lg sm:rounded-none touch-manipulation whitespace-nowrap min-h-[50px] sm:min-h-[44px] relative ${
                                activeTab === 'donate'
                                    ? 'text-[#800000] border-b-2 sm:border-b-2 border-[#800000] bg-red-50 sm:bg-transparent shadow-sm sm:shadow-none'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50 active:bg-gray-100'
                            }`}
                        >
                            <div className="flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-2">
                                <FaMoneyBillWave className="text-xl sm:text-base md:text-lg flex-shrink-0" />
                                <span className="hidden sm:inline truncate text-xs md:text-sm">Make a Donation</span>
                            </div>
                            {/* Active indicator for mobile */}
                            {activeTab === 'donate' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:hidden bg-[#800000]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('inkind')}
                            title="In-Kind Donation"
                            className={`flex-1 sm:flex-1 min-w-[60px] sm:min-w-0 px-2 sm:px-4 md:px-6 py-3 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-medium transition-all duration-200 rounded-lg sm:rounded-none touch-manipulation whitespace-nowrap min-h-[50px] sm:min-h-[44px] relative ${
                                activeTab === 'inkind'
                                    ? 'text-[#800000] border-b-2 sm:border-b-2 border-[#800000] bg-red-50 sm:bg-transparent shadow-sm sm:shadow-none'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50 active:bg-gray-100'
                            }`}
                        >
                            <div className="flex flex-col items-center justify-center gap-0.5 sm:flex-row sm:gap-2">
                                <FaBoxOpen className="text-xl sm:text-base md:text-lg flex-shrink-0" />
                                <span className="hidden sm:inline truncate text-xs md:text-sm">In-Kind Donation</span>
                            </div>
                            {/* Active indicator for mobile */}
                            {activeTab === 'inkind' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 sm:hidden bg-[#800000]"></div>
                            )}
                        </button>
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6 lg:p-8">
                        {/* Donation History Tab */}
                        {activeTab === 'history' && (
                        <div>
                                {/* Filters */}
                                <div className="mb-6 space-y-4">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search donations..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                        />
                                    </div>

                                    {/* Filter Toggles */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={() => setShowFilters(!showFilters)}
                                            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                        >
                                            <FaFilter />
                                            <span className="text-sm font-medium">Filters</span>
                                        </button>
                                        
                                        {showFilters && (
                                            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm"
                                                >
                                                    <option value="all">All Status</option>
                                                    <option value="succeeded">Succeeded</option>
                                                    <option value="cash_pending_verification">Cash - Pending Verification</option>
                                                    <option value="cash_verified">Cash - Verified</option>
                                                    <option value="cash_completed">Cash - Completed</option>
                                                    <option value="failed">Failed</option>
                                                    <option value="canceled">Canceled</option>
                                                </select>
                                                
                                                <select
                                                    value={paymentMethodFilter}
                                                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm"
                                                >
                                                    <option value="all">All Methods</option>
                                                    <option value="gcash">GCash</option>
                                                    <option value="paymaya">PayMaya</option>
                                                    <option value="card">Card</option>
                                                    <option value="bank">Bank</option>
                                                    <option value="cash">Cash</option>
                                                </select>
                                                
                                                <select
                                                    value={dateFilter}
                                                    onChange={(e) => setDateFilter(e.target.value)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm"
                                                >
                                                    <option value="all">All Time</option>
                                                    <option value="today">Today</option>
                                                    <option value="week">Last 7 Days</option>
                                                    <option value="month">Last Month</option>
                                                    <option value="year">Last Year</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Donations List */}
                                {loading ? (
                                    <div className="py-12">
                                        <LoadingSpinner size="medium" text="Loading donations..." />
                                    </div>
                                ) : filteredDonations.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaHandHoldingHeart className="text-6xl text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No donations found</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            {donations.length === 0 
                                                ? 'You haven\'t made any donations yet' 
                                                : 'Try adjusting your filters'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Desktop Table View */}
                                        <div className="hidden lg:block overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donation Method</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Recipient</th>
                                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {filteredDonations.map((donation) => (
                                                        <tr key={donation._id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {formatDate(donation.createdAt)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                                {formatCurrency(donation.amount)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center space-x-2">
                                                                    {getPaymentMethodIcon(donation.paymentMethod)}
                                                                    <span className="text-sm text-gray-900">
                                                                        {getPaymentMethodLabel(donation.paymentMethod)}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                    {getStatusIcon(donation.status)}
                                                                    <span className="ml-2 capitalize">{donation.status}</span>
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                                {donation.message || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                                {getRecipientLabel(donation)}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                {(donation.status === 'succeeded' || donation.status === 'cash_completed') && (
                                                                    <span className="text-green-600 text-xs font-medium">
                                                                        ✓ Receipt sent to email
                                                                    </span>
                                                                )}
                                                                {donation.status === 'cash_pending_verification' && (
                                                                    <span className="text-yellow-600 text-xs font-medium">
                                                                        ⏳ Pending verification
                                                                    </span>
                                                                )}
                                                                {donation.status === 'cash_verified' && (
                                                                    <span className="text-blue-600 text-xs font-medium">
                                                                        ✓ Verified
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile/Tablet Card View */}
                                        <div className="lg:hidden space-y-4">
                                            {filteredDonations.map((donation) => (
                                                <div key={donation._id} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                {getStatusIcon(donation.status)}
                                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                    {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                                                                </span>
                                                            </div>
                                                            <div className="text-2xl font-bold text-gray-900 mb-1">
                                                                {formatCurrency(donation.amount)}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                {formatDate(donation.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
                                                        {getPaymentMethodIcon(donation.paymentMethod)}
                                                        <span>{getPaymentMethodLabel(donation.paymentMethod)}</span>
                                                    </div>
                                                    
                                                    <div className="text-xs text-gray-500 mb-2">
                                                        Recipient: {getRecipientLabel(donation)}
                                                    </div>
                                                    
                                                    {donation.message && (
                                                        <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded-lg">
                                                            {donation.message}
                        </div>
                                                    )}
                                                    
                                                    {(donation.status === 'succeeded' || donation.status === 'cash_completed') && (
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 text-green-700">
                                                                <FaCheckCircle />
                                                                <span className="text-sm font-medium">Receipt sent to your email</span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mt-2">
                                                                Your official acknowledgment receipt has been sent to <strong>{donation.donorEmail}</strong>. Please check your email inbox.
                                                            </p>
                                                        </div>
                                                    )}
                                                    
                                                    {donation.status === 'cash_pending_verification' && (
                                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 text-yellow-700">
                                                                <FaClock />
                                                                <span className="text-sm font-medium">Pending Verification</span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mt-2">
                                                                Your cash donation is pending verification by the recipient. You will be notified once it's verified.
                                                            </p>
                                                        </div>
                                                    )}
                                                    
                                                    {donation.status === 'cash_verified' && (
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 text-blue-700">
                                                                <FaCheckCircle />
                                                                <span className="text-sm font-medium">Verified</span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mt-2">
                                                                Your cash donation has been verified. Receipt: <strong>{donation.cashVerification?.receiptNumber || 'N/A'}</strong>
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Make a Donation Tab */}
                        {activeTab === 'donate' && (
                            <div className="max-w-2xl mx-auto">
                                <div className="bg-gradient-to-r from-[#800000] to-[#9c0000] rounded-xl p-6 sm:p-8 text-white mb-6">
                                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">Make a Donation</h2>
                                    <p className="text-red-100">
                                        Your contribution helps us make a difference in the community
                                    </p>
                                </div>

                                <form onSubmit={handleDonate} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Donation Amount (PHP)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={donationForm.amount}
                                            onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                                            placeholder="Enter amount"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-lg"
                                            required
                                        />
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {[100, 500, 1000, 5000].map((amount) => (
                                                <button
                                                    key={amount}
                                                    type="button"
                                                    onClick={() => setDonationForm({ ...donationForm, amount: amount.toString() })}
                                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    ₱{amount}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Donate To <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={donationForm.recipientType}
                                            onChange={(e) => {
                                                const newRecipientType = e.target.value
                                                setDonationForm({ 
                                                    ...donationForm, 
                                                    recipientType: newRecipientType,
                                                    eventId: newRecipientType === 'event' ? donationForm.eventId : null,
                                                    departmentId: newRecipientType === 'department' ? donationForm.departmentId : null
                                                })
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                        >
                                            <option value="crd">CRD (Community Relations Department)</option>
                                            <option value="department">Department/Organization</option>
                                            <option value="event">Specific Event</option>
                                        </select>
                                    </div>

                                    {donationForm.recipientType === 'department' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Department <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={donationForm.departmentId || ''}
                                                onChange={(e) => setDonationForm({ ...donationForm, departmentId: e.target.value || null })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                                required={donationForm.recipientType === 'department'}
                                            >
                                                <option value="">Select a department...</option>
                                                {departments.map((dept) => (
                                                    <option key={dept._id} value={dept._id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-gray-500">
                                                Your donation will go directly to this department. CRD will be notified for transparency.
                                            </p>
                                        </div>
                                    )}

                                    {donationForm.recipientType === 'event' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Select Event <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={donationForm.eventId || ''}
                                                onChange={(e) => setDonationForm({ ...donationForm, eventId: e.target.value || null })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                                required={donationForm.recipientType === 'event'}
                                            >
                                                <option value="">Select an event...</option>
                                                {events.map((event) => (
                                                    <option key={event._id} value={event._id}>
                                                        {event.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Donation Method
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                            {[
                                                { value: 'gcash', label: 'GCash', icon: <FaWallet /> },
                                                { value: 'paymaya', label: 'PayMaya', icon: <FaCreditCard /> },
                                                { value: 'card', label: 'Card', icon: <FaCreditCard /> },
                                                { value: 'bank', label: 'Bank', icon: <FaMoneyBillWave /> },
                                                { value: 'cash', label: 'Cash', icon: <FaMoneyBillWave /> }
                                            ].map((method) => (
                                                <button
                                                    key={method.value}
                                                    type="button"
                                                    onClick={() => setDonationForm({ ...donationForm, paymentMethod: method.value })}
                                                    className={`p-4 border-2 rounded-lg transition-all ${
                                                        donationForm.paymentMethod === method.value
                                                            ? 'border-[#800000] bg-red-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <div className="text-2xl mb-2 text-gray-600">{method.icon}</div>
                                                    <div className="text-sm font-medium text-gray-700">{method.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                        {donationForm.paymentMethod === 'cash' && (
                                            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                                <div className="flex items-start">
                                                    <FaInfoCircle className="text-yellow-600 text-lg mr-3 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <h4 className="font-semibold text-yellow-900 mb-1">Cash Donation Process</h4>
                                                        <p className="text-sm text-yellow-800">
                                                            Your cash donation will be submitted for verification. The recipient (CRD or Department) will verify the cash receipt and update the status. You will be notified once verified.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Message (Optional)
                                        </label>
                                        <textarea
                                            value={donationForm.message}
                                            onChange={(e) => setDonationForm({ ...donationForm, message: e.target.value })}
                                            placeholder="Leave a message with your donation..."
                                            rows="4"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={donating}
                                        className="w-full bg-[#800000] text-white py-3 sm:py-4 rounded-lg font-semibold text-lg hover:bg-[#9c0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                    >
                                        {donating ? (
                                            <>
                                                <LoadingSpinner size="tiny" inline />
                                                <span>Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaHandHoldingHeart />
                                                <span>Donate Now</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* In-Kind Donation Tab */}
                        {activeTab === 'inkind' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                {/* Header */}
                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 sm:p-8 text-white">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <FaBoxOpen className="text-3xl" />
                                        <h2 className="text-2xl sm:text-3xl font-bold">In-Kind Donation</h2>
                                    </div>
                                    <p className="text-indigo-100">
                                        Submit a request to donate physical items, goods, or services. Our CRD staff will review and coordinate with you.
                                    </p>
                                </div>

                                {/* Info Banner */}
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                                    <div className="flex items-start">
                                        <FaInfoCircle className="text-blue-500 text-xl mr-3 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h3 className="font-semibold text-blue-900 mb-1">How It Works</h3>
                                            <p className="text-sm text-blue-800">
                                                Fill out the form below with details about your donation. Our CRD staff will review your request and contact you to coordinate pickup/delivery.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submission Form */}
                                <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8">
                                    <h3 className="text-xl font-bold text-gray-900 mb-6">Submit In-Kind Donation Request</h3>
                                    <form onSubmit={handleInKindSubmit} className="space-y-6">
                                        {/* Donation Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Donation Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={inKindForm.donationType}
                                                onChange={(e) => setInKindForm({ ...inKindForm, donationType: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                required
                                            >
                                                <option value="food">Food & Beverages</option>
                                                <option value="clothing">Clothing & Textiles</option>
                                                <option value="school_supplies">School Supplies & Books</option>
                                                <option value="medical_supplies">Medical Supplies</option>
                                                <option value="equipment">Equipment & Tools</option>
                                                <option value="services">Services & Expertise</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        {/* Item Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Item Description <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={inKindForm.itemDescription}
                                                onChange={(e) => setInKindForm({ ...inKindForm, itemDescription: e.target.value })}
                                                placeholder="Describe the items you wish to donate in detail..."
                                                rows="4"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        {/* Quantity and Condition */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Quantity
                                                </label>
                                                <input
                                                    type="text"
                                                    value={inKindForm.quantity}
                                                    onChange={(e) => setInKindForm({ ...inKindForm, quantity: e.target.value })}
                                                    placeholder="e.g., 10 boxes, 50 pieces"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Condition
                                                </label>
                                                <select
                                                    value={inKindForm.condition}
                                                    onChange={(e) => setInKindForm({ ...inKindForm, condition: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                >
                                                    <option value="new">New</option>
                                                    <option value="like_new">Like New</option>
                                                    <option value="good">Good</option>
                                                    <option value="fair">Fair</option>
                                                    <option value="poor">Poor</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Estimated Value and Event */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Estimated Value (PHP)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={inKindForm.estimatedValue}
                                                    onChange={(e) => setInKindForm({ ...inKindForm, estimatedValue: e.target.value })}
                                                    placeholder="Optional"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Related Event (Optional)
                                                </label>
                                                <select
                                                    value={inKindForm.eventId || ''}
                                                    onChange={(e) => setInKindForm({ ...inKindForm, eventId: e.target.value || null })}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                >
                                                    <option value="">General Donation</option>
                                                    {events.map((event) => (
                                                        <option key={event._id} value={event._id}>
                                                            {event.title}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Contact Information */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone Number
                                            </label>
                                            <input
                                                type="tel"
                                                value={inKindForm.donorPhone}
                                                onChange={(e) => setInKindForm({ ...inKindForm, donorPhone: e.target.value })}
                                                placeholder="Your contact number"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Delivery Method */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Delivery Method
                                            </label>
                                            <select
                                                value={inKindForm.deliveryMethod}
                                                onChange={(e) => setInKindForm({ ...inKindForm, deliveryMethod: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                <option value="pending">To be discussed</option>
                                                <option value="drop_off">I will drop off</option>
                                                <option value="pickup">Please pick up</option>
                                                <option value="delivery">I will arrange delivery</option>
                                            </select>
                                        </div>

                                        {/* Preferred Date and Time */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Preferred Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={inKindForm.preferredDate}
                                                    onChange={(e) => setInKindForm({ ...inKindForm, preferredDate: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Preferred Time
                                                </label>
                                                <input
                                                    type="text"
                                                    value={inKindForm.preferredTime}
                                                    onChange={(e) => setInKindForm({ ...inKindForm, preferredTime: e.target.value })}
                                                    placeholder="e.g., 9:00 AM - 5:00 PM"
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Address (if pickup/delivery needed)
                                            </label>
                                            <textarea
                                                value={inKindForm.address}
                                                onChange={(e) => setInKindForm({ ...inKindForm, address: e.target.value })}
                                                placeholder="Enter your address..."
                                                rows="2"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Additional Notes */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Additional Notes
                                            </label>
                                            <textarea
                                                value={inKindForm.notes}
                                                onChange={(e) => setInKindForm({ ...inKindForm, notes: e.target.value })}
                                                placeholder="Any additional information or special instructions..."
                                                rows="3"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Message (Optional)
                                            </label>
                                            <textarea
                                                value={inKindForm.message}
                                                onChange={(e) => setInKindForm({ ...inKindForm, message: e.target.value })}
                                                placeholder="Leave a message with your donation..."
                                                rows="3"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={submittingInKind}
                                            className="w-full bg-indigo-600 text-white py-3 sm:py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                        >
                                            {submittingInKind ? (
                                                <>
                                                    <LoadingSpinner size="tiny" inline />
                                                    <span>Submitting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaBoxOpen />
                                                    <span>Submit Donation Request</span>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>

                                {/* In-Kind Donation History */}
                                {inKindDonations.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                                        <h3 className="text-xl font-bold text-gray-900 mb-4">My In-Kind Donations</h3>
                                        <div className="space-y-4">
                                            {inKindDonations.map((donation) => (
                                                <div key={donation._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getInKindStatusColor(donation.status)}`}>
                                                                    {donation.status.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                                <span className="text-sm text-gray-500">
                                                                    {getDonationTypeLabel(donation.donationType)}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-900 font-medium mb-1">{donation.itemDescription}</p>
                                                            <p className="text-sm text-gray-600">
                                                                {new Date(donation.createdAt).toLocaleDateString('en-US', {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </p>
                                                            {donation.reviewNotes && (
                                                                <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                                                    <strong>Note:</strong> {donation.reviewNotes}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
            </div>
            </main>

            <Footer />
        </div>
    )
}

export default DonationHistory
