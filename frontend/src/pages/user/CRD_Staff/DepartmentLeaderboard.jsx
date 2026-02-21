import React, { useContext, useState, useEffect } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useCache } from '../../../context/CacheContext.jsx'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'

const DepartmentLeaderboard = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    const { cachedGet } = useCache()
    const [departments, setDepartments] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filterPeriod, setFilterPeriod] = useState('all') // 'all', 'month', 'quarter', 'year'
    const [viewMode, setViewMode] = useState('podium') // 'podium' or 'table'

    useEffect(() => {
        fetchLeaderboardData()
    }, [filterPeriod])

    // Sample data for all 10 MSEUF departments (always available)
    const sampleDepartments = [
        { id: 'ced', name: 'CED - College of Education', email: 'ced@mseuf.edu.ph', events: 18, volunteers: 145, donations: 185000, total: 3195 },
        { id: 'cafa', name: 'CAFA - College of Architecture and Fine Arts', email: 'cafa@mseuf.edu.ph', events: 15, volunteers: 120, donations: 165000, total: 2805 },
        { id: 'ccjc', name: 'CCJC - College of Criminal Justice and Criminology', email: 'ccjc@mseuf.edu.ph', events: 14, volunteers: 110, donations: 155000, total: 2655 },
        { id: 'ceng', name: 'CENG - College of Engineering', email: 'ceng@mseuf.edu.ph', events: 13, volunteers: 105, donations: 150000, total: 2555 },
        { id: 'cnahs', name: 'CNAHS - College of Nursing and Allied Health Sciences', email: 'cnahs@mseuf.edu.ph', events: 12, volunteers: 95, donations: 140000, total: 2395 },
        { id: 'cas', name: 'CAS - College of Arts and Sciences', email: 'cas@mseuf.edu.ph', events: 11, volunteers: 85, donations: 130000, total: 2235 },
        { id: 'cba', name: 'CBA - College of Business and Accountancy', email: 'cba@mseuf.edu.ph', events: 10, volunteers: 80, donations: 125000, total: 2145 },
        { id: 'ccms', name: 'CCMS - College of Computing and Multimedia Studies', email: 'ccms@mseuf.edu.ph', events: 9, volunteers: 70, donations: 115000, total: 1995 },
        { id: 'cme', name: 'CME - College of Maritime Education', email: 'cme@mseuf.edu.ph', events: 8, volunteers: 65, donations: 105000, total: 1855 },
        { id: 'cihtm', name: 'CIHTM - College of International Tourism and Hospitality Management', email: 'cihtm@mseuf.edu.ph', events: 7, volunteers: 55, donations: 95000, total: 1700 },
    ]

    const fetchLeaderboardData = async () => {
        try {
            setIsLoading(true)

            // Fetch events and donations in parallel using cache (repeat visits are fast)
            const [events, donationsPayload] = await Promise.all([
                cachedGet('events', 'api/events', { forceRefresh: false }),
                cachedGet('donations', 'api/donations/all', { forceRefresh: false }).catch(() => ({ donations: [] }))
            ])

            const eventsList = Array.isArray(events) ? events : []
            const allDonations = donationsPayload?.donations || []

            // Build eventId -> total donation amount map once (O(donations) instead of O(events * donations))
            const eventDonationsMap = new Map()
            for (const donation of allDonations) {
                if (donation.status !== 'succeeded' && donation.status !== 'cash_completed') continue
                const eventId = donation.event?._id?.toString() || donation.event?.toString()
                if (!eventId) continue
                const amount = parseFloat(donation.amount) || 0
                eventDonationsMap.set(eventId, (eventDonationsMap.get(eventId) || 0) + amount)
            }

            // Start with sample departments as baseline
            const departmentMap = new Map()
            sampleDepartments.forEach(dept => {
                departmentMap.set(dept.id, { ...dept })
            })

            // Filter events: Only events created by Department/Organization role users
            const filteredEvents = eventsList.filter(event => {
                if (!event.createdBy) return false
                const isDepartmentRole = event.createdBy.role === 'Department/Organization'
                if (event.eventCategory) {
                    const isCommunityEvent = event.eventCategory === 'community_relations' ||
                        event.eventCategory === 'community_extension'
                    return isDepartmentRole && isCommunityEvent
                }
                return isDepartmentRole
            })

            // Process real data and merge with sample data
            for (const event of filteredEvents) {
                if (!event.createdBy || !event.createdBy._id) continue
                if (event.createdBy.role !== 'Department/Organization') continue

                const deptId = event.createdBy._id.toString()
                const deptName = event.createdBy.name || 'Unknown Department'
                const deptEmail = event.createdBy.email || ''
                const eventId = event._id?.toString() || event._id?.toString()

                let matchedSampleId = null
                const deptNameUpper = deptName.toUpperCase()
                for (const sample of sampleDepartments) {
                    const sampleAcronym = sample.name.split(' - ')[0].toUpperCase()
                    if (deptNameUpper.includes(sampleAcronym) ||
                        sample.name.toUpperCase().includes(deptNameUpper.split(' - ')[0] || '')) {
                        matchedSampleId = sample.id
                        break
                    }
                }

                const mapKey = matchedSampleId || deptId
                if (!departmentMap.has(mapKey)) {
                    departmentMap.set(mapKey, {
                        id: mapKey,
                        name: matchedSampleId ? sampleDepartments.find(s => s.id === matchedSampleId).name : deptName,
                        email: matchedSampleId ? sampleDepartments.find(s => s.id === matchedSampleId).email : deptEmail,
                        events: 0,
                        volunteers: 0,
                        donations: 0,
                        total: 0
                    })
                }

                const dept = departmentMap.get(mapKey)
                if (matchedSampleId) {
                    const sampleDept = sampleDepartments.find(s => s.id === matchedSampleId)
                    if (dept.events === sampleDept.events && dept.volunteers === sampleDept.volunteers && dept.donations === sampleDept.donations) {
                        dept.events = 0
                        dept.volunteers = 0
                        dept.donations = 0
                    }
                }

                dept.events += 1

                if (event.volunteerRegistrations && Array.isArray(event.volunteerRegistrations)) {
                    const uniqueVolunteers = new Set()
                    event.volunteerRegistrations.forEach(reg => {
                        const userId = reg.user?._id?.toString() || reg.user?.toString()
                        if (userId) uniqueVolunteers.add(userId)
                    })
                    dept.volunteers += uniqueVolunteers.size
                } else if (event.volunteers && Array.isArray(event.volunteers)) {
                    dept.volunteers += event.volunteers.length
                }

                let eventDonations = eventDonationsMap.get(eventId) || 0
                if (eventDonations === 0 && event.donations && Array.isArray(event.donations)) {
                    eventDonations = event.donations
                        .filter(d => d.status === 'succeeded')
                        .reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0)
                }
                dept.donations += eventDonations
            }

            const departmentsArray = Array.from(departmentMap.values()).map(dept => ({
                ...dept,
                total: (dept.events * 1) + (dept.volunteers * 0.5) + (dept.donations * 0.01)
            }))
            departmentsArray.sort((a, b) => b.total - a.total)
            setDepartments(departmentsArray)
        } catch (error) {
            console.error('Error fetching leaderboard data:', error)
            setDepartments(sampleDepartments)
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

    // Departments are already sorted by total score from fetchLeaderboardData
    // No additional sorting needed - always sorted by total score
    const topThree = departments.slice(0, 3)
    const rest = departments.slice(3)

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
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800000, #900000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Leaderboards</h1>
                            <p className="text-gray-600 text-base sm:text-lg">Recognizing top-performing departments and their contributions</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setViewMode('podium')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                        viewMode === 'podium'
                                            ? 'bg-white shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    style={viewMode === 'podium' ? {
                                        backgroundImage: 'linear-gradient(to right, #800020, #9c0000)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    } : {}}
                                >
                                    Podium
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                                        viewMode === 'table'
                                            ? 'bg-white shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                    style={viewMode === 'table' ? {
                                        backgroundImage: 'linear-gradient(to right, #800020, #9c0000)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text'
                                    } : {}}
                                >
                                    Table
                                </button>
                            </div>
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
                        {topThree[1] && (() => {
                            const nameParts = topThree[1].name.split(' - ')
                            const acronym = nameParts[0] || topThree[1].name
                            const fullName = nameParts[1] || ''
                            return (
                            <div className="flex-1 max-w-[200px] sm:max-w-[250px] lg:max-w-[280px] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className={`bg-gradient-to-b ${getRankColor(2)} rounded-t-2xl ${getPodiumHeight(2)} flex flex-col items-center justify-between p-4 sm:p-5 lg:p-6 shadow-xl relative overflow-hidden`}>
                                    {/* Medal Icon */}
                                    <div className="absolute top-2 right-2 text-2xl sm:text-3xl opacity-25">🥈</div>
                                    
                                    {/* Top Section: Rank Number */}
                                    <div className="flex-1 flex flex-col items-center justify-center w-full pt-2">
                                        <div className="text-white text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-5 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                                            2
                                        </div>
                                        
                                        {/* Department Info Container */}
                                        <div className="w-full px-3 sm:px-4 space-y-2 sm:space-y-2.5 flex-1 flex flex-col justify-center">
                                            {/* Acronym - Prominent */}
                                            <div className="text-white text-lg sm:text-xl lg:text-2xl font-bold text-center leading-tight tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                                                {acronym}
                                            </div>
                                            {/* Full Name - Below Acronym */}
                                            {fullName && (
                                                <div className="text-white text-xs sm:text-sm lg:text-base font-medium text-center leading-relaxed px-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                                    {fullName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Bottom Section: Total Score */}
                                    <div className="w-full pt-2 pb-1">
                                        <div className="text-white text-sm sm:text-base lg:text-lg font-bold text-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                            {topThree[1].total.toFixed(0)} pts
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Stats Section */}
                                <div className="bg-white rounded-b-xl shadow-lg p-3 sm:p-4 lg:p-5 -mt-1 relative z-10">
                                    <div className="space-y-2 sm:space-y-2.5 text-center">
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">{topThree[1].events}</span>
                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Events</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">{topThree[1].volunteers}</span>
                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Volunteers</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">₱{(topThree[1].donations / 1000).toFixed(0)}k</span>
                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Donations</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )
                        })()}

                        {/* 1st Place */}
                        {topThree[0] && (() => {
                            const nameParts = topThree[0].name.split(' - ')
                            const acronym = nameParts[0] || topThree[0].name
                            const fullName = nameParts[1] || ''
                            return (
                            <div className="flex-1 max-w-[220px] sm:max-w-[280px] lg:max-w-[320px] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                <div className={`bg-gradient-to-b ${getRankColor(1)} rounded-t-2xl ${getPodiumHeight(1)} flex flex-col items-center justify-between p-5 sm:p-6 lg:p-8 shadow-2xl relative overflow-hidden border-4 border-yellow-300`}>
                                    {/* Crown Icon */}
                                    <div className="absolute top-2 right-2 text-3xl sm:text-4xl lg:text-5xl opacity-30 animate-bounce">👑</div>
                                    
                                    {/* Top Section: Rank Number */}
                                    <div className="flex-1 flex flex-col items-center justify-center w-full pt-2">
                                        <div className="text-white text-5xl sm:text-6xl lg:text-7xl font-extrabold mb-5 sm:mb-6 drop-shadow-xl" style={{ textShadow: '0 3px 10px rgba(0,0,0,0.4)' }}>
                                            1
                                        </div>
                                        
                                        {/* Department Info Container */}
                                        <div className="w-full px-3 sm:px-4 lg:px-5 space-y-2.5 sm:space-y-3 flex-1 flex flex-col justify-center">
                                            {/* Acronym - Prominent */}
                                            <div className="text-white text-xl sm:text-2xl lg:text-3xl font-bold text-center leading-tight tracking-wider" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                                                {acronym}
                                            </div>
                                            {/* Full Name - Below Acronym */}
                                            {fullName && (
                                                <div className="text-white text-sm sm:text-base lg:text-lg font-medium text-center leading-relaxed px-2 line-clamp-2 min-h-[3rem] sm:min-h-[3.5rem] flex items-center justify-center" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                                                    {fullName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Bottom Section: Total Score */}
                                    <div className="w-full pt-2 pb-1">
                                        <div className="text-white text-base sm:text-lg lg:text-xl font-bold text-center" style={{ textShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                                            {topThree[0].total.toFixed(0)} pts
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Stats Section */}
                                <div className="bg-white rounded-b-xl shadow-xl p-4 sm:p-5 lg:p-6 -mt-1 relative z-10 border-2 border-yellow-200">
                                    <div className="space-y-2.5 sm:space-y-3 text-center">
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-base sm:text-lg font-bold text-gray-900">{topThree[0].events}</span>
                                            <span className="text-sm sm:text-base text-gray-600 font-medium">Events</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-base sm:text-lg font-bold text-gray-900">{topThree[0].volunteers}</span>
                                            <span className="text-sm sm:text-base text-gray-600 font-medium">Volunteers</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-base sm:text-lg font-bold text-gray-900">₱{(topThree[0].donations / 1000).toFixed(0)}k</span>
                                            <span className="text-sm sm:text-base text-gray-600 font-medium">Donations</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )
                        })()}

                        {/* 3rd Place */}
                        {topThree[2] && (() => {
                            const nameParts = topThree[2].name.split(' - ')
                            const acronym = nameParts[0] || topThree[2].name
                            const fullName = nameParts[1] || ''
                            return (
                            <div className="flex-1 max-w-[200px] sm:max-w-[250px] lg:max-w-[280px] animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                <div className={`bg-gradient-to-b ${getRankColor(3)} rounded-t-2xl ${getPodiumHeight(3)} flex flex-col items-center justify-between p-4 sm:p-5 lg:p-6 shadow-xl relative overflow-hidden`}>
                                    {/* Medal Icon */}
                                    <div className="absolute top-2 right-2 text-2xl sm:text-3xl opacity-25">🥉</div>
                                    
                                    {/* Top Section: Rank Number */}
                                    <div className="flex-1 flex flex-col items-center justify-center w-full pt-2">
                                        <div className="text-white text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-5 drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                                            3
                                        </div>
                                        
                                        {/* Department Info Container */}
                                        <div className="w-full px-3 sm:px-4 space-y-2 sm:space-y-2.5 flex-1 flex flex-col justify-center">
                                            {/* Acronym - Prominent */}
                                            <div className="text-white text-lg sm:text-xl lg:text-2xl font-bold text-center leading-tight tracking-wider" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                                                {acronym}
                                            </div>
                                            {/* Full Name - Below Acronym */}
                                            {fullName && (
                                                <div className="text-white text-xs sm:text-sm lg:text-base font-medium text-center leading-relaxed px-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] flex items-center justify-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                                    {fullName}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Bottom Section: Total Score */}
                                    <div className="w-full pt-2 pb-1">
                                        <div className="text-white text-sm sm:text-base lg:text-lg font-bold text-center" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
                                            {topThree[2].total.toFixed(0)} pts
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Stats Section */}
                                <div className="bg-white rounded-b-xl shadow-lg p-3 sm:p-4 lg:p-5 -mt-1 relative z-10">
                                    <div className="space-y-2 sm:space-y-2.5 text-center">
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">{topThree[2].events}</span>
                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Events</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">{topThree[2].volunteers}</span>
                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Volunteers</span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-2 sm:space-x-2.5">
                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span className="text-sm sm:text-base font-bold text-gray-900">₱{(topThree[2].donations / 1000).toFixed(0)}k</span>
                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Donations</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            )
                        })()}
                    </div>
                </div>

                        {/* Rest of the Leaderboard */}
                        {rest.length > 0 && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">All Departments</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {rest.map((dept, index) => {
                                        const rank = index + 4
                                        // Split department name into acronym and full name
                                        const nameParts = dept.name.split(' - ')
                                        const acronym = nameParts[0] || dept.name
                                        const fullName = nameParts[1] || ''
                                        
                                        return (
                                            <div
                                                key={dept.id}
                                                className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] animate-fade-in"
                                                style={{ animationDelay: `${(index + 3) * 0.1}s` }}
                                            >
                                                {/* Header Section - Rank and Department Name */}
                                                <div className="mb-4 sm:mb-5">
                                                    <div className="flex items-start gap-3 sm:gap-4">
                                                        {/* Rank Badge */}
                                                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg sm:text-xl lg:text-2xl shadow-md flex-shrink-0">
                                                            {rank}
                                                        </div>
                                                        
                                                        {/* Department Name - Split Layout */}
                                                        <div className="flex-1 min-w-0">
                                                            {/* Acronym - Prominent */}
                                                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 mb-1 leading-tight">
                                                                {acronym}
                                                            </h3>
                                                            {/* Full Name - Below Acronym */}
                                                            {fullName && (
                                                                <p className="text-xs sm:text-sm text-gray-600 leading-snug line-clamp-2">
                                                                    {fullName}
                                                                </p>
                                                            )}
                                                            {/* Email - Smaller, below full name */}
                                                            <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate" title={dept.email}>
                                                                {dept.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Stats Section */}
                                                <div className="space-y-2.5 sm:space-y-3">
                                                    {/* Events */}
                                                    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center space-x-2 sm:space-x-2.5">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Events</span>
                                                        </div>
                                                        <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">{dept.events}</span>
                                                    </div>
                                                    
                                                    {/* Volunteers */}
                                                    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center space-x-2 sm:space-x-2.5">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Volunteers</span>
                                                        </div>
                                                        <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">{dept.volunteers}</span>
                                                    </div>
                                                    
                                                    {/* Donations */}
                                                    <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center space-x-2 sm:space-x-2.5">
                                                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                                            </svg>
                                                            <span className="text-xs sm:text-sm text-gray-600 font-medium">Donations</span>
                                                        </div>
                                                        <span className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">₱{dept.donations.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {/* Total Score */}
                                                    <div className="pt-2.5 sm:pt-3 border-t-2 border-gray-200">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs sm:text-sm text-gray-600 font-semibold">Total Score</span>
                                                            <span className="text-base sm:text-lg lg:text-xl font-bold text-indigo-600">{dept.total.toFixed(0)} pts</span>
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

                        {departments.length > 0 ? (
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
                                            {departments.map((dept, index) => {
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
                                    {departments.map((dept, index) => {
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

