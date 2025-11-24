import React, { useContext, useState, useEffect } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import axios from 'axios'
import { toast } from 'react-toastify'

const DepartmentDonations = () => {
    const navigate = useNavigate()
    const { userData, backendUrl } = useContext(AppContent)
    const [donations, setDonations] = useState([])
    const [events, setEvents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filteredDonations, setFilteredDonations] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [dateFilter, setDateFilter] = useState('all')
    const [sortBy, setSortBy] = useState('date')
    const [sortOrder, setSortOrder] = useState('desc')
    const [selectedDonation, setSelectedDonation] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(10)

    useEffect(() => {
        fetchDonations()
    }, [])

    useEffect(() => {
        filterAndSortDonations()
    }, [donations, searchTerm, statusFilter, dateFilter, sortBy, sortOrder])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [showModal])

    const fetchDonations = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(backendUrl + 'api/events')
            if (data) {
                // Set all events for reference
                setEvents(data)
                
                // Filter events created by this department and extract donations
                const departmentEvents = data.filter(e => e?.createdBy?._id === userData?._id)
                const allDonations = []
                
                departmentEvents.forEach(event => {
                    if (event.donations && event.donations.length > 0) {
                        event.donations.forEach(donation => {
                            allDonations.push({
                                _id: `${event._id}_${donation._id || Math.random()}`,
                                eventId: event._id,
                                eventTitle: event.title,
                                donorId: donation.donor,
                                amount: donation.amount,
                                status: 'completed', // All donations in events are completed
                                createdAt: donation.donatedAt,
                                donorName: donation.donor?.name || null, // Store null instead of 'Anonymous'
                                donorEmail: donation.donor?.email || '',
                                paymentMethod: 'Unknown',
                                transactionId: `${event._id}_${donation._id || Math.random()}`,
                                message: '',
                                donor: donation.donor // Keep full donor object for reference
                            })
                        })
                    }
                })
                
                setDonations(allDonations)
            }
        } catch (error) {
            console.error('Error fetching donations:', error)
            toast.error('Failed to fetch donations')
        } finally {
            setIsLoading(false)
        }
    }


    const filterAndSortDonations = () => {
        let filtered = [...donations]

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(donation => {
                const donorName = donation.donorName || donation.donor?.name || '';
                return donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    donation.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    donation.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase())
            })
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(donation => donation.status === statusFilter)
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            
            filtered = filtered.filter(donation => {
                const donationDate = new Date(donation.createdAt)
                switch (dateFilter) {
                    case 'today':
                        return donationDate >= today
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                        return donationDate >= weekAgo
                    case 'month':
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                        return donationDate >= monthAgo
                    case 'year':
                        const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
                        return donationDate >= yearAgo
                    default:
                        return true
                }
            })
        }

        // Sort
        filtered.sort((a, b) => {
            let aValue, bValue
            switch (sortBy) {
                case 'amount':
                    aValue = parseFloat(a.amount) || 0
                    bValue = parseFloat(b.amount) || 0
                    break
                case 'donor':
                    aValue = a.donorName || a.donor?.name || ''
                    bValue = b.donorName || b.donor?.name || ''
                    break
                case 'event':
                    aValue = a.eventTitle || ''
                    bValue = b.eventTitle || ''
                    break
                case 'date':
                default:
                    aValue = new Date(a.createdAt)
                    bValue = new Date(b.createdAt)
            }

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1
            } else {
                return aValue < bValue ? 1 : -1
            }
        })

        setFilteredDonations(filtered)
        setCurrentPage(1) // Reset to first page when filters change
    }

    // Pagination logic
    const totalPages = Math.ceil(filteredDonations.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedDonations = filteredDonations.slice(startIndex, endIndex)

    const getEventTitle = (eventId) => {
        const event = events.find(e => e._id === eventId)
        return event?.title || 'Unknown Event'
    }

    // Convert transaction ID to 12-digit reference number
    const generateReferenceNumber = (transactionId) => {
        if (!transactionId || transactionId === 'N/A') {
            return '000-000-000-000';
        }
        
        // Create a hash from the transaction ID to get consistent numbers
        let hash = 0;
        for (let i = 0; i < transactionId.length; i++) {
            const char = transactionId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Use multiple hash iterations to ensure we get enough digits
        let num1 = Math.abs(hash);
        let num2 = Math.abs(hash * 31 + transactionId.length);
        let num3 = Math.abs(hash * 17 + transactionId.charCodeAt(0) || 0);
        
        // Combine and ensure 12 digits
        const combined = String(num1).slice(-4) + String(num2).slice(-4) + String(num3).slice(-4);
        const reference = combined.padStart(12, '0').slice(-12);
        
        // Format as XXX-XXX-XXX-XXX for better readability
        return `${reference.slice(0, 3)}-${reference.slice(3, 6)}-${reference.slice(6, 9)}-${reference.slice(9, 12)}`;
    };

    // Mask donor name (e.g., "Luigi Amarillo" -> "Lu**i Am*****o")
    // Always returns blurred format, never "Anonymous"
    const maskDonorName = (donation) => {
        // Try to get the real name from various sources
        let name = '';
        
        // First, try donation.donorName if it exists and is not 'Anonymous'
        if (donation.donorName && donation.donorName !== 'Anonymous' && donation.donorName.trim() !== '') {
            name = donation.donorName;
        }
        // If not available, try donation.donor?.name (user object)
        else if (donation.donor?.name && donation.donor.name !== 'Anonymous' && donation.donor.name.trim() !== '') {
            name = donation.donor.name;
        }
        // If still no name, use a default blurred format
        else {
            return 'An*****s'; // Default blurred format for truly anonymous
        }
        
        // Blur the name in GCash style: "Lu**i Am*****o"
        const parts = name.trim().split(' ')
        const maskedParts = parts.map(part => {
            if (part.length <= 2) {
                return part
            }
            if (part.length === 3) {
                return part.charAt(0) + '**' + part.charAt(2)
            }
            // First 2 letters, then asterisks, then last letter
            const firstTwo = part.substring(0, 2)
            const lastLetter = part.charAt(part.length - 1)
            const asterisks = '*'.repeat(Math.max(2, part.length - 3))
            return firstTwo + asterisks + lastLetter
        })
        
        return maskedParts.join(' ')
    }

    const getTotalDonations = () => {
        return donations.reduce((total, donation) => total + (parseFloat(donation.amount) || 0), 0)
    }

    const getDonationStats = () => {
        const total = getTotalDonations()
        const count = donations.length
        const average = count > 0 ? total / count : 0
        const thisMonth = donations.filter(d => {
            const donationDate = new Date(d.createdAt)
            const now = new Date()
            return donationDate.getMonth() === now.getMonth() && donationDate.getFullYear() === now.getFullYear()
        }).reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)

        return { total, count, average, thisMonth }
    }

    const handleViewDetails = (donation) => {
        setSelectedDonation(donation)
        setShowModal(true)
    }

    const handleExportDonations = () => {
        const csvContent = [
            ['Donor Name', 'Email', 'Amount', 'Event', 'Status', 'Date', 'Donation Method'],
            ...filteredDonations.map(d => [
                d.donorName || '',
                d.donorEmail || '',
                d.amount || '0',
                getEventTitle(d.eventId),
                d.status || 'pending',
                new Date(d.createdAt).toLocaleDateString(),
                d.paymentMethod || 'Unknown'
            ])
        ].map(row => row.join(',')).join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `donations-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
        toast.success('Donations exported successfully!')
    }

    const stats = getDonationStats()

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Back Button - Top Left (Mobile/Tablet Only) */}
                <div className="mb-4 lg:hidden">
                    <button
                        onClick={() => navigate('/department/dashboard')}
                        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>

                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-md px-4 sm:px-6 py-5 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-bold text-black mb-2">Donation Management</h1>
                            <p className="text-gray-600">
                                Track and manage donations for your events
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <Button 
                                variant="primary" 
                                onClick={handleExportDonations}
                                className="flex items-center justify-center space-x-2 w-full md:w-auto"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Export CSV</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Donations</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{stats.total.toLocaleString()}</p>
                                <p className="text-xs text-green-600 mt-1 hidden sm:block">+12% from last month</p>
                            </div>
                            <div className="flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Donors</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats.count}</p>
                                <p className="text-xs text-blue-600 mt-1 hidden sm:block">+8% from last month</p>
                            </div>
                            <div className="flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Average Donation</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{stats.average.toLocaleString()}</p>
                                <p className="text-xs text-[#800020] mt-1 hidden sm:block">+5% from last month</p>
                            </div>
                            <div className="flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">This Month</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold truncate" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{stats.thisMonth.toLocaleString()}</p>
                                <p className="text-xs text-orange-600 mt-1 hidden sm:block">Current month</p>
                            </div>
                            <div className="flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Filter & Search</h3>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            <span className="text-xs sm:text-sm text-gray-600">{filteredDonations.length} donations found</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        <div className="sm:col-span-2 lg:col-span-2">
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Search Donations</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Search by donor name, email, or event..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-[#800020]/20 focus:border-[#800020] transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                                <svg className="absolute left-3 sm:left-4 top-2.5 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-[#800020] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-[#800020]/20 focus:border-[#800020] transition-all duration-200 bg-gray-50 focus:bg-white"
                            >
                                <option value="all">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Date Range</label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-[#800020]/20 focus:border-[#800020] transition-all duration-200 bg-gray-50 focus:bg-white"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Sort By</label>
                            <div className="flex space-x-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-[#800020]/20 focus:border-[#800020] transition-all duration-200 bg-gray-50 focus:bg-white"
                                >
                                    <option value="date">Date</option>
                                    <option value="amount">Amount</option>
                                    <option value="donor">Donor</option>
                                    <option value="event">Event</option>
                                </select>
                               
                            </div>
                        </div>
                    </div>
                </div>

                {/* Donations Table */}
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">Donation Records</h3>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                    <span className="text-xs sm:text-sm font-medium text-gray-600">{filteredDonations.length} donations</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-12">
                            <LoadingSpinner size="medium" text="Loading donations..." />
                        </div>
                    ) : filteredDonations.length > 0 ? (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Donor</th>
                                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Event</th>
                                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                            <th className="px-6 lg:px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {paginatedDonations.map((donation, index) => (
                                            <tr key={donation._id} className={`hover:bg-gray-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#800020] to-[#9c0000] flex items-center justify-center shadow-lg">
                                                            <span className="text-xs sm:text-sm font-bold text-white">
                                                                {(donation.donorName && donation.donorName !== 'Anonymous' ? donation.donorName : donation.donor?.name)?.charAt(0) || 'A'}
                                                            </span>
                                                        </div>
                                                        <div className="ml-3 sm:ml-4 min-w-0">
                                                            <div className="text-sm font-semibold text-gray-900 truncate">{maskDonorName(donation)}</div>
                                                            <div className="text-xs sm:text-sm text-gray-500 truncate">{donation.donorEmail || 'No email'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{getEventTitle(donation.eventId)}</div>
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <div className="text-base sm:text-lg font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{parseFloat(donation.amount || 0).toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <span className={`inline-flex px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-full ${
                                                        donation.status === 'completed' 
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                            : donation.status === 'pending'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-red-100 text-red-800 border border-red-200'
                                                    }`}>
                                                        {donation.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                                    {new Date(donation.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleViewDetails(donation)}
                                                        className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#800020] bg-[#800020]/10 rounded-lg hover:bg-[#800020]/20 hover:text-[#9c0000] transition-all duration-200"
                                                    >
                                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        <span className="hidden sm:inline">View Details</span>
                                                        <span className="sm:hidden">View</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="lg:hidden p-4 sm:p-6 space-y-4">
                                {paginatedDonations.map((donation) => (
                                    <div key={donation._id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#800020] to-[#9c0000] flex items-center justify-center shadow-lg flex-shrink-0">
                                                    <span className="text-sm font-bold text-white">
                                                        {(donation.donorName && donation.donorName !== 'Anonymous' ? donation.donorName : donation.donor?.name)?.charAt(0) || 'A'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-gray-900 truncate">{maskDonorName(donation)}</div>
                                                    <div className="text-xs text-gray-500 truncate">{donation.donorEmail || 'No email'}</div>
                                                </div>
                                            </div>
                                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full flex-shrink-0 ${
                                                donation.status === 'completed' 
                                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                    : donation.status === 'pending'
                                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                                {donation.status || 'pending'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 mb-3">
                                            <div>
                                                <p className="text-xs text-gray-500">Event</p>
                                                <p className="text-sm font-medium text-gray-900 truncate">{getEventTitle(donation.eventId)}</p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-gray-500">Amount</p>
                                                    <p className="text-lg font-bold" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₱{parseFloat(donation.amount || 0).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Date</p>
                                                    <p className="text-xs font-medium text-gray-700">{new Date(donation.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleViewDetails(donation)}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#800020] bg-[#800020]/10 rounded-lg hover:bg-[#800020]/20 hover:text-[#9c0000] transition-all duration-200"
                                        >
                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            View Details
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
                                    {/* Mobile: Stacked Layout */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                                        {/* Results Info */}
                                        <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1 text-center sm:text-left">
                                            <span className="hidden sm:inline">Showing </span>
                                            <span className="font-semibold text-gray-700">{startIndex + 1}</span>
                                            <span className="hidden sm:inline"> to </span>
                                            <span className="sm:hidden">-</span>
                                            <span className="font-semibold text-gray-700">{Math.min(endIndex, filteredDonations.length)}</span>
                                            <span className="hidden sm:inline"> of </span>
                                            <span className="sm:hidden">/</span>
                                            <span className="font-semibold text-gray-700">{filteredDonations.length}</span>
                                        </div>
                                        
                                        {/* Pagination Controls */}
                                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 order-1 sm:order-2 w-full sm:w-auto">
                                            {/* Previous Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className={`flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 min-w-[80px] sm:min-w-[90px] ${
                                                    currentPage === 1
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 border border-gray-300 shadow-sm'
                                                }`}
                                            >
                                                <svg className="w-4 h-4 mr-1 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                <span className="hidden sm:inline">Previous</span>
                                                <span className="sm:hidden">Prev</span>
                                            </button>
                                            
                                            {/* Page Numbers - Simplified on mobile */}
                                            <div className="flex items-center gap-1 sm:gap-1.5">
                                                {(() => {
                                                    const pages = [];
                                                    const showEllipsis = totalPages > 7;
                                                    
                                                    // Always show first page
                                                    if (totalPages > 0) {
                                                        pages.push(1);
                                                    }
                                                    
                                                    // Show ellipsis after first page if needed
                                                    if (showEllipsis && currentPage > 4) {
                                                        pages.push('ellipsis-start');
                                                    }
                                                    
                                                    // Show pages around current page
                                                    let startPage = Math.max(2, currentPage - 1);
                                                    let endPage = Math.min(totalPages - 1, currentPage + 1);
                                                    
                                                    // Adjust if we're near the start
                                                    if (currentPage <= 3) {
                                                        startPage = 2;
                                                        endPage = Math.min(5, totalPages - 1);
                                                    }
                                                    
                                                    // Adjust if we're near the end
                                                    if (currentPage >= totalPages - 2) {
                                                        startPage = Math.max(2, totalPages - 4);
                                                        endPage = totalPages - 1;
                                                    }
                                                    
                                                    // Add pages in the middle range
                                                    for (let i = startPage; i <= endPage; i++) {
                                                        if (i !== 1 && i !== totalPages) {
                                                            pages.push(i);
                                                        }
                                                    }
                                                    
                                                    // Show ellipsis before last page if needed
                                                    if (showEllipsis && currentPage < totalPages - 3) {
                                                        pages.push('ellipsis-end');
                                                    }
                                                    
                                                    // Always show last page (if more than 1 page)
                                                    if (totalPages > 1) {
                                                        pages.push(totalPages);
                                                    }
                                                    
                                                    // Remove duplicates and sort
                                                    const uniquePages = [...new Set(pages)];
                                                    
                                                    return uniquePages.map((item, index) => {
                                                        if (item === 'ellipsis-start' || item === 'ellipsis-end') {
                                                            return (
                                                                <span key={`ellipsis-${index}`} className="px-1 text-gray-400 text-xs">
                                                                    ...
                                                                </span>
                                                            );
                                                        }
                                                        
                                                        const page = item;
                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 min-w-[32px] sm:min-w-[36px] ${
                                                                    currentPage === page
                                                                        ? 'bg-gradient-to-r from-[#800020] to-[#9c0000] text-white shadow-md'
                                                                        : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 border border-gray-300'
                                                                }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                            
                                            {/* Next Button */}
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                                className={`flex items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 min-w-[80px] sm:min-w-[90px] ${
                                                    currentPage === totalPages
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 border border-gray-300 shadow-sm'
                                                }`}
                                            >
                                                <span className="hidden sm:inline">Next</span>
                                                <span className="sm:hidden">Next</span>
                                                <svg className="w-4 h-4 ml-1 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-600 mb-3">No donations found</h3>
                            <p className="text-gray-500 max-w-md mx-auto">No donations match your current filters. Try adjusting your search criteria or date range.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Donation Details Modal */}
            {showModal && selectedDonation && (
                <div 
                    className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[10000]"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowModal(false)
                        }
                    }}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="bg-white rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden mx-auto">
                        {/* Header - Compact */}
                        <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-[#800020]/10 to-[#9c0000]/10 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#800020] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                                    </svg>
                                    <div className="min-w-0">
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Donation Details</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        {/* Content - Optimized spacing, no scroll */}
                        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 flex-1 overflow-y-auto">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {/* Donor Information */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Donor Information</label>
                                    <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                                        <p className="text-sm sm:text-base font-semibold text-gray-900">{maskDonorName(selectedDonation)}</p>
                                        <p className="text-xs text-gray-600 mt-0.5">{selectedDonation.donorEmail || 'No email provided'}</p>
                                    </div>
                                </div>
                                
                                {/* Event */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Event</label>
                                    <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">{getEventTitle(selectedDonation.eventId)}</p>
                                    </div>
                                </div>
                                
                                {/* Donation Amount - Full Width */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700">Donation Amount</label>
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 sm:p-4 rounded-lg border border-emerald-200">
                                        <p className="text-xl sm:text-2xl font-bold text-emerald-600">₱{parseFloat(selectedDonation.amount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                {/* Status */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Status</label>
                                    <div className="p-2">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                                            selectedDonation.status === 'completed' 
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                                : selectedDonation.status === 'pending'
                                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                : 'bg-red-100 text-red-800 border border-red-200'
                                        }`}>
                                            {selectedDonation.status || 'pending'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Donation Method */}
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-gray-700">Donation Method</label>
                                    <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                                        <p className="text-sm font-medium text-gray-900">{selectedDonation.paymentMethod || 'Unknown'}</p>
                                    </div>
                                </div>
                                
                                {/* Donation Date and Reference Number - Full Width */}
                                <div className="space-y-1.5 sm:col-span-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Donation Date</label>
                                            <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg">
                                                <p className="text-xs sm:text-sm font-medium text-gray-900">{new Date(selectedDonation.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reference Number</label>
                                            <div className="p-2.5 sm:p-3">
                                                <p className="text-[#800020] font-mono text-sm font-semibold tracking-wider">{generateReferenceNumber(selectedDonation.transactionId)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Donor Message - Full Width, if exists */}
                                {selectedDonation.message && (
                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700">Donor Message</label>
                                        <div className="bg-[#800020]/10 p-2.5 sm:p-3 rounded-lg border border-[#800020]/20">
                                            <p className="text-xs sm:text-sm text-gray-900 leading-relaxed">{selectedDonation.message}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Footer - Compact */}
                        <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowModal(false)}
                                className="px-4 sm:px-5 py-2 text-sm w-full sm:w-auto"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default DepartmentDonations
