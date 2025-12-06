import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import { useCache } from '../../../context/CacheContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    FaWallet,
    FaMoneyBillWave,
    FaBoxOpen,
    FaFilter,
    FaSearch,
    FaCheckCircle,
    FaClock,
    FaTimesCircle,
    FaEye,
    FaEdit,
    FaCalendarAlt,
    FaUser,
    FaArrowLeft,
    FaChevronDown,
    FaChevronUp,
    FaFilePdf,
    FaChartBar,
    FaPrint,
    FaFileExcel
} from 'react-icons/fa'
import { motion } from 'framer-motion'

const CRDDonations = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const { cachedGet } = useCache()
    const [searchParams] = useSearchParams()
    const initialTab = searchParams.get('tab') || 'wallet'
    const [activeTab, setActiveTab] = useState(initialTab) // 'wallet', 'cashcheque', 'inkind', 'event-report'
    
    // Wallet donations state
    const [walletDonations, setWalletDonations] = useState([])
    const [filteredWalletDonations, setFilteredWalletDonations] = useState([])
    const [walletLoading, setWalletLoading] = useState(true)
    
    // Cash/Cheque donations state (placeholder)
    const [cashChequeDonations, setCashChequeDonations] = useState([])
    const [cashChequeLoading, setCashChequeLoading] = useState(false)
    
    // In-kind donations state
    const [inKindDonations, setInKindDonations] = useState([])
    const [filteredInKindDonations, setFilteredInKindDonations] = useState([])
    const [inKindLoading, setInKindLoading] = useState(true)
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
    const [recipientTypeFilter, setRecipientTypeFilter] = useState('all') // 'all', 'crd', 'department', 'event'
    const [searchTerm, setSearchTerm] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    
    // Cash verification state
    const [verifyingCash, setVerifyingCash] = useState(null)
    const [verificationModal, setVerificationModal] = useState({ open: false, donation: null })
    const [verificationForm, setVerificationForm] = useState({ receiptNumber: '', verificationNotes: '' })
    
    // Modal states
    const [selectedDonation, setSelectedDonation] = useState(null)
    const [showModal, setShowModal] = useState(false)
    
    // Event donations report state
    const [eventsData, setEventsData] = useState([])
    const [overallTotal, setOverallTotal] = useState(0)
    const [totalEvents, setTotalEvents] = useState(0)
    const [eventReportLoading, setEventReportLoading] = useState(false)
    
    // Update URL when tab changes (but don't trigger navigation on initial load)
    useEffect(() => {
        const currentTab = searchParams.get('tab') || 'wallet'
        if (activeTab !== currentTab) {
            if (activeTab !== 'wallet') {
                navigate(`/crd-staff/donations?tab=${activeTab}`, { replace: true })
            } else {
                navigate('/crd-staff/donations', { replace: true })
            }
        }
    }, [activeTab, navigate, searchParams])
    
    useEffect(() => {
        if (activeTab === 'wallet') {
            fetchWalletDonations()
        } else if (activeTab === 'inkind') {
            fetchInKindDonations()
        } else if (activeTab === 'cashcheque') {
            fetchCashDonations()
        } else if (activeTab === 'event-report') {
            fetchEventDonations()
        }
    }, [activeTab, backendUrl])
    
    const fetchCashDonations = async () => {
        try {
            setCashChequeLoading(true)
            const data = await cachedGet('donations', 'api/donations/all', { forceRefresh: false })
            if (data?.success) {
                // Filter only cash donations
                const cashDonations = (data.donations || []).filter(d => d.paymentMethod === 'cash')
                setCashChequeDonations(cashDonations)
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load cash donations')
            setCashChequeDonations([])
        } finally {
            setCashChequeLoading(false)
        }
    }
    
    useEffect(() => {
        if (activeTab === 'wallet') {
            filterWalletDonations()
        } else if (activeTab === 'inkind') {
            filterInKindDonations()
        }
    }, [walletDonations, inKindDonations, statusFilter, paymentMethodFilter, recipientTypeFilter, searchTerm, activeTab])
    
    const handleVerifyCash = async () => {
        if (!verificationForm.receiptNumber.trim()) {
            toast.error('Please enter a receipt number')
            return
        }
        
        setVerifyingCash(verificationModal.donation._id)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(
                `${backendUrl}api/donations/${verificationModal.donation._id}/verify-cash`,
                {
                    receiptNumber: verificationForm.receiptNumber,
                    verificationNotes: verificationForm.verificationNotes
                }
            )
            
            if (data.success) {
                toast.success('Cash donation verified successfully')
                setVerificationModal({ open: false, donation: null })
                setVerificationForm({ receiptNumber: '', verificationNotes: '' })
                fetchWalletDonations()
                fetchCashDonations()
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to verify cash donation')
        } finally {
            setVerifyingCash(null)
        }
    }
    
    const handleCompleteCash = async (donationId) => {
        if (!window.confirm('Mark this cash donation as completed? This will send the receipt email to the donor.')) {
            return
        }
        
        setVerifyingCash(donationId)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(`${backendUrl}api/donations/${donationId}/complete-cash`)
            
            if (data.success) {
                toast.success('Cash donation completed successfully')
                fetchWalletDonations()
                fetchCashDonations()
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to complete cash donation')
        } finally {
            setVerifyingCash(null)
        }
    }
    
    const fetchWalletDonations = async () => {
        try {
            setWalletLoading(true)
            const data = await cachedGet('donations', 'api/donations/all', { forceRefresh: false })
            if (data?.success) {
                setWalletDonations(data.donations || [])
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load wallet donations')
            setWalletDonations([])
        } finally {
            setWalletLoading(false)
        }
    }
    
    const fetchInKindDonations = async () => {
        try {
            setInKindLoading(true)
            const data = await cachedGet('inKindDonations', 'api/in-kind-donations', {
                forceRefresh: false,
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: searchTerm || undefined,
                    page: 1,
                    limit: 100
                }
            })
            if (data?.success) {
                setInKindDonations(data.donations || [])
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load in-kind donations')
            setInKindDonations([])
        } finally {
            setInKindLoading(false)
        }
    }
    
    const filterWalletDonations = () => {
        let filtered = [...walletDonations]
        
        // Recipient type filter
        if (recipientTypeFilter !== 'all') {
            filtered = filtered.filter(d => d.recipientType === recipientTypeFilter)
        }
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(d => 
                d.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.event?.title?.toLowerCase().includes(searchTerm.toLowerCase())
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
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        
        setFilteredWalletDonations(filtered)
    }
    
    const filterInKindDonations = () => {
        let filtered = [...inKindDonations]
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(d => 
                d.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.itemDescription?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => d.status === statusFilter)
        }
        
        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        
        setFilteredInKindDonations(filtered)
    }
    
    const openDetailsModal = (donation) => {
        setSelectedDonation(donation)
        setShowModal(true)
    }
    
    const getStatusColor = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            succeeded: 'bg-green-100 text-green-800 border-green-200',
            failed: 'bg-red-100 text-red-800 border-red-200',
            canceled: 'bg-gray-100 text-gray-800 border-gray-200',
            // In-kind statuses
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
    
    const getStatusIcon = (status) => {
        switch (status) {
            case 'succeeded':
            case 'completed':
            case 'approved':
            case 'received':
                return <FaCheckCircle className="text-green-500" />
            case 'pending':
            case 'under_review':
            case 'scheduled':
                return <FaClock className="text-yellow-500" />
            case 'failed':
            case 'rejected':
            case 'canceled':
            case 'cancelled':
                return <FaTimesCircle className="text-red-500" />
            default:
                return <FaClock className="text-gray-500" />
        }
    }
    
    const getPaymentMethodLabel = (method) => {
        const labels = {
            gcash: 'GCash',
            paymaya: 'PayMaya',
            card: 'Credit/Debit Card',
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
    
    const getRecipientTypeColor = (type) => {
        switch (type) {
            case 'crd':
                return 'bg-[#800000]/10 text-[#800000] border-[#800000]/30'
            case 'department':
                return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'event':
                return 'bg-purple-50 text-purple-700 border-purple-200'
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200'
        }
    }
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
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
        if (!amount || amount === 0) return '₱0.00'
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount)
    }
    
    // Event Donations Report Functions
    const fetchEventDonations = async () => {
        try {
            setEventReportLoading(true)
            const data = await cachedGet('reports', 'api/donations/totals/per-event', { forceRefresh: false })
            
            if (data?.success) {
                setEventsData(data.events || [])
                setOverallTotal(data.overallTotal || 0)
                setTotalEvents(data.totalEvents || 0)
            } else {
                toast.error(data?.message || 'Failed to fetch event donations')
            }
        } catch (error) {
            console.error('Error fetching event donations:', error)
            toast.error('Failed to load event donations report')
        } finally {
            setEventReportLoading(false)
        }
    }
    
    const handlePrintEventReport = () => {
        window.print()
    }
    
    const handleExportEventReport = () => {
        const headers = ['Event Title', 'Start Date', 'End Date', 'Total Donations (₱)', 'Donation Count', 'Target (₱)', 'Progress (%)']
        const rows = eventsData.map(event => [
            event.eventTitle || 'N/A',
            event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A',
            event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A',
            event.totalDonations.toFixed(2),
            event.donationCount,
            event.donationTarget ? event.donationTarget.toFixed(2) : 'N/A',
            event.donationTarget ? ((event.totalDonations / event.donationTarget) * 100).toFixed(2) + '%' : 'N/A'
        ])
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `event-donations-report-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Report exported successfully!')
    }
    
    const calculateProgress = (total, target) => {
        if (!target || target === 0) return null
        return Math.min(100, (total / target) * 100).toFixed(1)
    }
    
    const [downloadingReceipt, setDownloadingReceipt] = useState(null)
    
    const downloadReceipt = async (donationId) => {
        try {
            setDownloadingReceipt(donationId)
            axios.defaults.withCredentials = true
            const response = await axios.get(`${backendUrl}api/donations/${donationId}/receipt`, {
                responseType: 'blob'
            })
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `donation-receipt-${donationId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            toast.success('Receipt downloaded successfully')
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to download receipt')
        } finally {
            setDownloadingReceipt(null)
        }
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Back Button - Top Left (Mobile/Tablet Only) */}
                <div className="mb-4 lg:hidden">
                    <button
                        onClick={() => navigate('/crd-staff/dashboard')}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Donations</h1>
                            <p className="text-gray-600 text-lg">Manage and track all donation types across your organization</p>
                        </div>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 mb-6 overflow-hidden">
                    <div className="flex flex-wrap">
                        <button
                            onClick={() => setActiveTab('wallet')}
                            className={`flex-1 sm:flex-none px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold transition-all duration-300 relative ${
                                activeTab === 'wallet'
                                    ? 'text-[#800000] bg-gradient-to-br from-red-50 to-red-100/50'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <FaWallet className={`text-xl transition-transform duration-200 ${activeTab === 'wallet' ? 'scale-110' : ''}`} />
                                <span>Wallet</span>
                            </div>
                            {activeTab === 'wallet' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800000] to-[#9c0000]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('cashcheque')}
                            className={`flex-1 sm:flex-none px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold transition-all duration-300 relative ${
                                activeTab === 'cashcheque'
                                    ? 'text-[#800000] bg-gradient-to-br from-red-50 to-red-100/50'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <FaMoneyBillWave className={`text-xl transition-transform duration-200 ${activeTab === 'cashcheque' ? 'scale-110' : ''}`} />
                                <span>Cash/Cheque</span>
                            </div>
                            {activeTab === 'cashcheque' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800000] to-[#9c0000]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('inkind')}
                            className={`flex-1 sm:flex-none px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold transition-all duration-300 relative ${
                                activeTab === 'inkind'
                                    ? 'text-[#800000] bg-gradient-to-br from-red-50 to-red-100/50'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <FaBoxOpen className={`text-xl transition-transform duration-200 ${activeTab === 'inkind' ? 'scale-110' : ''}`} />
                                <span>In-Kind</span>
                            </div>
                            {activeTab === 'inkind' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800000] to-[#9c0000]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('event-report')}
                            className={`flex-1 sm:flex-none px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold transition-all duration-300 relative ${
                                activeTab === 'event-report'
                                    ? 'text-[#800000] bg-gradient-to-br from-red-50 to-red-100/50'
                                    : 'text-gray-600 hover:text-[#800000] hover:bg-gray-50/50'
                            }`}
                        >
                            <div className="flex items-center justify-center gap-3">
                                <FaChartBar className={`text-xl transition-transform duration-200 ${activeTab === 'event-report' ? 'scale-110' : ''}`} />
                                <span>Event Report</span>
                            </div>
                            {activeTab === 'event-report' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#800000] to-[#9c0000]"></div>
                            )}
                        </button>
                    </div>
                </div>
                
                {/* Filters */}
                {(activeTab === 'wallet' || activeTab === 'inkind') && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-5 sm:p-6 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
                                    <input
                                        type="text"
                                        placeholder="Search donations by name, email, or message..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20 transition-all duration-200 text-base"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20 transition-all duration-200 text-base font-medium cursor-pointer bg-white"
                                >
                                    <option value="all">All Status</option>
                                    {activeTab === 'wallet' ? (
                                        <>
                                            <option value="pending">Pending</option>
                                            <option value="succeeded">Succeeded</option>
                                            <option value="failed">Failed</option>
                                            <option value="canceled">Canceled</option>
                                            <option value="cash_pending_verification">Cash - Pending Verification</option>
                                            <option value="cash_verified">Cash - Verified</option>
                                            <option value="cash_completed">Cash - Completed</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="pending">Pending</option>
                                            <option value="under_review">Under Review</option>
                                            <option value="approved">Approved</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="received">Received</option>
                                            <option value="completed">Completed</option>
                                            <option value="rejected">Rejected</option>
                                        </>
                                    )}
                                </select>
                                {activeTab === 'wallet' && (
                                    <>
                                        <select
                                            value={paymentMethodFilter}
                                            onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                            className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20 transition-all duration-200 text-base font-medium cursor-pointer bg-white"
                                        >
                                            <option value="all">All Methods</option>
                                            <option value="gcash">GCash</option>
                                            <option value="paymaya">PayMaya</option>
                                            <option value="card">Card</option>
                                            <option value="bank">Bank</option>
                                            <option value="cash">Cash</option>
                                        </select>
                                        <select
                                            value={recipientTypeFilter}
                                            onChange={(e) => setRecipientTypeFilter(e.target.value)}
                                            className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20 transition-all duration-200 text-base font-medium cursor-pointer bg-white"
                                        >
                                            <option value="all">All Recipients</option>
                                            <option value="crd">CRD</option>
                                            <option value="department">Department</option>
                                            <option value="event">Event</option>
                                        </select>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Content */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-5 sm:p-6 lg:p-8">
                    {activeTab === 'wallet' && (
                        <>
                            {walletLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner size="medium" text="Loading wallet donations..." />
                                </div>
                            ) : filteredWalletDonations.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FaWallet className="text-5xl text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 text-xl font-semibold mb-2">No wallet donations found</p>
                                    <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    {filteredWalletDonations.map((donation) => (
                                        <div
                                            key={donation._id}
                                            className="bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 rounded-xl p-5 sm:p-6 hover:shadow-xl hover:border-[#800000]/30 transition-all duration-300 transform hover:-translate-y-1"
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-lg">
                                                                    {getStatusIcon(donation.status)}
                                                                </div>
                                                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${getStatusColor(donation.status)}`}>
                                                                    {donation.status.toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                                                                {getPaymentMethodLabel(donation.paymentMethod)}
                                                            </span>
                                                        </div>
                                                        <div className="mb-2">
                                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getRecipientTypeColor(donation.recipientType || 'crd')}`}>
                                                                {getRecipientLabel(donation)}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                            {donation.donorName}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            {donation.donorEmail}
                                                        </p>
                                                        <div className="mb-3">
                                                            <p className="text-xs text-gray-500 mb-1">Amount</p>
                                                            <p className="text-2xl font-extrabold text-[#800000]">
                                                                {formatCurrency(donation.amount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
                                                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                        <FaCalendarAlt className="text-gray-400" />
                                                        {formatDate(donation.createdAt)}
                                                    </span>
                                                    {donation.event && (
                                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                            <FaUser className="text-gray-400" />
                                                            {donation.event.title}
                                                        </span>
                                                    )}
                                                </div>
                                                {donation.message && (
                                                    <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200">
                                                        <p className="text-sm text-gray-700 line-clamp-2 italic">
                                                            "{donation.message}"
                                                        </p>
                                                    </div>
                                                )}
                                                {/* Cash Verification Actions */}
                                                {donation.paymentMethod === 'cash' && donation.status === 'cash_pending_verification' && (
                                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg mb-3">
                                                        <p className="text-sm text-yellow-800 font-medium mb-2">Cash donation pending verification</p>
                                                        <button
                                                            onClick={() => setVerificationModal({ open: true, donation })}
                                                            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                                                        >
                                                            Verify Cash Donation
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {donation.paymentMethod === 'cash' && donation.status === 'cash_verified' && (
                                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg mb-3">
                                                        <p className="text-sm text-blue-800 font-medium mb-1">
                                                            Verified - Receipt: {donation.cashVerification?.receiptNumber || 'N/A'}
                                                        </p>
                                                        {donation.cashVerification?.verifiedAt && (
                                                            <p className="text-xs text-blue-600">
                                                                Verified: {formatDate(donation.cashVerification.verifiedAt)}
                                                            </p>
                                                        )}
                                                        <button
                                                            onClick={() => handleCompleteCash(donation._id)}
                                                            disabled={verifyingCash === donation._id}
                                                            className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                                                        >
                                                            {verifyingCash === donation._id ? 'Completing...' : 'Mark as Completed'}
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => openDetailsModal(donation)}
                                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        <FaEye />
                                                        <span>View Details</span>
                                                    </button>
                                                    {(donation.status === 'succeeded' || donation.status === 'cash_completed') && (
                                                        <button
                                                            onClick={() => downloadReceipt(donation._id)}
                                                            disabled={downloadingReceipt === donation._id}
                                                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white rounded-xl hover:from-[#9c0000] hover:to-[#800000] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                        >
                                                            {downloadingReceipt === donation._id ? (
                                                                <>
                                                                    <LoadingSpinner size="tiny" inline />
                                                                    <span>Downloading...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FaFilePdf />
                                                                    <span>Receipt</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    
                    {activeTab === 'cashcheque' && (
                        <>
                            {cashChequeLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner size="medium" text="Loading cash donations..." />
                                </div>
                            ) : cashChequeDonations.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FaMoneyBillWave className="text-5xl text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 text-xl font-semibold mb-2">No cash donations found</p>
                                    <p className="text-gray-500 text-sm">Cash donations will appear here once submitted</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    {cashChequeDonations.map((donation) => (
                                        <div
                                            key={donation._id}
                                            className="bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 rounded-xl p-5 sm:p-6 hover:shadow-xl hover:border-[#800000]/30 transition-all duration-300 transform hover:-translate-y-1"
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-lg">
                                                                    {getStatusIcon(donation.status)}
                                                                </div>
                                                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${getStatusColor(donation.status)}`}>
                                                                    {donation.status.replace(/_/g, ' ').toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                                                                Cash
                                                            </span>
                                                        </div>
                                                        <div className="mb-2">
                                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getRecipientTypeColor(donation.recipientType || 'crd')}`}>
                                                                {getRecipientLabel(donation)}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                            {donation.donorName}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            {donation.donorEmail}
                                                        </p>
                                                        <div className="mb-3">
                                                            <p className="text-xs text-gray-500 mb-1">Amount</p>
                                                            <p className="text-2xl font-extrabold text-[#800000]">
                                                                {formatCurrency(donation.amount)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
                                                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                        <FaCalendarAlt className="text-gray-400" />
                                                        {formatDate(donation.createdAt)}
                                                    </span>
                                                    {donation.department && (
                                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                            <FaUser className="text-gray-400" />
                                                            {donation.department.name}
                                                        </span>
                                                    )}
                                                    {donation.event && (
                                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                            <FaUser className="text-gray-400" />
                                                            {donation.event.title}
                                                        </span>
                                                    )}
                                                </div>
                                                {donation.message && (
                                                    <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200">
                                                        <p className="text-sm text-gray-700 line-clamp-2 italic">
                                                            "{donation.message}"
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {/* Cash Verification Actions */}
                                                {donation.status === 'cash_pending_verification' && (
                                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
                                                        <p className="text-sm text-yellow-800 font-medium mb-2">Cash donation pending verification</p>
                                                        <button
                                                            onClick={() => setVerificationModal({ open: true, donation })}
                                                            className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold"
                                                        >
                                                            Verify Cash Donation
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {donation.status === 'cash_verified' && (
                                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                                        <p className="text-sm text-blue-800 font-medium mb-1">
                                                            Verified - Receipt: {donation.cashVerification?.receiptNumber || 'N/A'}
                                                        </p>
                                                        {donation.cashVerification?.verifiedAt && (
                                                            <p className="text-xs text-blue-600 mb-2">
                                                                Verified: {formatDate(donation.cashVerification.verifiedAt)}
                                                            </p>
                                                        )}
                                                        {donation.cashVerification?.verificationNotes && (
                                                            <p className="text-xs text-blue-700 mb-2 italic">
                                                                Notes: {donation.cashVerification.verificationNotes}
                                                            </p>
                                                        )}
                                                        <button
                                                            onClick={() => handleCompleteCash(donation._id)}
                                                            disabled={verifyingCash === donation._id}
                                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                                                        >
                                                            {verifyingCash === donation._id ? 'Completing...' : 'Mark as Completed'}
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {donation.status === 'cash_completed' && (
                                                    <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded-r-lg">
                                                        <p className="text-sm text-green-800 font-medium mb-1">
                                                            ✓ Completed
                                                        </p>
                                                        {donation.cashVerification?.completedAt && (
                                                            <p className="text-xs text-green-600">
                                                                Completed: {formatDate(donation.cashVerification.completedAt)}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => openDetailsModal(donation)}
                                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        <FaEye />
                                                        <span>View Details</span>
                                                    </button>
                                                    {donation.status === 'cash_completed' && (
                                                        <button
                                                            onClick={() => downloadReceipt(donation._id)}
                                                            disabled={downloadingReceipt === donation._id}
                                                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white rounded-xl hover:from-[#9c0000] hover:to-[#800000] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                                        >
                                                            {downloadingReceipt === donation._id ? (
                                                                <>
                                                                    <LoadingSpinner size="tiny" inline />
                                                                    <span>Downloading...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <FaFilePdf />
                                                                    <span>Receipt</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    
                    {activeTab === 'inkind' && (
                        <>
                            {inKindLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner size="medium" text="Loading in-kind donations..." />
                                </div>
                            ) : filteredInKindDonations.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <FaBoxOpen className="text-5xl text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 text-xl font-semibold mb-2">No in-kind donations found</p>
                                    <p className="text-gray-500 text-sm">Try adjusting your search or filter criteria</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                    {filteredInKindDonations.map((donation) => (
                                        <div
                                            key={donation._id}
                                            className="bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 rounded-xl p-5 sm:p-6 hover:shadow-xl hover:border-[#800000]/30 transition-all duration-300 transform hover:-translate-y-1"
                                        >
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="text-lg">
                                                                    {getStatusIcon(donation.status)}
                                                                </div>
                                                                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${getStatusColor(donation.status)}`}>
                                                                    {donation.status.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                            {donation.donorName}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 mb-3">
                                                            {donation.donorEmail}
                                                        </p>
                                                        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 mb-3">
                                                            <p className="text-xs text-gray-500 mb-1">Item Description</p>
                                                            <p className="text-base text-gray-900 font-medium">
                                                                {donation.itemDescription}
                                                            </p>
                                                        </div>
                                                        <div className="mb-3">
                                                            <p className="text-xs text-gray-500 mb-1">Estimated Value</p>
                                                            <p className="text-2xl font-extrabold text-[#800000]">
                                                                {formatCurrency(donation.estimatedValue || 0)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 border-t border-gray-200 pt-3">
                                                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                        <FaCalendarAlt className="text-gray-400" />
                                                        {formatDate(donation.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => openDetailsModal(donation)}
                                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        <FaEye />
                                                        <span>View Details</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    
                    {activeTab === 'event-report' && (
                        <>
                            {/* Event Report Header */}
                            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Donations Report</h2>
                                    <p className="text-gray-600">Total donations received per event</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePrintEventReport}
                                        className="flex items-center gap-2 px-4 py-2 bg-[#800020] text-white rounded-lg hover:bg-[#9c0000] transition-colors duration-200 shadow-md hover:shadow-lg"
                                    >
                                        <FaPrint className="w-4 h-4" />
                                        <span>Print</span>
                                    </button>
                                    <button
                                        onClick={handleExportEventReport}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                                    >
                                        <FaFileExcel className="w-4 h-4" />
                                        <span>Export CSV</span>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Print Header - Only visible when printing */}
                            <div className="hidden print:block mb-4">
                                <h1 className="text-2xl font-bold text-[#800020] mb-2">Event Donations Report</h1>
                                <p className="text-gray-600">Generated: {new Date().toLocaleString()}</p>
                            </div>
                            
                            {eventReportLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner size="medium" text="Loading event donations report..." />
                                </div>
                            ) : (
                                <>
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center flex-shrink-0">
                                                    <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Donations</p>
                                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800020]">
                                                        {formatCurrency(overallTotal)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                        
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center flex-shrink-0">
                                                    <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
                                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800020]">
                                                        {totalEvents}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                        
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center flex-shrink-0">
                                                    <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Average per Event</p>
                                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800020]">
                                                        {formatCurrency(totalEvents > 0 ? overallTotal / totalEvents : 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                    
                                    {/* Events Table */}
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gradient-to-r from-[#800020] to-[#9c0000] text-white">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold">Event Title</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold">Start Date</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold">End Date</th>
                                                        <th className="px-4 py-3 text-right text-sm font-semibold">Total Donations</th>
                                                        <th className="px-4 py-3 text-center text-sm font-semibold">Count</th>
                                                        <th className="px-4 py-3 text-right text-sm font-semibold">Target</th>
                                                        <th className="px-4 py-3 text-center text-sm font-semibold">Progress</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {eventsData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="7" className="px-4 py-12">
                                                                <div className="text-center">
                                                                    <FaCalendarAlt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                                    <p className="text-gray-500 text-lg font-medium mb-2">No events with donations found</p>
                                                                    <p className="text-gray-400 text-sm">There are no events that have received donations yet</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        eventsData.map((event, index) => {
                                                            const progress = calculateProgress(event.totalDonations, event.donationTarget)
                                                            return (
                                                                <tr key={event.eventId || index} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                                        {event.eventTitle || 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {event.endDate ? new Date(event.endDate).toLocaleDateString() : 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm font-semibold text-[#800020] text-right">
                                                                        {formatCurrency(event.totalDonations)}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                                                        {event.donationCount}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                                        {event.donationTarget ? formatCurrency(event.donationTarget) : 'N/A'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        {progress ? (
                                                                            <div className="flex items-center justify-center gap-2">
                                                                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                                                                    <div
                                                                                        className="bg-[#800020] h-2 rounded-full"
                                                                                        style={{ width: `${Math.min(100, progress)}%` }}
                                                                                    />
                                                                                </div>
                                                                                <span className="text-xs font-medium text-gray-700">{progress}%</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-gray-500">N/A</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })
                                                    )}
                                                </tbody>
                                                {eventsData.length > 0 && (
                                                    <tfoot className="bg-gray-50">
                                                        <tr>
                                                            <td colSpan="3" className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                                Total
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-bold text-[#800020] text-right">
                                                                {formatCurrency(overallTotal)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">
                                                                {eventsData.reduce((sum, e) => sum + e.donationCount, 0)}
                                                            </td>
                                                            <td colSpan="2" className="px-4 py-3"></td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
            
            {/* Cash Verification Modal */}
            {verificationModal.open && verificationModal.donation && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 pt-20 sm:pt-24 md:pt-28 pb-8 backdrop-blur-md bg-white/30 animate-modal-in"
                    onClick={() => setVerificationModal({ open: false, donation: null })}
                    style={{ zIndex: 200 }}
                >
                    <div 
                        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200/50 animate-slide-down flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ zIndex: 201, maxHeight: 'calc(100vh - 6rem)' }}
                    >
                        <div className="flex-shrink-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-5 sm:p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-bold">Verify Cash Donation</h2>
                                <button
                                    onClick={() => setVerificationModal({ open: false, donation: null })}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0"
                                >
                                    <FaTimesCircle className="text-xl" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                <p className="text-sm text-yellow-800 font-medium mb-1">Donation Details</p>
                                <p className="text-lg font-bold text-yellow-900">{formatCurrency(verificationModal.donation.amount)}</p>
                                <p className="text-xs text-yellow-700 mt-1">From: {verificationModal.donation.donorName}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Receipt Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={verificationForm.receiptNumber}
                                    onChange={(e) => setVerificationForm({ ...verificationForm, receiptNumber: e.target.value })}
                                    placeholder="Enter official receipt number"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Verification Notes (Optional)
                                </label>
                                <textarea
                                    value={verificationForm.verificationNotes}
                                    onChange={(e) => setVerificationForm({ ...verificationForm, verificationNotes: e.target.value })}
                                    placeholder="Add any notes about the verification..."
                                    rows="4"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-all duration-200"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setVerificationModal({ open: false, donation: null })}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVerifyCash}
                                    disabled={verifyingCash === verificationModal.donation._id || !verificationForm.receiptNumber.trim()}
                                    className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {verifyingCash === verificationModal.donation._id ? (
                                        <>
                                            <LoadingSpinner size="tiny" inline />
                                            <span className="ml-2">Verifying...</span>
                                        </>
                                    ) : (
                                        'Verify Donation'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Details Modal - Higher z-index than header (z-[100]) */}
            {showModal && selectedDonation && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-md bg-black/20 animate-modal-in"
                    onClick={() => setShowModal(false)}
                    style={{ 
                        zIndex: 200
                    }}
                >
                    <div 
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200/50 animate-slide-down flex flex-col mx-auto my-auto"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            zIndex: 201,
                            maxHeight: '90vh',
                            maxWidth: 'calc(100vw - 1.5rem)'
                        }}
                    >
                        <div className="flex-shrink-0 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white p-4 sm:p-5 md:p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Donation Details</h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0"
                                    aria-label="Close modal"
                                >
                                    <FaTimesCircle className="text-xl" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 md:space-y-6">
                            {/* Donor Information Card */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Donor Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Donor Name</p>
                                        <p className="text-lg font-semibold text-gray-900">{selectedDonation.donorName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Email Address</p>
                                        <p className="text-base text-gray-700">{selectedDonation.donorEmail}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Donation Information Card */}
                            <div className="bg-gradient-to-br from-red-50/50 to-white rounded-xl p-4 sm:p-5 border border-red-100 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Donation Information</h3>
                                {activeTab === 'wallet' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                            <p className="text-xs text-gray-500">Amount</p>
                                            <p className="text-2xl font-bold text-[#800000]">{formatCurrency(selectedDonation.amount)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Donation Method</p>
                                                <p className="text-base font-medium text-gray-900">{getPaymentMethodLabel(selectedDonation.paymentMethod)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Status</p>
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedDonation.status)}`}>
                                                    {selectedDonation.status}
                                                </span>
                                            </div>
                                        </div>
                                        {selectedDonation.paymongoReferenceId && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                                                <p className="text-xs font-mono text-gray-600 break-all">{selectedDonation.paymongoReferenceId}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Recipient</p>
                                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold border ${getRecipientTypeColor(selectedDonation.recipientType || 'crd')}`}>
                                                {getRecipientLabel(selectedDonation)}
                                            </span>
                                        </div>
                                        {selectedDonation.paymentMethod === 'cash' && selectedDonation.cashVerification && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 mt-3">
                                                <p className="text-sm font-semibold text-blue-900">Cash Verification Details</p>
                                                {selectedDonation.cashVerification.receiptNumber && (
                                                    <div>
                                                        <p className="text-xs text-blue-700">Receipt Number</p>
                                                        <p className="text-sm font-medium text-blue-900">{selectedDonation.cashVerification.receiptNumber}</p>
                                                    </div>
                                                )}
                                                {selectedDonation.cashVerification.verifiedAt && (
                                                    <div>
                                                        <p className="text-xs text-blue-700">Verified At</p>
                                                        <p className="text-sm text-blue-900">{formatDate(selectedDonation.cashVerification.verifiedAt)}</p>
                                                    </div>
                                                )}
                                                {selectedDonation.cashVerification.verificationNotes && (
                                                    <div>
                                                        <p className="text-xs text-blue-700">Notes</p>
                                                        <p className="text-sm text-blue-900">{selectedDonation.cashVerification.verificationNotes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'inkind' && (
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Item Description</p>
                                            <p className="text-base text-gray-900 leading-relaxed">{selectedDonation.itemDescription}</p>
                                        </div>
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                            <p className="text-xs text-gray-500">Estimated Value</p>
                                            <p className="text-2xl font-bold text-[#800000]">{formatCurrency(selectedDonation.estimatedValue || 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Status</p>
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedDonation.status)}`}>
                                                {selectedDonation.status}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Information Card */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Additional Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                                        <p className="text-base text-gray-900">{formatDate(selectedDonation.createdAt)}</p>
                                    </div>
                                    {selectedDonation.event && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Event</p>
                                            <p className="text-base text-gray-900">{selectedDonation.event.title || 'N/A'}</p>
                                        </div>
                                    )}
                                    {(selectedDonation.message || selectedDonation.additionalNotes) && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">
                                                {activeTab === 'wallet' ? 'Message' : 'Additional Notes'}
                                            </p>
                                            <p className="text-base text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
                                                {selectedDonation.message || selectedDonation.additionalNotes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            {activeTab === 'wallet' && (selectedDonation.status === 'succeeded' || selectedDonation.status === 'cash_completed') && (
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            downloadReceipt(selectedDonation._id)
                                        }}
                                        disabled={downloadingReceipt === selectedDonation._id}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white rounded-xl hover:from-[#9c0000] hover:to-[#800000] transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {downloadingReceipt === selectedDonation._id ? (
                                            <>
                                                <LoadingSpinner size="tiny" inline />
                                                <span>Downloading...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaFilePdf className="text-lg" />
                                                <span>Download Receipt</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <Footer />
        </div>
    )
}

export default CRDDonations

