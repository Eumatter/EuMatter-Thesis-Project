import React, { useEffect, useState, useContext } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import { useCache } from '../../../context/CacheContext.jsx'
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
    FaCheck,
    FaExclamationCircle
} from 'react-icons/fa'

const DonationHistory = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const { cachedGet, invalidateType } = useCache()
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
    const [inKindSettings, setInKindSettings] = useState({
        enabled: true,
        allowedTypes: ['food', 'clothing', 'school_supplies', 'medical_supplies', 'equipment', 'services', 'other'],
        instructions: ''
    })

    useEffect(() => {
        fetchAllDonationPageData()
    }, [backendUrl])

    /** Fetch all data in parallel to reduce loading time */
    const fetchAllDonationPageData = async () => {
        setLoading(true)
        try {
            const [donationsRes, eventsRes, inKindRes, departmentsRes, inKindSettingsRes] = await Promise.allSettled([
                cachedGet('donations', 'api/donations/me', { identifier: 'user', forceRefresh: false }),
                cachedGet('events', 'api/events', { forceRefresh: false }),
                cachedGet('inKindDonations', 'api/in-kind-donations/me', { identifier: 'user', forceRefresh: false }),
                cachedGet('departments', 'api/user/departments', { forceRefresh: true }),
                cachedGet('inKindDonationSettings', 'api/system-settings/in-kind-donations', { forceRefresh: true })
            ])
            if (donationsRes.status === 'fulfilled' && donationsRes.value?.success) {
                setDonations(donationsRes.value.donations || [])
            } else if (donationsRes.status === 'rejected') {
                toast.error(donationsRes.reason?.response?.data?.message || 'Failed to load donations')
            }
            if (eventsRes.status === 'fulfilled' && eventsRes.value && Array.isArray(eventsRes.value)) {
                const openEvents = eventsRes.value.filter(e => e.isOpenForDonation && new Date(e.endDate) > new Date())
                setEvents(openEvents)
            }
            if (inKindRes.status === 'fulfilled' && inKindRes.value?.success) {
                setInKindDonations(inKindRes.value.donations || [])
            }
            if (departmentsRes.status === 'fulfilled' && departmentsRes.value?.success) {
                setDepartments(departmentsRes.value.departments || [])
            } else if (departmentsRes.status === 'rejected') {
                setDepartments([])
            }
            if (inKindSettingsRes.status === 'fulfilled' && inKindSettingsRes.value?.success && inKindSettingsRes.value.inKindDonationSettings) {
                const s = inKindSettingsRes.value.inKindDonationSettings
                setInKindSettings({
                    enabled: s.enabled !== undefined ? s.enabled : true,
                    allowedTypes: s.allowedTypes || inKindSettings.allowedTypes,
                    instructions: s.instructions || ''
                })
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    /** Refresh donations list only (e.g. after submit) */
    const fetchDonations = async () => {
        try {
            const data = await cachedGet('donations', 'api/donations/me', { identifier: 'user', forceRefresh: true })
            if (data?.success) setDonations(data.donations || [])
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to refresh donations')
        }
    }

    /** Refresh in-kind list only (e.g. after submit) */
    const fetchInKindDonations = async () => {
        try {
            const data = await cachedGet('inKindDonations', 'api/in-kind-donations/me', { identifier: 'user', forceRefresh: true })
            if (data?.success) setInKindDonations(data.donations || [])
        } catch (err) {
            console.error('Failed to refresh in-kind donations:', err)
        }
    }

    useEffect(() => {
        filterDonations()
    }, [donations, searchTerm, statusFilter, paymentMethodFilter, dateFilter])

    const handleInKindSubmit = async (e) => {
        e.preventDefault()
        
        // Validate in-kind donations are enabled
        if (!inKindSettings.enabled) {
            toast.error('In-kind donations are currently disabled')
            return
        }
        
        // Validate donation type is allowed
        if (!inKindSettings.allowedTypes.includes(inKindForm.donationType)) {
            toast.error('Selected donation type is not currently allowed')
            return
        }
        
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
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header — card style (same as /user/events) */}
                <div className="mb-6 sm:mb-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#800000] mb-3 lg:hidden"
                        aria-label="Back to Dashboard"
                    >
                        <FaArrowLeft className="text-xs" />
                        Back to Dashboard
                    </button>
                    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>My Donations</h1>
                                <p className="text-gray-600 text-base sm:text-lg">View history and make donations.</p>
                            </div>
                            <div className="flex items-center gap-3 sm:flex-shrink-0">
                                <span className="text-xs text-gray-500 uppercase tracking-wide">Total donated</span>
                                <span className="text-lg font-semibold text-[#800000]">{formatCurrency(totalDonated)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats — compact row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
                        <p className="text-lg font-semibold text-gray-900 mt-0.5">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Succeeded</p>
                        <p className="text-lg font-semibold text-gray-900 mt-0.5">{stats.succeeded}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Failed</p>
                        <p className="text-lg font-semibold text-gray-900 mt-0.5">{stats.failed}</p>
                    </div>
                </div>

                {/* Tabs container */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="border-b border-gray-200 flex overflow-x-auto scrollbar-hide -mx-px">
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === 'history'
                                    ? 'border-[#800000] text-[#800000] bg-red-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <FaHandHoldingHeart className="flex-shrink-0" />
                            <span className="hidden sm:inline">My Donations</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('donate')}
                            className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === 'donate'
                                    ? 'border-[#800000] text-[#800000] bg-red-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <FaMoneyBillWave className="flex-shrink-0" />
                            <span className="hidden sm:inline">Make a Donation</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('inkind')}
                            className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === 'inkind'
                                    ? 'border-[#800000] text-[#800000] bg-red-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <FaBoxOpen className="flex-shrink-0" />
                            <span className="hidden sm:inline">In-Kind</span>
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 sm:p-6">
                        {/* Donation History Tab */}
                        {activeTab === 'history' && (
                        <div>
                                {/* Search + Filters — consistent inputs */}
                                <div className="mb-4 space-y-3">
                                    <div className="relative">
                                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" aria-hidden />
                                        <input
                                            id="search-donations"
                                            type="text"
                                            placeholder="Search by name, message, or ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowFilters(!showFilters)}
                                            aria-expanded={showFilters}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:ring-offset-1"
                                        >
                                            <FaFilter className="text-xs" />
                                            Filters
                                        </button>
                                        {showFilters && (
                                            <>
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                                >
                                                    <option value="all">All status</option>
                                                    <option value="succeeded">Succeeded</option>
                                                    <option value="cash_pending_verification">Cash pending</option>
                                                    <option value="cash_verified">Cash verified</option>
                                                    <option value="cash_completed">Cash completed</option>
                                                    <option value="failed">Failed</option>
                                                    <option value="canceled">Canceled</option>
                                                </select>
                                                <select
                                                    value={paymentMethodFilter}
                                                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                                >
                                                    <option value="all">All methods</option>
                                                    <option value="gcash">GCash</option>
                                                    <option value="paymaya">PayMaya</option>
                                                    <option value="card">Card</option>
                                                    <option value="bank">Bank</option>
                                                    <option value="cash">Cash</option>
                                                </select>
                                                <select
                                                    value={dateFilter}
                                                    onChange={(e) => setDateFilter(e.target.value)}
                                                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                                >
                                                    <option value="all">All time</option>
                                                    <option value="today">Today</option>
                                                    <option value="week">Last 7 days</option>
                                                    <option value="month">Last month</option>
                                                    <option value="year">Last year</option>
                                                </select>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Donations List */}
                                {loading ? (
                                    <div className="py-12 flex justify-center">
                                        <LoadingSpinner size="medium" text="Loading..." />
                                    </div>
                                ) : filteredDonations.length === 0 ? (
                                    <div className="text-center py-10">
                                        <FaHandHoldingHeart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-700 mb-1">No donations found</p>
                                        <p className="text-xs text-gray-500 mb-4">{donations.length === 0 ? "You haven't made any donations yet." : "Try adjusting your filters."}</p>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('donate')}
                                            className="px-4 py-2.5 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] focus:ring-2 focus:ring-[#800000] focus:ring-offset-2"
                                        >
                                            Make your first donation
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-0">
                                        {/* Desktop Table */}
                                        <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Method</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Message</th>
                                                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Recipient</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {filteredDonations.map((donation) => (
                                                        <tr key={donation._id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(donation.createdAt)}</td>
                                                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{formatCurrency(donation.amount)}</td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center gap-1.5 text-gray-700">
                                                                    {getPaymentMethodIcon(donation.paymentMethod)}
                                                                    {getPaymentMethodLabel(donation.paymentMethod)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                    {getStatusIcon(donation.status)}
                                                                    <span className="capitalize">{donation.status.replace(/_/g, ' ')}</span>
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 max-w-[12rem] truncate">{donation.message || '—'}</td>
                                                            <td className="px-4 py-3 text-gray-600">{getRecipientLabel(donation)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile cards */}
                                        <div className="lg:hidden space-y-3">
                                            {filteredDonations.map((donation) => (
                                                <div key={donation._id} className="border border-gray-200 rounded-lg p-4 bg-white">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(donation.amount)}</p>
                                                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                            {donation.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-2">{formatDate(donation.createdAt)} · {getPaymentMethodLabel(donation.paymentMethod)}</p>
                                                    <p className="text-xs text-gray-600">Recipient: {getRecipientLabel(donation)}</p>
                                                    {donation.message && <p className="text-xs text-gray-600 mt-2 truncate">{donation.message}</p>}
                                                    {(donation.status === 'succeeded' || donation.status === 'cash_completed') && (
                                                        <p className="mt-2 text-xs text-green-700 flex items-center gap-1"><FaCheckCircle /> Receipt sent to email</p>
                                                    )}
                                                    {donation.status === 'cash_pending_verification' && (
                                                        <p className="mt-2 text-xs text-amber-700 flex items-center gap-1"><FaClock /> Pending verification</p>
                                                    )}
                                                    {donation.status === 'cash_verified' && (
                                                        <p className="mt-2 text-xs text-blue-700 flex items-center gap-1"><FaCheckCircle /> Verified</p>
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
                            <div className="max-w-4xl mx-auto w-full">
                                <p className="text-sm text-gray-500 mb-4">Your contribution helps us make a difference in the community.</p>
                                <form onSubmit={handleDonate} className="space-y-4">
                                        <div>
                                            <label htmlFor="donation-amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Amount (PHP) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="donation-amount"
                                                type="number"
                                                min="1"
                                                step="0.01"
                                                value={donationForm.amount}
                                                onChange={(e) => setDonationForm({ ...donationForm, amount: e.target.value })}
                                                placeholder="e.g. 100.00"
                                                aria-label="Donation amount"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-base"
                                                required
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Min. ₱1.00</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {[100, 500, 1000, 5000].map((amount) => (
                                                    <button
                                                        key={amount}
                                                        type="button"
                                                        onClick={() => setDonationForm({ ...donationForm, amount: amount.toString() })}
                                                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#800000] hover:text-[#800000] transition-colors"
                                                    >
                                                        ₱{amount}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Donate To <span className="text-red-500">*</span></label>
                                            <select
                                                value={donationForm.recipientType}
                                                onChange={(e) => {
                                                    const v = e.target.value
                                                    setDonationForm({ ...donationForm, recipientType: v, eventId: v === 'event' ? donationForm.eventId : null, departmentId: v === 'department' ? donationForm.departmentId : null })
                                                }}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                            >
                                                <option value="crd">CRD (Community Relations Department)</option>
                                                <option value="department">Department / Organization</option>
                                                <option value="event">Specific Event</option>
                                            </select>
                                        </div>

                                        {donationForm.recipientType === 'department' && (
                                            <div>
                                                <label htmlFor="donation-department" className="block text-sm font-medium text-gray-700 mb-1.5">Department <span className="text-red-500">*</span></label>
                                                <select
                                                    id="donation-department"
                                                    value={donationForm.departmentId || ''}
                                                    onChange={(e) => setDonationForm({ ...donationForm, departmentId: e.target.value || null })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                    required={donationForm.recipientType === 'department'}
                                                >
                                                    <option value="">Select department...</option>
                                                    {departments.map((dept) => (
                                                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                                                    ))}
                                                </select>
                                                <p className="mt-1 text-xs text-gray-500">CRD will be notified for transparency.</p>
                                            </div>
                                        )}

                                        {donationForm.recipientType === 'event' && (
                                            <div>
                                                <label htmlFor="donation-event" className="block text-sm font-medium text-gray-700 mb-1.5">Event <span className="text-red-500">*</span></label>
                                                <select
                                                    id="donation-event"
                                                    value={donationForm.eventId || ''}
                                                    onChange={(e) => setDonationForm({ ...donationForm, eventId: e.target.value || null })}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                    required={donationForm.recipientType === 'event'}
                                                >
                                                    <option value="">Select event...</option>
                                                    {events.map((event) => (
                                                        <option key={event._id} value={event._id}>{event.title}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Payment method">
                                                {[
                                                    { value: 'gcash', label: 'GCash', icon: <FaWallet className="text-lg" /> },
                                                    { value: 'paymaya', label: 'PayMaya', icon: <FaCreditCard className="text-lg" /> },
                                                    { value: 'card', label: 'Card', icon: <FaCreditCard className="text-lg" /> },
                                                    { value: 'bank', label: 'Bank', icon: <FaMoneyBillWave className="text-lg" /> },
                                                    { value: 'cash', label: 'Cash', icon: <FaMoneyBillWave className="text-lg" /> }
                                                ].map((method) => (
                                                    <button
                                                        key={method.value}
                                                        type="button"
                                                        onClick={() => setDonationForm({ ...donationForm, paymentMethod: method.value })}
                                                        role="radio"
                                                        aria-checked={donationForm.paymentMethod === method.value}
                                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-1 ${
                                                            donationForm.paymentMethod === method.value ? 'border-[#800000] bg-red-50 text-[#800000]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {method.icon}
                                                        <span>{method.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            {donationForm.paymentMethod === 'cash' && (
                                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                                                    <FaInfoCircle className="text-amber-600 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-amber-800">Cash donations are verified by the recipient. You will be notified once verified.</p>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="donation-message" className="block text-sm font-medium text-gray-700 mb-1.5">Message (optional)</label>
                                            <textarea
                                                id="donation-message"
                                                value={donationForm.message}
                                                onChange={(e) => setDonationForm({ ...donationForm, message: e.target.value })}
                                                placeholder="e.g. In memory of..., For the children..."
                                                rows="3"
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base resize-y"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Max 500 characters</p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={donating}
                                            aria-busy={donating}
                                            className="w-full py-3 rounded-lg font-semibold text-sm bg-[#800000] text-white hover:bg-[#9c0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-2"
                                        >
                                            {donating ? <><LoadingSpinner size="tiny" inline /><span>Processing...</span></> : <><FaHandHoldingHeart /><span>Donate Now</span></>}
                                        </button>
                                    </form>
                            </div>
                        )}

                        {/* In-Kind Donation Tab */}
                        {activeTab === 'inkind' && (
                            <div className="max-w-4xl mx-auto w-full space-y-6">
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex gap-2">
                                    <FaInfoCircle className="text-gray-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-gray-600">Donate items, goods, or services. Our staff will contact you to coordinate pickup or delivery.</p>
                                </div>

                                        {inKindSettings.instructions && (
                                            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                <p className="text-xs text-gray-700 whitespace-pre-line">{inKindSettings.instructions}</p>
                                            </div>
                                        )}

                                        {!inKindSettings.enabled ? (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <p className="text-sm text-amber-800">In-kind donations are currently disabled. Please contact support.</p>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleInKindSubmit} className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Donation Type <span className="text-red-500">*</span></label>
                                                        <select
                                                            value={inKindForm.donationType}
                                                            onChange={(e) => inKindSettings.allowedTypes.includes(e.target.value) && setInKindForm({ ...inKindForm, donationType: e.target.value })}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                            required
                                                        >
                                                            {inKindSettings.allowedTypes.includes('food') && <option value="food">Food & Beverages</option>}
                                                            {inKindSettings.allowedTypes.includes('clothing') && <option value="clothing">Clothing & Textiles</option>}
                                                            {inKindSettings.allowedTypes.includes('school_supplies') && <option value="school_supplies">School Supplies & Books</option>}
                                                            {inKindSettings.allowedTypes.includes('medical_supplies') && <option value="medical_supplies">Medical Supplies</option>}
                                                            {inKindSettings.allowedTypes.includes('equipment') && <option value="equipment">Equipment & Tools</option>}
                                                            {inKindSettings.allowedTypes.includes('services') && <option value="services">Services & Expertise</option>}
                                                            {inKindSettings.allowedTypes.includes('other') && <option value="other">Other</option>}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Condition</label>
                                                        <select
                                                            value={inKindForm.condition}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, condition: e.target.value })}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        >
                                                            <option value="new">New</option>
                                                            <option value="like_new">Like New</option>
                                                            <option value="good">Good</option>
                                                            <option value="fair">Fair</option>
                                                            <option value="poor">Poor</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Item Description <span className="text-red-500">*</span></label>
                                                    <textarea
                                                        value={inKindForm.itemDescription}
                                                        onChange={(e) => setInKindForm({ ...inKindForm, itemDescription: e.target.value })}
                                                        placeholder="Describe the items in detail..."
                                                        rows="3"
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base resize-y"
                                                        required
                                                    />
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity</label>
                                                        <input
                                                            type="text"
                                                            value={inKindForm.quantity}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, quantity: e.target.value })}
                                                            placeholder="e.g. 10 boxes, 50 pieces"
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Value (PHP)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={inKindForm.estimatedValue}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, estimatedValue: e.target.value })}
                                                            placeholder="Optional"
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Related Event (optional)</label>
                                                    <select
                                                        value={inKindForm.eventId || ''}
                                                        onChange={(e) => setInKindForm({ ...inKindForm, eventId: e.target.value || null })}
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                    >
                                                        <option value="">General Donation</option>
                                                        {events.map((event) => (
                                                            <option key={event._id} value={event._id}>{event.title}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                                        <input
                                                            type="tel"
                                                            value={inKindForm.donorPhone}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, donorPhone: e.target.value })}
                                                            placeholder="Contact number"
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Method</label>
                                                        <select
                                                            value={inKindForm.deliveryMethod}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, deliveryMethod: e.target.value })}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        >
                                                            <option value="pending">To be discussed</option>
                                                            <option value="drop_off">I will drop off</option>
                                                            <option value="pickup">Please pick up</option>
                                                            <option value="delivery">I will arrange delivery</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Date</label>
                                                        <input
                                                            type="date"
                                                            value={inKindForm.preferredDate}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, preferredDate: e.target.value })}
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Time</label>
                                                        <input
                                                            type="text"
                                                            value={inKindForm.preferredTime}
                                                            onChange={(e) => setInKindForm({ ...inKindForm, preferredTime: e.target.value })}
                                                            placeholder="e.g. 9:00 AM - 5:00 PM"
                                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address (if pickup/delivery)</label>
                                                    <textarea
                                                        value={inKindForm.address}
                                                        onChange={(e) => setInKindForm({ ...inKindForm, address: e.target.value })}
                                                        placeholder="Your address"
                                                        rows="2"
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base resize-y"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes</label>
                                                    <textarea
                                                        value={inKindForm.notes}
                                                        onChange={(e) => setInKindForm({ ...inKindForm, notes: e.target.value })}
                                                        placeholder="Special instructions..."
                                                        rows="2"
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base resize-y"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message (optional)</label>
                                                    <textarea
                                                        value={inKindForm.message}
                                                        onChange={(e) => setInKindForm({ ...inKindForm, message: e.target.value })}
                                                        placeholder="Leave a message..."
                                                        rows="2"
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm sm:text-base resize-y"
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={submittingInKind}
                                                    className="w-full py-3 rounded-lg font-semibold text-sm bg-[#800000] text-white hover:bg-[#9c0000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-2"
                                                >
                                                    {submittingInKind ? <><LoadingSpinner size="tiny" inline /><span>Submitting...</span></> : <><FaBoxOpen /><span>Submit Donation Request</span></>}
                                                </button>
                                            </form>
                                        )}

                                {inKindDonations.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">My In-Kind Donations</h3>
                                        <div className="space-y-3">
                                            {inKindDonations.map((donation) => (
                                                <div key={donation._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getInKindStatusColor(donation.status)}`}>
                                                            {donation.status.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-xs text-gray-500">{getDonationTypeLabel(donation.donationType)}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900">{donation.itemDescription}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {new Date(donation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    {donation.reviewNotes && (
                                                        <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">Note: {donation.reviewNotes}</p>
                                                    )}
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
