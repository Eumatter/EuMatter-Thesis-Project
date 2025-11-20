import React, { useContext, useState, useEffect, useMemo } from 'react'
// Shared UI helper classes
const inputBase = 'w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-gray-400'
const controlLabel = 'block text-sm font-medium text-gray-700 mb-2'
import RichTextEditor from '../../../components/RichTextEditor'
// Fallback simple editor to avoid peer deps issues
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { FaEye, FaEdit, FaTrash, FaClock, FaCheckCircle, FaTimesCircle, FaListAlt } from 'react-icons/fa'

const EventManagement = () => {
    const navigate = useNavigate()
    const { backendUrl, userData } = useContext(AppContent)
    
    // State management
    const [events, setEvents] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState('pending') // pending, approved, declined
    const [searchTerm, setSearchTerm] = useState('')
    const [sortBy, setSortBy] = useState('createdAt')
    const [sortOrder, setSortOrder] = useState('desc')
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    
    // Modal states
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
    const [reviewComment, setReviewComment] = useState('')
    // Create Event (CRD) modal state
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createForm, setCreateForm] = useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        isOpenForDonation: false,
        isOpenForVolunteer: false,
        status: 'Pending'
    })
    const [createImageFile, setCreateImageFile] = useState(null)
    const [createDocFile, setCreateDocFile] = useState(null)
    const [createImagePreviewUrl, setCreateImagePreviewUrl] = useState('')
    const [createDocPreviewName, setCreateDocPreviewName] = useState('')
    // Status Update modal state
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [statusEvent, setStatusEvent] = useState(null)
    const [newStatus, setNewStatus] = useState('Upcoming')
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    
    // Delete Event modal state (Temporary feature)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteEventId, setDeleteEventId] = useState(null)
    const [deleteEventTitle, setDeleteEventTitle] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    
    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        declined: 0
    })

    // Prevent body scroll when any modal is open
    useEffect(() => {
        const anyModalOpen = showModal || showReviewModal || showEventDetailsModal || showCreateModal || showStatusModal || showDeleteModal;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.position = 'unset';
            document.body.style.width = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.position = 'unset';
            document.body.style.width = 'unset';
        };
    }, [showModal, showReviewModal, showEventDetailsModal, showCreateModal, showStatusModal, showDeleteModal]);

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            setIsLoading(true)
            axios.defaults.withCredentials = true
            const { data } = await axios.get(backendUrl + 'api/events')
            if (data) {
                setEvents(data)
                calculateStats(data)
            }
        } catch (error) {
            console.error('Error fetching events:', error)
            toast.error('Failed to load events')
        } finally {
            setIsLoading(false)
        }
    }

    const calculateStats = (eventsData) => {
        const stats = {
            total: eventsData.length,
            pending: eventsData.filter(e => e.status === 'Pending').length,
            approved: eventsData.filter(e => e.status === 'Approved').length,
            declined: eventsData.filter(e => e.status === 'Declined').length
        }
        setStats(stats)
    }

    // Advanced filtering and sorting
    const filteredAndSortedEvents = useMemo(() => {
        let filtered = events.filter(event => {
            // Status filter
            if (filter === 'all') return true // Show all events
            if (filter === 'pending') return event.status === 'Pending'
            if (filter === 'approved') return event.status === 'Approved'
            if (filter === 'declined') return event.status === 'Declined'
            return false
        })

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (event.createdBy?.name && event.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase()))
            )
        }

        // Sorting
        filtered.sort((a, b) => {
            let aValue = a[sortBy]
            let bValue = b[sortBy]
            
            if (sortBy === 'createdAt' || sortBy === 'startDate' || sortBy === 'endDate') {
                aValue = new Date(aValue)
                bValue = new Date(bValue)
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1
            } else {
                return aValue < bValue ? 1 : -1
            }
        })

        return filtered
    }, [events, filter, searchTerm, sortBy, sortOrder])

    // Pagination
    const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage)
    const paginatedEvents = filteredAndSortedEvents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handleReviewEvent = async (eventId, status) => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.patch(backendUrl + `api/events/${eventId}/review`, {
                status,
                reviewedBy: userData?._id
            })
            
            if (data.message) {
                toast.success(data.message)
                setShowModal(false)
                setShowReviewModal(false)
                setSelectedEvent(null)
                setReviewComment('')
                fetchEvents() // Refresh events
            } else {
                toast.error('Failed to update event status')
            }
        } catch (error) {
            console.error('Review event error:', error)
            toast.error(error?.response?.data?.message || 'Failed to review event')
        }
    }

    const handleAcceptEvent = async (eventId) => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.patch(backendUrl + `api/events/${eventId}/accept`)
            if (data.message) {
                toast.success(data.message)
                fetchEvents()
            } else {
                toast.error('Failed to accept event for review')
            }
        } catch (error) {
            console.error('Accept event error:', error)
            toast.error(error?.response?.data?.message || 'Failed to accept event for review')
        }
    }


    const openReviewModal = (event) => {
        setSelectedEvent(event)
        setShowModal(true)
        setReviewComment('')
    }

    const closeModal = () => {
        setShowModal(false)
        setSelectedEvent(null)
        setReviewComment('')
    }


    const openReviewDetailsModal = (event) => {
        setSelectedEvent(event)
        setShowReviewModal(true)
    }

    const closeReviewDetailsModal = () => {
        setShowReviewModal(false)
        setSelectedEvent(null)
    }

    // Open event details modal
    const openEventDetailsModal = (event) => {
        setSelectedEvent(event)
        setShowEventDetailsModal(true)
    }

    // Close event details modal
    const closeEventDetailsModal = () => {
        setShowEventDetailsModal(false)
        setSelectedEvent(null)
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-800 border-green-300'
            case 'Declined': return 'bg-red-100 text-red-800 border-red-300'
            case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
            default: return 'bg-gray-100 text-gray-800 border-gray-300'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Approved': 
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            case 'Declined': 
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            case 'Pending': 
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            default: 
                return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const resetFilters = () => {
        setFilter('pending')
        setSearchTerm('')
        setSortBy('createdAt')
        setSortOrder('desc')
        setCurrentPage(1)
    }

    // Live previews for create
    useEffect(() => {
        if (createImageFile) {
            const url = URL.createObjectURL(createImageFile)
            setCreateImagePreviewUrl(url)
            return () => URL.revokeObjectURL(url)
        } else {
            setCreateImagePreviewUrl('')
        }
    }, [createImageFile])
    
    useEffect(() => {
        if (createDocFile) setCreateDocPreviewName(createDocFile.name); else setCreateDocPreviewName('')
    }, [createDocFile])

    const toInputDateTime = (value) => {
        if (!value) return ''
        const date = new Date(value)
        if (isNaN(date.getTime())) return ''
        const tzOffset = date.getTimezoneOffset() * 60000
        const local = new Date(date.getTime() - tzOffset)
        return local.toISOString().slice(0, 16)
    }

    const handleSubmitCreate = async (e) => {
        e.preventDefault()
        try {
            if (!createForm.title || !createForm.location || !createForm.startDate || !createForm.endDate) {
                toast.error('Please fill in title, location, start and end date')
                return
            }
            const start = new Date(createForm.startDate)
            const end = new Date(createForm.endDate)
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                toast.error('Invalid date/time')
                return
            }
            if (end <= start) {
                toast.error('End date/time must be after start date/time')
                return
            }


            const formDataToSend = new FormData()
            formDataToSend.append('title', createForm.title)
            formDataToSend.append('description', createForm.description)
            formDataToSend.append('location', createForm.location)
            formDataToSend.append('startDate', new Date(createForm.startDate).toISOString())
            formDataToSend.append('endDate', new Date(createForm.endDate).toISOString())
            formDataToSend.append('isOpenForDonation', createForm.isOpenForDonation ? 'true' : 'false')
            formDataToSend.append('isOpenForVolunteer', createForm.isOpenForVolunteer ? 'true' : 'false')
            formDataToSend.append('status', createForm.status)
            if (createImageFile) formDataToSend.append('image', createImageFile)
            if (createDocFile) formDataToSend.append('proposalDocument', createDocFile)

            const createPromise = axios.post(backendUrl + 'api/events/crd-create', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            })
            toast.promise(createPromise, { pending: 'Creating event...' })
            const { data } = await createPromise
            if (data?.event?._id) {
                toast.success('Event created')
                setShowCreateModal(false)
                setCreateForm({ title: '', description: '', location: '', startDate: '', endDate: '', isOpenForDonation: false, isOpenForVolunteer: false, status: 'Pending' })
                setCreateImageFile(null)
                setCreateDocFile(null)
                fetchEvents()
            } else {
                toast.error(data?.message || 'Failed to create event')
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Error creating event')
        }
    }

    // Duplicate feature removed

    const openStatusUpdate = (event) => {
        setStatusEvent(event)
        setNewStatus('Upcoming')
        setShowStatusModal(true)
    }

    const handleSubmitStatus = async (e) => {
        e.preventDefault()
        if (!statusEvent?._id) return
        
        setIsUpdatingStatus(true)
        try {
            const { data } = await axios.patch(
                backendUrl + `api/events/${statusEvent._id}/status`, 
                { status: newStatus }, 
                { withCredentials: true }
            )
            
            if (data?.event?._id) {
                // Optimistically update the local state immediately
                setEvents(prevEvents => {
                    const updatedEvents = prevEvents.map(event => 
                        event._id === statusEvent._id 
                            ? { ...event, status: newStatus }
                            : event
                    )
                    // Recalculate stats with updated events
                    calculateStats(updatedEvents)
                    return updatedEvents
                })
                
                toast.success('Status updated')
                setShowStatusModal(false)
                setStatusEvent(null)
                setNewStatus('Upcoming')
            } else {
                toast.error(data?.message || 'Failed to update status')
            }
        } catch (error) {
            console.error('Error updating status:', error)
            toast.error(error?.response?.data?.message || 'Error updating status')
            // On error, refetch to ensure consistency
            fetchEvents()
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleStatusUpdate = async (event, status) => {
        if (isUpdatingStatus) return;
        
        setIsUpdatingStatus(true);
        try {
            const { data } = await axios.patch(
                `${backendUrl}api/events/${event._id}/status`,
                { status },
                {
                    withCredentials: true,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            
            if (data?.event?._id) {
                toast.success(`Event status updated to ${status}`);
                fetchEvents();
            } else {
                throw new Error('Failed to update event status');
            }
        } catch (error) {
            console.error('Error updating event status:', error);
            toast.error(error.response?.data?.message || 'Failed to update event status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    // Delete Event Handler (Temporary feature for data cleanup)
    const openDeleteModal = (event) => {
        setDeleteEventId(event._id)
        setDeleteEventTitle(event.title)
        setShowDeleteModal(true)
    }

    const closeDeleteModal = () => {
        setShowDeleteModal(false)
        setDeleteEventId(null)
        setDeleteEventTitle('')
    }

    const handleDeleteEvent = async () => {
        if (!deleteEventId) return
        
        setIsDeleting(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.delete(`${backendUrl}api/events/${deleteEventId}/crd-delete`, {
                withCredentials: true
            })
            
            if (data?.message === 'Event deleted successfully') {
                toast.success('Event deleted successfully')
                closeDeleteModal()
                // Optimistically remove from list
                setEvents(prevEvents => {
                    const updated = prevEvents.filter(e => e._id !== deleteEventId)
                    calculateStats(updated)
                    return updated
                })
            } else {
                toast.error(data?.message || 'Failed to delete event')
            }
        } catch (error) {
            console.error('Error deleting event:', error)
            toast.error(error?.response?.data?.message || 'Failed to delete event. Please try again.')
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Page Header */}
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">Event Management</h1>
                            <p className="text-sm sm:text-base text-gray-600">Review and manage event proposals from departments</p>
                        </div>
                        <div className="flex items-center">
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-[#800000] hover:bg-[#900000] text-white flex items-center space-x-2 px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-sm sm:text-base">Create Event</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#800000]">
                                        {stats.total}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center flex-shrink-0 ml-3">
                                    <svg className="w-7 h-7 transition-transform duration-300 hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="iconGradientTotal" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#800020" />
                                                <stop offset="100%" stopColor="#9c0000" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5z" fill="url(#iconGradientTotal)" />
                                        <circle cx="9" cy="13" r="1.5" fill="url(#iconGradientTotal)" />
                                        <circle cx="15" cy="13" r="1.5" fill="url(#iconGradientTotal)" />
                                        <path d="M12 17c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z" fill="url(#iconGradientTotal)" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending Review</p>
                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#800000]">
                                        {stats.pending}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center flex-shrink-0 ml-3">
                                    <svg className="w-7 h-7 transition-transform duration-300 hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="gradientPending" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#800020" />
                                                <stop offset="100%" stopColor="#9c0000" />
                                            </linearGradient>
                                        </defs>
                                        <circle cx="12" cy="12" r="10" fill="url(#gradientPending)" />
                                        {/* Clock hands - Hour hand pointing to 10, minute hand pointing to 2 */}
                                        <line x1="12" y1="12" x2="12" y2="8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        <line x1="12" y1="12" x2="15" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        {/* Center dot */}
                                        <circle cx="12" cy="12" r="1.5" fill="white" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Approved</p>
                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#800000]">
                                        {stats.approved}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center flex-shrink-0 ml-3">
                                    <svg className="w-7 h-7 transition-transform duration-300 hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="gradientApproved" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#800020" />
                                                <stop offset="100%" stopColor="#9c0000" />
                                            </linearGradient>
                                        </defs>
                                        <circle cx="12" cy="12" r="10" fill="url(#gradientApproved)" />
                                        {/* Checkmark */}
                                        <path d="M9 12 L11 14 L15 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Declined</p>
                                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#800000]">
                                        {stats.declined}
                                    </p>
                                </div>
                                <div className="flex items-center justify-center flex-shrink-0 ml-3">
                                    <svg className="w-7 h-7 transition-transform duration-300 hover:scale-110" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="gradientDeclined" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#800020" />
                                                <stop offset="100%" stopColor="#9c0000" />
                                            </linearGradient>
                                        </defs>
                                        <circle cx="12" cy="12" r="10" fill="url(#gradientDeclined)" />
                                        <path d="M9 9 L15 15 M15 9 L9 15" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                {/* Advanced Controls */}
                <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-200 mb-6 sm:mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                        {/* Search Bar */}
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-4">
                            {/* Sort */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
                                >
                                    <option value="createdAt">Date Created</option>
                                    <option value="title">Title</option>
                                    <option value="startDate">Start Date</option>
                                    <option value="status">Status</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                                >
                                    {sortOrder === 'asc' ? 
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg> :
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    }
                                </button>
                            </div>

                            {/* Items per page */}
                            <div className="flex items-center space-x-2">
                                <label className="text-sm font-medium text-gray-700">Show:</label>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 bg-white"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            {/* Reset Filters */}
                            <Button
                                variant="ghostDark"
                                size="sm"
                                onClick={resetFilters}
                                className="flex items-center space-x-1 text-gray-700 hover:text-gray-900"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Reset</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-4">
                        <button
                            onClick={() => setFilter('all')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-200 font-medium text-sm"
                            style={{ 
                                backgroundColor: filter === 'all' ? 'transparent' : '#ffffff',
                                backgroundImage: filter === 'all' ? 'linear-gradient(to bottom right, #800020, #9c0000)' : 'none',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            <div className="relative inline-flex items-center justify-center" style={{
                                backgroundImage: filter === 'all' ? 'none' : 'linear-gradient(to right, #800020, #9c0000)',
                                WebkitBackgroundClip: filter === 'all' ? 'none' : 'text',
                                backgroundClip: filter === 'all' ? 'none' : 'text'
                            }}>
                                <FaListAlt 
                                    className="w-4 h-4" 
                                    style={{ 
                                        color: filter === 'all' ? '#ffffff' : '#800020',
                                        fill: filter === 'all' ? '#ffffff' : '#800020',
                                        filter: filter === 'all' ? 'none' : 'drop-shadow(0 0 0 #800020)'
                                    }} 
                                />
                            </div>
                            <span className="text-sm font-semibold" style={{ 
                                color: filter === 'all' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'all' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'all' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'all' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'all' ? 'none' : 'none'
                            }}>
                                All Events
                                                            </span>
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ 
                                color: filter === 'all' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'all' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'all' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'all' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'all' ? 'none' : 'none'
                            }}>
                                {stats.total}
                                                                </span>
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                            style={{ 
                                backgroundColor: filter === 'pending' ? 'transparent' : '#ffffff',
                                backgroundImage: filter === 'pending' ? 'linear-gradient(to bottom right, #800020, #9c0000)' : 'none',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            <div className="relative inline-flex items-center justify-center">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="gradientPendingIcon" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#800020" />
                                            <stop offset="100%" stopColor="#9c0000" />
                                        </linearGradient>
                                    </defs>
                                    {filter === 'pending' ? (
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="#ffffff" />
                                    ) : (
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="url(#gradientPendingIcon)" />
                                    )}
                                </svg>
                            </div>
                            <span className="text-sm font-semibold" style={{ 
                                color: filter === 'pending' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'pending' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'pending' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'pending' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'pending' ? 'none' : 'none'
                            }}>
                                Pending Review
                            </span>
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ 
                                color: filter === 'pending' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'pending' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'pending' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'pending' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'pending' ? 'none' : 'none'
                            }}>
                                {stats.pending}
                            </span>
                        </button>
                        <button
                            onClick={() => setFilter('approved')}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                            style={{ 
                                backgroundColor: filter === 'approved' ? 'transparent' : '#ffffff',
                                backgroundImage: filter === 'approved' ? 'linear-gradient(to bottom right, #800020, #9c0000)' : 'none',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            <div className="relative inline-flex items-center justify-center">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="gradientApprovedIcon" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#800020" />
                                            <stop offset="100%" stopColor="#9c0000" />
                                        </linearGradient>
                                    </defs>
                                    {filter === 'approved' ? (
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#ffffff" />
                                    ) : (
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="url(#gradientApprovedIcon)" />
                                    )}
                                </svg>
                            </div>
                            <span className="text-sm font-semibold" style={{ 
                                color: filter === 'approved' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'approved' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'approved' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'approved' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'approved' ? 'none' : 'none'
                            }}>
                                Approved
                                                            </span>
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ 
                                color: filter === 'approved' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'approved' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'approved' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'approved' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'approved' ? 'none' : 'none'
                            }}>
                                {stats.approved}
                            </span>
                        </button>
                        <button
                            onClick={() => setFilter('declined')}
                            className="flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                            style={{ 
                                backgroundColor: filter === 'declined' ? 'transparent' : '#ffffff',
                                backgroundImage: filter === 'declined' ? 'linear-gradient(to bottom right, #800020, #9c0000)' : 'none',
                                border: 'none',
                                outline: 'none'
                            }}
                        >
                            <div className="relative inline-flex items-center justify-center">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="gradientDeclinedIcon" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#800020" />
                                            <stop offset="100%" stopColor="#9c0000" />
                                        </linearGradient>
                                    </defs>
                                    {filter === 'declined' ? (
                                        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="#ffffff" />
                                    ) : (
                                        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" fill="url(#gradientDeclinedIcon)" />
                                    )}
                                </svg>
                            </div>
                            <span className="text-sm font-semibold" style={{ 
                                color: filter === 'declined' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'declined' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'declined' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'declined' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'declined' ? 'none' : 'none'
                            }}>
                                Declined
                                                    </span>
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ 
                                color: filter === 'declined' ? '#ffffff' : '#000000',
                                backgroundImage: filter === 'declined' ? 'none' : 'none',
                                WebkitBackgroundClip: filter === 'declined' ? 'none' : 'none',
                                WebkitTextFillColor: filter === 'declined' ? '#ffffff' : '#000000',
                                backgroundClip: filter === 'declined' ? 'none' : 'none'
                            }}>
                                {stats.declined}
                            </span>
                        </button>
                    </div>

                {/* Events List */}
                {isLoading ? (
                    <div className="py-12">
                        <LoadingSpinner size="medium" text="Loading events..." />
                    </div>
                ) : paginatedEvents.length > 0 ? (
                    filter === 'all' ? (
                        /* Card View for All Events */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedEvents.map((event) => {
                                // Handle event image
                                let imageUrl = null;
                                if (event.image) {
                                    if (event.image.startsWith('data:image')) {
                                        imageUrl = event.image;
                                    } else if (event.image.startsWith('http://') || event.image.startsWith('https://')) {
                                        imageUrl = event.image;
                                    } else {
                                        imageUrl = `data:image/jpeg;base64,${event.image}`;
                                    }
                                } else if (event.imageUrl) {
                                    imageUrl = event.imageUrl;
                                }

                                return (
                                    <div
                                        key={event._id}
                                        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                                    >
                                        {/* Event Image */}
                                        {imageUrl ? (
                                            <div className="w-full h-48 overflow-hidden bg-gray-100">
                                                <img
                                                    src={imageUrl}
                                                    alt={event.title}
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                                <div className="w-full h-full bg-gradient-to-br from-[#800020] to-[#9c0000] hidden items-center justify-center">
                                                    <svg className="w-16 h-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                        </div>
                                                    </div>
                                        ) : (
                                            <div className="w-full h-48 bg-gradient-to-br from-[#800020] to-[#9c0000] flex items-center justify-center">
                                                <svg className="w-16 h-16 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                    </div>
                                        )}

                                        {/* Event Content */}
                                        <div className="p-5 flex-1 flex flex-col">
                                            {/* Status Badge */}
                                            <div className="mb-3">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                                                    {getStatusIcon(event.status)}
                                                    <span className="ml-1">{event.status || 'Pending'}</span>
                                                </span>
                                            </div>

                                            {/* Event Title */}
                                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>

                                            {/* Event Description */}
                                                    {event.description && (
                                                        <div 
                                                    className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1"
                                                            dangerouslySetInnerHTML={{ 
                                                                __html: event.description
                                                                    .replace(/&lt;/g, '<')
                                                                    .replace(/&gt;/g, '>')
                                                                    .replace(/&amp;/g, '&')
                                                            .substring(0, 150) + (event.description.length > 150 ? '...' : '')
                                                            }}
                                                        />
                                                    )}
                                                    
                                            {/* Event Details */}
                                            <div className="space-y-2 mb-4">
                                                {/* Department */}
                                                <div className="flex items-center text-sm text-gray-600">
                                                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    <span className="truncate">{event.createdBy?.name || 'Unknown'}</span>
                                                </div>

                                                {/* Date */}
                                                <div className="flex items-center text-sm text-gray-600">
                                                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span>{formatDate(event.startDate)}</span>
                                                </div>

                                                {/* Location */}
                                                <div className="flex items-center text-sm text-gray-600">
                                                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="truncate">{event.location || 'TBA'}</span>
                                            </div>
                                        </div>
                                        
                                            {/* Features */}
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {event.isOpenForVolunteer && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-medium">
                                                        Volunteers
                                                    </span>
                                                )}
                                                {event.isOpenForDonation && (
                                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-medium">
                                                        Donations
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-end space-x-2 mt-auto pt-4 border-t border-gray-200">
                                            {event.status === 'Proposed' && (
                                                    <button
                                                        onClick={() => handleAcceptEvent(event._id)}
                                                        className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                        style={{
                                                            backgroundColor: '#ffffff',
                                                            color: '#800020',
                                                            border: '1px solid #e5e7eb',
                                                            outline: 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                            e.currentTarget.style.color = '#ffffff';
                                                            e.currentTarget.style.borderColor = 'transparent';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundImage = 'none';
                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                            e.currentTarget.style.color = '#800020';
                                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                                        }}
                                                        title="Accept for Review"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                                        </svg>
                                                    </button>
                                            )}
                                            {event.status === 'Pending' && (
                                                    <button
                                                        onClick={() => openReviewDetailsModal(event)}
                                                        className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                        style={{
                                                            backgroundColor: '#ffffff',
                                                            color: '#800020',
                                                            border: '1px solid #e5e7eb',
                                                            outline: 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                            e.currentTarget.style.color = '#ffffff';
                                                            e.currentTarget.style.borderColor = 'transparent';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundImage = 'none';
                                                            e.currentTarget.style.backgroundColor = '#ffffff';
                                                            e.currentTarget.style.color = '#800020';
                                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                                        }}
                                                        title="Review Event"
                                                    >
                                                        <FaEye className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {event.status === 'Approved' && (
                                                    <>
                                                        <button
                                                            onClick={() => openEventDetailsModal(event)}
                                                            className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                color: '#800020',
                                                                border: '1px solid #e5e7eb',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                e.currentTarget.style.color = '#ffffff';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'none';
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#800020';
                                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                            }}
                                                            title="View Event"
                                                        >
                                                            <FaEye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openStatusUpdate(event)}
                                                            className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                color: '#800020',
                                                                border: '1px solid #e5e7eb',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                e.currentTarget.style.color = '#ffffff';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'none';
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#800020';
                                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                            }}
                                                            title="Update Status"
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(event)}
                                                            className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                color: '#800020',
                                                                border: '1px solid #e5e7eb',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                e.currentTarget.style.color = '#ffffff';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'none';
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#800020';
                                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                            }}
                                                            title="Delete Event"
                                                        >
                                                            <FaTrash className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {(event.status !== 'Proposed' && event.status !== 'Pending' && event.status !== 'Approved') && (
                                                    <>
                                                <button
                                                            onClick={() => openEventDetailsModal(event)}
                                                            className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                color: '#800020',
                                                                border: '1px solid #e5e7eb',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                e.currentTarget.style.color = '#ffffff';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'none';
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#800020';
                                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                            }}
                                                            title="View Event"
                                                        >
                                                            <FaEye className="w-4 h-4" />
                                                </button>
                                                        <button
                                                            onClick={() => openStatusUpdate(event)}
                                                            className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                color: '#800020',
                                                                border: '1px solid #e5e7eb',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                e.currentTarget.style.color = '#ffffff';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'none';
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#800020';
                                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                            }}
                                                            title="Update Status"
                                                        >
                                                            <FaEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(event)}
                                                            className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200"
                                                            style={{
                                                                backgroundColor: '#ffffff',
                                                                color: '#800020',
                                                                border: '1px solid #e5e7eb',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                e.currentTarget.style.color = '#ffffff';
                                                                e.currentTarget.style.borderColor = 'transparent';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundImage = 'none';
                                                                e.currentTarget.style.backgroundColor = '#ffffff';
                                                                e.currentTarget.style.color = '#800020';
                                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                            }}
                                                            title="Delete Event"
                                                        >
                                                            <FaTrash className="w-4 h-4" />
                                                        </button>
                                                    </>
                                    )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })}
                    </div>
                    ) : (
                        /* Table View */
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Title</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Features</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedEvents.map((event) => (
                                            <tr key={event._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-gray-900">{event.title}</div>
                                                    {event.description && (
                                                        <div 
                                                            className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-md"
                                                            dangerouslySetInnerHTML={{ 
                                                                __html: event.description
                                                                    .replace(/&lt;/g, '<')
                                                                    .replace(/&gt;/g, '>')
                                                                    .replace(/&amp;/g, '&')
                                                                    .substring(0, 100) + '...'
                                                            }}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{event.createdBy?.name || 'Unknown'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatDate(event.startDate)}</div>
                                                    <div className="text-xs text-gray-500">{formatDate(event.endDate)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-900">{event.location}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                                                        {getStatusIcon(event.status)}
                                                        <span className="ml-1">{event.status || 'Pending'}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {event.isOpenForVolunteer && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                                                Volunteers
                                                            </span>
                                                        )}
                                                        {event.isOpenForDonation && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                                                                Donations
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        {event.status === 'Proposed' && (
                                                            <button
                                                                onClick={() => handleAcceptEvent(event._id)}
                                                                className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                style={{ 
                                                                    backgroundColor: '#ffffff',
                                                                    color: '#800020',
                                                                    border: 'none',
                                                                    outline: 'none'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                    e.currentTarget.style.color = '#ffffff';
                                                                    const icon = e.currentTarget.querySelector('svg');
                                                                    if (icon) icon.style.color = '#ffffff';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundImage = 'none';
                                                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                                                    e.currentTarget.style.color = '#800020';
                                                                    const icon = e.currentTarget.querySelector('svg');
                                                                    if (icon) icon.style.color = '#800020';
                                                                }}
                                                                title="Accept for Review"
                                                            >
                                                                <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#800020' }}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                        {event.status === 'Pending' && (
                                                            <button
                                                                    onClick={() => openReviewDetailsModal(event)}
                                                                className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                style={{ 
                                                                    backgroundColor: '#ffffff',
                                                                    color: '#800020',
                                                                    border: 'none',
                                                                    outline: 'none'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                    e.currentTarget.style.color = '#ffffff';
                                                                    const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                    if (icon) icon.style.color = '#ffffff';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundImage = 'none';
                                                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                                                    e.currentTarget.style.color = '#800020';
                                                                    const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                    if (icon) icon.style.color = '#800020';
                                                                }}
                                                                title="Review Event"
                                                            >
                                                                <FaEye className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                            </button>
                                                        )}
                                                        {event.status === 'Approved' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openEventDetailsModal(event)}
                                                                    className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#800020',
                                                                        border: 'none',
                                                                        outline: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                        e.currentTarget.style.color = '#ffffff';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#ffffff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'none';
                                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                                        e.currentTarget.style.color = '#800020';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#800020';
                                                                    }}
                                                                    title="View"
                                                                >
                                                                    <FaEye className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openStatusUpdate(event)}
                                                                    className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#800020',
                                                                        border: 'none',
                                                                        outline: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                        e.currentTarget.style.color = '#ffffff';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#ffffff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'none';
                                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                                        e.currentTarget.style.color = '#800020';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#800020';
                                                                    }}
                                                                    title="Edit"
                                                                >
                                                                    <FaEdit className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openDeleteModal(event)}
                                                                    className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#800020',
                                                                        border: 'none',
                                                                        outline: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                        e.currentTarget.style.color = '#ffffff';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#ffffff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'none';
                                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                                        e.currentTarget.style.color = '#800020';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#800020';
                                                                    }}
                                                                    title="Delete"
                                                                >
                                                                    <FaTrash className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {event.status !== 'Approved' && event.status !== 'Pending' && event.status !== 'Proposed' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openEventDetailsModal(event)}
                                                                    className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#800020',
                                                                        border: 'none',
                                                                        outline: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                        e.currentTarget.style.color = '#ffffff';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#ffffff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'none';
                                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                                        e.currentTarget.style.color = '#800020';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#800020';
                                                                    }}
                                                                    title="View"
                                                                >
                                                                    <FaEye className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openStatusUpdate(event)}
                                                                    className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#800020',
                                                                        border: 'none',
                                                                        outline: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                        e.currentTarget.style.color = '#ffffff';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#ffffff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'none';
                                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                                        e.currentTarget.style.color = '#800020';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#800020';
                                                                    }}
                                                                    title="Update Status"
                                                                >
                                                                    <FaEdit className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openDeleteModal(event)}
                                                                    className="p-2 rounded-lg bg-white hover:bg-gradient-to-br hover:from-[#800020] hover:to-[#9c0000] transition-all duration-200 relative overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: '#ffffff',
                                                                        color: '#800020',
                                                                        border: 'none',
                                                                        outline: 'none'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'linear-gradient(to bottom right, #800020, #9c0000)';
                                                                        e.currentTarget.style.color = '#ffffff';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#ffffff';
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.backgroundImage = 'none';
                                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                                        e.currentTarget.style.color = '#800020';
                                                                        const icon = e.currentTarget.querySelector('svg, .react-icons');
                                                                        if (icon) icon.style.color = '#800020';
                                                                    }}
                                                                    title="Delete"
                                                                >
                                                                    <FaTrash className="w-4 h-4 transition-colors duration-200" style={{ color: '#800020' }} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">No events found</h3>
                        <p className="text-gray-500 mb-6">No events match your current filter criteria.</p>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-red-900 hover:bg-red-800 text-white flex items-center space-x-2 mx-auto mb-3"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Create Event</span>
                        </Button>
                        <Button
                            variant="ghostDark"
                            onClick={resetFilters}
                            className="flex items-center space-x-2 mx-auto"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Reset Filters</span>
                        </Button>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedEvents.length)} of {filteredAndSortedEvents.length} events
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="ghostDark"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    <span>Previous</span>
                                </Button>
                                
                                <div className="flex items-center space-x-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const page = i + 1
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${
                                                    currentPage === page
                                                        ? 'bg-red-900 text-white'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    })}
                                </div>
                                
                                <Button
                                    variant="ghostDark"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                >
                                    <span>Next</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Review Modal */}
            {showModal && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm flex items-center justify-center p-4 pt-20 sm:pt-24 md:pt-28 pb-8 z-[200]" style={{ zIndex: 200 }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[calc(100vh-6rem)] overflow-y-auto border border-red-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-red-900">Review Event</h3>
                                    <p className="text-red-700 mt-1">Make a decision on this event proposal</p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            {/* Event Details */}
                            <div className="bg-red-50 rounded-xl p-6 mb-6 border border-red-200">
                                <h4 className="text-xl font-semibold text-red-900 mb-3">{selectedEvent.title}</h4>
                                {selectedEvent.description && (
                                    <div 
                                        className="text-red-700 mb-4 prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ 
                                            __html: selectedEvent.description
                                                .replace(/&lt;/g, '<')
                                                .replace(/&gt;/g, '>')
                                                .replace(/&amp;/g, '&')
                                        }}
                                    />
                                )}
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="font-medium text-red-900">Location:</span>
                                        <span className="ml-2 text-red-700">{selectedEvent.location}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="font-medium text-red-900">Date:</span>
                                        <span className="ml-2 text-red-700">{formatDate(selectedEvent.startDate)} - {formatDate(selectedEvent.endDate)}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="font-medium text-red-900">Department:</span>
                                        <span className="ml-2 text-red-700">{selectedEvent.createdBy?.name || 'Unknown Department'}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium text-red-900">Created:</span>
                                        <span className="ml-2 text-red-700">{formatDateTime(selectedEvent.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Review Comment */}
                            <div className="mb-8">
                                <label htmlFor="reviewComment" className="block text-sm font-semibold text-red-900 mb-3">
                                    Review Comment (Optional)
                                </label>
                                <textarea
                                    id="reviewComment"
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-red-900 placeholder-red-400"
                                    placeholder="Add any comments about your decision..."
                                />
                                <p className="text-sm text-red-600 mt-2">This comment will be visible to the department that submitted the event.</p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-4">
                                <Button
                                    onClick={() => handleReviewEvent(selectedEvent._id, 'Approved')}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Approve Event</span>
                                </Button>
                                <Button
                                    onClick={() => handleReviewEvent(selectedEvent._id, 'Declined')}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Decline Event</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Event Details Modal */}
            {showEventDetailsModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6" onClick={closeEventDetailsModal} style={{ zIndex: 200 }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col mx-auto my-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-900 to-red-800 p-6 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedEvent.title}</h2>
                                    <div className="flex items-center mt-2 space-x-3">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedEvent.status === 'Approved' ? 'bg-green-100 text-green-800' : selectedEvent.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {selectedEvent.status}
                                        </span>
                                        <div className="flex items-center text-sm text-white/90">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={closeEventDetailsModal}
                                    className="text-white/80 hover:text-white transition-colors p-1"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Event Image */}
                            {selectedEvent.imageUrl && (
                                <div className="mb-6 rounded-xl overflow-hidden border border-gray-200">
                                    <img 
                                        src={selectedEvent.imageUrl} 
                                        alt={selectedEvent.title}
                                        className="w-full h-64 object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://via.placeholder.com/800x400?text=Event+Image';
                                        }}
                                    />
                                </div>
                            )}

                            {/* Event Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Event Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Location</p>
                                                <p className="text-gray-900">{selectedEvent.location || 'Not specified'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Time</p>
                                                <p className="text-gray-900">
                                                    {new Date(selectedEvent.startDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(selectedEvent.endDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-medium text-gray-600">Organized By</p>
                                                <p className="text-gray-900">{selectedEvent.createdBy?.name || 'CRD Staff'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Description</h3>
                                    <div 
                                        className="prose max-w-none text-gray-700"
                                        dangerouslySetInnerHTML={{ 
                                            __html: selectedEvent.description 
                                                ? selectedEvent.description
                                                    .replace(/&lt;/g, '<')
                                                    .replace(/&gt;/g, '>')
                                                    .replace(/&amp;/g, '&')
                                                : 'No description provided.'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Volunteers Section */}
                            {selectedEvent.isOpenForVolunteer && (
                                <div className="mb-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <h3 className="text-lg font-semibold text-gray-800">Volunteers</h3>
                                            <div className="flex items-center space-x-2">
                                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                    {(selectedEvent.volunteerRegistrations?.length || selectedEvent.volunteers?.length || 0)} Registered
                                                </span>
                                                {((selectedEvent.volunteerRegistrations || selectedEvent.volunteers || [])).some(v => {
                                                    const volunteer = v.user || v;
                                                    return volunteer.attended || (v.attendanceRecords && v.attendanceRecords.length > 0);
                                                }) && (
                                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                                        {((selectedEvent.volunteerRegistrations || selectedEvent.volunteers || [])).filter(v => {
                                                            const volunteer = v.user || v;
                                                            return volunteer.attended || (v.attendanceRecords && v.attendanceRecords.length > 0);
                                                        }).length} Attended
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {(selectedEvent.volunteerRegistrations?.length > 0 || selectedEvent.volunteers?.length > 0) ? (
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {/* Use volunteerRegistrations if available, otherwise use volunteers */}
                                                        {(() => {
                                                            // Prefer volunteerRegistrations if available, otherwise use volunteers
                                                            const volunteersList = selectedEvent.volunteerRegistrations?.length > 0 
                                                                ? selectedEvent.volunteerRegistrations 
                                                                : (selectedEvent.volunteers || []);
                                                            
                                                            return volunteersList.map((volunteer, index) => {
                                                                // Check if this is a volunteerRegistration (has .user property) or a direct volunteer (user object)
                                                                const isRegistration = volunteer.user !== undefined && volunteer.user !== null;
                                                                const user = isRegistration ? volunteer.user : volunteer;
                                                                
                                                                // Get volunteer information
                                                                const volunteerName = (isRegistration && volunteer.name) 
                                                                    ? volunteer.name 
                                                                    : (user?.name || 'Anonymous');
                                                                const volunteerEmail = (isRegistration && volunteer.email) 
                                                                    ? volunteer.email 
                                                                    : (user?.email || 'N/A');
                                                                const volunteerDepartment = (isRegistration && volunteer.department) 
                                                                    ? volunteer.department 
                                                                    : (user?.department || 'N/A');
                                                                
                                                                // Determine status: registration status > attendance records > pending
                                                                const hasAttendanceRecords = volunteer.attendanceRecords && volunteer.attendanceRecords.length > 0;
                                                                const volunteerStatus = volunteer.status 
                                                                    ? volunteer.status 
                                                                    : (hasAttendanceRecords ? 'verified' : 'pending');
                                                                const hasAttended = volunteer.attended || hasAttendanceRecords;
                                                                
                                                                return (
                                                                    <tr key={volunteer._id || user?._id || index} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                                {volunteerName}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                            {volunteerEmail}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    <div className="flex items-center">
                                                                                {volunteerDepartment && volunteerDepartment !== 'N/A' ? (
                                                                                    <span className="text-gray-900 font-medium">
                                                                                        {volunteerDepartment}
                                                                            </span>
                                                                        ) : (
                                                                                    <span className="text-gray-400 italic">Not specified</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center space-x-2">
                                                                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                                                                    volunteerStatus === 'approved' || volunteerStatus === 'verified' ? 'bg-green-100 text-green-800' 
                                                                                    : volunteerStatus === 'pending' || volunteerStatus === 'registered' ? 'bg-yellow-100 text-yellow-800' 
                                                                                    : volunteerStatus === 'rejected' ? 'bg-red-100 text-red-800'
                                                                                    : 'bg-gray-100 text-gray-800'
                                                                                }`}>
                                                                                    {volunteerStatus === 'verified' ? 'Verified' 
                                                                                        : volunteerStatus === 'approved' ? 'Approved' 
                                                                                        : volunteerStatus === 'pending' || volunteerStatus === 'registered' ? 'Pending' 
                                                                                        : volunteerStatus === 'rejected' ? 'Rejected' 
                                                                                        : 'Pending'}
                                                                        </span>
                                                                                {hasAttended && (
                                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center">
                                                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                </svg>
                                                                                Attended
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                                );
                                                            });
                                                        })()}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-yellow-700">
                                                        No volunteers have registered for this event yet.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Donations Section */}
                            {selectedEvent.isOpenForDonation && (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-800">Donations</h3>
                                        <div className="flex items-center">
                                            <span className="text-sm font-medium text-gray-600 mr-2">Total Raised:</span>
                                            <span className="text-lg font-bold text-green-600">
                                                ₱{selectedEvent.donations?.reduce((total, d) => total + (d.amount || 0), 0).toLocaleString() || '0'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {selectedEvent.donations?.length > 0 ? (
                                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Donor</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {selectedEvent.donations.map((donation, index) => {
                                                            // Function to censor name for all donations (e.g., "Luigi Amarillo" -> "Lu**i Am*****o")
                                                            const censorName = (name) => {
                                                                if (!name || name.trim() === '' || name === 'Anonymous') {
                                                                    return 'N/A';
                                                                }
                                                                const parts = name.trim().split(/\s+/);
                                                                return parts.map(part => {
                                                                    if (part.length <= 2) return part;
                                                                    const firstChar = part[0];
                                                                    const lastChar = part[part.length - 1];
                                                                    // Replace middle characters with * (keep first and last visible)
                                                                    const middleChars = '*'.repeat(part.length - 2);
                                                                    return firstChar + middleChars + lastChar;
                                                                }).join(' ');
                                                            };
                                                            
                                                            // Get donor name - always censor for all donation methods (ignore isAnonymous flag)
                                                            // Strategy: Use user.name if available (most reliable), otherwise use donorName
                                                            // If donorName is "Anonymous", try to get real name from user object
                                                            let name = '';
                                                            if (donation.user?.name) {
                                                                // User object is populated, use their name (most reliable)
                                                                name = donation.user.name;
                                                            } else if (donation.donorName && donation.donorName.trim() !== '' && donation.donorName.toLowerCase() !== 'anonymous') {
                                                                // Use donorName if it's not empty and not "Anonymous"
                                                                name = donation.donorName;
                                                            }
                                                            
                                                            // Always censor the name regardless of donation method or isAnonymous flag
                                                            const donorName = name ? censorName(name) : 'N/A';
                                                            
                                                            // Format date properly
                                                            const formatDate = (dateString) => {
                                                                if (!dateString) return 'N/A';
                                                                try {
                                                                    // Handle both string and Date object
                                                                    const date = dateString instanceof Date ? dateString : new Date(dateString);
                                                                    if (isNaN(date.getTime())) {
                                                                        console.error('Invalid date:', dateString);
                                                                        return 'N/A';
                                                                    }
                                                                    // Format as: "Jan 15, 2024, 10:30 AM"
                                                                    return date.toLocaleDateString('en-US', {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        hour12: true
                                                                    });
                                                                } catch (e) {
                                                                    console.error('Date formatting error:', e, dateString);
                                                                    return 'N/A';
                                                                }
                                                            };
                                                            
                                                            // Get donation date (prefer createdAt, then donatedAt, then createdAt from donation object)
                                                            const donationDate = donation.createdAt || donation.donatedAt || donation.createdAt;
                                                            
                                                            // Get message - ensure it's a string and trim whitespace
                                                            const donationMessage = (donation.message && donation.message.trim()) ? donation.message.trim() : '';
                                                            
                                                            return (
                                                                <tr key={donation._id || index} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                        {donorName}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                                        ₱{donation.amount?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                        {formatDate(donationDate)}
                                                                </td>
                                                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                                                        {donationMessage ? (
                                                                            <span className="block truncate" title={donationMessage}>
                                                                                {donationMessage}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 italic">No message</span>
                                                                        )}
                                                                </td>
                                                            </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-blue-700">
                                                        No donations have been made to this event yet.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Attachments - Proposal Document */}
                            {selectedEvent.proposalDocument && (
                                <div className="mt-8">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <div className="w-1 h-6 bg-gradient-to-b from-[#800000] to-[#9c0000] rounded-full"></div>
                                        <h3 className="text-xl font-bold text-gray-900">Proposal Document</h3>
                                    </div>
                                    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl p-6 border-2 border-gray-200 hover:shadow-xl transition-all duration-300 group">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            {/* Document Info Section */}
                                            <div className="flex items-center space-x-4 flex-1">
                                                {/* PDF Icon Container */}
                                                <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#800000] to-[#9c0000] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            </div>
                                                {/* Document Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#800000] transition-colors duration-200">
                                                        Event Proposal Document
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                            <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                            </svg>
                                                            PDF Format
                                                        </span>
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                                                            </svg>
                                                            {Math.round(selectedEvent.proposalDocument.length / 1024)} KB
                                                        </span>
                                        </div>
                                                    <p className="text-sm text-gray-600 mt-2">
                                                        Click the download button to view the complete event proposal document
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Download Button */}
                                            <button
                                                onClick={() => {
                                                    const link = document.createElement('a')
                                                    link.href = `data:application/pdf;base64,${selectedEvent.proposalDocument}`
                                                    link.download = `${selectedEvent.title}_proposal.pdf`
                                                    link.click()
                                                }}
                                                className="flex-shrink-0 inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#800000] via-[#9c0000] to-[#800000] text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:from-[#9c0000] hover:via-[#800000] hover:to-[#9c0000] transform hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#800000] focus:ring-offset-2 group"
                                            >
                                                <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                                <span>Download PDF</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                            <Button
                                onClick={closeEventDetailsModal}
                                className="bg-red-900 hover:bg-red-800 text-white"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[200] p-3 sm:p-4 md:p-6"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowCreateModal(false)
                        }
                    }}
                    style={{ zIndex: 200 }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden border border-gray-200 flex flex-col mx-auto my-auto">
                        <div className="p-8 overflow-y-auto flex-1">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Create Event</h3>
                                    <p className="text-gray-600 mt-1">Directly post an event as CRD</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmitCreate} className="space-y-6 max-w-2xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className={controlLabel}>Title</label>
                                        <input
                                            type="text"
                                            value={createForm.title}
                                            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                                            className={`${inputBase} ${createForm.title ? 'text-black' : 'text-gray-600'}`}
                                            placeholder="Event title"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={controlLabel}>Description</label>
                                        <RichTextEditor
                                            value={createForm.description}
                                            onChange={(val) => setCreateForm({ ...createForm, description: val })}
                                            placeholder="Describe the event"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={controlLabel}>Location</label>
                                        <input
                                            type="text"
                                            value={createForm.location}
                                            onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                                            className={`${inputBase} ${createForm.location ? 'text-black' : 'text-gray-600'}`}
                                            placeholder="Location"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={controlLabel}>Start Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={toInputDateTime(createForm.startDate)}
                                            onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                                            className={`${inputBase} ${createForm.startDate ? 'text-black' : 'text-gray-600'}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={controlLabel}>End Date & Time</label>
                                        <input
                                            type="datetime-local"
                                            value={toInputDateTime(createForm.endDate)}
                                            onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                                            className={`${inputBase} ${createForm.endDate ? 'text-black' : 'text-gray-600'}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={controlLabel}>Poster/Image</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setCreateImageFile(e.target.files?.[0] || null)}
                                            className={`${inputBase} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100`}
                                        />
                                        {createImagePreviewUrl && (
                                            <div className="mt-3 flex items-center gap-3">
                                                <img src={createImagePreviewUrl} alt="Preview" className="h-24 w-24 object-cover rounded-lg border" />
                                                <div className="text-sm text-gray-700">
                                                    <p className="font-medium truncate max-w-[220px]">{createImageFile?.name}</p>
                                                    <button type="button" className="mt-1 text-red-700 hover:underline" onClick={() => setCreateImageFile(null)}>Remove</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className={controlLabel}>Attachment (PDF)</label>
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => setCreateDocFile(e.target.files?.[0] || null)}
                                            className={`${inputBase} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100`}
                                        />
                                        {createDocPreviewName && (
                                            <div className="mt-3 inline-flex items-center gap-3 rounded-lg border px-3 py-2 bg-gray-50">
                                                <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 3h8l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
                                                <span className="text-sm text-gray-800 truncate max-w-[240px]">{createDocPreviewName}</span>
                                                <button type="button" className="text-red-700 hover:underline" onClick={() => setCreateDocFile(null)}>Remove</button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-6 md:col-span-2">
                                        {/* Event Options Row */}
                                        <div className="flex items-center space-x-6 flex-wrap gap-4">
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setCreateForm({ ...createForm, isOpenForVolunteer: !createForm.isOpenForVolunteer })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createForm.isOpenForVolunteer ? 'bg-green-600' : 'bg-gray-300'}`}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${createForm.isOpenForVolunteer ? 'translate-x-5' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                                <span className="text-gray-700 select-none font-medium">Open for Volunteers</span>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setCreateForm({ ...createForm, isOpenForDonation: !createForm.isOpenForDonation })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createForm.isOpenForDonation ? 'bg-green-600' : 'bg-gray-300'}`}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${createForm.isOpenForDonation ? 'translate-x-5' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                                <span className="text-gray-700 select-none font-medium">Open for Donations</span>
                                            </div>
                                            <div className="ml-auto">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Status</label>
                                                <select
                                                    value={createForm.status}
                                                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                                >
                                                    <option value="Approved">Approved</option>
                                                    <option value="Upcoming">Upcoming</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-4 justify-center mt-6 mb-2">
                                    <Button
                                        variant="ghostDark"
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="min-w-[160px] py-3 rounded-xl text-gray-700 hover:text-gray-900"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="min-w-[160px] bg-red-900 hover:bg-red-800 text-white font-semibold py-3 rounded-xl"
                                    >
                                        Create Event
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}


            {/* Update Status Modal */}
            {showStatusModal && statusEvent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 md:p-6 z-[200]" style={{ zIndex: 200 }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] border border-gray-200 overflow-hidden mx-auto my-auto">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Update Event Status</h3>
                                <button
                                    onClick={() => setShowStatusModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleSubmitStatus} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                    <select
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                    >
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="Ongoing">Ongoing</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                    <p className="mt-2 text-sm text-gray-500">
                                        {newStatus === 'Upcoming' && 'Event is upcoming. Users can see and join.'}
                                        {newStatus === 'Ongoing' && 'Event is currently happening. Donations/volunteering will be disabled.'}
                                        {newStatus === 'Completed' && 'Event has ended. It will be moved to past events.'}
                                    </p>
                                </div>
                                <div className="flex space-x-4">
                                    <Button
                                        variant="ghostDark"
                                        type="button"
                                        onClick={() => setShowStatusModal(false)}
                                        className="flex-1 py-3 rounded-xl text-gray-700 hover:text-gray-900"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isUpdatingStatus}
                                        className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUpdatingStatus ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Updating...
                                            </>
                                        ) : (
                                            'Update'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Review Details Modal - Enhanced for better workflow */}
            {showReviewModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 md:p-6 z-[200]" style={{ zIndex: 200 }} onClick={closeReviewDetailsModal}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto border border-gray-200 mx-auto my-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Review Event</h3>
                                    <p className="text-sm text-gray-600 mt-1">Review all event details before making your decision</p>
                                </div>
                                <button
                                    onClick={closeReviewDetailsModal}
                                    className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 p-2 rounded-lg"
                                    title="Close"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Event Image */}
                            {selectedEvent.image && (() => {
                                let imageUrl = null;
                                if (selectedEvent.image) {
                                    if (selectedEvent.image.startsWith('data:image')) {
                                        imageUrl = selectedEvent.image;
                                    } else if (selectedEvent.image.startsWith('http://') || selectedEvent.image.startsWith('https://')) {
                                        imageUrl = selectedEvent.image;
                                    } else {
                                        imageUrl = `data:image/jpeg;base64,${selectedEvent.image}`;
                                    }
                                }
                                return imageUrl ? (
                                    <div className="mb-6 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
                                        <img 
                                            src={imageUrl} 
                                            alt={selectedEvent.title}
                                            className="w-full h-72 object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ) : null;
                            })()}

                            {/* Event Details */}
                            <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Event Title</label>
                                                <p className="text-gray-900 font-medium">{selectedEvent.title}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Description</label>
                                                {selectedEvent.description && (
                                                    <div 
                                                        className="text-gray-900 prose prose-sm max-w-none"
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: selectedEvent.description
                                                                .replace(/&lt;/g, '<')
                                                                .replace(/&gt;/g, '>')
                                                                .replace(/&amp;/g, '&')
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Location</label>
                                                <p className="text-gray-900">{selectedEvent.location}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Start Date</label>
                                                <p className="text-gray-900">{formatDate(selectedEvent.startDate)}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">End Date</label>
                                                <p className="text-gray-900">{formatDate(selectedEvent.endDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Department</label>
                                                <p className="text-gray-900">{selectedEvent.createdBy?.name || 'Unknown Department'}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Created Date</label>
                                                <p className="text-gray-900">{formatDateTime(selectedEvent.createdAt)}</p>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-600">Status</label>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedEvent.status)}`}>
                                                    {selectedEvent.status || 'Pending'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedEvent.isOpenForVolunteer && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                        Volunteer Opportunities
                                                    </span>
                                                )}
                                                {selectedEvent.isOpenForDonation && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        Donation Opportunities
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments */}
                            {(selectedEvent.proposalImage || selectedEvent.proposalDocument) && (
                                <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h4>
                                    
                                    {selectedEvent.proposalImage && (
                                        <div className="mb-4">
                                            <label className="text-sm font-medium text-gray-600 mb-2 block">Proposal Image</label>
                                            <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                                <img 
                                                    src={selectedEvent.proposalImage} 
                                                    alt="Proposal Image" 
                                                    className="max-w-full h-auto max-h-64 rounded-lg object-contain"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {selectedEvent.proposalDocument && (
                                        <div>
                                            <label className="text-sm font-semibold text-gray-700 mb-3 block">Proposal Document</label>
                                            <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl p-5 border-2 border-gray-200 hover:shadow-lg transition-all duration-300 group">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                    {/* Document Info */}
                                                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                                                        {/* PDF Icon Container */}
                                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#800000] to-[#9c0000] rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                        {/* Document Details */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-base font-bold text-gray-900 mb-1 group-hover:text-[#800000] transition-colors duration-200">
                                                                Proposal Document
                                                            </h4>
                                                            <div className="flex flex-wrap items-center gap-2 text-sm">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                                    PDF
                                                                </span>
                                                                <span className="text-gray-600">Click to download the event proposal</span>
                                                    </div>
                                                        </div>
                                                    </div>
                                                    {/* Download Button */}
                                                    <button
                                                        onClick={() => {
                                                            const link = document.createElement('a')
                                                            link.href = `data:application/pdf;base64,${selectedEvent.proposalDocument}`
                                                            link.download = `${selectedEvent.title}_proposal.pdf`
                                                            link.click()
                                                        }}
                                                        className="flex-shrink-0 inline-flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white font-semibold rounded-lg shadow-md hover:shadow-xl hover:from-[#9c0000] hover:to-[#800000] transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:ring-offset-2"
                                                    >
                                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                        </svg>
                                                        <span>Download</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex space-x-4 pt-6 border-t border-gray-200 mt-6">
                                <Button
                                    onClick={async () => {
                                        await handleReviewEvent(selectedEvent._id, 'Approved')
                                        closeReviewDetailsModal()
                                    }}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Approve</span>
                                </Button>
                                <Button
                                    onClick={async () => {
                                        await handleReviewEvent(selectedEvent._id, 'Declined')
                                        closeReviewDetailsModal()
                                    }}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Decline</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Event Confirmation Modal (Temporary Feature) */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 md:p-6 z-[200]" style={{ zIndex: 200 }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[85vh] border border-gray-200 overflow-hidden mx-auto my-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-bold text-gray-900">Delete Event</h3>
                                <button
                                    onClick={closeDeleteModal}
                                    disabled={isDeleting}
                                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="mb-6">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        <div>
                                            <p className="text-sm font-semibold text-red-900 mb-1">Warning: This action cannot be undone</p>
                                            <p className="text-xs text-red-700">
                                                This is a temporary feature for data cleanup. The event will be permanently deleted from the database.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-700 mb-2">
                                        <span className="font-semibold">Event Title:</span>
                                    </p>
                                    <p className="text-lg font-medium text-gray-900">{deleteEventTitle}</p>
                                </div>
                            </div>
                            
                            <div className="flex space-x-3">
                                <Button
                                    variant="ghostDark"
                                    onClick={closeDeleteModal}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleDeleteEvent}
                                    disabled={isDeleting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <>
                                            <LoadingSpinner size="tiny" inline />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            <span>Delete Event</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    )
}

export default EventManagement
