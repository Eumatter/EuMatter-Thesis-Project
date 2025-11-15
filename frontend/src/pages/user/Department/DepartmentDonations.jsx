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

    useEffect(() => {
        fetchDonations()
    }, [])

    useEffect(() => {
        filterAndSortDonations()
    }, [donations, searchTerm, statusFilter, dateFilter, sortBy, sortOrder])

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
                                donorName: donation.donor?.name || 'Anonymous',
                                donorEmail: donation.donor?.email || '',
                                paymentMethod: 'Unknown',
                                transactionId: `${event._id}_${donation._id || Math.random()}`,
                                message: ''
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
            filtered = filtered.filter(donation => 
                donation.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                donation.donorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                donation.eventTitle?.toLowerCase().includes(searchTerm.toLowerCase())
            )
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
                    aValue = a.donorName || ''
                    bValue = b.donorName || ''
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
    }

    const getEventTitle = (eventId) => {
        const event = events.find(e => e._id === eventId)
        return event?.title || 'Unknown Event'
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
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Donation Management</h1>
                            <p className="text-sm sm:text-base text-gray-600 mt-2">Track and manage donations for your events</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
                            <Button 
                                variant="primary" 
                                onClick={handleExportDonations}
                                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
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
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">₱{stats.total.toLocaleString()}</p>
                                <p className="text-xs text-green-600 mt-1 hidden sm:block">+12% from last month</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Donors</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{stats.count}</p>
                                <p className="text-xs text-blue-600 mt-1 hidden sm:block">+8% from last month</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Average Donation</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">₱{stats.average.toLocaleString()}</p>
                                <p className="text-xs text-purple-600 mt-1 hidden sm:block">+5% from last month</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 group">
                        <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">This Month</p>
                                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">₱{stats.thisMonth.toLocaleString()}</p>
                                <p className="text-xs text-orange-600 mt-1 hidden sm:block">Current month</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                                <svg className="w-5 h-5 sm:w-6 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                />
                                <svg className="absolute left-3 sm:left-4 top-2.5 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
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
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
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
                                    className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                >
                                    <option value="date">Date</option>
                                    <option value="amount">Amount</option>
                                    <option value="donor">Donor</option>
                                    <option value="event">Event</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg sm:rounded-xl hover:bg-white focus:ring-2 sm:focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-gray-50 text-base sm:text-lg"
                                >
                                    <span className="font-medium">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                </button>
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
                                        {filteredDonations.map((donation, index) => (
                                            <tr key={donation._id} className={`hover:bg-gray-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                            <span className="text-xs sm:text-sm font-bold text-white">
                                                                {donation.donorName?.charAt(0) || '?'}
                                                            </span>
                                                        </div>
                                                        <div className="ml-3 sm:ml-4 min-w-0">
                                                            <div className="text-sm font-semibold text-gray-900 truncate">{donation.donorName || 'Anonymous'}</div>
                                                            <div className="text-xs sm:text-sm text-gray-500 truncate">{donation.donorEmail || 'No email'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{getEventTitle(donation.eventId)}</div>
                                                </td>
                                                <td className="px-6 lg:px-8 py-4 sm:py-6 whitespace-nowrap">
                                                    <div className="text-base sm:text-lg font-bold text-gray-900">₱{parseFloat(donation.amount || 0).toLocaleString()}</div>
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
                                                        className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-all duration-200"
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
                                {filteredDonations.map((donation) => (
                                    <div key={donation._id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                                                    <span className="text-sm font-bold text-white">
                                                        {donation.donorName?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-gray-900 truncate">{donation.donorName || 'Anonymous'}</div>
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
                                                    <p className="text-lg font-bold text-gray-900">₱{parseFloat(donation.amount || 0).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Date</p>
                                                    <p className="text-xs font-medium text-gray-700">{new Date(donation.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleViewDetails(donation)}
                                            className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-all duration-200"
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
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl sm:rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
                        <div className="p-4 sm:p-6 lg:p-8 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Donation Details</h3>
                                        <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Complete donation information</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0"
                                >
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                                <div className="space-y-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Donor Information</label>
                                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                                        <p className="text-base sm:text-lg font-semibold text-gray-900">{selectedDonation.donorName || 'Anonymous'}</p>
                                        <p className="text-xs sm:text-sm text-gray-600">{selectedDonation.donorEmail || 'No email provided'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Event</label>
                                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                                        <p className="text-base sm:text-lg font-medium text-gray-900 truncate">{getEventTitle(selectedDonation.eventId)}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Donation Amount</label>
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-emerald-200">
                                        <p className="text-2xl sm:text-3xl font-bold text-emerald-600">₱{parseFloat(selectedDonation.amount || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Status</label>
                                    <div className="p-3 sm:p-4">
                                        <span className={`inline-flex px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-full ${
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
                                <div className="space-y-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Donation Method</label>
                                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                                        <p className="text-base sm:text-lg font-medium text-gray-900">{selectedDonation.paymentMethod || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Donation Date</label>
                                    <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                                        <p className="text-sm sm:text-base font-medium text-gray-900">{new Date(selectedDonation.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Transaction ID</label>
                                <div className="bg-gray-900 p-3 sm:p-4 rounded-lg sm:rounded-xl">
                                    <p className="text-gray-100 font-mono text-xs sm:text-sm break-all">{selectedDonation.transactionId || 'N/A'}</p>
                                </div>
                            </div>
                            {selectedDonation.message && (
                                <div className="space-y-2">
                                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">Donor Message</label>
                                    <div className="bg-indigo-50 p-4 sm:p-6 rounded-lg sm:rounded-xl border border-indigo-200">
                                        <p className="text-sm sm:text-base text-gray-900 leading-relaxed">{selectedDonation.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 sm:p-6 lg:p-8 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <Button 
                                variant="secondary" 
                                onClick={() => setShowModal(false)}
                                className="px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto"
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
