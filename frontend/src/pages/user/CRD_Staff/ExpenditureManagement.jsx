import React, { useContext, useState, useEffect } from 'react'
import { AppContent } from '../../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import LoadingSpinner from '../../../components/LoadingSpinner'
import axios from 'axios'
import { toast } from 'react-toastify'

const ExpenditureManagement = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    const [expenditures, setExpenditures] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingExpenditure, setEditingExpenditure] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterCategory, setFilterCategory] = useState('all')
    
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        amount: '',
        category: 'other',
        event: '',
        department: '',
        paymentMethod: 'cash',
        receiptNumber: '',
        receiptUrl: '',
        expenseDate: new Date().toISOString().split('T')[0],
        notes: ''
    })

    useEffect(() => {
        fetchExpenditures()
    }, [backendUrl])

    const fetchExpenditures = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            
            // Check if backendUrl is set
            if (!backendUrl) {
                console.error('Backend URL is not set')
                toast.error('Backend URL is not configured')
                setExpenditures([])
                setIsLoading(false)
                return
            }

            const response = await axios.get(`${backendUrl}api/expenditures`, {
                timeout: 10000, // 10 second timeout
                withCredentials: true
            })
            
            // Handle different response formats
            if (response.data) {
                if (Array.isArray(response.data)) {
                    setExpenditures(response.data)
                } else if (response.data.expenditures && Array.isArray(response.data.expenditures)) {
                    setExpenditures(response.data.expenditures)
                } else if (response.data.success && Array.isArray(response.data.data)) {
                    setExpenditures(response.data.data)
                } else {
                    setExpenditures([])
                }
            } else {
                setExpenditures([])
            }
        } catch (error) {
            console.error('Error fetching expenditures:', error)
            
            // Handle specific error types
            if (error.code === 'ERR_BLOCKED_BY_CLIENT' || error.message?.includes('blocked')) {
                toast.warning('Request blocked by browser extension. Please disable ad blockers or try incognito mode.')
            } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
                toast.error('Network error. Please check your connection and backend server.')
            } else if (error.response) {
                // Server responded with error status
                toast.error(error.response.data?.message || `Error: ${error.response.status}`)
            } else {
                toast.error('Failed to fetch expenditures. Please try again.')
            }
            
            setExpenditures([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            axios.defaults.withCredentials = true
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                event: formData.event || null,
                department: formData.department || null
            }

            if (editingExpenditure) {
                await axios.put(`${backendUrl}api/expenditures/${editingExpenditure._id}`, payload)
                toast.success('Expenditure updated successfully')
            } else {
                await axios.post(`${backendUrl}api/expenditures`, payload)
                toast.success('Expenditure created successfully')
            }

            setShowAddModal(false)
            setEditingExpenditure(null)
            resetForm()
            fetchExpenditures()
        } catch (error) {
            console.error('Error saving expenditure:', error)
            toast.error(error.response?.data?.message || 'Failed to save expenditure')
        }
    }

    const handleEdit = (expenditure) => {
        setEditingExpenditure(expenditure)
        setFormData({
            title: expenditure.title || '',
            description: expenditure.description || '',
            amount: expenditure.amount || '',
            category: expenditure.category || 'other',
            event: expenditure.event?._id || expenditure.event || '',
            department: expenditure.department?._id || expenditure.department || '',
            paymentMethod: expenditure.paymentMethod || 'cash',
            receiptNumber: expenditure.receiptNumber || '',
            receiptUrl: expenditure.receiptUrl || '',
            expenseDate: expenditure.expenseDate ? new Date(expenditure.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            notes: expenditure.notes || ''
        })
        setShowAddModal(true)
    }

    const handleApprove = async (id) => {
        try {
            axios.defaults.withCredentials = true
            await axios.post(`${backendUrl}api/expenditures/${id}/approve`)
            toast.success('Expenditure approved')
            fetchExpenditures()
        } catch (error) {
            console.error('Error approving expenditure:', error)
            toast.error(error.response?.data?.message || 'Failed to approve expenditure')
        }
    }

    const handleReject = async (id) => {
        const reason = prompt('Please provide a reason for rejection:')
        if (reason) {
            try {
                axios.defaults.withCredentials = true
                await axios.post(`${backendUrl}api/expenditures/${id}/reject`, { rejectionReason: reason })
                toast.success('Expenditure rejected')
                fetchExpenditures()
            } catch (error) {
                console.error('Error rejecting expenditure:', error)
                toast.error(error.response?.data?.message || 'Failed to reject expenditure')
            }
        }
    }

    const handleMarkAsPaid = async (id) => {
        try {
            axios.defaults.withCredentials = true
            await axios.post(`${backendUrl}api/expenditures/${id}/mark-paid`)
            toast.success('Expenditure marked as paid')
            fetchExpenditures()
        } catch (error) {
            console.error('Error marking as paid:', error)
            toast.error(error.response?.data?.message || 'Failed to mark as paid')
        }
    }

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            amount: '',
            category: 'other',
            event: '',
            department: '',
            paymentMethod: 'cash',
            receiptNumber: '',
            receiptUrl: '',
            expenseDate: new Date().toISOString().split('T')[0],
            notes: ''
        })
        setEditingExpenditure(null)
    }

    const filteredExpenditures = expenditures.filter(exp => {
        if (filterStatus !== 'all' && exp.status !== filterStatus) return false
        if (filterCategory !== 'all' && exp.category !== filterCategory) return false
        return true
    })

    const categories = ['event_expenses', 'operational', 'equipment', 'supplies', 'transportation', 'food', 'other']
    const paymentMethods = ['cash', 'check', 'bank_transfer', 'gcash', 'paymaya', 'other']

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <LoadingSpinner size="large" text="Loading expenditures..." />
                </div>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-md px-4 sm:px-6 py-5 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-black mb-2">Expenditure Management</h1>
                            <p className="text-gray-600">Track and manage organizational expenses</p>
                        </div>
                        <button
                            onClick={() => {
                                resetForm()
                                setShowAddModal(true)
                            }}
                            className="inline-flex items-center justify-center bg-gradient-to-r from-[#800020] to-[#9c0000] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-[#9c0000] hover:to-[#a0002a] transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Expenditure
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="paid">Paid</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Category</label>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => navigate('/crd-staff/reports')}
                                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                View Reports
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expenditures Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredExpenditures.map((exp) => (
                                    <tr key={exp._id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{exp.title}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{exp.category?.replace(/_/g, ' ') || 'Other'}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">₱{parseFloat(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{exp.paymentMethod?.replace(/_/g, ' ') || 'Cash'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                exp.status === 'approved' || exp.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                exp.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {exp.status?.charAt(0).toUpperCase() + exp.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(exp)}
                                                    className="text-[#800020] hover:text-[#9c0000] transition-colors"
                                                    title="Edit"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                {exp.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(exp._id)}
                                                            className="text-green-600 hover:text-green-700 transition-colors"
                                                            title="Approve"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(exp._id)}
                                                            className="text-red-600 hover:text-red-700 transition-colors"
                                                            title="Reject"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                                {exp.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleMarkAsPaid(exp._id)}
                                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                                        title="Mark as Paid"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExpenditures.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                            No expenditures found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add/Edit Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {editingExpenditure ? 'Edit Expenditure' : 'Add New Expenditure'}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setShowAddModal(false)
                                            resetForm()
                                        }}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                                        <input
                                            type="text"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            rows="3"
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₱) *</label>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleInputChange}
                                                required
                                                min="0"
                                                step="0.01"
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                                            <select
                                                name="paymentMethod"
                                                value={formData.paymentMethod}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                            >
                                                {paymentMethods.map(method => (
                                                    <option key={method} value={method}>{method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Expense Date *</label>
                                            <input
                                                type="date"
                                                name="expenseDate"
                                                value={formData.expenseDate}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt Number</label>
                                            <input
                                                type="text"
                                                name="receiptNumber"
                                                value={formData.receiptNumber}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Receipt URL</label>
                                            <input
                                                type="url"
                                                name="receiptUrl"
                                                value={formData.receiptUrl}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            rows="2"
                                            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddModal(false)
                                                resetForm()
                                            }}
                                            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-gradient-to-r from-[#800020] to-[#9c0000] text-white rounded-lg hover:from-[#9c0000] hover:to-[#a0002a] transition-all duration-200 font-medium shadow-md"
                                        >
                                            {editingExpenditure ? 'Update' : 'Create'} Expenditure
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    )
}

export default ExpenditureManagement

