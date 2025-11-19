import React, { useContext, useState, useEffect, useCallback } from 'react'
import { AppContent } from '../../../context/AppContext.jsx'
import { useNavigate } from 'react-router-dom'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx'
import AuditLogTable from '../../../components/AuditLogTable.jsx'
import LoadingSpinner from '../../../components/LoadingSpinner'
import axios from 'axios'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'
import { 
    MagnifyingGlassIcon, 
    FunnelIcon, 
    ArrowPathIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

// Category definitions
const AUDIT_CATEGORIES = [
    { id: 'Authentication & Authorization', label: 'Authentication & Authorization' },
    { id: 'User Management', label: 'User Management' },
    { id: 'System Administrator Actions', label: 'System Administrator Actions' },
    { id: 'Wallet Management', label: 'Wallet Management' },
    { id: 'Event Management', label: 'Event Management' },
    { id: 'Donation Transactions', label: 'Donation Transactions' },
    { id: 'Volunteer Management', label: 'Volunteer Management' },
    { id: 'Data Access & Privacy', label: 'Data Access & Privacy' },
    { id: 'System Operations', label: 'System Operations' },
    { id: 'Content Management', label: 'Content Management' },
    { id: 'Settings & Configuration', label: 'Settings & Configuration' },
    { id: 'Reports & Analytics', label: 'Reports & Analytics' },
    { id: 'Integration Events', label: 'Integration Events' },
    { id: 'Compliance & Audit', label: 'Compliance & Audit' },
    { id: 'Department/Organization Actions', label: 'Department/Organization Actions' }
];

const PRIORITY_OPTIONS = [
    { value: '', label: 'All Priorities' },
    { value: 'Critical', label: 'Critical' },
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
];

const SystemReports = () => {
    const navigate = useNavigate()
    const { userData, backendUrl } = useContext(AppContent)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    
    // Audit log state
    const [logs, setLogs] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1
    })
    
    // Filter state
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedPriority, setSelectedPriority] = useState('')
    const [selectedSuccess, setSelectedSuccess] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [showFilters, setShowFilters] = useState(false)
    
    // Sorting state
    const [sortField, setSortField] = useState('timestamp')
    const [sortDirection, setSortDirection] = useState('desc')
    
    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [refreshInterval, setRefreshInterval] = useState(null)

    // Fetch audit logs
    const fetchAuditLogs = useCallback(async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                sortBy: sortField,
                sortOrder: sortDirection
            })
            
            if (selectedCategory) params.append('category', selectedCategory)
            if (selectedPriority) params.append('priority', selectedPriority)
            if (selectedSuccess !== '') params.append('success', selectedSuccess)
            if (searchTerm) params.append('search', searchTerm)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)
            
            const url = selectedCategory && selectedCategory !== 'all'
                ? `${backendUrl}api/audit-logs/category/${encodeURIComponent(selectedCategory)}`
                : `${backendUrl}api/audit-logs`
            
            const response = await axios.get(`${url}?${params.toString()}`)
            
            if (response.data.success) {
                setLogs(response.data.logs || [])
                setPagination(response.data.pagination || pagination)
            } else {
                toast.error('Failed to fetch audit logs')
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error)
            if (error.response?.status === 403) {
                toast.error('You do not have permission to view audit logs')
            } else {
                toast.error('Failed to fetch audit logs')
            }
        } finally {
            setIsLoading(false)
        }
    }, [backendUrl, pagination.page, pagination.limit, selectedCategory, selectedPriority, selectedSuccess, searchTerm, startDate, endDate, sortField, sortDirection])

    // Initial fetch when filters change
    useEffect(() => {
        fetchAuditLogs()
    }, [fetchAuditLogs])

    // Auto-refresh effect
    useEffect(() => {
        if (!autoRefresh) {
            if (refreshInterval) {
                clearInterval(refreshInterval)
                setRefreshInterval(null)
            }
            return
        }

        const interval = setInterval(() => {
            fetchAuditLogs()
        }, 10000) // 10 seconds
        
        setRefreshInterval(interval)
        
        return () => {
            clearInterval(interval)
        }
    }, [autoRefresh, fetchAuditLogs])

    // Handle page change
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }))
        }
    }
    
    // Handle page size change
    const handlePageSizeChange = (newLimit) => {
        setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }))
    }

    // Handle sort
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    // Handle category filter
    const handleCategoryFilter = (category) => {
        setSelectedCategory(category === 'all' ? '' : category)
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    // Handle filter reset
    const handleResetFilters = () => {
        setSelectedCategory('')
        setSelectedPriority('')
        setSelectedSuccess('')
        setSearchTerm('')
        setStartDate('')
        setEndDate('')
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    // Handle export
    const handleExport = async (format) => {
        try {
            if (logs.length === 0) {
                toast.warning('No audit logs to export')
                return
            }

            toast.info(`Exporting audit logs as ${format.toUpperCase()}...`)

            if (format === 'csv') {
                // CSV Export
                const headers = [
                    'Timestamp',
                    'User Email',
                    'User Name',
                    'User Role',
                    'Action Type',
                    'Category',
                    'Resource Type',
                    'Resource ID',
                    'IP Address',
                    'Status',
                    'Priority',
                    'Request Method',
                    'Request Endpoint',
                    'Response Status',
                    'Error Message'
                ]

                const csvRows = [
                    headers.join(','),
                    ...logs.map(log => {
                        const formatDate = (dateString) => {
                            if (!dateString) return ''
                            try {
                                return new Date(dateString).toISOString()
                            } catch {
                                return ''
                            }
                        }

                        const escapeCSV = (value) => {
                            if (value === null || value === undefined) return ''
                            const stringValue = String(value)
                            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                                return `"${stringValue.replace(/"/g, '""')}"`
                            }
                            return stringValue
                        }

                        return [
                            formatDate(log.timestamp),
                            escapeCSV(log.userEmail || ''),
                            escapeCSV(log.userName || ''),
                            escapeCSV(log.userRole || ''),
                            escapeCSV(log.actionType || ''),
                            escapeCSV(log.category || ''),
                            escapeCSV(log.resourceType || ''),
                            escapeCSV(log.resourceId || ''),
                            escapeCSV(log.ipAddress || ''),
                            log.success ? 'Success' : 'Failure',
                            escapeCSV(log.priority || ''),
                            escapeCSV(log.requestMethod || ''),
                            escapeCSV(log.requestEndpoint || ''),
                            log.responseStatus || '',
                            escapeCSV(log.errorMessage || '')
                        ].join(',')
                    })
                ]

                const csvContent = csvRows.join('\n')
                // Add BOM (Byte Order Mark) for UTF-8 to ensure Excel opens it correctly with proper encoding
                const BOM = '\uFEFF'
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.setAttribute('download', `audit-logs${selectedCategory ? `-${selectedCategory.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}-${new Date().toISOString().split('T')[0]}.csv`)
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                // Clean up after a delay to ensure download starts
                setTimeout(() => {
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                }, 100)
                toast.success('Audit logs exported as CSV successfully!')
            } else if (format === 'excel') {
                // Excel Export (as CSV with .xlsx extension, or use a library)
                // For now, we'll export as CSV but with .xlsx extension
                // In production, you might want to use a library like xlsx
                const headers = [
                    'Timestamp',
                    'User Email',
                    'User Name',
                    'User Role',
                    'Action Type',
                    'Category',
                    'Resource Type',
                    'Resource ID',
                    'IP Address',
                    'Status',
                    'Priority',
                    'Request Method',
                    'Request Endpoint',
                    'Response Status',
                    'Error Message'
                ]

                const csvRows = [
                    headers.join(','),
                    ...logs.map(log => {
                        const formatDate = (dateString) => {
                            if (!dateString) return ''
                            try {
                                return new Date(dateString).toISOString()
                            } catch {
                                return ''
                            }
                        }

                        const escapeCSV = (value) => {
                            if (value === null || value === undefined) return ''
                            const stringValue = String(value)
                            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                                return `"${stringValue.replace(/"/g, '""')}"`
                            }
                            return stringValue
                        }

                        return [
                            formatDate(log.timestamp),
                            escapeCSV(log.userEmail || ''),
                            escapeCSV(log.userName || ''),
                            escapeCSV(log.userRole || ''),
                            escapeCSV(log.actionType || ''),
                            escapeCSV(log.category || ''),
                            escapeCSV(log.resourceType || ''),
                            escapeCSV(log.resourceId || ''),
                            escapeCSV(log.ipAddress || ''),
                            log.success ? 'Success' : 'Failure',
                            escapeCSV(log.priority || ''),
                            escapeCSV(log.requestMethod || ''),
                            escapeCSV(log.requestEndpoint || ''),
                            log.responseStatus || '',
                            escapeCSV(log.errorMessage || '')
                        ].join(',')
                    })
                ]

                const csvContent = csvRows.join('\n')
                // Convert to Excel-compatible format (tab-separated with BOM for UTF-8)
                const BOM = '\uFEFF'
                const excelContent = BOM + csvContent.replace(/,/g, '\t')
                const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.setAttribute('download', `audit-logs${selectedCategory ? `-${selectedCategory.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}-${new Date().toISOString().split('T')[0]}.xls`)
                a.style.display = 'none'
                document.body.appendChild(a)
                a.click()
                // Clean up after a delay to ensure download starts
                setTimeout(() => {
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                }, 100)
                toast.success('Audit logs exported as Excel successfully!')
            } else if (format === 'pdf') {
                // PDF Export using jsPDF
                try {
                    const doc = new jsPDF('landscape', 'mm', 'a4')
                    const pageHeight = doc.internal.pageSize.getHeight()
                    const margin = 10
                    const tableStartY = 40
                    let currentY = tableStartY
                    const rowHeight = 8
                    const fontSize = 8
                    
                    // Header
                    doc.setFillColor(128, 0, 0) // #800000
                    doc.setTextColor(255, 255, 255)
                    doc.setFontSize(16)
                    doc.setFont('helvetica', 'bold')
                    doc.text('System Audit Logs Report', margin, 15)
                    
                    // Metadata
                    doc.setFontSize(10)
                    doc.setFont('helvetica', 'normal')
                    doc.setTextColor(0, 0, 0)
                    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22)
                    if (selectedCategory) {
                        doc.text(`Category: ${selectedCategory}`, margin, 27)
                    }
                    doc.text(`Total Records: ${logs.length}`, margin, selectedCategory ? 32 : 27)
                    
                    // Table headers
                    const headers = ['Timestamp', 'User', 'Action', 'Category', 'Resource', 'Status', 'Priority']
                    const colWidths = [35, 35, 35, 40, 30, 20, 25]
                    let currentX = margin
                    
                    doc.setFillColor(128, 0, 0)
                    doc.setTextColor(255, 255, 255)
                    doc.setFontSize(fontSize)
                    doc.setFont('helvetica', 'bold')
                    
                    headers.forEach((header, i) => {
                        doc.rect(currentX, currentY, colWidths[i], rowHeight, 'F')
                        doc.text(header, currentX + 2, currentY + 5)
                        currentX += colWidths[i]
                    })
                    
                    currentY += rowHeight
                    doc.setTextColor(0, 0, 0)
                    doc.setFont('helvetica', 'normal')
                    
                    // Table rows
                    logs.forEach((log, index) => {
                        // Check if we need a new page
                        if (currentY + rowHeight > pageHeight - margin) {
                            doc.addPage()
                            currentY = margin
                            
                            // Redraw headers on new page
                            currentX = margin
                            doc.setFillColor(128, 0, 0)
                            doc.setTextColor(255, 255, 255)
                            doc.setFont('helvetica', 'bold')
                            headers.forEach((header, i) => {
                                doc.rect(currentX, currentY, colWidths[i], rowHeight, 'F')
                                doc.text(header, currentX + 2, currentY + 5)
                                currentX += colWidths[i]
                            })
                            currentY += rowHeight
                            doc.setTextColor(0, 0, 0)
                            doc.setFont('helvetica', 'normal')
                        }
                        
                        const formatDate = (dateString) => {
                            if (!dateString) return 'N/A'
                            try {
                                const date = new Date(dateString)
                                return date.toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })
                            } catch {
                                return 'Invalid Date'
                            }
                        }
                        
                        const rowData = [
                            formatDate(log.timestamp),
                            (log.userEmail || log.userName || 'System').substring(0, 20),
                            (log.actionType || '').substring(0, 20),
                            (log.category || '').substring(0, 25),
                            (log.resourceType || 'N/A').substring(0, 18),
                            log.success ? 'Success' : 'Failure',
                            (log.priority || '').substring(0, 12)
                        ]
                        
                        currentX = margin
                        rowData.forEach((cell, i) => {
                            doc.text(cell, currentX + 2, currentY + 5)
                            doc.rect(currentX, currentY, colWidths[i], rowHeight, 'S')
                            currentX += colWidths[i]
                        })
                        
                        currentY += rowHeight
                    })
                    
                    // Save PDF
                    const dateStr = new Date().toISOString().split('T')[0]
                    const categoryStr = selectedCategory ? `-${selectedCategory.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
                    doc.save(`audit-logs${categoryStr}-${dateStr}.pdf`)
                    toast.success('Audit logs exported as PDF successfully!')
                } catch (error) {
                    console.error('PDF export error:', error)
                    toast.error('Failed to generate PDF. Please try again.')
                }
            }
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Failed to export audit logs')
        }
    }

    // Get today's date for max date
    const today = new Date().toISOString().split('T')[0]

    return (
        <div className="bg-gray-50 min-h-screen">
            <SystemAdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <main className="lg:ml-64 xl:ml-72 min-h-screen overflow-y-auto">
                {/* Mobile Menu Button */}
                <div className="lg:hidden sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-[#800000] hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="ml-3 text-xl font-bold text-[#800000]">System Admin</h1>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* Header Section */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports</h1>
                                <p className="text-gray-600 text-lg">Monitor and track all system activities and audit logs</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        autoRefresh
                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <ArrowPathIcon className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                                        {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                                    </div>
                                </button>
                                <button
                                    onClick={fetchAuditLogs}
                                    className="px-4 py-2 text-sm font-medium text-[#800000] bg-white border border-[#800000] rounded-lg hover:bg-[#800000] hover:text-white transition-colors"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-black">Filters</h2>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-[#800000] transition-colors"
                            >
                                <FunnelIcon className="w-5 h-5" />
                                {showFilters ? 'Hide' : 'Show'} Filters
                            </button>
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Search */}
                                <div className="lg:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Search
                                    </label>
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Search by action, user, or resource..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                        />
                                    </div>
                                </div>

                                {/* Date Range */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        max={today}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        max={today}
                                        min={startDate}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    />
                                </div>

                                {/* Priority Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority
                                    </label>
                                    <select
                                        value={selectedPriority}
                                        onChange={(e) => setSelectedPriority(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    >
                                        {PRIORITY_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Success Filter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={selectedSuccess}
                                        onChange={(e) => setSelectedSuccess(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                                    >
                                        <option value="">All Status</option>
                                        <option value="true">Success</option>
                                        <option value="false">Failure</option>
                                    </select>
                                </div>

                                {/* Reset Button */}
                                <div className="flex items-end">
                                    <button
                                        onClick={handleResetFilters}
                                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Apply Filters Button */}
                        {showFilters && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={fetchAuditLogs}
                                    className="px-6 py-2 text-sm font-medium text-white bg-[#800000] rounded-lg hover:bg-[#900000] transition-colors"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Main Audit Log Table */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <h2 className="text-lg font-semibold text-black">
                                Audit Logs {selectedCategory && `- ${selectedCategory}`}
                            </h2>
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Page Size Selector */}
                                <div className="flex items-center gap-2">
                                    <label htmlFor="pageSize" className="text-sm text-gray-700 whitespace-nowrap">
                                        Show:
                                    </label>
                                    <select
                                        id="pageSize"
                                        value={pagination.limit}
                                        onChange={(e) => handlePageSizeChange(e.target.value)}
                                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#800000] focus:border-[#800000] bg-white"
                                    >
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                        <option value="200">200</option>
                                    </select>
                                    <span className="text-sm text-gray-600 whitespace-nowrap">per page</span>
                                </div>
                                
                                {/* Export Buttons */}
                                <div className="flex items-center gap-2 border-l border-gray-300 pl-3">
                                    <button
                                        onClick={() => handleExport('pdf')}
                                        className="px-3 py-2 text-sm text-gray-700 hover:text-[#800000] transition-colors flex items-center gap-2 rounded-lg hover:bg-gray-100"
                                        title="Export as PDF"
                                    >
                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">PDF</span>
                                    </button>
                                    <button
                                        onClick={() => handleExport('excel')}
                                        className="px-3 py-2 text-sm text-gray-700 hover:text-[#800000] transition-colors flex items-center gap-2 rounded-lg hover:bg-gray-100"
                                        title="Export as Excel"
                                    >
                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">Excel</span>
                                    </button>
                                    <button
                                        onClick={() => handleExport('csv')}
                                        className="px-3 py-2 text-sm text-gray-700 hover:text-[#800000] transition-colors flex items-center gap-2 rounded-lg hover:bg-gray-100"
                                        title="Export as CSV"
                                    >
                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                        <span className="hidden sm:inline">CSV</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isLoading && logs.length === 0 ? (
                            <div className="flex justify-center items-center py-12">
                                <LoadingSpinner />
                            </div>
                        ) : (
                            <AuditLogTable
                                logs={logs}
                                isLoading={isLoading}
                                pagination={pagination}
                                onPageChange={handlePageChange}
                                onSort={handleSort}
                                sortField={sortField}
                                sortDirection={sortDirection}
                            />
                        )}
                    </div>

                    {/* Category Filter Links */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-black mb-4">Filter by Category</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <button
                                onClick={() => handleCategoryFilter('all')}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                                    !selectedCategory
                                        ? 'bg-[#800000] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                All Categories
                            </button>
                            {AUDIT_CATEGORIES.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => handleCategoryFilter(category.id)}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                                        selectedCategory === category.id
                                            ? 'bg-[#800000] text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default SystemReports
