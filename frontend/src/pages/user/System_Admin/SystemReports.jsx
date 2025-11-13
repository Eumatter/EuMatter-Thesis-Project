import React, { useContext, useState } from 'react'
import Button from '../../../components/Button'
import { AppContent } from '../../../context/AppContext.jsx'
import { useNavigate } from 'react-router-dom'
import SystemAdminSidebar from '../System_Admin/SystemAdminSidebar.jsx';

const SystemReports = () => {
    const navigate = useNavigate()
    const { userData } = useContext(AppContent)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                    {/* Header section of the reports page */}
                    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-2">System Reports</h1>
                            <p className="text-sm sm:text-base text-gray-600">Generate comprehensive system reports and analytics.</p>
                        </div>
                    </div>

                    {/* Report categories with modern hover effects */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                        {/* User Reports */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg sm:hover:scale-[1.01]">
                            <h3 className="text-lg sm:text-xl font-semibold text-black mb-4 sm:mb-6">User Reports</h3>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">User Registration Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Monthly user registration statistics</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">User Activity Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">User login and activity patterns</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Role Distribution Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Breakdown of users by role</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Event Reports */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg sm:hover:scale-[1.01]">
                            <h3 className="text-lg sm:text-xl font-semibold text-black mb-4 sm:mb-6">Event Reports</h3>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Event Creation Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Events created by departments</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Event Status Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Events by approval status</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Event Performance Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Event success metrics</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* System Reports */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg sm:hover:scale-[1.01]">
                            <h3 className="text-lg sm:text-xl font-semibold text-black mb-4 sm:mb-6">System Reports</h3>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">System Usage Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Overall system usage statistics</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Error Log Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">System errors and issues</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Security Audit Report</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Security events and access logs</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Financial Reports */}
                        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg sm:hover:scale-[1.01]">
                            <h3 className="text-lg sm:text-xl font-semibold text-black mb-4 sm:mb-6">Financial Reports</h3>
                            <div className="space-y-3 sm:space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Donation Summary</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Total donations and trends</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Department Financials</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Financial performance by department</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-gray-200 rounded-lg transition-colors duration-200 hover:bg-gray-50">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-black text-sm sm:text-base">Budget Utilization</h4>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Budget usage and allocation</p>
                                    </div>
                                    <Button variant="primary" size="sm" className="w-full sm:w-auto">
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-md p-4 sm:p-6 transform transition-all duration-300 hover:shadow-lg sm:hover:scale-[1.01]">
                        <h3 className="text-lg sm:text-xl font-semibold text-black mb-4 sm:mb-6">Export Options</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <Button variant="primary" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100">
                                Export as PDF
                            </Button>
                            <Button variant="primary" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100">
                                Export as Excel
                            </Button>
                            <Button variant="primary" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100">
                                Export as CSV
                            </Button>
                            <Button variant="primary" className="w-full border-gray-300 text-gray-700 hover:bg-gray-100">
                                Schedule Report
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default SystemReports