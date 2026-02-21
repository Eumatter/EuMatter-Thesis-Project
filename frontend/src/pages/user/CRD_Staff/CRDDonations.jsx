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
    
    // Cash/Cheque donations state
    const [cashChequeDonations, setCashChequeDonations] = useState([])
    const [filteredCashDonations, setFilteredCashDonations] = useState([])
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
    
    // Wallet table pagination
    const [walletPage, setWalletPage] = useState(1)
    const [walletPerPage] = useState(10)
    // Cash/Cheque table pagination
    const [cashPage, setCashPage] = useState(1)
    const [cashPerPage] = useState(10)
    // In-Kind table pagination
    const [inKindPage, setInKindPage] = useState(1)
    const [inKindPerPage] = useState(10)

    // Event donations report state
    const [eventsData, setEventsData] = useState([])
    const [overallTotal, setOverallTotal] = useState(0)
    const [totalEvents, setTotalEvents] = useState(0)
    const [eventReportLoading, setEventReportLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    
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
                const cashDonations = (data.donations || []).filter(d => d.paymentMethod === 'cash')
                setCashChequeDonations(cashDonations)
                setCashPage(1)
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
        } else if (activeTab === 'cashcheque') {
            filterCashDonations()
        }
    }, [walletDonations, inKindDonations, cashChequeDonations, statusFilter, paymentMethodFilter, recipientTypeFilter, searchTerm, activeTab])
    
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
        setWalletPage(1)
    }

    const walletTotalPages = Math.max(1, Math.ceil(filteredWalletDonations.length / walletPerPage))
    const walletPaginated = filteredWalletDonations.slice((walletPage - 1) * walletPerPage, walletPage * walletPerPage)

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
        setInKindPage(1)
    }

    const filterCashDonations = () => {
        let filtered = [...cashChequeDonations]
        if (recipientTypeFilter !== 'all') {
            filtered = filtered.filter(d => d.recipientType === recipientTypeFilter)
        }
        if (searchTerm) {
            filtered = filtered.filter(d =>
                d.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.department?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.event?.title?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => d.status === statusFilter)
        }
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setFilteredCashDonations(filtered)
        setCashPage(1)
    }

    const cashTotalPages = Math.max(1, Math.ceil(filteredCashDonations.length / cashPerPage))
    const cashPaginated = filteredCashDonations.slice((cashPage - 1) * cashPerPage, cashPage * cashPerPage)
    const inKindTotalPages = Math.max(1, Math.ceil(filteredInKindDonations.length / inKindPerPage))
    const inKindPaginated = filteredInKindDonations.slice((inKindPage - 1) * inKindPerPage, inKindPage * inKindPerPage)

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
                // Reset to first page when new data is loaded
                setCurrentPage(1)
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
    
    // Reset pagination when tab changes to event-report
    useEffect(() => {
        if (activeTab === 'event-report') {
            setCurrentPage(1)
        }
    }, [activeTab])
    
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
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Donations</h1>
                            <p className="text-gray-600 text-base sm:text-lg">Manage and track all donation types across your organization</p>
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
                            onClick={() => { setActiveTab('cashcheque'); setStatusFilter('all'); setCashPage(1); }}
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
                {(activeTab === 'wallet' || activeTab === 'inkind' || activeTab === 'cashcheque') && (
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
                                    {activeTab === 'wallet' && (
                                        <>
                                            <option value="pending">Pending</option>
                                            <option value="succeeded">Succeeded</option>
                                            <option value="failed">Failed</option>
                                            <option value="canceled">Canceled</option>
                                            <option value="cash_pending_verification">Cash - Pending Verification</option>
                                            <option value="cash_verified">Cash - Verified</option>
                                            <option value="cash_completed">Cash - Completed</option>
                                        </>
                                    )}
                                    {activeTab === 'cashcheque' && (
                                        <>
                                            <option value="cash_pending_verification">Pending Verification</option>
                                            <option value="cash_verified">Verified</option>
                                            <option value="cash_completed">Completed</option>
                                        </>
                                    )}
                                    {activeTab === 'inkind' && (
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
                                {(activeTab === 'wallet' || activeTab === 'cashcheque') && (
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
                                )}
                                {activeTab === 'wallet' && (
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
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaWallet className="text-2xl text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">No wallet donations found</p>
                                    <p className="text-xs text-gray-500 mt-1">Try adjusting search or filters</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full min-w-[720px] text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Donor</th>
                                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Method</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Recipient</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {walletPaginated.map((donation) => (
                                                    <tr key={donation._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(donation.createdAt)}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-medium text-gray-900">{donation.donorName}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-[180px]">{donation.donorEmail}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-medium text-[#800000] whitespace-nowrap">{formatCurrency(donation.amount)}</td>
                                                        <td className="py-3 px-4 text-gray-600">{getPaymentMethodLabel(donation.paymentMethod)}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getRecipientTypeColor(donation.recipientType || 'crd')}`}>
                                                                {getRecipientLabel(donation)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                {getStatusIcon(donation.status)}
                                                                {donation.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDetailsModal(donation)}
                                                                    className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#800000] focus:ring-offset-1 flex items-center gap-1"
                                                                >
                                                                    <FaEye className="w-3.5 h-3.5" /> View
                                                                </button>
                                                                {donation.paymentMethod === 'cash' && donation.status === 'cash_pending_verification' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setVerificationModal({ open: true, donation })}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-2 focus:ring-amber-500"
                                                                    >
                                                                        Verify
                                                                    </button>
                                                                )}
                                                                {donation.paymentMethod === 'cash' && donation.status === 'cash_verified' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCompleteCash(donation._id)}
                                                                        disabled={verifyingCash === donation._id}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                                    >
                                                                        {verifyingCash === donation._id ? '...' : 'Complete'}
                                                                    </button>
                                                                )}
                                                                {(donation.status === 'succeeded' || donation.status === 'cash_completed') && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => downloadReceipt(donation._id)}
                                                                        disabled={downloadingReceipt === donation._id}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] focus:ring-2 focus:ring-[#800000] disabled:opacity-50 flex items-center gap-1"
                                                                    >
                                                                        {downloadingReceipt === donation._id ? <LoadingSpinner size="tiny" inline /> : <FaFilePdf className="w-3.5 h-3.5" />}
                                                                        Receipt
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {walletTotalPages > 1 && (
                                        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                Showing {((walletPage - 1) * walletPerPage) + 1}–{Math.min(walletPage * walletPerPage, filteredWalletDonations.length)} of {filteredWalletDonations.length}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setWalletPage(p => Math.max(1, p - 1))}
                                                    disabled={walletPage <= 1}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-sm text-gray-600">
                                                    Page {walletPage} of {walletTotalPages}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setWalletPage(p => Math.min(walletTotalPages, p + 1))}
                                                    disabled={walletPage >= walletTotalPages}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                    
                    {activeTab === 'cashcheque' && (
                        <>
                            {cashChequeLoading ? (
                                <div className="py-12">
                                    <LoadingSpinner size="medium" text="Loading cash donations..." />
                                </div>
                            ) : filteredCashDonations.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaMoneyBillWave className="text-2xl text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">No cash donations found</p>
                                    <p className="text-xs text-gray-500 mt-1">Cash donations will appear here once submitted</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full min-w-[720px] text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Donor</th>
                                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Amount</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Recipient</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cashPaginated.map((donation) => (
                                                    <tr key={donation._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(donation.createdAt)}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-medium text-gray-900">{donation.donorName}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-[180px]">{donation.donorEmail}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-medium text-[#800000] whitespace-nowrap">{formatCurrency(donation.amount)}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getRecipientTypeColor(donation.recipientType || 'crd')}`}>
                                                                {getRecipientLabel(donation)}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                {getStatusIcon(donation.status)}
                                                                {donation.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDetailsModal(donation)}
                                                                    className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#800000] focus:ring-offset-1 flex items-center gap-1"
                                                                >
                                                                    <FaEye className="w-3.5 h-3.5" /> View
                                                                </button>
                                                                {donation.status === 'cash_pending_verification' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setVerificationModal({ open: true, donation })}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-2 focus:ring-amber-500"
                                                                    >
                                                                        Verify
                                                                    </button>
                                                                )}
                                                                {donation.status === 'cash_verified' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleCompleteCash(donation._id)}
                                                                        disabled={verifyingCash === donation._id}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                                                    >
                                                                        {verifyingCash === donation._id ? '...' : 'Complete'}
                                                                    </button>
                                                                )}
                                                                {donation.status === 'cash_completed' && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => downloadReceipt(donation._id)}
                                                                        disabled={downloadingReceipt === donation._id}
                                                                        className="px-2.5 py-1.5 text-xs font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] focus:ring-2 focus:ring-[#800000] disabled:opacity-50 flex items-center gap-1"
                                                                    >
                                                                        {downloadingReceipt === donation._id ? <LoadingSpinner size="tiny" inline /> : <FaFilePdf className="w-3.5 h-3.5" />}
                                                                        Receipt
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {cashTotalPages > 1 && (
                                        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                Showing {((cashPage - 1) * cashPerPage) + 1}–{Math.min(cashPage * cashPerPage, filteredCashDonations.length)} of {filteredCashDonations.length}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCashPage(p => Math.max(1, p - 1))}
                                                    disabled={cashPage <= 1}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-sm text-gray-600">Page {cashPage} of {cashTotalPages}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setCashPage(p => Math.min(cashTotalPages, p + 1))}
                                                    disabled={cashPage >= cashTotalPages}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                                <div className="text-center py-12">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FaBoxOpen className="text-2xl text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">No in-kind donations found</p>
                                    <p className="text-xs text-gray-500 mt-1">Try adjusting search or filters</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                                        <table className="w-full min-w-[640px] text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Donor</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Item</th>
                                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Est. value</th>
                                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                                                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inKindPaginated.map((donation) => (
                                                    <tr key={donation._id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{formatDate(donation.createdAt)}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-medium text-gray-900">{donation.donorName}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-[160px]">{donation.donorEmail}</div>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-700 max-w-[200px]">
                                                            <span className="line-clamp-2">{donation.itemDescription}</span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-medium text-[#800000] whitespace-nowrap">{formatCurrency(donation.estimatedValue || 0)}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                {getStatusIcon(donation.status)}
                                                                {donation.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => openDetailsModal(donation)}
                                                                className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#800000] focus:ring-offset-1 inline-flex items-center gap-1"
                                                            >
                                                                <FaEye className="w-3.5 h-3.5" /> View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {inKindTotalPages > 1 && (
                                        <div className="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">
                                                Showing {((inKindPage - 1) * inKindPerPage) + 1}–{Math.min(inKindPage * inKindPerPage, filteredInKindDonations.length)} of {filteredInKindDonations.length}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setInKindPage(p => Math.max(1, p - 1))}
                                                    disabled={inKindPage <= 1}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-sm text-gray-600">Page {inKindPage} of {inKindTotalPages}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setInKindPage(p => Math.min(inKindTotalPages, p + 1))}
                                                    disabled={inKindPage >= inKindTotalPages}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
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
                                        className="flex items-center gap-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#900000] transition-colors duration-200 shadow-md hover:shadow-lg"
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
                                <h1 className="text-2xl font-bold text-[#800000] mb-2">Event Donations Report</h1>
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
                                                    <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-[#800000]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Donations</p>
                                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800000]">
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
                                                    <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6 text-[#800000]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
                                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800000]">
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
                                                    <FaMoneyBillWave className="w-5 h-5 sm:w-6 sm:h-6 text-[#800000]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Average per Event</p>
                                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate text-[#800000]">
                                                        {formatCurrency(totalEvents > 0 ? overallTotal / totalEvents : 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </div>
                                    
                                    {/* Pagination Controls - Top */}
                                    {eventsData.length > 0 && (
                                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <label className="text-sm font-medium text-gray-700">Items per page:</label>
                                                <select
                                                    value={itemsPerPage}
                                                    onChange={(e) => {
                                                        setItemsPerPage(Number(e.target.value))
                                                        setCurrentPage(1)
                                                    }}
                                                    className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000] text-sm"
                                                >
                                                    <option value={5}>5</option>
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                    <option value={50}>50</option>
                                                    <option value={100}>100</option>
                                                </select>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Showing <span className="font-semibold text-gray-900">
                                                    {((currentPage - 1) * itemsPerPage) + 1}
                                                </span> to <span className="font-semibold text-gray-900">
                                                    {Math.min(currentPage * itemsPerPage, eventsData.length)}
                                                </span> of <span className="font-semibold text-gray-900">
                                                    {eventsData.length}
                                                </span> events
                                            </div>
                                        </div>
                                    )}

                                    {/* Events Table */}
                                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gradient-to-r from-[#800000] to-[#900000] text-white">
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
                                                        eventsData
                                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                            .map((event, index) => {
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
                                                                    <td className="px-4 py-3 text-sm font-semibold text-[#800000] text-right">
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
                                                                                        className="bg-[#800000] h-2 rounded-full"
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
                                                            <td className="px-4 py-3 text-sm font-bold text-[#800000] text-right">
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

                                    {/* Pagination Controls - Bottom */}
                                    {eventsData.length > 0 && (
                                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div className="text-sm text-gray-600">
                                                Page <span className="font-semibold text-gray-900">{currentPage}</span> of <span className="font-semibold text-gray-900">{Math.ceil(eventsData.length / itemsPerPage)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setCurrentPage(1)}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="First page"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="Previous page"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                
                                                {/* Page Numbers */}
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: Math.min(5, Math.ceil(eventsData.length / itemsPerPage)) }, (_, i) => {
                                                        const totalPages = Math.ceil(eventsData.length / itemsPerPage)
                                                        let pageNum
                                                        
                                                        if (totalPages <= 5) {
                                                            pageNum = i + 1
                                                        } else if (currentPage <= 3) {
                                                            pageNum = i + 1
                                                        } else if (currentPage >= totalPages - 2) {
                                                            pageNum = totalPages - 4 + i
                                                        } else {
                                                            pageNum = currentPage - 2 + i
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => setCurrentPage(pageNum)}
                                                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                                                    currentPage === pageNum
                                                                        ? 'bg-[#800000] text-white hover:bg-[#900000]'
                                                                        : 'text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                {pageNum}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(eventsData.length / itemsPerPage), prev + 1))}
                                                    disabled={currentPage >= Math.ceil(eventsData.length / itemsPerPage)}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="Next page"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(Math.ceil(eventsData.length / itemsPerPage))}
                                                    disabled={currentPage >= Math.ceil(eventsData.length / itemsPerPage)}
                                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title="Last page"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
            
            {/* Donation Details Modal — compact, wallet / cash-cheque / in-kind */}
            {showModal && selectedDonation && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                    style={{ zIndex: 200 }}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ zIndex: 201 }}
                    >
                        <div className="flex items-center justify-between flex-shrink-0 px-4 py-3 border-b border-gray-200">
                            <h2 className="text-base font-semibold text-gray-900">Donation details</h2>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                                aria-label="Close"
                            >
                                <FaTimesCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
                            {/* Donor */}
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Donor</p>
                                <p className="font-medium text-gray-900">{selectedDonation.donorName}</p>
                                <p className="text-gray-600 truncate">{selectedDonation.donorEmail}</p>
                            </div>

                            {/* Wallet / Cash: amount, method, status, recipient */}
                            {(activeTab === 'wallet' || activeTab === 'cashcheque') && (
                                <>
                                    <div className="flex justify-between items-baseline gap-2 py-2 border-t border-gray-100">
                                        <span className="text-gray-500">Amount</span>
                                        <span className="font-semibold text-[#800000]">{formatCurrency(selectedDonation.amount)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-2 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500">Method</p>
                                            <p className="text-gray-900">{getPaymentMethodLabel(selectedDonation.paymentMethod)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Status</p>
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(selectedDonation.status)}`}>
                                                {selectedDonation.status.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="py-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-0.5">Recipient</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getRecipientTypeColor(selectedDonation.recipientType || 'crd')}`}>
                                            {getRecipientLabel(selectedDonation)}
                                        </span>
                                    </div>
                                    {selectedDonation.paymongoReferenceId && (
                                        <div className="py-2 border-t border-gray-100">
                                            <p className="text-xs text-gray-500 mb-0.5">Transaction ID</p>
                                            <p className="text-xs font-mono text-gray-600 break-all">{selectedDonation.paymongoReferenceId}</p>
                                        </div>
                                    )}
                                    {selectedDonation.paymentMethod === 'cash' && selectedDonation.cashVerification && (
                                        <div className="py-2 pt-2 border-t border-gray-100 bg-blue-50/50 rounded-lg px-3 py-2 space-y-1.5">
                                            <p className="text-xs font-medium text-blue-900">Cash verification</p>
                                            {selectedDonation.cashVerification.receiptNumber && (
                                                <p className="text-xs text-blue-800">Receipt: {selectedDonation.cashVerification.receiptNumber}</p>
                                            )}
                                            {selectedDonation.cashVerification.verifiedAt && (
                                                <p className="text-xs text-blue-700">Verified: {formatDate(selectedDonation.cashVerification.verifiedAt)}</p>
                                            )}
                                            {selectedDonation.cashVerification.verificationNotes && (
                                                <p className="text-xs text-blue-700">Notes: {selectedDonation.cashVerification.verificationNotes}</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* In-kind: item, value, status */}
                            {activeTab === 'inkind' && (
                                <>
                                    <div className="py-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-0.5">Item</p>
                                        <p className="text-gray-900 leading-snug">{selectedDonation.itemDescription}</p>
                                    </div>
                                    <div className="flex justify-between items-baseline gap-2 py-2 border-t border-gray-100">
                                        <span className="text-gray-500">Est. value</span>
                                        <span className="font-semibold text-[#800000]">{formatCurrency(selectedDonation.estimatedValue || 0)}</span>
                                    </div>
                                    <div className="py-2 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-0.5">Status</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(selectedDonation.status)}`}>
                                            {selectedDonation.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* Date, event, message — all tabs */}
                            <div className="py-2 border-t border-gray-100 space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500">Date</p>
                                    <p className="text-gray-900">{formatDate(selectedDonation.createdAt)}</p>
                                </div>
                                {selectedDonation.event && (
                                    <div>
                                        <p className="text-xs text-gray-500">Event</p>
                                        <p className="text-gray-900">{selectedDonation.event.title || 'N/A'}</p>
                                    </div>
                                )}
                                {(selectedDonation.message || selectedDonation.additionalNotes) && (
                                    <div>
                                        <p className="text-xs text-gray-500">{activeTab === 'inkind' ? 'Notes' : 'Message'}</p>
                                        <p className="text-gray-700 text-sm leading-relaxed">{selectedDonation.message || selectedDonation.additionalNotes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Download receipt — wallet / cash when completed */}
                            {(activeTab === 'wallet' || activeTab === 'cashcheque') && (selectedDonation.status === 'succeeded' || selectedDonation.status === 'cash_completed') && (
                                <div className="pt-2 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => downloadReceipt(selectedDonation._id)}
                                        disabled={downloadingReceipt === selectedDonation._id}
                                        className="w-full px-3 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#9c0000] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                                    >
                                        {downloadingReceipt === selectedDonation._id ? (
                                            <><LoadingSpinner size="tiny" inline /> Downloading...</>
                                        ) : (
                                            <><FaFilePdf className="w-4 h-4" /> Download receipt</>
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

