import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
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
    FaFilePdf
} from 'react-icons/fa'

const CRDDonations = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [activeTab, setActiveTab] = useState('wallet') // 'wallet', 'cashcheque', 'inkind'
    
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
    const [searchTerm, setSearchTerm] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    
    // Modal states
    const [selectedDonation, setSelectedDonation] = useState(null)
    const [showModal, setShowModal] = useState(false)
    
    useEffect(() => {
        if (activeTab === 'wallet') {
            fetchWalletDonations()
        } else if (activeTab === 'inkind') {
            fetchInKindDonations()
        } else if (activeTab === 'cashcheque') {
            // Placeholder for cash/cheque donations
            setCashChequeLoading(false)
        }
    }, [activeTab, backendUrl])
    
    useEffect(() => {
        if (activeTab === 'wallet') {
            filterWalletDonations()
        } else if (activeTab === 'inkind') {
            filterInKindDonations()
        }
    }, [walletDonations, inKindDonations, statusFilter, paymentMethodFilter, searchTerm, activeTab])
    
    const fetchWalletDonations = async () => {
        try {
            setWalletLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/donations/all`)
            if (data.success) {
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
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/in-kind-donations`, {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: searchTerm || undefined,
                    page: 1,
                    limit: 100
                }
            })
            if (data.success) {
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
        
        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(d => 
                d.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.message?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(d => d.status === statusFilter)
        }
        
        // Payment method filter
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
            bank: 'Bank Transfer'
        }
        return labels[method] || method
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
            
            <main className="pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/crd-staff/dashboard')}
                        className="flex items-center space-x-2 text-gray-600 hover:text-[#800000] transition-colors mb-4 lg:hidden group"
                    >
                        <FaArrowLeft className="text-sm transform group-hover:-translate-x-1 transition-transform duration-200" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 bg-gradient-to-r from-[#800000] to-[#9c0000] bg-clip-text text-transparent">
                                Donations Management
                            </h1>
                            <p className="text-base sm:text-lg text-gray-600">
                                Manage and track all donation types across your organization
                            </p>
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
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => openDetailsModal(donation)}
                                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        <FaEye />
                                                        <span>View Details</span>
                                                    </button>
                                                    {donation.status === 'succeeded' && (
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
                        <div className="text-center py-16">
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaMoneyBillWave className="text-5xl text-gray-400" />
                            </div>
                            <p className="text-gray-600 text-xl font-semibold mb-2">Cash/Cheque Donations</p>
                            <p className="text-gray-500 text-base mb-4">This feature is coming soon</p>
                            <div className="inline-block px-6 py-3 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white rounded-xl font-semibold shadow-lg">
                                Stay tuned for updates!
                            </div>
                        </div>
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
                </div>
            </main>
            
            {/* Details Modal - Higher z-index than header (z-[100]) */}
            {showModal && selectedDonation && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 pt-20 sm:pt-24 md:pt-28 pb-8 backdrop-blur-md bg-white/30 animate-modal-in"
                    onClick={() => setShowModal(false)}
                    style={{ 
                        zIndex: 200
                    }}
                >
                    <div 
                        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200/50 animate-slide-down flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            zIndex: 201,
                            maxHeight: 'calc(100vh - 6rem)'
                        }}
                    >
                        <div className="flex-shrink-0 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white p-5 sm:p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-bold">Donation Details</h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 flex-shrink-0"
                                    aria-label="Close modal"
                                >
                                    <FaTimesCircle className="text-xl" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 sm:space-y-6">
                            {/* Donor Information Card */}
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
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
                            <div className="bg-gradient-to-br from-red-50/50 to-white rounded-xl p-5 border border-red-100 shadow-sm">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Donation Information</h3>
                                {activeTab === 'wallet' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                            <p className="text-xs text-gray-500">Amount</p>
                                            <p className="text-2xl font-bold text-[#800000]">{formatCurrency(selectedDonation.amount)}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Payment Method</p>
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
                            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-200 shadow-sm">
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
                            {activeTab === 'wallet' && selectedDonation.status === 'succeeded' && (
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

