import React, { useContext, useState, useEffect } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import axios from 'axios'
import { toast } from 'react-toastify'

const DepartmentLeaderboard = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    const [departments, setDepartments] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [sortBy, setSortBy] = useState('total') // 'total', 'events', 'volunteers', 'donations'
    const [filterPeriod, setFilterPeriod] = useState('all') // 'all', 'month', 'quarter', 'year'
    const [viewMode, setViewMode] = useState('podium') // 'podium' or 'table'

    useEffect(() => {
        fetchLeaderboardData()
    }, [filterPeriod])

    const fetchLeaderboardData = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            
            // Fetch all events
            const eventsResponse = await axios.get(backendUrl + 'api/events')
            const events = eventsResponse.data || []
            
            // Group events by department and calculate metrics
            const departmentMap = new Map()
            
            events.forEach(event => {
                if (event.createdBy && event.createdBy._id) {
                    const deptId = event.createdBy._id
                    const deptName = event.createdBy.name || event.createdBy.organizationName || 'Unknown Department'
                    const deptEmail = event.createdBy.email || ''
                    
                    if (!departmentMap.has(deptId)) {
                        departmentMap.set(deptId, {
                            id: deptId,
                            name: deptName,
                            email: deptEmail,
                            events: 0,
                            volunteers: 0,
                            donations: 0,
                            total: 0
                        })
                    }
                    
                    const dept = departmentMap.get(deptId)
                    
                    // Count events
                    dept.events += 1
                    
                    // Count volunteers
                    if (event.volunteers && Array.isArray(event.volunteers)) {
                        dept.volunteers += event.volunteers.length
                    }
                    
                    // Calculate donations
                    if (event.donations && Array.isArray(event.donations)) {
                        const eventDonations = event.donations.reduce((sum, donation) => {
                            return sum + (parseFloat(donation.amount) || 0)
                        }, 0)
                        dept.donations += eventDonations
                    }
                }
            })
            
            // Calculate total score (weighted: events*1 + volunteers*0.5 + donations*0.01)
            const departmentsArray = Array.from(departmentMap.values()).map(dept => ({
                ...dept,
                total: (dept.events * 1) + (dept.volunteers * 0.5) + (dept.donations * 0.01)
            }))
            
            // Sort by total score
            departmentsArray.sort((a, b) => b.total - a.total)
            
            setDepartments(departmentsArray)
        } catch (error) {
            console.error('Error fetching leaderboard data:', error)
            toast.error('Failed to load leaderboard data')
            // Use mock data as fallback
            setDepartments([
                { id: '1', name: 'Green Earth Organization', email: 'green@example.com', events: 15, volunteers: 120, donations: 150000, total: 2770 },
                { id: '2', name: 'Community Health Initiative', email: 'health@example.com', events: 12, volunteers: 95, donations: 180000, total: 2745 },
                { id: '3', name: 'Education Support Network', email: 'education@example.com', events: 10, volunteers: 80, donations: 120000, total: 2140 },
                { id: '4', name: 'Youth Development Program', email: 'youth@example.com', events: 8, volunteers: 65, donations: 95000, total: 1730 },
                { id: '5', name: 'Environmental Action Group', email: 'env@example.com', events: 7, volunteers: 55, donations: 85000, total: 1520 },
                { id: '6', name: 'Social Welfare Foundation', email: 'social@example.com', events: 6, volunteers: 45, donations: 70000, total: 1315 },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const getRankColor = (rank) => {
        if (rank === 1) return 'from-yellow-400 via-yellow-500 to-yellow-600'
        if (rank === 2) return 'from-gray-300 via-gray-400 to-gray-500'
        if (rank === 3) return 'from-amber-600 via-amber-700 to-amber-800'
        return 'from-blue-50 to-indigo-50'
    }

    const getRankIcon = (rank) => {
        if (rank === 1) return '🥇'
        if (rank === 2) return '🥈'
        if (rank === 3) return '🥉'
        return `#${rank}`
    }

    const getPodiumHeight = (rank) => {
        if (rank === 1) return 'h-32 sm:h-40 lg:h-48'
        if (rank === 2) return 'h-24 sm:h-32 lg:h-40'
        if (rank === 3) return 'h-20 sm:h-28 lg:h-36'
        return 'h-16'
    }

    const sortedDepartments = [...departments].sort((a, b) => {
        switch (sortBy) {
            case 'events':
                return b.events - a.events
            case 'volunteers':
                return b.volunteers - a.volunteers
            case 'donations':
                return b.donations - a.donations
            default:
                return b.total - a.total
        }
    })

    const topThree = sortedDepartments.slice(0, 3)
    const rest = sortedDepartments.slice(3)

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading leaderboard..." />
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                Department Leaderboard
                            </h1>
                            <p className="text-sm sm:text-base text-gray-600">
                                Recognizing top-performing departments and their contributions
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('podium')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                        viewMode === 'podium'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Podium View
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                        viewMode === 'table'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    Table View
                                </button>
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-white text-sm font-medium"
                            >
                                <option value="total">Sort by Total Score</option>
                                <option value="events">Sort by Events</option>
                                <option value="volunteers">Sort by Volunteers</option>
                                <option value="donations">Sort by Donations</option>
                            </select>
                            <select
                                value={filterPeriod}
                                onChange={(e) => setFilterPeriod(e.target.value)}
                                className="px-4 py-2.5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 bg-white text-sm font-medium"
                            >
                                <option value="all">All Time</option>
                                <option value="year">This Year</option>
                                <option value="quarter">This Quarter</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>
                    </div>
                </div>

                {viewMode === 'podium' ? (
                    <>
                        {/* Top 3 Podium */}
                        <div className="mb-8 sm:mb-12">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">Top Performers</h2>
                            <div className="flex items-end justify-center gap-2 sm:gap-4 lg:gap-6 max-w-5xl mx-auto">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <div className="flex-1 max-w-[200px] sm:max-w-[250px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className={`bg-gradient-to-b ${getRankColor(2)} rounded-t-2xl ${getPodiumHeight(2)} flex flex-col items-center justify-center p-4 sm:p-6 shadow-xl relative overflow-hidden`}>
                                    <div className="absolute top-2 right-2 text-2xl sm:text-3xl opacity-20">🥈</div>
                                    <div className="text-white text-3xl sm:text-4xl font-bold mb-2">2</div>
                                    <div className="text-white text-xs sm:text-sm font-semibold text-center leading-tight">{topThree[1].name}</div>
                                    <div className="text-white/90 text-[10px] sm:text-xs mt-1 font-medium">{topThree[1].total.toFixed(0)} pts</div>
                                </div>
                                <div className="bg-white rounded-b-xl shadow-lg p-3 sm:p-4 -mt-1 relative z-10">
                                    <div className="space-y-1.5 sm:space-y-2 text-center">
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{topThree[1].events}</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{topThree[1].volunteers}</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">₱{(topThree[1].donations / 1000).toFixed(0)}k</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 1st Place */}
                        {topThree[0] && (
                            <div className="flex-1 max-w-[220px] sm:max-w-[280px] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <div className={`bg-gradient-to-b ${getRankColor(1)} rounded-t-2xl ${getPodiumHeight(1)} flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl relative overflow-hidden border-4 border-yellow-300`}>
                                    <div className="absolute top-2 right-2 text-3xl sm:text-4xl opacity-30 animate-bounce">👑</div>
                                    <div className="text-white text-4xl sm:text-5xl font-bold mb-2 drop-shadow-lg">1</div>
                                    <div className="text-white text-sm sm:text-base font-bold text-center leading-tight">{topThree[0].name}</div>
                                    <div className="text-white/90 text-xs sm:text-sm mt-1 font-semibold">{topThree[0].total.toFixed(0)} pts</div>
                                </div>
                                <div className="bg-white rounded-b-xl shadow-xl p-4 sm:p-5 -mt-1 relative z-10 border-2 border-yellow-200">
                                    <div className="space-y-2 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">{topThree[0].events} Events</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">{topThree[0].volunteers} Volunteers</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">₱{(topThree[0].donations / 1000).toFixed(0)}k Donations</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3rd Place */}
                        {topThree[2] && (
                            <div className="flex-1 max-w-[200px] sm:max-w-[250px] animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <div className={`bg-gradient-to-b ${getRankColor(3)} rounded-t-2xl ${getPodiumHeight(3)} flex flex-col items-center justify-center p-4 sm:p-6 shadow-xl relative overflow-hidden`}>
                                    <div className="absolute top-2 right-2 text-2xl sm:text-3xl opacity-20">🥉</div>
                                    <div className="text-white text-3xl sm:text-4xl font-bold mb-2">3</div>
                                    <div className="text-white text-xs sm:text-sm font-semibold text-center leading-tight">{topThree[2].name}</div>
                                    <div className="text-white/90 text-[10px] sm:text-xs mt-1 font-medium">{topThree[2].total.toFixed(0)} pts</div>
                                </div>
                                <div className="bg-white rounded-b-xl shadow-lg p-3 sm:p-4 -mt-1 relative z-10">
                                    <div className="space-y-1.5 sm:space-y-2 text-center">
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{topThree[2].events}</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{topThree[2].volunteers}</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-1.5">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-xs sm:text-sm font-semibold text-gray-900">₱{(topThree[2].donations / 1000).toFixed(0)}k</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                        {/* Rest of the Leaderboard */}
                        {rest.length > 0 && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">All Departments</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {rest.map((dept, index) => {
                                        const rank = index + 4
                                        return (
                                            <div
                                                key={dept.id}
                                                className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in"
                                                style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md">
                                                            {rank}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{dept.name}</h3>
                                                            <p className="text-xs text-gray-500 truncate">{dept.email}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-2">
                                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-xs sm:text-sm text-gray-600">Events</span>
                                                        </div>
                                                        <span className="text-sm sm:text-base font-bold text-gray-900">{dept.events}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-2">
                                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                            <span className="text-xs sm:text-sm text-gray-600">Volunteers</span>
                                                        </div>
                                                        <span className="text-sm sm:text-base font-bold text-gray-900">{dept.volunteers}</span>
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center space-x-2">
                                                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                            </svg>
                                                            <span className="text-xs sm:text-sm text-gray-600">Donations</span>
                                                        </div>
                                                        <span className="text-sm sm:text-base font-bold text-gray-900">₱{dept.donations.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <div className="pt-2 border-t border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Total Score</span>
                                                            <span className="text-base sm:text-lg font-bold text-indigo-600">{dept.total.toFixed(0)} pts</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Table View - All Departments */
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-900">All Departments Leaderboard</h2>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">Complete ranking of all departments</p>
                        </div>

                        {sortedDepartments.length > 0 ? (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Events</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Volunteers</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Donations</th>
                                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {sortedDepartments.map((dept, index) => {
                                                const rank = index + 1
                                                const isTopThree = rank <= 3
                                                return (
                                                    <tr 
                                                        key={dept.id} 
                                                        className={`hover:bg-gray-50 transition-all duration-200 ${
                                                            isTopThree ? 'bg-gradient-to-r from-indigo-50 to-purple-50' : ''
                                                        }`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                {rank <= 3 ? (
                                                                    <span className="text-2xl">{getRankIcon(rank)}</span>
                                                                ) : (
                                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${
                                                                        isTopThree 
                                                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md' 
                                                                            : 'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                        {rank}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="min-w-0">
                                                                <div className={`text-sm font-semibold ${isTopThree ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                                    {dept.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 truncate max-w-xs">{dept.email}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm font-bold text-gray-900">{dept.events}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm font-bold text-gray-900">{dept.volunteers}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className="text-sm font-bold text-gray-900">₱{dept.donations.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                                            <span className={`text-base font-bold ${
                                                                rank === 1 ? 'text-yellow-600' :
                                                                rank === 2 ? 'text-gray-600' :
                                                                rank === 3 ? 'text-amber-700' :
                                                                'text-indigo-600'
                                                            }`}>
                                                                {dept.total.toFixed(0)} pts
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile/Tablet Card View */}
                                <div className="lg:hidden p-4 sm:p-6 space-y-4">
                                    {sortedDepartments.map((dept, index) => {
                                        const rank = index + 1
                                        const isTopThree = rank <= 3
                                        return (
                                            <div
                                                key={dept.id}
                                                className={`bg-white border-2 rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-200 ${
                                                    isTopThree 
                                                        ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50' 
                                                        : 'border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                                                        {rank <= 3 ? (
                                                            <span className="text-3xl sm:text-4xl flex-shrink-0">{getRankIcon(rank)}</span>
                                                        ) : (
                                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                                                                {rank}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`text-base sm:text-lg font-bold truncate ${
                                                                isTopThree ? 'text-indigo-900' : 'text-gray-900'
                                                            }`}>
                                                                {dept.name}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 truncate">{dept.email}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                                                    <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                                                        <div className="text-xs text-gray-500 mb-1">Events</div>
                                                        <div className="text-sm sm:text-base font-bold text-gray-900">{dept.events}</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                                                        <div className="text-xs text-gray-500 mb-1">Volunteers</div>
                                                        <div className="text-sm sm:text-base font-bold text-gray-900">{dept.volunteers}</div>
                                                    </div>
                                                    <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                                                        <div className="text-xs text-gray-500 mb-1">Donations</div>
                                                        <div className="text-sm sm:text-base font-bold text-gray-900">₱{(dept.donations / 1000).toFixed(0)}k</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs sm:text-sm text-gray-600 font-medium">Total Score</span>
                                                        <span className={`text-base sm:text-lg font-bold ${
                                                            rank === 1 ? 'text-yellow-600' :
                                                            rank === 2 ? 'text-gray-600' :
                                                            rank === 3 ? 'text-amber-700' :
                                                            'text-indigo-600'
                                                        }`}>
                                                            {dept.total.toFixed(0)} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No departments found</p>
                            </div>
                        )}
                    </div>
                )}

                {departments.length === 0 && !isLoading && (
                    <div className="text-center py-16">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        <p className="text-gray-500 text-lg">No departments found</p>
                    </div>
                )}
            </main>

            <Footer />

            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes fade-in-up {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes fade-in {
                        from {
                            opacity: 0;
                        }
                        to {
                            opacity: 1;
                        }
                    }
                    .animate-fade-in-up {
                        animation: fade-in-up 0.6s ease-out forwards;
                        opacity: 0;
                    }
                    .animate-fade-in {
                        animation: fade-in 0.5s ease-out forwards;
                        opacity: 0;
                    }
                `
            }} />
        </div>
    )
}

export default DepartmentLeaderboard

