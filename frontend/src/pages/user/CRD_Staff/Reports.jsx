import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const Reports = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    const [reportType, setReportType] = useState('utilization')
    const [dateRange, setDateRange] = useState('month')
    const [isGenerating, setIsGenerating] = useState(false)
    const [reportData, setReportData] = useState(null)

    const generateReport = async () => {
        setIsGenerating(true)
        try {
            // Simulate API call for report generation
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Mock report data
            const mockData = {
                utilization: {
                    totalEvents: 45,
                    approvedEvents: 38,
                    pendingEvents: 7,
                    volunteerParticipation: 234,
                    donationAmount: 125000,
                    topDepartments: [
                        { name: 'Community Development', events: 12, volunteers: 89 },
                        { name: 'Environmental Services', events: 8, volunteers: 67 },
                        { name: 'Health Department', events: 6, volunteers: 45 },
                        { name: 'Education Office', events: 5, volunteers: 33 }
                    ]
                },
                financial: {
                    totalDonations: 125000,
                    totalExpenses: 89000,
                    netRevenue: 36000,
                    donationBreakdown: [
                        { category: 'Community Development', amount: 45000, percentage: 36 },
                        { category: 'Environmental', amount: 32000, percentage: 25.6 },
                        { category: 'Health', amount: 28000, percentage: 22.4 },
                        { category: 'Education', amount: 20000, percentage: 16 }
                    ],
                    monthlyTrend: [
                        { month: 'Jan', donations: 15000, expenses: 12000 },
                        { month: 'Feb', donations: 18000, expenses: 14000 },
                        { month: 'Mar', donations: 22000, expenses: 16000 },
                        { month: 'Apr', donations: 19000, expenses: 15000 },
                        { month: 'May', donations: 25000, expenses: 18000 },
                        { month: 'Jun', donations: 26000, expenses: 14000 }
                    ]
                }
            }
            
            setReportData(mockData[reportType])
            toast.success('Report generated successfully!')
        } catch (error) {
            toast.error('Failed to generate report')
        } finally {
            setIsGenerating(false)
        }
    }

    const exportReport = () => {
        if (!reportData) return
        
        const dataStr = JSON.stringify(reportData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
        
        toast.success('Report exported successfully!')
    }

    const renderUtilizationReport = () => {
        if (!reportData) return null
        
        return (
            <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-black">{reportData.totalEvents}</p>
                                <p className="text-gray-600">Total Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-black">{reportData.approvedEvents}</p>
                                <p className="text-gray-600">Approved Events</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-black">{reportData.volunteerParticipation}</p>
                                <p className="text-gray-600">Volunteers</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-black">${reportData.donationAmount.toLocaleString()}</p>
                                <p className="text-gray-600">Donations</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Departments */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-xl font-semibold text-black mb-4">Top Performing Departments</h3>
                    <div className="space-y-4">
                        {reportData.topDepartments.map((dept, index) => (
                            <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                        <span className="text-sm font-bold text-red-900">{index + 1}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-black">{dept.name}</h4>
                                        <p className="text-sm text-gray-600">{dept.events} events, {dept.volunteers} volunteers</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-semibold text-black">{dept.events}</div>
                                    <div className="text-sm text-gray-600">events</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const renderFinancialReport = () => {
        if (!reportData) return null
        
        return (
            <div className="space-y-6">
                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-green-600">${reportData.totalDonations.toLocaleString()}</p>
                                <p className="text-gray-600">Total Donations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-red-600">${reportData.totalExpenses.toLocaleString()}</p>
                                <p className="text-gray-600">Total Expenses</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-2xl font-bold text-blue-600">${reportData.netRevenue.toLocaleString()}</p>
                                <p className="text-gray-600">Net Revenue</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Donation Breakdown */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-xl font-semibold text-black mb-4">Donation Breakdown by Category</h3>
                    <div className="space-y-4">
                        {reportData.donationBreakdown.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-900 rounded mr-3"></div>
                                    <span className="font-medium text-black">{item.category}</span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-red-900 h-2 rounded-full" 
                                            style={{ width: `${item.percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-black w-20 text-right">
                                        ${item.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-xl font-semibold text-black mb-4">Monthly Trend</h3>
                    <div className="space-y-3">
                        {reportData.monthlyTrend.map((month, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <span className="font-medium text-black">{month.month}</span>
                                <div className="flex space-x-6">
                                    <div className="text-right">
                                        <div className="text-sm text-gray-600">Donations</div>
                                        <div className="font-semibold text-green-600">${month.donations.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-600">Expenses</div>
                                        <div className="font-semibold text-red-600">${month.expenses.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-600">Net</div>
                                        <div className={`font-semibold ${month.donations - month.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${(month.donations - month.expenses).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-black mb-2">Reports & Analytics</h1>
                            <p className="text-gray-600">Generate utilization and financial reports for campaign management.</p>
                        </div>
                        {/* Back to Dashboard removed per CRD UX */}
                    </div>
                </div>

                {/* Report Controls */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-black mb-2">Report Type</label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                            >
                                <option value="utilization">Utilization Report</option>
                                <option value="financial">Financial Report</option>
                            </select>
                        </div>
                        
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-black mb-2">Date Range</label>
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                            >
                                <option value="week">Last Week</option>
                                <option value="month">Last Month</option>
                                <option value="quarter">Last Quarter</option>
                                <option value="year">Last Year</option>
                            </select>
                        </div>
                        
                        <div className="flex space-x-2">
                            <Button
                                onClick={generateReport}
                                disabled={isGenerating}
                            >
                                {isGenerating ? 'Generating...' : 'Generate Report'}
                            </Button>
                            
                            {reportData && (
                                <Button
                                    variant="outlineLight"
                                    onClick={exportReport}
                                    className="border-red-900 text-red-900 hover:bg-red-900 hover:text-white"
                                >
                                    Export
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                {reportData ? (
                    <div>
                        {reportType === 'utilization' ? renderUtilizationReport() : renderFinancialReport()}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-600 mb-2">No report generated</h3>
                        <p className="text-gray-500">Select a report type and date range, then click "Generate Report" to view analytics.</p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}

export default Reports
