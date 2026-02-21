import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import {
    FaBoxOpen,
    FaFilter,
    FaSearch,
    FaCheckCircle,
    FaClock,
    FaTimesCircle,
    FaEye,
    FaEdit,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaPhone,
    FaEnvelope,
    FaUser,
    FaArrowLeft,
    FaChevronDown,
    FaChevronUp
} from 'react-icons/fa'

const InKindDonations = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [donations, setDonations] = useState([])
    const [filteredDonations, setFilteredDonations] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        scheduled: 0,
        received: 0,
        completed: 0,
        totalEstimatedValue: 0
    })
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('all')
    const [donationTypeFilter, setDonationTypeFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    
    // Modal states
    const [selectedDonation, setSelectedDonation] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [statusUpdate, setStatusUpdate] = useState({
        status: '',
        reviewNotes: '',
        scheduledDate: '',
        receivedDate: ''
    })
    const [updating, setUpdating] = useState(false)
    const [expandedDonations, setExpandedDonations] = useState(new Set())

    useEffect(() => {
        fetchDonations()
        fetchStats()
    }, [backendUrl])

    useEffect(() => {
        filterDonations()
    }, [donations, statusFilter, donationTypeFilter, searchTerm])

    const fetchDonations = async () => {
        try {
            setLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/in-kind-donations`, {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    donationType: donationTypeFilter !== 'all' ? donationTypeFilter : undefined,
                    search: searchTerm || undefined,
                    page: 1,
                    limit: 100
                }
            })
            if (data.success) {
                setDonations(data.donations || [])
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to load in-kind donations')
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.get(`${backendUrl}api/in-kind-donations/stats`)
            if (data.success) {
                setStats(data.stats)
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        }
    }

    const filterDonations = () => {
        let filtered = [...donations]

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

        // Donation type filter
        if (donationTypeFilter !== 'all') {
            filtered = filtered.filter(d => d.donationType === donationTypeFilter)
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

        setFilteredDonations(filtered)
    }

    const handleStatusUpdate = async () => {
        if (!statusUpdate.status) {
            toast.error('Please select a status')
            return
        }

        setUpdating(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.put(
                `${backendUrl}api/in-kind-donations/${selectedDonation._id}/status`,
                {
                    status: statusUpdate.status,
                    reviewNotes: statusUpdate.reviewNotes || '',
                    scheduledDate: statusUpdate.scheduledDate || null,
                    receivedDate: statusUpdate.receivedDate || null
                }
            )

            if (data.success) {
                toast.success('Donation status updated successfully')
                setShowStatusModal(false)
                setSelectedDonation(null)
                setStatusUpdate({ status: '', reviewNotes: '', scheduledDate: '', receivedDate: '' })
                fetchDonations()
                fetchStats()
            } else {
                throw new Error(data.message || 'Failed to update status')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to update donation status')
        } finally {
            setUpdating(false)
        }
    }

    const openStatusModal = (donation) => {
        setSelectedDonation(donation)
        setStatusUpdate({
            status: donation.status,
            reviewNotes: donation.reviewNotes || '',
            scheduledDate: donation.scheduledDate ? new Date(donation.scheduledDate).toISOString().split('T')[0] : '',
            receivedDate: donation.receivedDate ? new Date(donation.receivedDate).toISOString().split('T')[0] : ''
        })
        setShowStatusModal(true)
    }

    const openDetailsModal = (donation) => {
        setSelectedDonation(donation)
        setShowModal(true)
    }

    const toggleExpand = (donationId) => {
        const newExpanded = new Set(expandedDonations)
        if (newExpanded.has(donationId)) {
            newExpanded.delete(donationId)
        } else {
            newExpanded.add(donationId)
        }
        setExpandedDonations(newExpanded)
    }

    const getStatusColor = (status) => {
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

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
            case 'approved':
            case 'received':
                return <FaCheckCircle className="text-green-500" />
            case 'pending':
            case 'under_review':
            case 'scheduled':
                return <FaClock className="text-yellow-500" />
            case 'rejected':
            case 'cancelled':
                return <FaTimesCircle className="text-red-500" />
            default:
                return <FaClock className="text-gray-500" />
        }
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
        if (!amount || amount === 0) return 'N/A'
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-6 sm:mb-8">
                    <button
                        onClick={() => navigate('/crd-staff/dashboard')}
                        className="flex items-center space-x-2 text-gray-600 hover:text-[#800000] transition-colors mb-4 lg:hidden"
                    >
                        <FaArrowLeft className="text-sm" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </button>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                In-Kind Donations Management
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Manage and track all in-kind donation requests
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Total</div>
                        <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Pending</div>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Approved</div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.approved}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Scheduled</div>
                        <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.scheduled}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Received</div>
                        <div className="text-xl sm:text-2xl font-bold text-indigo-600">{stats.received}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
                        <div className="text-xs sm:text-sm text-gray-500 mb-1">Completed</div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search donations..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                            />
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="under_review">Under Review</option>
                                <option value="approved">Approved</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="received">Received</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            
                            <select
                                value={donationTypeFilter}
                                onChange={(e) => setDonationTypeFilter(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent text-sm"
                            >
                                <option value="all">All Types</option>
                                <option value="food">Food & Beverages</option>
                                <option value="clothing">Clothing & Textiles</option>
                                <option value="school_supplies">School Supplies</option>
                                <option value="medical_supplies">Medical Supplies</option>
                                <option value="equipment">Equipment & Tools</option>
                                <option value="services">Services</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Donations List */}
                {loading ? (
                    <div className="py-12">
                        <LoadingSpinner size="medium" text="Loading in-kind donations..." />
                    </div>
                ) : filteredDonations.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
                        <FaBoxOpen className="text-6xl text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No in-kind donations found</p>
                        <p className="text-gray-400 text-sm mt-2">
                            {donations.length === 0 
                                ? 'No in-kind donation requests yet' 
                                : 'Try adjusting your filters'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredDonations.map((donation) => {
                            const isExpanded = expandedDonations.has(donation._id)
                            return (
                                <div
                                    key={donation._id}
                                    className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                                >
                                    <div className="p-4 sm:p-6">
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-2 mb-2 flex-wrap">
                                                            {getStatusIcon(donation.status)}
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(donation.status)}`}>
                                                                {donation.status.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                                {getDonationTypeLabel(donation.donationType)}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                                                            {donation.itemDescription}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                                            <div className="flex items-center space-x-1">
                                                                <FaUser className="text-gray-400" />
                                                                <span>{donation.donorName}</span>
                                                            </div>
                                                            <div className="flex items-center space-x-1">
                                                                <FaCalendarAlt className="text-gray-400" />
                                                                <span>{formatDate(donation.createdAt)}</span>
                                                            </div>
                                                            {donation.estimatedValue > 0 && (
                                                                <div className="text-green-600 font-semibold">
                                                                    {formatCurrency(donation.estimatedValue)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-500 uppercase">Donor Information</label>
                                                                <div className="mt-2 space-y-1">
                                                                    <div className="flex items-center space-x-2 text-sm">
                                                                        <FaEnvelope className="text-gray-400" />
                                                                        <span>{donation.donorEmail}</span>
                                                                    </div>
                                                                    {donation.donorPhone && (
                                                                        <div className="flex items-center space-x-2 text-sm">
                                                                            <FaPhone className="text-gray-400" />
                                                                            <span>{donation.donorPhone}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-500 uppercase">Donation Details</label>
                                                                <div className="mt-2 space-y-1 text-sm">
                                                                    {donation.quantity && (
                                                                        <div><strong>Quantity:</strong> {donation.quantity}</div>
                                                                    )}
                                                                    <div><strong>Condition:</strong> {donation.condition.replace('_', ' ')}</div>
                                                                    {donation.event && (
                                                                        <div><strong>Event:</strong> {donation.event.title}</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {donation.deliveryMethod !== 'pending' && (
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-500 uppercase">Delivery Information</label>
                                                                <div className="mt-2 space-y-1 text-sm">
                                                                    <div><strong>Method:</strong> {donation.deliveryMethod.replace('_', ' ')}</div>
                                                                    {donation.preferredDate && (
                                                                        <div><strong>Preferred Date:</strong> {formatDate(donation.preferredDate)}</div>
                                                                    )}
                                                                    {donation.preferredTime && (
                                                                        <div><strong>Preferred Time:</strong> {donation.preferredTime}</div>
                                                                    )}
                                                                    {donation.address && (
                                                                        <div className="flex items-start space-x-2">
                                                                            <FaMapMarkerAlt className="text-gray-400 mt-0.5" />
                                                                            <span>{donation.address}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {donation.message && (
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-500 uppercase">Message</label>
                                                                <p className="mt-2 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
                                                                    {donation.message}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {donation.notes && (
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-500 uppercase">Additional Notes</label>
                                                                <p className="mt-2 text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
                                                                    {donation.notes}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {donation.reviewNotes && (
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-500 uppercase">Review Notes</label>
                                                                <p className="mt-2 text-sm text-gray-700 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                                    {donation.reviewNotes}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {donation.reviewedBy && (
                                                            <div className="text-xs text-gray-500">
                                                                Reviewed by: {donation.reviewedBy?.name || 'N/A'} on {formatDate(donation.reviewedAt)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[120px]">
                                                <button
                                                    onClick={() => toggleExpand(donation._id)}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <FaChevronUp />
                                                            <span>Less</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FaChevronDown />
                                                            <span>More</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => openStatusModal(donation)}
                                                    className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#9c0000] transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                                                >
                                                    <FaEdit />
                                                    <span>Update Status</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>

            {/* Status Update Modal */}
            {showStatusModal && selectedDonation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Update Donation Status</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Update the status and add notes for: {selectedDonation.itemDescription.substring(0, 50)}...
                            </p>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={statusUpdate.status}
                                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                    required
                                >
                                    <option value="pending">Pending</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="approved">Approved</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="received">Received</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Review Notes
                                </label>
                                <textarea
                                    value={statusUpdate.reviewNotes}
                                    onChange={(e) => setStatusUpdate({ ...statusUpdate, reviewNotes: e.target.value })}
                                    placeholder="Add notes about this donation..."
                                    rows="4"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                />
                            </div>

                            {(statusUpdate.status === 'scheduled' || statusUpdate.status === 'approved') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Scheduled Date
                                    </label>
                                    <input
                                        type="date"
                                        value={statusUpdate.scheduledDate}
                                        onChange={(e) => setStatusUpdate({ ...statusUpdate, scheduledDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                    />
                                </div>
                            )}

                            {statusUpdate.status === 'received' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Received Date
                                    </label>
                                    <input
                                        type="date"
                                        value={statusUpdate.receivedDate}
                                        onChange={(e) => setStatusUpdate({ ...statusUpdate, receivedDate: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-transparent"
                                    />
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setShowStatusModal(false)
                                        setSelectedDonation(null)
                                        setStatusUpdate({ status: '', reviewNotes: '', scheduledDate: '', receivedDate: '' })
                                    }}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStatusUpdate}
                                    disabled={updating || !statusUpdate.status}
                                    className="flex-1 px-4 py-3 bg-[#800000] text-white rounded-lg hover:bg-[#9c0000] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                                >
                                    {updating ? (
                                        <>
                                            <LoadingSpinner size="tiny" inline />
                                            <span>Updating...</span>
                                        </>
                                    ) : (
                                        <span>Update Status</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default InKindDonations

