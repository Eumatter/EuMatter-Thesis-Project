import React, { useState, useContext, useEffect, useRef } from 'react'
// Shared UI helper classes
const inputBase = 'w-full rounded-lg border border-gray-300 px-4 py-3 transition-all duration-200 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500'
const controlLabel = 'block text-sm font-medium text-gray-700 mb-2'
import RichTextEditor from '../../../components/RichTextEditor'
// Fallback simple editor (contenteditable) to avoid peer deps issues
import { AppContent } from '../../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import { useNavigate } from 'react-router-dom'
import FacebookSettingsModal from '../../../components/FacebookSettingsModal'

const EventManagement = () => {
    const { backendUrl } = useContext(AppContent)
    const navigate = useNavigate()
    const DEPARTMENTS = [
        'College of Education',
        'College of Architecture and Fine Arts',
        'College of Criminal Justice and Criminology',
        'College of Engineering',
        'College of Nursing and Allied Health Sciences',
        'College of Arts and Sciences',
        'College of Business and Accountancy',
        'College of Computing and Multimedia Studies',
        'College of Maritime Education',
        'College of International Tourism and Hospitality Management'
    ]
    // Helpers for datetime-local values
    const toInputDateTime = (value) => {
        if (!value) return ''
        const date = new Date(value)
        if (isNaN(date.getTime())) return ''
        const tzOffset = date.getTimezoneOffset() * 60000
        const local = new Date(date.getTime() - tzOffset)
        return local.toISOString().slice(0, 16)
    }
    const nowLocal = (() => {
        const d = new Date()
        const tzOffset = d.getTimezoneOffset() * 60000
        return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
    })()
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        isOpenForDonation: false,
        isOpenForVolunteer: false,
        eventCategory: 'community_relations', // Default for Department/Organization
        volunteerSettings: {
            mode: 'open_for_all', // 'open_for_all' | 'with_requirements'
            minAge: '',
            maxVolunteers: '',
            requiredSkills: [],
            departmentRestrictionType: 'all', // 'all' | 'specific'
            allowedDepartments: [],
            notes: '',
            dailySchedule: [],
            requireTimeTracking: true
        }
    })
    const [imageFile, setImageFile] = useState(null)
    const [documentFile, setDocumentFile] = useState(null)
    const [imagePreviewUrl, setImagePreviewUrl] = useState('')
    const [docPreviewName, setDocPreviewName] = useState('')
    const [events, setEvents] = useState([])
    const [showAttendanceModal, setShowAttendanceModal] = useState(false)
    const [attendanceForEvent, setAttendanceForEvent] = useState(null)
    const [currentQrToken, setCurrentQrToken] = useState('')
    const [qrExpiresIn, setQrExpiresIn] = useState(30)
    const [liveCount, setLiveCount] = useState(null)
    const [qrRotateTimer, setQrRotateTimer] = useState(null)
    const [showProposalModal, setShowProposalModal] = useState(false)
    const [showPostModal, setShowPostModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editEventId, setEditEventId] = useState(null)
    const [editData, setEditData] = useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        isOpenForDonation: false,
        isOpenForVolunteer: false,
        volunteerSettings: {
            mode: 'open_for_all',
            minAge: '',
            maxVolunteers: '',
            requiredSkills: [],
            departmentRestrictionType: 'all',
            allowedDepartments: [],
            notes: ''
        }
    })
    const [editImageFile, setEditImageFile] = useState(null)
    const [editDocumentFile, setEditDocumentFile] = useState(null)
    const [editImagePreviewUrl, setEditImagePreviewUrl] = useState('')
    const [editDocPreviewName, setEditDocPreviewName] = useState('')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteEventId, setDeleteEventId] = useState(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [confirmMessage, setConfirmMessage] = useState('')
    const [pendingCancelEventId, setPendingCancelEventId] = useState(null)
    const [pendingCancelSeriesId, setPendingCancelSeriesId] = useState(null)
    const [sortBy, setSortBy] = useState('date') // 'date', 'status'
    const [sortOrder, setSortOrder] = useState('desc') // 'asc', 'desc'
    const [showCalendar, setShowCalendar] = useState(false)
    const [calendarCursor, setCalendarCursor] = useState(() => {
        const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1)
    })
    const [calendarFilter, setCalendarFilter] = useState('all') // all|approved|proposed|upcoming|ongoing|completed
    const [selectedCalEvent, setSelectedCalEvent] = useState(null)
    const [mySubscriptions, setMySubscriptions] = useState([])

    // Token inputs for propose form
    const [reqSkillInput, setReqSkillInput] = useState('')
    const [allowedDeptInput, setAllowedDeptInput] = useState('')
    const [selectedDept, setSelectedDept] = useState('')
    // Token inputs for edit form
    const [editReqSkillInput, setEditReqSkillInput] = useState('')
    const [editAllowedDeptInput, setEditAllowedDeptInput] = useState('')
    const [editSelectedDept, setEditSelectedDept] = useState('')

    // Create (Post Event) state
    const [postForm, setPostForm] = useState({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        isOpenForDonation: false,
        isOpenForVolunteer: false,
        status: 'Approved'
    })
    const [postImageFile, setPostImageFile] = useState(null)
    const [postDocFile, setPostDocFile] = useState(null)
    const [postImagePreviewUrl, setPostImagePreviewUrl] = useState('')
    const [postDocPreviewName, setPostDocPreviewName] = useState('')
    
    // Facebook integration state
    const [facebookConnected, setFacebookConnected] = useState(false)
    const [facebookPages, setFacebookPages] = useState([])
    const [selectedFacebookPage, setSelectedFacebookPage] = useState(null)
    const [facebookPageAccessToken, setFacebookPageAccessToken] = useState('')
    const [autoPostToFacebook, setAutoPostToFacebook] = useState(false)
    const [facebookConfigLoading, setFacebookConfigLoading] = useState(false)
    const [showFacebookSettings, setShowFacebookSettings] = useState(false)

    // Recurrence UI state (shared)
    const [isRecurring, setIsRecurring] = useState(false)
    const [recurrenceType, setRecurrenceType] = useState('none') // none | weekly | monthly
    const [recurrenceCount, setRecurrenceCount] = useState(4) // number of occurrences
    const [recurrenceInterval, setRecurrenceInterval] = useState(1) // every N weeks/months
    const [recurrenceWeekday, setRecurrenceWeekday] = useState('') // for weekly; empty => derive from startDate
    const [recurrenceMonthday, setRecurrenceMonthday] = useState('') // for monthly; empty => derive from startDate

    // Always use table view - removed card view option

    const addTokenToArray = (arr, value) => {
        const v = String(value || '').trim()
        if (!v) return arr
        if (arr.includes(v)) return arr
        return [...arr, v]
    }

    const removeTokenFromArray = (arr, value) => arr.filter(x => x !== value)

    // Lightweight Rich Text Editor using contentEditable
    const RichTextEditor_InlineDeprecated = ({ value, onChange, placeholder }) => {
        const editorRef = useRef(null)
        const [isFocused, setIsFocused] = useState(false)
        const [formatState, setFormatState] = useState({
            bold: false,
            italic: false,
            underline: false,
            ul: false,
            ol: false,
            left: false,
            center: false,
            right: false,
            link: false
        })

        useEffect(() => {
            if (!editorRef.current) return
            // Sync external value ONLY when not actively typing to avoid caret jump
            if (!isFocused && editorRef.current.innerHTML !== (value || '')) {
                editorRef.current.innerHTML = value || ''
                editorRef.current.setAttribute('data-empty', String(!(value && editorRef.current.textContent.trim().length > 0)))
            }
        }, [value, isFocused])

        const focusEditor = () => {
            if (!editorRef.current) return
            editorRef.current.focus()
            // Place caret at end if nothing selected
            const range = document.createRange()
            range.selectNodeContents(editorRef.current)
            range.collapse(false)
            const sel = window.getSelection()
            sel.removeAllRanges()
            sel.addRange(range)
        }

        const updateFormatState = () => {
            try {
                const bold = document.queryCommandState('bold')
                const italic = document.queryCommandState('italic')
                const underline = document.queryCommandState('underline')
                const ul = document.queryCommandState('insertUnorderedList')
                const ol = document.queryCommandState('insertOrderedList')
                const left = document.queryCommandState('justifyLeft')
                const center = document.queryCommandState('justifyCenter')
                const right = document.queryCommandState('justifyRight')
                const link = document.queryCommandState('createLink')
                setFormatState({ bold, italic, underline, ul, ol, left, center, right, link })
            } catch (_) {}
        }

        useEffect(() => {
            const onSelectionChange = () => updateFormatState()
            document.addEventListener('selectionchange', onSelectionChange)
            return () => document.removeEventListener('selectionchange', onSelectionChange)
        }, [])

        const exec = (command, valueArg = null) => {
            focusEditor()
            document.execCommand(command, false, valueArg)
            if (editorRef.current) {
                onChange(editorRef.current.innerHTML)
            }
            updateFormatState()
        }

        const formatBlock = (tag) => {
            focusEditor()
            document.execCommand('formatBlock', false, tag)
            if (editorRef.current) onChange(editorRef.current.innerHTML)
        }

        const handleInput = () => {
            if (!editorRef.current) return
            // Defer to end of frame to minimize selection flicker
            requestAnimationFrame(() => {
                const html = editorRef.current?.innerHTML || ''
                onChange(html)
                const empty = !(editorRef.current.textContent && editorRef.current.textContent.trim().length > 0)
                editorRef.current.setAttribute('data-empty', String(empty))
            })
        }

        const handlePaste = (e) => {
            // Paste as plain text for clean formatting
            e.preventDefault()
            const text = (e.clipboardData || window.clipboardData).getData('text')
            document.execCommand('insertText', false, text)
        }

        return (
            <div className="border rounded-lg overflow-hidden">
                <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50 rounded-t-lg">
                    {/* Headings */}
                    <select className="px-2 py-1 text-sm rounded border border-gray-200 bg-white" onChange={(e) => formatBlock(e.target.value)} defaultValue="">
                        <option value="" disabled>Format</option>
                        <option value="p">Paragraph</option>
                        <option value="h1">Heading 1</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                        <option value="blockquote">Quote</option>
                        <option value="pre">Code</option>
                    </select>
                    <div className="w-px bg-gray-200 mx-1" />
                    {/* Inline styles */}
                    <button type="button" title="Bold" aria-pressed={formatState.bold} className={`p-2 rounded transition-colors ${formatState.bold ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('bold')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 5h6a4 4 0 110 8H7zM7 13h7a4 4 0 110 8H7z" /></svg>
                    </button>
                    <button type="button" title="Italic" aria-pressed={formatState.italic} className={`p-2 rounded transition-colors ${formatState.italic ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('italic')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 5h9M5 19h9M14 5l-4 14" /></svg>
                    </button>
                    <button type="button" title="Underline" aria-pressed={formatState.underline} className={`p-2 rounded transition-colors ${formatState.underline ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('underline')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 4v6a6 6 0 0012 0V4M4 20h16" /></svg>
                    </button>
                    <div className="w-px bg-gray-200 mx-1" />
                    {/* Lists */}
                    <button type="button" title="Bulleted List" aria-pressed={formatState.ul} className={`p-2 rounded transition-colors ${formatState.ul ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('insertUnorderedList')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
                    </button>
                    <button type="button" title="Numbered List" aria-pressed={formatState.ol} className={`p-2 rounded transition-colors ${formatState.ol ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('insertOrderedList')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h13M8 12h13M8 18h13M4 5h1M4 11h1M4 17h1" /></svg>
                    </button>
                    <div className="w-px bg-gray-200 mx-1" />
                    {/* Align */}
                    <button type="button" title="Align Left" aria-pressed={formatState.left} className={`p-2 rounded transition-colors ${formatState.left ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('justifyLeft')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M3 10h12M3 14h18M3 18h12" /></svg>
                    </button>
                    <button type="button" title="Align Center" aria-pressed={formatState.center} className={`p-2 rounded transition-colors ${formatState.center ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('justifyCenter')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M6 10h12M3 14h18M6 18h12" /></svg>
                    </button>
                    <button type="button" title="Align Right" aria-pressed={formatState.right} className={`p-2 rounded transition-colors ${formatState.right ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => exec('justifyRight')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M9 10h12M3 14h18M9 18h12" /></svg>
                    </button>
                    <div className="w-px bg-gray-200 mx-1" />
                    {/* Undo/Redo */}
                    <button type="button" title="Undo" className="p-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => exec('undo')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7l4-4m0 0l4 4M7 3v6a8 8 0 108 8" /></svg>
                    </button>
                    <button type="button" title="Redo" className="p-2 rounded hover:bg-gray-100 text-gray-700" onClick={() => exec('redo')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 7l-4-4m0 0l-4 4M17 3v6a8 8 0 11-8 8" /></svg>
                    </button>
                    <div className="w-px bg-gray-200 mx-1" />
                    {/* Link */}
                    <button type="button" title="Add Link" aria-pressed={formatState.link} className={`p-2 rounded transition-colors ${formatState.link ? 'bg-red-100 text-red-800 border border-red-200' : 'hover:bg-gray-100 text-gray-700'}`} onClick={() => {
                        focusEditor()
                        const url = window.prompt('Enter URL')
                        if (url) {
                            document.execCommand('createLink', false, url)
                            if (editorRef.current) onChange(editorRef.current.innerHTML)
                        }
                        updateFormatState()
                    }}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 11-5.656-5.656l1-1M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" /></svg>
                    </button>
                    <button type="button" title="Clear Formatting" className="p-2 rounded text-red-700 hover:bg-gray-100" onClick={() => exec('removeFormat')}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12M4 7h16" /></svg>
                    </button>
                </div>
                <div
                    ref={editorRef}
                    className="min-h-[160px] max-h-72 overflow-y-auto px-4 py-3 focus:outline-none prose prose-sm"
                    contentEditable
                    onInput={handleInput}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onPaste={handlePaste}
                    spellCheck
                    data-placeholder={placeholder}
                    suppressContentEditableWarning
                />
            </div>
        )
    }

    // Fetch user's events only
    React.useEffect(() => {
        axios.defaults.withCredentials = true
        axios.get(backendUrl + 'api/events/my-events')
            .then(res => setEvents(res.data || []))
            .catch(() => { })
    }, [backendUrl])

    // Load my subscriptions (for subscribe button state)
    React.useEffect(() => {
        axios.get(backendUrl + 'api/subscriptions', { withCredentials: true })
            .then(res => setMySubscriptions(Array.isArray(res.data) ? res.data.map(s => ({ ...s, targetId: s.targetId?.toString?.() || s.targetId })) : []))
            .catch(() => {})
    }, [backendUrl])

    // Load Facebook configuration from localStorage
    React.useEffect(() => {
        const fbConfig = localStorage.getItem('facebookConfig')
        if (fbConfig) {
            try {
                const config = JSON.parse(fbConfig)
                setFacebookPageAccessToken(config.pageAccessToken || '')
                setSelectedFacebookPage(config.pageId || null)
                setFacebookConnected(!!config.pageAccessToken && !!config.pageId)
                setAutoPostToFacebook(config.autoPost || false)
            } catch (e) {
                console.error('Error loading Facebook config:', e)
            }
        }
    }, [])

    // Handle escape key to close modal
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showProposalModal) {
                setShowProposalModal(false)
            }
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [showProposalModal])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            // Validate date range
            if (!formData.startDate || !formData.endDate) {
                toast.error('Please provide start and end date/time')
                return
            }
            const start = new Date(formData.startDate)
            const end = new Date(formData.endDate)
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                toast.error('Invalid date/time format')
                return
            }
            if (end <= start) {
                toast.error('End date/time must be after start date/time')
                return
            }
            
            // Validate attendance setup if volunteers are enabled
            if (formData.isOpenForVolunteer) {
                const eventDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                const isMultiDay = eventDuration > 1
                
                if (isMultiDay) {
                    // For multi-day events, check that we have schedule for all days
                    if (!formData.volunteerSettings.dailySchedule || formData.volunteerSettings.dailySchedule.length === 0) {
                        toast.error('Please set check-in and check-out times for all days of the event')
                        return
                    }
                    // Check that all days have timeIn and timeOut
                    for (let i = 0; i < eventDuration; i++) {
                        const dayDate = new Date(start)
                        dayDate.setDate(dayDate.getDate() + i)
                        const dayKey = dayDate.toISOString().split('T')[0]
                        const daySchedule = formData.volunteerSettings.dailySchedule.find(d => d.date === dayKey)
                        if (!daySchedule || !daySchedule.timeIn || !daySchedule.timeOut) {
                            toast.error(`Please set check-in and check-out times for Day ${i + 1}`)
                            return
                        }
                    }
                } else {
                    // For single-day events, check that we have at least one schedule entry
                    const daySchedule = formData.volunteerSettings.dailySchedule?.[0]
                    if (!daySchedule || !daySchedule.timeIn || !daySchedule.timeOut) {
                        toast.error('Please set check-in and check-out times for the event')
                        return
                    }
                }
            }
            
            // Validate donation target if donations are enabled
            // Build one or many payloads based on recurrence
            const buildPayload = (s, e, seriesId, index) => {
                const fd = new FormData()
                fd.append('title', formData.title)
                fd.append('description', formData.description || '')
                fd.append('location', formData.location)
                fd.append('startDate', new Date(s).toISOString())
                fd.append('endDate', new Date(e).toISOString())
                fd.append('isOpenForDonation', formData.isOpenForDonation ? 'true' : 'false')
                fd.append('isOpenForVolunteer', formData.isOpenForVolunteer ? 'true' : 'false')
                fd.append('eventCategory', formData.eventCategory || 'community_relations') // Include event category
                if (formData.isOpenForVolunteer) {
                    // Calculate event duration for this specific occurrence
                    const eventDuration = Math.ceil((new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24))
                    const isMultiDay = eventDuration > 1
                    
                    // Prepare volunteer settings with proper dailySchedule
                    let volunteerSettingsToSend = { ...formData.volunteerSettings }
                    
                    // Ensure dailySchedule is properly set up
                    if (isMultiDay) {
                        // For multi-day events, ensure we have entries for all days
                        const dailySchedule = []
                        for (let i = 0; i < eventDuration; i++) {
                            const dayDate = new Date(s)
                            dayDate.setDate(dayDate.getDate() + i)
                            const dayKey = dayDate.toISOString().split('T')[0]
                            
                            // Find existing entry for this day, or create new one
                            // Check both date string format (YYYY-MM-DD) and ISO string format
                            const existingDay = formData.volunteerSettings.dailySchedule?.find(d => {
                                const dDate = typeof d.date === 'string' ? d.date.split('T')[0] : new Date(d.date).toISOString().split('T')[0]
                                return dDate === dayKey
                            })
                            if (existingDay && existingDay.timeIn && existingDay.timeOut) {
                                dailySchedule.push({
                                    date: dayDate.toISOString(), // Backend expects Date, Mongoose will parse ISO string
                                    timeIn: existingDay.timeIn,
                                    timeOut: existingDay.timeOut,
                                    notes: existingDay.notes || ''
                                })
                            } else {
                                // Use default times from first day if available, or empty
                                const defaultTimeIn = formData.volunteerSettings.dailySchedule?.[0]?.timeIn || '09:00'
                                const defaultTimeOut = formData.volunteerSettings.dailySchedule?.[0]?.timeOut || '17:00'
                                dailySchedule.push({
                                    date: dayDate.toISOString(), // Backend expects Date, Mongoose will parse ISO string
                                    timeIn: defaultTimeIn,
                                    timeOut: defaultTimeOut,
                                    notes: ''
                                })
                            }
                        }
                        volunteerSettingsToSend.dailySchedule = dailySchedule
                    } else {
                        // For single-day events, ensure we have at least one entry
                        const dayKey = new Date(s).toISOString().split('T')[0]
                        const existingDay = formData.volunteerSettings.dailySchedule?.[0]
                        if (existingDay && existingDay.timeIn && existingDay.timeOut) {
                            volunteerSettingsToSend.dailySchedule = [{
                                date: dayKey,
                                timeIn: existingDay.timeIn,
                                timeOut: existingDay.timeOut,
                                notes: existingDay.notes || ''
                            }]
                        } else {
                            // If no schedule set, use default times
                            volunteerSettingsToSend.dailySchedule = [{
                                date: new Date(s).toISOString(), // Backend expects Date object, but we'll send ISO string
                                timeIn: '09:00',
                                timeOut: '17:00',
                                notes: ''
                            }]
                        }
                    }
                    
                    fd.append('volunteerSettings', JSON.stringify(volunteerSettingsToSend))
                }
                // Optional: default reminder offsets in seconds (24h, 1h)
                fd.append('reminderOffsets', JSON.stringify([86400, 3600]))
                if (imageFile) fd.append('image', imageFile)
                if (documentFile) fd.append('proposalDocument', documentFile)
                if (seriesId) fd.append('seriesId', seriesId)
                if (typeof index === 'number') fd.append('occurrenceIndex', String(index))
                return fd
            }

            const occurrences = []
            if (isRecurring) {
                const baseStart = new Date(formData.startDate)
                const baseEnd = new Date(formData.endDate)
                let cursorStart = new Date(baseStart)
                let cursorEnd = new Date(baseEnd)
                for (let i = 0; i < Math.max(1, recurrenceCount); i++) {
                    occurrences.push({ s: new Date(cursorStart), e: new Date(cursorEnd), i })
                    if (recurrenceType === 'weekly') {
                        const step = 7 * recurrenceInterval
                        cursorStart.setDate(cursorStart.getDate() + step)
                        cursorEnd.setDate(cursorEnd.getDate() + step)
                        if (recurrenceWeekday !== '') {
                            const target = Number(recurrenceWeekday)
                            const delta = (target - cursorStart.getDay() + 7) % 7
                            cursorEnd = new Date(cursorEnd.getTime() + delta * 24 * 60 * 60 * 1000)
                            cursorStart = new Date(cursorStart.getTime() + delta * 24 * 60 * 60 * 1000)
                        }
                    } else if (recurrenceType === 'monthly') {
                        const monthStep = recurrenceInterval
                        const startDay = recurrenceMonthday ? Number(recurrenceMonthday) : baseStart.getDate()
                        cursorStart = new Date(baseStart)
                        cursorEnd = new Date(baseEnd)
                        cursorStart.setMonth(baseStart.getMonth() + (i + 1) * monthStep)
                        cursorEnd.setMonth(baseEnd.getMonth() + (i + 1) * monthStep)
                        // set specific day if provided
                        if (recurrenceMonthday) {
                            cursorEnd.setDate(startDay)
                            cursorStart.setDate(startDay)
                        }
                    }
                }
            } else {
                occurrences.push({ s: formData.startDate, e: formData.endDate, i: 0 })
            }

            const seriesId = isRecurring ? `series_${Date.now()}_${Math.random().toString(36).slice(2,8)}` : ''
            const createPromises = occurrences.map(({ s, e, i }) => axios.post(backendUrl + 'api/events', buildPayload(s, e, seriesId, i), {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            }))

            const results = await Promise.allSettled(createPromises)
            const successful = results.filter(r => r.status === 'fulfilled' && r.value?.data?.message?.toLowerCase().includes('success'))
            const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.data?.message?.toLowerCase().includes('success')))

            if (successful.length > 0) {
                toast.success(`${successful.length} event proposal(s) submitted successfully!`)
                // Reset form completely
                setFormData({ 
                    title: '', 
                    description: '', 
                    location: '', 
                    startDate: '', 
                    endDate: '', 
                    isOpenForDonation: false, 
                    isOpenForVolunteer: false,
                    eventCategory: 'community_relations',
                    volunteerSettings: {
                        mode: 'open_for_all',
                        minAge: '',
                        maxVolunteers: '',
                        requiredSkills: [],
                        departmentRestrictionType: 'all',
                        allowedDepartments: [],
                        notes: '',
                        dailySchedule: [],
                        requireTimeTracking: true
                    }
                })
                setImageFile(null)
                setDocumentFile(null)
                setReqSkillInput('')
                setSelectedDept('')
                setIsRecurring(false)
                setRecurrenceType('none')
                setRecurrenceCount(4)
                setRecurrenceInterval(1)
                setRecurrenceWeekday('')
                setRecurrenceMonthday('')
                setShowProposalModal(false)
                // Refresh events list
                const eventsRes = await axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                setEvents(eventsRes.data || [])
            } else {
                // Show detailed error message
                const errorMessages = failed.map(r => {
                    if (r.status === 'rejected') {
                        return r.reason?.response?.data?.message || r.reason?.message || 'Unknown error'
                    } else {
                        return r.value?.data?.message || 'Failed to create event'
                    }
                })
                const uniqueErrors = [...new Set(errorMessages)]
                toast.error(uniqueErrors.length === 1 ? uniqueErrors[0] : `Failed to submit: ${uniqueErrors.join('; ')}`)
            }
        } catch (error) {
            console.error('Error submitting event:', error)
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit event proposal'
            toast.error(errorMessage)
        }
    }

    const handleEdit = async (id, updatedData) => {
        try {
            const formDataToSend = new FormData()
            
            // Add form fields
            Object.keys(updatedData).forEach(key => {
                if (key !== 'image' && key !== 'proposalDocument') {
                    if (key === 'volunteerSettings' && updatedData[key]) {
                        // Stringify volunteerSettings object
                        formDataToSend.append(key, JSON.stringify(updatedData[key]))
                    } else {
                    formDataToSend.append(key, updatedData[key])
                    }
                }
            })
            
            // Add files if they exist and are File objects
            if (updatedData.image && updatedData.image instanceof File) {
                formDataToSend.append('image', updatedData.image)
            }
            if (updatedData.proposalDocument && updatedData.proposalDocument instanceof File) {
                formDataToSend.append('proposalDocument', updatedData.proposalDocument)
            }

            const updatePromise = axios.put(backendUrl + `api/events/${id}`, formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            })
            toast.promise(updatePromise, {
                pending: 'Updating event...'
            })
            const res = await updatePromise
            
            if (res.data.message === "Event updated successfully") {
                // Close immediately for responsive feel
                setShowEditModal(false)
                setEditEventId(null)
                setEditImageFile(null)
                setEditDocumentFile(null)
                toast.success('Event updated!')
                // Refresh list in background
                axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                    .then(eventsRes => setEvents(eventsRes.data || []))
                    .catch(() => {})
            } else {
                toast.error(res.data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Error updating event')
        }
    }
    const handleDelete = async (id) => {
        // Optimistic UI: close modal and remove immediately
        const previous = events
        setShowDeleteModal(false)
        setDeleteEventId(null)
        setEvents(prev => prev.filter(e => e._id !== id))
        try {
            axios.defaults.withCredentials = true
            const deletePromise = axios.delete(backendUrl + `api/events/${id}`)
            toast.promise(deletePromise, {
                pending: 'Deleting event...',
                success: 'Event deleted',
                error: 'Failed to delete event'
            })
            const res = await deletePromise
            if (res.data.message === 'Event deleted successfully') {
                // Sync in background
                axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                    .then(eventsRes => setEvents(eventsRes.data || []))
                    .catch(() => {})
            } else {
                // Revert on failure
                setEvents(previous)
            }
        } catch (error) {
            setEvents(previous)
        }
    }

    // Handle Edit Click - Opens edit modal with event data
    const handleEditClick = (event) => {
        setEditEventId(event._id)
        const volunteerSettings = event.volunteerSettings || {
                mode: 'open_for_all',
                minAge: '',
                maxVolunteers: '',
                requiredSkills: [],
                departmentRestrictionType: 'all',
                allowedDepartments: [],
                notes: '',
                dailySchedule: [],
                requireTimeTracking: true
            }
        // Ensure requiredSkills and allowedDepartments are arrays
        if (typeof volunteerSettings.requiredSkills === 'string') {
            volunteerSettings.requiredSkills = volunteerSettings.requiredSkills ? [volunteerSettings.requiredSkills] : []
        } else if (!Array.isArray(volunteerSettings.requiredSkills)) {
            volunteerSettings.requiredSkills = []
        }
        if (!Array.isArray(volunteerSettings.allowedDepartments)) {
            volunteerSettings.allowedDepartments = []
        }
        setEditData({
            title: event.title || '',
            description: event.description || '',
            location: event.location || '',
            startDate: toInputDateTime(event.startDate),
            endDate: toInputDateTime(event.endDate),
            isOpenForDonation: event.isOpenForDonation || false,
            isOpenForVolunteer: event.isOpenForVolunteer || false,
            eventCategory: event.eventCategory || 'community_relations',
            volunteerSettings: volunteerSettings
        })
        setEditImageFile(null)
        setEditDocumentFile(null)
        setEditImagePreviewUrl(event.image ? `data:image/jpeg;base64,${event.image}` : '')
        setEditDocPreviewName('')
        setEditReqSkillInput('')
        setEditAllowedDeptInput('')
        setEditSelectedDept('')
        setShowEditModal(true)
    }

    // Handle Post From Proposal - Opens post modal with proposal data pre-filled
    const handlePostFromProposal = (event) => {
        // Pre-fill the post form with proposal data
        setPostForm({
            title: event.title || '',
            description: event.description || '',
            location: event.location || '',
            startDate: toInputDateTime(event.startDate),
            endDate: toInputDateTime(event.endDate),
            isOpenForDonation: event.isOpenForDonation || false,
            isOpenForVolunteer: event.isOpenForVolunteer || false,
            status: 'Approved',
            eventCategory: event.eventCategory || 'community_relations',
            volunteerSettings: event.volunteerSettings || {
                mode: 'open_for_all',
                minAge: '',
                maxVolunteers: '',
                requiredSkills: [],
                departmentRestrictionType: 'all',
                allowedDepartments: [],
                notes: '',
                dailySchedule: [],
                requireTimeTracking: true
            }
        })
        setPostImageFile(null)
        setPostDocFile(null)
        setPostImagePreviewUrl(event.image ? `data:image/jpeg;base64,${event.image}` : '')
        setPostDocPreviewName('')
        // Reset recurrence settings
        setIsRecurring(false)
        setRecurrenceType('none')
        setRecurrenceCount(4)
        setRecurrenceInterval(1)
        setRecurrenceWeekday('')
        setRecurrenceMonthday('')
        setShowPostModal(true)
    }

    // Handle Clone Event - Duplicates an event by creating a new one
    const handleCloneEvent = async (event) => {
        try {
            // Create a new event with the same data but new dates (default to next week)
            const startDate = new Date(event.startDate)
            const endDate = new Date(event.endDate)
            const duration = endDate - startDate
            
            // Set to next week same day/time
            startDate.setDate(startDate.getDate() + 7)
            endDate.setTime(startDate.getTime() + duration)

            const formData = new FormData()
            formData.append('title', `${event.title} (Copy)`)
            formData.append('description', event.description || '')
            formData.append('location', event.location || '')
            formData.append('startDate', startDate.toISOString())
            formData.append('endDate', endDate.toISOString())
            formData.append('isOpenForDonation', event.isOpenForDonation ? 'true' : 'false')
            formData.append('isOpenForVolunteer', event.isOpenForVolunteer ? 'true' : 'false')
            formData.append('eventCategory', event.eventCategory || 'community_relations')
            
            if (event.volunteerSettings) {
                formData.append('volunteerSettings', JSON.stringify(event.volunteerSettings))
            }

            // If event has base64 image, we need to convert it to a blob for upload
            if (event.image) {
                try {
                    const base64Response = await fetch(`data:image/jpeg;base64,${event.image}`)
                    const blob = await base64Response.blob()
                    const file = new File([blob], 'event-image.jpg', { type: 'image/jpeg' })
                    formData.append('image', file)
                } catch (err) {
                    console.error('Error converting image:', err)
                }
            }

            // If event has proposal document
            if (event.proposalDocument) {
                try {
                    const base64Response = await fetch(`data:application/pdf;base64,${event.proposalDocument}`)
                    const blob = await base64Response.blob()
                    const file = new File([blob], 'proposal-document.pdf', { type: 'application/pdf' })
                    formData.append('proposalDocument', file)
                } catch (err) {
                    console.error('Error converting document:', err)
                }
            }

            const createPromise = axios.post(backendUrl + 'api/events', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            })

            toast.promise(createPromise, {
                pending: 'Duplicating event...',
                success: 'Event duplicated successfully!',
                error: 'Failed to duplicate event'
            })

            const res = await createPromise
            if (res.data.message?.toLowerCase().includes('success')) {
                // Refresh events list
                const eventsRes = await axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                setEvents(eventsRes.data || [])
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to duplicate event')
        }
    }

    // Handle Cancel Proposal - Deletes/cancels a proposed event
    const handleCancelProposal = (event) => {
        setConfirmMessage(`Are you sure you want to cancel "${event.title}"? This action cannot be undone.`)
        setPendingCancelEventId(event._id)
        setPendingCancelSeriesId(null)
        setShowConfirmModal(true)
    }

    // Handle Cancel Series - Cancels all events in a series
    const handleCancelSeries = (seriesId) => {
        const seriesEvents = events.filter(e => e.seriesId === seriesId)
        const eventCount = seriesEvents.length
        
        setConfirmMessage(`Are you sure you want to cancel all ${eventCount} event(s) in this series? This action cannot be undone.`)
        setPendingCancelSeriesId(seriesId)
        setPendingCancelEventId(null)
        setShowConfirmModal(true)
    }

    // Live previews for create
    React.useEffect(() => {
        if (imageFile) {
            const url = URL.createObjectURL(imageFile)
            setImagePreviewUrl(url)
            return () => URL.revokeObjectURL(url)
        } else {
            setImagePreviewUrl('')
        }
    }, [imageFile])
    React.useEffect(() => {
        if (documentFile) setDocPreviewName(documentFile.name); else setDocPreviewName('')
    }, [documentFile])

    // Live previews for edit
    React.useEffect(() => {
        if (editImageFile) {
            const url = URL.createObjectURL(editImageFile)
            setEditImagePreviewUrl(url)
            return () => URL.revokeObjectURL(url)
        } else {
            setEditImagePreviewUrl('')
        }
    }, [editImageFile])
    React.useEffect(() => {
        if (editDocumentFile) setEditDocPreviewName(editDocumentFile.name); else setEditDocPreviewName('')
    }, [editDocumentFile])

    // Live previews for POST modal
    React.useEffect(() => {
        if (postImageFile) {
            const url = URL.createObjectURL(postImageFile)
            setPostImagePreviewUrl(url)
            return () => URL.revokeObjectURL(url)
        } else {
            setPostImagePreviewUrl('')
        }
    }, [postImageFile])
    React.useEffect(() => {
        if (postDocFile) setPostDocPreviewName(postDocFile.name); else setPostDocPreviewName('')
    }, [postDocFile])

    // Sort events based on selected criteria
    // Rotate QR token every 30s while modal open
    useEffect(() => {
        if (!showAttendanceModal || !attendanceForEvent) return
        let mounted = true
        const issue = async () => {
            try {
                const { data } = await axios.post(backendUrl + `api/attendance/${attendanceForEvent._id}/issue-token`, {}, { withCredentials: true })
                if (!mounted) return
                setCurrentQrToken(data?.token || '')
                setQrExpiresIn(Number(data?.expiresIn || 30))
            } catch (_) {
                if (!mounted) return
                setCurrentQrToken('')
                setQrExpiresIn(30)
            }
        }
        issue()
        const rotate = setInterval(issue, 30000)
        setQrRotateTimer(rotate)
        // tick down UI seconds
        const tick = setInterval(() => setQrExpiresIn((s) => s > 0 ? s - 1 : 30), 1000)
        return () => { mounted = false; clearInterval(rotate); clearInterval(tick); setQrRotateTimer(null) }
    }, [showAttendanceModal, attendanceForEvent, backendUrl])

    // Poll live count every 10s while modal open
    useEffect(() => {
        if (!showAttendanceModal || !attendanceForEvent) return
        let active = true
        const fetchCount = async () => {
            try {
                const { data } = await axios.get(backendUrl + `api/attendance/${attendanceForEvent._id}/count`, { withCredentials: true })
                if (active) setLiveCount(data?.count ?? 0)
            } catch (_) {}
        }
        fetchCount()
        const t = setInterval(fetchCount, 10000)
        return () => { active = false; clearInterval(t) }
    }, [showAttendanceModal, attendanceForEvent, backendUrl])

    const sortedEvents = [...events].sort((a, b) => {
        if (sortBy === 'date') {
            const dateA = new Date(a.startDate || a.createdAt)
            const dateB = new Date(b.startDate || b.createdAt)
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
        } else if (sortBy === 'status') {
            const statusOrder = { 'Proposed': 1, 'Approved': 2, 'Declined': 3, 'Upcoming': 4, 'Ongoing': 5, 'Completed': 6 }
            const statusA = statusOrder[a.status] || 0
            const statusB = statusOrder[b.status] || 0
            return sortOrder === 'asc' ? statusA - statusB : statusB - statusA
        }
        return 0
    })

    const getStatusColor = (status) => {
        switch (status) {
            case 'Proposed': return 'bg-yellow-100 text-yellow-800'
            case 'Approved': return 'bg-green-100 text-green-800'
            case 'Declined': return 'bg-red-100 text-red-800'
            case 'Upcoming': return 'bg-blue-100 text-blue-800'
            case 'Ongoing': return 'bg-purple-100 text-purple-800'
            case 'Completed': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-xl shadow-md px-4 sm:px-6 py-5 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-bold text-black mb-2">Event Management</h1>
                            <p className="text-gray-600">
                                Create and manage your department events and proposals.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowProposalModal(true)}
                                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm w-full md:w-auto"
                            >
                                <svg className="w-5 h-5 text-[#800020]" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Propose Event</span>
                            </button>
                            <button
                                onClick={() => setShowPostModal(true)}
                                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm w-full md:w-auto"
                            >
                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                </svg>
                                <span>Post Event</span>
                            </button>
                            <button
                                onClick={() => setShowCalendar(true)}
                                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm w-full md:w-auto"
                            >
                                <svg className="w-5 h-5 text-[#800020]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                </svg>
                                <span>Calendar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Event Proposal Modal */}
                {showProposalModal && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-modal-in"
                        style={{ marginTop: 0 }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowProposalModal(false)
                            }
                        }}
                    >
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] my-auto overflow-hidden border border-gray-200 animate-modal-in relative flex flex-col">
                            {/* Minimalist Header */}
                            <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-6 py-4 z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Propose New Event</h2>
                                            <p className="text-sm text-gray-500 mt-0.5">Submit your event proposal for review</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowProposalModal(false)
                                            // Reset form when closing
                                            setTimeout(() => {
                                                setFormData({ 
                                                    title: '', 
                                                    description: '', 
                                                    location: '', 
                                                    startDate: '', 
                                                    endDate: '', 
                                                    isOpenForDonation: false, 
                                                    isOpenForVolunteer: false,
                                                    eventCategory: 'community_relations',
                                                    volunteerSettings: {
                                                        mode: 'open_for_all',
                                                        minAge: '',
                                                        maxVolunteers: '',
                                                        requiredSkills: [],
                                                        departmentRestrictionType: 'all',
                                                        allowedDepartments: [],
                                                        notes: '',
                                                        dailySchedule: [],
                                                        requireTimeTracking: true
                                                    }
                                                })
                                                setImageFile(null)
                                                setDocumentFile(null)
                                                setReqSkillInput('')
                                                setSelectedDept('')
                                                setIsRecurring(false)
                                                setRecurrenceType('none')
                                                setRecurrenceCount(4)
                                                setRecurrenceInterval(1)
                                                setRecurrenceWeekday('')
                                                setRecurrenceMonthday('')
                                            }, 200)
                                        }}
                                        className="text-white/90 hover:text-white hover:bg-[#d4af37]/20 transition-all duration-200 rounded-xl p-2.5 border border-white/20 hover:border-[#d4af37]/40"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-8 overflow-y-auto flex-1 scrollbar-thin bg-white">
                                <form id="propose-form" onSubmit={handleSubmit} className="space-y-8">
                                    {/* Section 1: Basic Information */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                </div>
                                        <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span>Basic Information</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                                </h3>
                                                <p className="text-sm text-gray-600">Essential details about your event</p>
                                        </div>
                                        </div>

                                        {/* Event Title */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                        </div>
                                                <span>Event Title <span className="text-[#800020] font-semibold">*</span></span>
                                            </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                placeholder="Enter a catchy event title"
                                    required
                                />
                            </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                                    </svg>
                                                </div>
                                                <span>Description</span>
                                            </label>
                                            <RichTextEditor
                                                value={formData.description}
                                                onChange={(val) => setFormData(prev => ({ ...prev, description: val }))}
                                                placeholder="Describe your event in detail..."
                                            />
                                        </div>

                                        {/* Location */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span>Location <span className="text-[#800020] font-semibold">*</span></span>
                                            </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                placeholder="Enter event location or venue"
                                    required
                                />
                            </div>

                                        {/* Date & Time */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Start Date & Time <span className="text-[#800020] font-semibold">*</span></span>
                                                </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.startDate}
                                        onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        min={nowLocal}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                        required
                                    />
                                                <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                    <svg className="w-3 h-3 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Use your local date and time</span>
                                                </p>
                                </div>
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>End Date & Time <span className="text-[#800020] font-semibold">*</span></span>
                                                </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.endDate}
                                        onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        min={formData.startDate || nowLocal}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                        required
                                    />
                                                <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                    <svg className="w-3 h-3 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Must be after start date/time</span>
                                                </p>
                                            </div>
                                </div>
                                    </div>
                            
                                    {/* Section 3: Media & Documents */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Media & Documents
                                                </h3>
                                                <p className="text-sm text-gray-500">Upload images and supporting documents</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Event Image */}
                                            <div className="space-y-3">
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Event Image</span>
                                                </label>
                                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*,image/webp,.webp"
                                        onChange={e => {
                                            const file = e.target.files?.[0]
                                            setImageFile(file || null)
                                        }}
                                        className="hidden"
                                        id="event-image-upload"
                                    />
                                                    <label
                                                        htmlFor="event-image-upload"
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-white to-[#d4af37]/5 hover:bg-gradient-to-br hover:from-[#d4af37]/10 hover:to-[#f4d03f]/10 hover:border-[#800020] transition-all duration-200 group shadow-sm"
                                                    >
                                                        {imagePreviewUrl ? (
                                                            <div className="relative w-full h-full rounded-xl overflow-hidden">
                                                                <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setImageFile(null)
                                                                        setImagePreviewUrl('')
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-[#800020] text-white rounded-full p-1.5 hover:bg-[#a0002a] transition-colors shadow-lg border-2 border-white"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                            </div>
                                                        ) : (
                                                            <>
                                                                <svg className="w-10 h-10 text-gray-400 group-hover:text-[#800020] transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600 group-hover:text-[#800020] font-medium">Click to upload image</p>
                                                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                                                            </>
                                                        )}
                                                    </label>
                                </div>
                                            </div>

                                            {/* Proposal Document */}
                                            <div className="space-y-3">
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Proposal Document</span>
                                                </label>
                                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0]
                                                            setDocumentFile(file || null)
                                                        }}
                                                        className="hidden"
                                                        id="proposal-doc-upload"
                                                    />
                                                    <label
                                                        htmlFor="proposal-doc-upload"
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-white to-[#d4af37]/5 hover:bg-gradient-to-br hover:from-[#d4af37]/10 hover:to-[#f4d03f]/10 hover:border-[#800020] transition-all duration-200 group shadow-sm"
                                                    >
                                                        {docPreviewName ? (
                                                            <div className="flex items-center space-x-3 p-4 w-full">
                                                                <div className="w-12 h-12 bg-[#800020]/10 rounded-lg flex items-center justify-center border-2 border-[#d4af37]/30">
                                                                    <svg className="w-6 h-6 text-[#800020]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                        </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-[#800020] truncate">{docPreviewName}</p>
                                                                    <p className="text-xs text-gray-500">Click to change</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setDocumentFile(null)
                                                                    }}
                                                                    className="text-[#800020] hover:text-[#a0002a] transition-colors"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <svg className="w-10 h-10 text-gray-400 group-hover:text-[#800020] transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600 group-hover:text-[#800020] font-medium">Click to upload document</p>
                                                                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                </div>
                            </div>
                            
                                    {/* Section 4: Attendance Setup (only when Open for Volunteers is enabled) */}
                                    {formData.isOpenForVolunteer && (
                                        <div className="space-y-6 animate-slide-down">
                                            <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Attendance Setup
                                                    </h3>
                                                    <p className="text-sm text-gray-500">Configure check-in and check-out times for volunteers</p>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 space-y-4">
                                                {/* Calculate event duration */}
                                                {(() => {
                                                    const start = formData.startDate ? new Date(formData.startDate) : null
                                                    const end = formData.endDate ? new Date(formData.endDate) : null
                                                    const isMultiDay = start && end && Math.ceil((end - start) / (1000 * 60 * 60 * 24)) > 1
                                                    const eventDuration = start && end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) : 1
                                                    
                                                    return (
                                                        <>
                                                            {!start || !end ? (
                                                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                                                    <p className="text-sm text-yellow-800">Please set the event start and end dates first to configure attendance times.</p>
                                                                </div>
                                                            ) : isMultiDay ? (
                                                                <div className="space-y-4">
                                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                        <p className="text-sm font-medium text-blue-800">Multi-day Event ({eventDuration} days)</p>
                                                                        <p className="text-xs text-blue-600 mt-1">Set check-in and check-out times for each day</p>
                                                                    </div>
                                                                    {Array.from({ length: eventDuration }, (_, i) => {
                                                                        const dayDate = new Date(start)
                                                                        dayDate.setDate(dayDate.getDate() + i)
                                                                        const dayKey = dayDate.toISOString().split('T')[0]
                                                                        const existingDay = formData.volunteerSettings.dailySchedule?.find(d => d.date === dayKey)
                                                                        
                                                                        return (
                                                                            <div key={i} className="bg-white rounded-xl p-4 border-2 border-[#d4af37]/20 shadow-sm">
                                                                                <div className="flex items-center justify-between mb-3">
                                                                                    <label className="text-sm font-semibold text-[#800020]">
                                                                                        Day {i + 1} - {dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                    </label>
                                                                                </div>
                                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                                    <div className="space-y-2">
                                                                                        <label className="text-xs font-medium text-gray-700">Check-in Time</label>
                                                                                        <input
                                                                                            type="time"
                                                                                            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                            value={existingDay?.timeIn || ''}
                                                                                            onChange={e => {
                                                                                                const newSchedule = [...(formData.volunteerSettings.dailySchedule || [])]
                                                                                                const dayIndex = newSchedule.findIndex(d => d.date === dayKey)
                                                                                                if (dayIndex >= 0) {
                                                                                                    newSchedule[dayIndex] = { ...newSchedule[dayIndex], timeIn: e.target.value }
                                                                                                } else {
                                                                                                    newSchedule.push({ date: dayKey, timeIn: e.target.value, timeOut: existingDay?.timeOut || '' })
                                                                                                }
                                                                                                setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, dailySchedule: newSchedule } }))
                                                                                            }}
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <label className="text-xs font-medium text-gray-700">Check-out Time</label>
                                                                                        <input
                                                                                            type="time"
                                                                                            className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                            value={existingDay?.timeOut || ''}
                                                                                            onChange={e => {
                                                                                                const newSchedule = [...(formData.volunteerSettings.dailySchedule || [])]
                                                                                                const dayIndex = newSchedule.findIndex(d => d.date === dayKey)
                                                                                                if (dayIndex >= 0) {
                                                                                                    newSchedule[dayIndex] = { ...newSchedule[dayIndex], timeOut: e.target.value }
                                                                                                } else {
                                                                                                    newSchedule.push({ date: dayKey, timeIn: existingDay?.timeIn || '', timeOut: e.target.value })
                                                                                                }
                                                                                                setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, dailySchedule: newSchedule } }))
                                                                                            }}
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-4">
                                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                                                        <p className="text-sm font-medium text-blue-800">Single-day Event</p>
                                                                        <p className="text-xs text-blue-600 mt-1">Set check-in and check-out times for this event</p>
                                                                    </div>
                                                                    <div className="bg-white rounded-xl p-4 border-2 border-[#d4af37]/20 shadow-sm">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                            <div className="space-y-2">
                                                                                <label className="text-sm font-semibold text-[#800020]">Check-in Time</label>
                                                                                <input
                                                                                    type="time"
                                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                    value={formData.volunteerSettings.dailySchedule?.[0]?.timeIn || ''}
                                                                                    onChange={e => {
                                                                                        const dayKey = start.toISOString().split('T')[0]
                                                                                        setFormData(prev => ({
                                                                                            ...prev,
                                                                                            volunteerSettings: {
                                                                                                ...prev.volunteerSettings,
                                                                                                dailySchedule: [{ date: dayKey, timeIn: e.target.value, timeOut: prev.volunteerSettings.dailySchedule?.[0]?.timeOut || '' }]
                                                                                            }
                                                                                        }))
                                                                                    }}
                                                                                    required
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <label className="text-sm font-semibold text-[#800020]">Check-out Time</label>
                                                                                <input
                                                                                    type="time"
                                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                    value={formData.volunteerSettings.dailySchedule?.[0]?.timeOut || ''}
                                                                                    onChange={e => {
                                                                                        const dayKey = start.toISOString().split('T')[0]
                                                                                        setFormData(prev => ({
                                                                                            ...prev,
                                                                                            volunteerSettings: {
                                                                                                ...prev.volunteerSettings,
                                                                                                dailySchedule: [{ date: dayKey, timeIn: prev.volunteerSettings.dailySchedule?.[0]?.timeIn || '', timeOut: e.target.value }]
                                                                                            }
                                                                                        }))
                                                                                    }}
                                                                                    required
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    {/* Section 5: Event Options */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                        <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Event Options
                                                </h3>
                                                <p className="text-sm text-gray-500">Configure event settings</p>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Open for Donations */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Open for Donations</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Allow users to donate to this event</p>
                                                        </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, isOpenForDonation: !prev.isOpenForDonation }))}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            formData.isOpenForDonation ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                            aria-pressed={formData.isOpenForDonation}
                                        >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            formData.isOpenForDonation ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                        </button>
                                    </div>
                                            </div>

                                            {/* Open for Volunteers */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Open for Volunteers</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Allow users to join as volunteers</p>
                                                        </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, isOpenForVolunteer: !prev.isOpenForVolunteer }))}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            formData.isOpenForVolunteer ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                            aria-pressed={formData.isOpenForVolunteer}
                                        >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            formData.isOpenForVolunteer ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                        </button>
                                </div>

                                                {/* Volunteer Requirements - Show below when toggled on */}
                                {formData.isOpenForVolunteer && (
                                                    <div className="mt-4 pt-4 border-t border-[#d4af37]/20 animate-slide-down">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                            <div>
                                                            <p className="text-sm font-bold text-[#800020]">Volunteer Requirements</p>
                                                            <p className="text-xs text-gray-600">Configure who can join and any limits</p>
                                            </div>
                                        </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-xl p-4 border-2 border-[#d4af37]/20 shadow-sm">
                                                        <div className="space-y-2">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <span>Minimum Age</span>
                                                            </label>
                                        <input
                                                        type="number"
                                                        min="0"
                                                                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                        value={formData.volunteerSettings.minAge}
                                                        onChange={e => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, minAge: e.target.value } }))}
                                                                placeholder="e.g., 18"
                                                    />
                                    </div>
                                                        <div className="space-y-2">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                    </svg>
                                                                </div>
                                                                <span>Max Volunteers</span>
                                                            </label>
                                        <input
                                                        type="number"
                                                        min="1"
                                                                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                        value={formData.volunteerSettings.maxVolunteers}
                                                        onChange={e => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, maxVolunteers: e.target.value } }))}
                                                                placeholder="e.g., 50"
                                                    />
                                                </div>
                                                        <div className="md:col-span-2 space-y-2">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                                    </svg>
                                                                </div>
                                                                <span>Required Skills</span>
                                                            </label>
                                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                        <input
                                                            type="text"
                                                                    className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                            value={reqSkillInput}
                                                            onChange={e => setReqSkillInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ',') {
                                                                    e.preventDefault()
                                                                    const tokens = reqSkillInput.split(',').map(s => s.trim()).filter(Boolean)
                                                                    if (tokens.length) {
                                                                                    setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: [...new Set([...(prev.volunteerSettings.requiredSkills || []), ...tokens])] } }))
                                                                        setReqSkillInput('')
                                                                    }
                                                                }
                                                            }}
                                                                        placeholder="Type a skill and press Enter or comma"
                                                        />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => {
                                                            const tokens = reqSkillInput.split(',').map(s => s.trim()).filter(Boolean)
                                                            if (tokens.length) {
                                                                                setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: [...new Set([...(prev.volunteerSettings.requiredSkills || []), ...tokens])] } }))
                                                                setReqSkillInput('')
                                                            }
                                                                    }}
                                                                        className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#a0002a] text-white text-sm font-semibold hover:from-[#a0002a] hover:to-[#800020] transition-all shadow-md hover:shadow-lg whitespace-nowrap w-full sm:w-auto"
                                                                >
                                                                    Add
                                                                </button>
                                                    </div>
                                                                {formData.volunteerSettings.requiredSkills && formData.volunteerSettings.requiredSkills.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                                        {formData.volunteerSettings.requiredSkills.map((skill, index) => (
                                                                            <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#d4af37]/20 text-[#800020] border-2 border-[#d4af37]/40 rounded-full">
                                                                    {skill}
                                                                            <button 
                                                                                type="button" 
                                                                                className="text-[#800020] hover:text-[#a0002a] transition-colors" 
                                                                                    onClick={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: removeTokenFromArray(prev.volunteerSettings.requiredSkills || [], skill) } }))}
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                    </svg>
                                                                </div>
                                                                <span>Department Access</span>
                                                            </label>
                                                                <select
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={formData.volunteerSettings.departmentRestrictionType}
                                                                    onChange={e => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, departmentRestrictionType: e.target.value, allowedDepartments: e.target.value === 'all' ? [] : prev.volunteerSettings.allowedDepartments } }))}
                                                                >
                                                                    <option value="all">All Departments</option>
                                                                    <option value="specific">Specific Departments</option>
                                                                </select>
                                                    {formData.volunteerSettings.departmentRestrictionType === 'specific' && (
                                                                    <div className="space-y-2 mt-2">
                                                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                                        <select 
                                                                            className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white" 
                                                                            value={selectedDept} 
                                                                            onChange={e => setSelectedDept(e.target.value)}
                                                                        >
                                                                    <option value="">Select department</option>
                                                                                {DEPARTMENTS.filter(d => !(formData.volunteerSettings.allowedDepartments || []).includes(d)).map(d => (
                                                                        <option key={d} value={d}>{d}</option>
                                                                    ))}
                                                                </select>
                                                                        <button 
                                                                            type="button" 
                                                                            onClick={() => {
                                                                    if (!selectedDept) return
                                                                                    setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: addTokenToArray(prev.volunteerSettings.allowedDepartments || [], selectedDept) } }))
                                                                    setSelectedDept('')
                                                                            }}
                                                                                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#a0002a] text-white text-sm font-semibold hover:from-[#a0002a] hover:to-[#800020] transition-all shadow-md hover:shadow-lg whitespace-nowrap w-full sm:w-auto"
                                                                        >
                                                                            Add
                                                                        </button>
                                </div>
                                                                        {formData.volunteerSettings.allowedDepartments && formData.volunteerSettings.allowedDepartments.length > 0 && (
                                                                        <div className="flex flex-wrap gap-2">
                                                                                {formData.volunteerSettings.allowedDepartments.map((dep, index) => (
                                                                                    <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#d4af37]/20 text-[#800020] border-2 border-[#d4af37]/40 rounded-full">
                                                                            {dep}
                                                                                    <button 
                                                                                        type="button" 
                                                                                        className="text-[#800020] hover:text-[#a0002a] transition-colors" 
                                                                                            onClick={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: removeTokenFromArray(prev.volunteerSettings.allowedDepartments || [], dep) } }))}
                                                                                    >
                                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                                        </svg>
                                                                                    </button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                        <div className="md:col-span-2 space-y-2">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </div>
                                                                <span>Additional Notes</span>
                                                            </label>
                                                    <textarea
                                                        rows={3}
                                                                className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white resize-none"
                                                        value={formData.volunteerSettings.notes}
                                                        onChange={e => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, notes: e.target.value } }))}
                                                                placeholder="Any additional requirements or notes for volunteers..."
                                                    />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                </div>
                                                
                                            {/* Recurring Event - Moved down */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Recurring Event</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Schedule this event to repeat</p>
                                                                </div>
                                                                            </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsRecurring(!isRecurring)}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            isRecurring ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                                        aria-pressed={isRecurring}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            isRecurring ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                                    </button>
                                                                                </div>
                                                {isRecurring && (
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-down">
                                                        <div className="bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <label className="block text-xs font-semibold text-[#800020] mb-2">Pattern</label>
                                                            <select className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="monthly">Monthly</option>
                                                            </select>
                                                                                </div>
                                                        <div className="bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <label className="block text-xs font-semibold text-[#800020] mb-2">Repeat Every</label>
                                                            <input type="number" min={1} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(Number(e.target.value) || 1)} placeholder="1" />
                                                                            </div>
                                                        <div className="bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <label className="block text-xs font-semibold text-[#800020] mb-2">Occurrences</label>
                                                            <input type="number" min={1} max={24} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceCount} onChange={(e) => setRecurrenceCount(Number(e.target.value) || 1)} placeholder="4" />
                                                        </div>
                                                        {recurrenceType === 'weekly' && (
                                                            <div className="md:col-span-3 bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                                <label className="block text-xs font-semibold text-[#800020] mb-2">Weekday (Optional)</label>
                                                                <select className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceWeekday} onChange={(e) => setRecurrenceWeekday(e.target.value)}>
                                                                    <option value="">Same as start date</option>
                                                                    <option value="0">Sunday</option>
                                                                    <option value="1">Monday</option>
                                                                    <option value="2">Tuesday</option>
                                                                    <option value="3">Wednesday</option>
                                                                    <option value="4">Thursday</option>
                                                                    <option value="5">Friday</option>
                                                                    <option value="6">Saturday</option>
                                                                </select>
                                                                                </div>
                                                                            )}
                                                        {recurrenceType === 'monthly' && (
                                                            <div className="md:col-span-3 bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                                <label className="block text-xs font-semibold text-[#800020] mb-2">Day of Month (Optional)</label>
                                                                <input type="number" min={1} max={31} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceMonthday} onChange={(e) => setRecurrenceMonthday(e.target.value)} placeholder="Same as start date if empty" />
                                                                        </div>
                                                        )}
                                                            </div>
                                                )}
                                                        </div>
                                            </div>
                                    </div>
                                </form>
                            </div>
                            {/* Sticky Footer with Buttons */}
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 z-10">
                                        <button 
                                            onClick={() => {
                                                setShowProposalModal(false)
                                                setTimeout(() => {
                                                    setFormData({ 
                                                        title: '', 
                                                        description: '', 
                                                        location: '', 
                                                        startDate: '', 
                                                        endDate: '', 
                                                        isOpenForDonation: false, 
                                                        isOpenForVolunteer: false,
                                                eventCategory: 'community_relations',
                                                        volunteerSettings: {
                                                            mode: 'open_for_all',
                                                            minAge: '',
                                                            maxVolunteers: '',
                                                            requiredSkills: [],
                                                            departmentRestrictionType: 'all',
                                                            allowedDepartments: [],
                                                            notes: '',
                                                            dailySchedule: [],
                                                            requireTimeTracking: true
                                                        }
                                                    })
                                                    setImageFile(null)
                                                    setDocumentFile(null)
                                                    setReqSkillInput('')
                                                    setSelectedDept('')
                                                    setIsRecurring(false)
                                                    setRecurrenceType('none')
                                                    setRecurrenceCount(4)
                                                    setRecurrenceInterval(1)
                                                    setRecurrenceWeekday('')
                                                    setRecurrenceMonthday('')
                                                }, 200)
                                            }}
                                            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                    form="propose-form"
                                            className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#9c0000] text-white font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020]/50 focus-visible:ring-offset-2 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Propose Event</span>
                                        </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Post Event Modal */}
                {showPostModal && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-modal-in"
                        style={{ marginTop: 0 }}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowPostModal(false)
                            }
                        }}
                    >
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] my-auto overflow-hidden border border-gray-200 animate-modal-in relative flex flex-col">
                            {/* Minimalist Header */}
                            <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-6 py-4 z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Post Event</h2>
                                            <p className="text-sm text-gray-500 mt-0.5">Publish your event immediately</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowPostModal(false)
                                            // Reset form when closing
                                            setTimeout(() => {
                                                setPostForm({ title: '', description: '', location: '', startDate: '', endDate: '', isOpenForDonation: false, isOpenForVolunteer: false, status: 'Approved' })
                                                setPostImageFile(null)
                                                setPostDocFile(null)
                                                setIsRecurring(false)
                                                setRecurrenceType('none')
                                                setRecurrenceCount(4)
                                                setRecurrenceInterval(1)
                                                setRecurrenceWeekday('')
                                                setRecurrenceMonthday('')
                                            }, 200)
                                        }}
                                        className="text-white/90 hover:text-white hover:bg-[#d4af37]/20 transition-all duration-200 rounded-xl p-2.5 border border-white/20 hover:border-[#d4af37]/40"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1 scrollbar-thin bg-white">
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault()
                                        // validation similar to propose
                                        if (!postForm.startDate || !postForm.endDate) {
                                            toast.error('Please provide start and end date/time')
                                            return
                                        }
                                        const s = new Date(postForm.startDate)
                                        const en = new Date(postForm.endDate)
                                        if (isNaN(s.getTime()) || isNaN(en.getTime())) {
                                            toast.error('Invalid date/time format')
                                            return
                                        }
                                        if (en <= s) {
                                            toast.error('End date/time must be after start date/time')
                                            return
                                        }

                                        try {
                                            const buildFd = (start, end, seriesId, index) => {
                                                const fd = new FormData()
                                                fd.append('title', postForm.title)
                                                fd.append('description', postForm.description)
                                                fd.append('location', postForm.location)
                                                fd.append('startDate', new Date(start).toISOString())
                                                fd.append('endDate', new Date(end).toISOString())
                                                fd.append('isOpenForDonation', postForm.isOpenForDonation)
                                                fd.append('isOpenForVolunteer', postForm.isOpenForVolunteer)
                                                fd.append('status', 'Approved')
                                                if (postImageFile) fd.append('image', postImageFile)
                                                if (postDocFile) fd.append('proposalDocument', postDocFile)
                                                fd.append('reminderOffsets', JSON.stringify([86400, 3600]))
                                                if (seriesId) fd.append('seriesId', seriesId)
                                                if (typeof index === 'number') fd.append('occurrenceIndex', String(index))
                                                return fd
                                            }

                                            const occs = []
                                            if (isRecurring) {
                                                const baseS = new Date(postForm.startDate)
                                                const baseE = new Date(postForm.endDate)
                                                let cs = new Date(baseS)
                                                let ce = new Date(baseE)
                                                for (let i = 0; i < Math.max(1, recurrenceCount); i++) {
                                                    occs.push({ s: new Date(cs), e: new Date(ce), i })
                                                    if (recurrenceType === 'weekly') {
                                                        const step = 7 * recurrenceInterval
                                                        cs.setDate(cs.getDate() + step)
                                                        ce.setDate(ce.getDate() + step)
                                                        if (recurrenceWeekday !== '') {
                                                            const target = Number(recurrenceWeekday)
                                                            const delta = (target - cs.getDay() + 7) % 7
                                                            ce = new Date(ce.getTime() + delta * 24 * 60 * 60 * 1000)
                                                            cs = new Date(cs.getTime() + delta * 24 * 60 * 60 * 1000)
                                                        }
                                                    } else if (recurrenceType === 'monthly') {
                                                        const step = recurrenceInterval
                                                        const day = recurrenceMonthday ? Number(recurrenceMonthday) : baseS.getDate()
                                                        cs = new Date(baseS)
                                                        ce = new Date(baseE)
                                                        cs.setMonth(baseS.getMonth() + (i + 1) * step)
                                                        ce.setMonth(baseE.getMonth() + (i + 1) * step)
                                                        if (recurrenceMonthday) { cs.setDate(day); ce.setDate(day) }
                                                    }
                                                }
                                            } else {
                                                occs.push({ s: postForm.startDate, e: postForm.endDate, i: 0 })
                                            }

                                            const seriesId = isRecurring ? `series_${Date.now()}_${Math.random().toString(36).slice(2,8)}` : ''
                                            const results = await Promise.all(occs.map(({ s, e, i }) => axios.post(backendUrl + 'api/events', buildFd(s, e, seriesId, i), { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true })))
                                            const ok = results.some(r => r?.data?.event?._id || r?.data?.message?.toLowerCase().includes('success'))
                                            
                                            if (ok) {
                                                // Post to Facebook if enabled
                                                if (autoPostToFacebook && facebookPageAccessToken && selectedFacebookPage) {
                                                    const createdEvents = results
                                                        .filter(r => r?.data?.event?._id)
                                                        .map(r => r.data.event)
                                                    
                                                    // Post each event to Facebook
                                                    let facebookSuccessCount = 0
                                                    for (const event of createdEvents) {
                                                        try {
                                                            await axios.post(
                                                                backendUrl + 'api/facebook/post-event',
                                                                {
                                                                    eventId: event._id,
                                                                    pageAccessToken: facebookPageAccessToken,
                                                                    pageId: selectedFacebookPage,
                                                                    autoPost: true
                                                                },
                                                                { withCredentials: true }
                                                            )
                                                            facebookSuccessCount++
                                                        } catch (fbError) {
                                                            console.error('Error posting to Facebook:', fbError)
                                                            toast.warning(`Event created but failed to post to Facebook: ${fbError.response?.data?.message || 'Unknown error'}`)
                                                        }
                                                    }
                                                    
                                                    if (facebookSuccessCount > 0) {
                                                        toast.success(`Event${createdEvents.length > 1 ? 's' : ''} posted${createdEvents.length > 1 ? ' and shared to Facebook!' : ' and shared to Facebook!'}`)
                                                    }
                                                } else {
                                                toast.success('Event posted!')
                                                }
                                                
                                                // Reset form completely
                                                setPostForm({ title: '', description: '', location: '', startDate: '', endDate: '', isOpenForDonation: false, isOpenForVolunteer: false, status: 'Approved' })
                                                setPostImageFile(null)
                                                setPostDocFile(null)
                                                setIsRecurring(false)
                                                setRecurrenceType('none')
                                                setRecurrenceCount(4)
                                                setRecurrenceInterval(1)
                                                setRecurrenceWeekday('')
                                                setRecurrenceMonthday('')
                                                setShowPostModal(false)
                                                // refresh
                                                axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                                                    .then(r => setEvents(r.data || []))
                                                    .catch(() => {})
                                            } else {
                                                toast.error('Failed to post event')
                                            }
                                        } catch (err) {
                                            toast.error(err?.response?.data?.message || 'Error posting event')
                                        }
                                    }}
                                    id="post-form"
                                    className="space-y-8"
                                >
                                    {/* Section 1: Basic Information */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                    <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Basic Information
                                                </h3>
                                                <p className="text-sm text-gray-500">Essential details about your event</p>
                                            </div>
                                        </div>

                                        {/* Event Title */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                                </div>
                                                <span>Event Title <span className="text-[#800020] font-semibold">*</span></span>
                                            </label>
                                        <input
                                            type="text"
                                            value={postForm.title}
                                            onChange={e => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                placeholder="Enter a catchy event title"
                                            required
                                        />
                                    </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                                    </svg>
                                                </div>
                                                <span>Description</span>
                                            </label>
                                            <RichTextEditor
                                                value={postForm.description}
                                                onChange={(val) => setPostForm(prev => ({ ...prev, description: val }))}
                                                placeholder="Describe your event in detail..."
                                            />
                                    </div>

                                        {/* Location */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span>Location <span className="text-[#800020] font-semibold">*</span></span>
                                            </label>
                                        <input
                                            type="text"
                                            value={postForm.location}
                                            onChange={e => setPostForm(prev => ({ ...prev, location: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                placeholder="Enter event location or venue"
                                            required
                                        />
                                    </div>

                                        {/* Date & Time */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Start Date & Time <span className="text-[#800020] font-semibold">*</span></span>
                                                </label>
                                            <input
                                                type="datetime-local"
                                                value={postForm.startDate}
                                                onChange={e => setPostForm(prev => ({ ...prev, startDate: e.target.value }))}
                                                min={nowLocal}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                required
                                    />
                                                <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                    <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Use your local date and time</span>
                                                </p>
                                </div>
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>End Date & Time <span className="text-[#800020] font-semibold">*</span></span>
                                                </label>
                                    <input
                                        type="datetime-local"
                                        value={postForm.endDate}
                                        onChange={e => setPostForm(prev => ({ ...prev, endDate: e.target.value }))}
                                        min={postForm.startDate || nowLocal}
                                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                        required
                                    />
                                                <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                    <svg className="w-3 h-3 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span>Must be after start date/time</span>
                                                </p>
                                        </div>
                                    </div>
                                    </div>

                                    {/* Section 3: Media & Documents */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                            </div>
                                        <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Media & Documents
                                                </h3>
                                                <p className="text-sm text-gray-500">Upload images and supporting documents</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Event Image */}
                                            <div className="space-y-3">
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Event Image</span>
                                                </label>
                                                <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*,image/webp,.webp"
                                                onChange={e => {
                                                    const file = e.target.files?.[0]
                                                    setPostImageFile(file || null)
                                                }}
                                                className="hidden"
                                                id="post-event-image-upload"
                                            />
                                                    <label
                                                        htmlFor="post-event-image-upload"
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-white to-[#d4af37]/5 hover:bg-gradient-to-br hover:from-[#d4af37]/10 hover:to-[#f4d03f]/10 hover:border-[#800020] transition-all duration-200 group shadow-sm"
                                                    >
                                                        {postImagePreviewUrl ? (
                                                            <div className="relative w-full h-full rounded-xl overflow-hidden">
                                                                <img src={postImagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setPostImageFile(null)
                                                                        setPostImagePreviewUrl('')
                                                                    }}
                                                                    className="absolute top-2 right-2 bg-[#800020] text-white rounded-full p-1.5 hover:bg-[#a0002a] transition-colors shadow-lg border-2 border-white"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                    </div>
                                                        ) : (
                                                            <>
                                                                <svg className="w-10 h-10 text-gray-400 group-hover:text-[#800020] transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600 group-hover:text-[#800020] font-medium">Click to upload image</p>
                                                                <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                                                            </>
                                                        )}
                                                    </label>
                                        </div>
                                            </div>

                                            {/* Attachment Document */}
                                            <div className="space-y-3">
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Attachment</span>
                                                </label>
                                                <div className="relative">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0]
                                                            setPostDocFile(file || null)
                                                        }}
                                                        className="hidden"
                                                        id="post-attachment-upload"
                                                    />
                                                    <label
                                                        htmlFor="post-attachment-upload"
                                                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-white to-[#d4af37]/5 hover:bg-gradient-to-br hover:from-[#d4af37]/10 hover:to-[#f4d03f]/10 hover:border-[#800020] transition-all duration-200 group shadow-sm"
                                                    >
                                                        {postDocPreviewName ? (
                                                            <div className="flex items-center space-x-3 p-4 w-full">
                                                                <div className="w-12 h-12 bg-[#800020]/10 rounded-lg flex items-center justify-center border-2 border-[#d4af37]/30">
                                                                    <svg className="w-6 h-6 text-[#800020]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                    </svg>
                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-[#800020] truncate">{postDocPreviewName}</p>
                                                                    <p className="text-xs text-gray-500">Click to change</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setPostDocFile(null)
                                                                    }}
                                                                    className="text-[#800020] hover:text-[#a0002a] transition-colors"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <svg className="w-10 h-10 text-gray-400 group-hover:text-[#800020] transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                                <p className="text-sm text-gray-600 group-hover:text-[#800020] font-medium">Click to upload document</p>
                                                                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Event Options */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Event Options
                                                </h3>
                                                <p className="text-sm text-gray-500">Configure event settings</p>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Open for Donations */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Open for Donations</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Allow users to donate to this event</p>
                                                        </div>
                                                    </div>
                                        <button 
                                                        type="button"
                                                        onClick={() => setPostForm(prev => ({ ...prev, isOpenForDonation: !prev.isOpenForDonation }))}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            postForm.isOpenForDonation ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                                        aria-pressed={postForm.isOpenForDonation}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            postForm.isOpenForDonation ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                        </button>
                                                </div>
                                            </div>

                                            {/* Open for Volunteers */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Open for Volunteers</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Allow users to join as volunteers</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setPostForm(prev => ({ ...prev, isOpenForVolunteer: !prev.isOpenForVolunteer }))}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            postForm.isOpenForVolunteer ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                                        aria-pressed={postForm.isOpenForVolunteer}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            postForm.isOpenForVolunteer ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                                    </button>
                                                </div>
                                                
                                                {/* Volunteer Requirements - Show below when toggled on */}
                                                {postForm.isOpenForVolunteer && postForm.volunteerSettings && (
                                                    <div className="mt-4 pt-4 border-t border-[#d4af37]/20 animate-slide-down">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <div>
                                                                <p className="text-sm font-bold text-[#800020]">Volunteer Requirements</p>
                                                                <p className="text-xs text-gray-600">Configure who can join and any limits</p>
                                        </div>
                                    </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-xl p-4 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <div className="space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                                                    <span>Minimum Age</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={postForm.volunteerSettings.minAge}
                                                                    onChange={e => setPostForm(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, minAge: e.target.value } }))}
                                                                    placeholder="e.g., 18"
                                                                />
                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                        </svg>
                                        </div>
                                                                    <span>Max Volunteers</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={postForm.volunteerSettings.maxVolunteers}
                                                                    onChange={e => setPostForm(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, maxVolunteers: e.target.value } }))}
                                                                    placeholder="e.g., 50"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                        </svg>
                                                    </div>
                                                                    <span>Required Skills</span>
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={postForm.volunteerSettings.requiredSkills}
                                                                    onChange={e => setPostForm(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: e.target.value } }))}
                                                                    placeholder="e.g., First Aid, Communication"
                                                                />
                                                    </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                        </svg>
                                                </div>
                                                                    <span>Department Access</span>
                                                                </label>
                                                                <select
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={postForm.volunteerSettings.departmentRestrictionType}
                                                                    onChange={e => setPostForm(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, departmentRestrictionType: e.target.value } }))}
                                                >
                                                                    <option value="all">All Departments</option>
                                                                    <option value="specific">Specific Departments</option>
                                                                </select>
                                                                {postForm.volunteerSettings.departmentRestrictionType === 'specific' && (
                                                                    <input
                                                                        type="text"
                                                                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white mt-2"
                                                                        value={postForm.volunteerSettings.allowedDepartments.join(', ')}
                                                                        onChange={e => setPostForm(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: e.target.value.split(',').map(d => d.trim()).filter(d => d) } }))}
                                                                        placeholder="e.g., College of Engineering, College of Nursing"
                                                                    />
                                                                )}
                                            </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                </div>
                                                                    <span>Additional Notes</span>
                                                                </label>
                                                                <textarea
                                                                    rows={3}
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white resize-none"
                                                                    value={postForm.volunteerSettings.notes}
                                                                    onChange={e => setPostForm(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, notes: e.target.value } }))}
                                                                    placeholder="Any additional requirements or notes for volunteers..."
                                                                />
                                                                </div>
                                                            </div>
                                                        </div>
                                                )}
                                            </div>

                                            {/* Recurring Event - Moved down */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                            <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                        </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Recurring Event</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Schedule this event to repeat</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                        onClick={() => setIsRecurring(!isRecurring)}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            isRecurring ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                                        aria-pressed={isRecurring}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            isRecurring ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                                                </button>
                                                            </div>
                                                {isRecurring && (
                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-down">
                                                        <div className="bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <label className="block text-xs font-semibold text-[#800020] mb-2">Pattern</label>
                                                            <select className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                                                                <option value="weekly">Weekly</option>
                                                                <option value="monthly">Monthly</option>
                                                            </select>
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <label className="block text-xs font-semibold text-[#800020] mb-2">Repeat Every</label>
                                                            <input type="number" min={1} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(Number(e.target.value) || 1)} placeholder="1" />
                                                        </div>
                                                        <div className="bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <label className="block text-xs font-semibold text-[#800020] mb-2">Occurrences</label>
                                                            <input type="number" min={1} max={24} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceCount} onChange={(e) => setRecurrenceCount(Number(e.target.value) || 1)} placeholder="4" />
                                                        </div>
                                                        {recurrenceType === 'weekly' && (
                                                            <div className="md:col-span-3 bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                                <label className="block text-xs font-semibold text-[#800020] mb-2">Weekday (Optional)</label>
                                                                <select className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceWeekday} onChange={(e) => setRecurrenceWeekday(e.target.value)}>
                                                                    <option value="">Same as start date</option>
                                                                    <option value="0">Sunday</option>
                                                                    <option value="1">Monday</option>
                                                                    <option value="2">Tuesday</option>
                                                                    <option value="3">Wednesday</option>
                                                                    <option value="4">Thursday</option>
                                                                    <option value="5">Friday</option>
                                                                    <option value="6">Saturday</option>
                                                                </select>
                                                        </div>
                                                    )}
                                                        {recurrenceType === 'monthly' && (
                                                            <div className="md:col-span-3 bg-white rounded-xl p-3 border-2 border-[#d4af37]/20 shadow-sm">
                                                                <label className="block text-xs font-semibold text-[#800020] mb-2">Day of Month (Optional)</label>
                                                                <input type="number" min={1} max={31} className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all bg-white" value={recurrenceMonthday} onChange={(e) => setRecurrenceMonthday(e.target.value)} placeholder="Same as start date if empty" />
                                                </div>
                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </form>
                            </div>
                            {/* Sticky Footer with Buttons */}
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3 z-10">
                                        <button 
                                            onClick={() => {
                                                setShowPostModal(false)
                                                setTimeout(() => {
                                                    setPostForm({ title: '', description: '', location: '', startDate: '', endDate: '', isOpenForDonation: false, isOpenForVolunteer: false, status: 'Approved' })
                                                    setPostImageFile(null)
                                                    setPostDocFile(null)
                                                    setIsRecurring(false)
                                                    setRecurrenceType('none')
                                                    setRecurrenceCount(4)
                                                    setRecurrenceInterval(1)
                                                    setRecurrenceWeekday('')
                                                    setRecurrenceMonthday('')
                                                }, 200)
                                            }}
                                            className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                    form="post-form"
                                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#900000] text-white font-semibold shadow-sm transition-all duration-200 hover:from-[#900000] hover:to-[#A00000] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Post Event</span>
                                        </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Event Modal */}
                {showEditModal && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowEditModal(false)
                            }
                        }}
                    >
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200 relative flex flex-col">
                            {/* Minimalist Header */}
                            <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-6 py-4 z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-lg border border-gray-300 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 4h2a2 2 0 012 2v2m-6 8l8-8M7 18l-3 1 1-3 9-9a2 2 0 112 2l-9 9z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">Edit Proposed Event</h2>
                                            <p className="text-sm text-gray-500 mt-0.5">Update your proposal details</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200 rounded-full p-2 hover:bg-gray-100"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                <form
                                    id="edit-event-form"
                                    onSubmit={async (e) => {
                                        e.preventDefault()
                                        // validation
                                        if (!editData.startDate || !editData.endDate) {
                                            toast.error('Please provide start and end date/time')
                                            return
                                        }
                                        const s = new Date(editData.startDate)
                                        const en = new Date(editData.endDate)
                                        if (isNaN(s.getTime()) || isNaN(en.getTime())) {
                                            toast.error('Invalid date/time format')
                                            return
                                        }
                                        if (en <= s) {
                                            toast.error('End date/time must be after start date/time')
                                            return
                                        }
                                        await handleEdit(editEventId, {
                                            title: editData.title,
                                            description: editData.description,
                                            location: editData.location,
                                            startDate: new Date(editData.startDate).toISOString(),
                                            endDate: new Date(editData.endDate).toISOString(),
                                            image: editImageFile || undefined,
                                            proposalDocument: editDocumentFile || undefined,
                                            isOpenForDonation: editData.isOpenForDonation,
                                            isOpenForVolunteer: editData.isOpenForVolunteer,
                                            volunteerSettings: editData.isOpenForVolunteer ? editData.volunteerSettings : undefined
                                        })
                                    }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                </svg>
                                            </div>
                                            <span>Event Title <span className="text-[#800020] font-semibold">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editData.title}
                                            onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                            placeholder="Enter event title"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                                </svg>
                                            </div>
                                            <span>Description</span>
                                        </label>
                                        <RichTextEditor
                                            value={editData.description}
                                            onChange={(val) => setEditData(prev => ({ ...prev, description: val }))}
                                            placeholder="Describe your event in detail"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </div>
                                            <span>Location <span className="text-[#800020] font-semibold">*</span></span>
                                        </label>
                                        <input
                                            type="text"
                                            value={editData.location}
                                            onChange={e => setEditData(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                            placeholder="Enter event location"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span>Start Date & Time <span className="text-[#800020] font-semibold">*</span></span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={editData.startDate}
                                                onChange={e => setEditData(prev => ({ ...prev, startDate: e.target.value }))}
                                                min={nowLocal}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                <svg className="w-3 h-3 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Use your local date and time</span>
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span>End Date & Time <span className="text-[#800020] font-semibold">*</span></span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={editData.endDate}
                                                onChange={e => setEditData(prev => ({ ...prev, endDate: e.target.value }))}
                                                min={editData.startDate || nowLocal}
                                                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20 transition-all duration-200 bg-white"
                                                required
                                            />
                                            <p className="text-xs text-gray-500 flex items-center space-x-1">
                                                <svg className="w-3 h-3 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Must be after start date/time</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Event Image */}
                                        <div className="space-y-3">
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span>Event Image</span>
                                            </label>
                                            <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*,image/webp,.webp"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0]
                                                        setEditImageFile(file || null)
                                                        if (file) {
                                                            const reader = new FileReader()
                                                            reader.onloadend = () => {
                                                                setEditImagePreviewUrl(reader.result)
                                                            }
                                                            reader.readAsDataURL(file)
                                                        } else {
                                                            setEditImagePreviewUrl('')
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="edit-event-image-upload"
                                                />
                                                <label
                                                    htmlFor="edit-event-image-upload"
                                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-white to-[#d4af37]/5 hover:bg-gradient-to-br hover:from-[#d4af37]/10 hover:to-[#f4d03f]/10 hover:border-[#800020] transition-all duration-200 group shadow-sm"
                                                >
                                                    {editImagePreviewUrl ? (
                                                        <div className="relative w-full h-full rounded-xl overflow-hidden">
                                                            <img src={editImagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setEditImageFile(null)
                                                                    setEditImagePreviewUrl('')
                                                                }}
                                                                className="absolute top-2 right-2 bg-[#800020] text-white rounded-full p-1.5 hover:bg-[#a0002a] transition-colors shadow-lg border-2 border-white"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                    </div>
                                                    ) : (
                                                        <>
                                                            <svg className="w-10 h-10 text-gray-400 group-hover:text-[#800020] transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                            </svg>
                                                            <p className="text-sm text-gray-600 group-hover:text-[#800020] font-medium">Click to upload image</p>
                                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                                                        </>
                                            )}
                                                </label>
                                        </div>
                                        </div>

                                        {/* Proposal Document */}
                                        <div className="space-y-3">
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <span>Proposal Document</span>
                                            </label>
                                            <div className="relative">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0]
                                                        setEditDocumentFile(file || null)
                                                        if (file) {
                                                            setEditDocPreviewName(file.name)
                                                        } else {
                                                            setEditDocPreviewName('')
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="edit-proposal-doc-upload"
                                                />
                                                <label
                                                    htmlFor="edit-proposal-doc-upload"
                                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-white to-[#d4af37]/5 hover:bg-gradient-to-br hover:from-[#d4af37]/10 hover:to-[#f4d03f]/10 hover:border-[#800020] transition-all duration-200 group shadow-sm"
                                                >
                                                    {editDocPreviewName ? (
                                                        <div className="flex items-center space-x-3 p-4 w-full">
                                                            <div className="w-12 h-12 bg-[#800020]/10 rounded-lg flex items-center justify-center border-2 border-[#d4af37]/30">
                                                                <svg className="w-6 h-6 text-[#800020]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                </svg>
                                                </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-[#800020] truncate">{editDocPreviewName}</p>
                                                                <p className="text-xs text-gray-500">Click to change</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setEditDocumentFile(null)
                                                                    setEditDocPreviewName('')
                                                                }}
                                                                className="text-[#800020] hover:text-[#a0002a] transition-colors"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <svg className="w-10 h-10 text-gray-400 group-hover:text-[#800020] transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                            </svg>
                                                            <p className="text-sm text-gray-600 group-hover:text-[#800020] font-medium">Click to upload document</p>
                                                            <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                                                        </>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center space-x-3 pb-3 border-b border-gray-200">
                                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-300 shadow-sm">
                                                <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                        <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Event Options
                                                </h3>
                                                <p className="text-sm text-gray-500">Configure event settings</p>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Open for Donations */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Open for Donations</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Allow users to donate to this event</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setEditData(prev => ({ ...prev, isOpenForDonation: !prev.isOpenForDonation }))} 
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            editData.isOpenForDonation ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                                        aria-pressed={editData.isOpenForDonation}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            editData.isOpenForDonation ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                        </button>
                                            </div>
                                        </div>

                                            {/* Open for Volunteers */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                        </svg>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-[#800020]">Open for Volunteers</p>
                                                            <p className="text-xs text-gray-600 mt-0.5">Allow users to join as volunteers</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setEditData(prev => ({ ...prev, isOpenForVolunteer: !prev.isOpenForVolunteer }))} 
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                            editData.isOpenForVolunteer ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                        }`}
                                                        aria-pressed={editData.isOpenForVolunteer}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                            editData.isOpenForVolunteer ? 'translate-x-6' : 'translate-x-1'
                                                        }`} />
                                        </button>
                                    </div>
                                                
                                                {/* Volunteer Requirements - Show below when toggled on */}
                                                {editData.isOpenForVolunteer && editData.volunteerSettings && (
                                                    <div className="mt-4 pt-4 border-t border-[#d4af37]/20 animate-slide-down">
                                                        <div className="flex items-center space-x-3 mb-4">
                                                            <svg className="w-5 h-5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            <div>
                                                                <p className="text-sm font-bold text-[#800020]">Volunteer Requirements</p>
                                                                <p className="text-xs text-gray-600">Configure who can join and any limits</p>
                                        </div>
                                    </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-xl p-4 border-2 border-[#d4af37]/20 shadow-sm">
                                                            <div className="space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                        </svg>
                                                                    </div>
                                                                    <span>Minimum Age</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={editData.volunteerSettings.minAge}
                                                                    onChange={e => setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, minAge: e.target.value } }))}
                                                                    placeholder="e.g., 18"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                                        </svg>
                                                                    </div>
                                                                    <span>Max Volunteers</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={editData.volunteerSettings.maxVolunteers}
                                                                    onChange={e => setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, maxVolunteers: e.target.value } }))}
                                                                    placeholder="e.g., 50"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                                        </svg>
                                                                    </div>
                                                                    <span>Required Skills</span>
                                                                </label>
                                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                        value={editReqSkillInput}
                                                                        onChange={e => setEditReqSkillInput(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === ',') {
                                                                                e.preventDefault()
                                                                                const tokens = editReqSkillInput.split(',').map(s => s.trim()).filter(Boolean)
                                                                                if (tokens.length) {
                                                                                    setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: [...new Set([...(prev.volunteerSettings.requiredSkills || []), ...tokens])] } }))
                                                                                    setEditReqSkillInput('')
                                                                                }
                                                                            }
                                                                        }}
                                                                        placeholder="Type a skill and press Enter or comma"
                                                                    />
                                        <button 
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const tokens = editReqSkillInput.split(',').map(s => s.trim()).filter(Boolean)
                                                                            if (tokens.length) {
                                                                                setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: [...new Set([...(prev.volunteerSettings.requiredSkills || []), ...tokens])] } }))
                                                                                setEditReqSkillInput('')
                                                                            }
                                                                        }}
                                                                        className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#a0002a] text-white text-sm font-semibold hover:from-[#a0002a] hover:to-[#800020] transition-all shadow-md hover:shadow-lg whitespace-nowrap w-full sm:w-auto"
                                        >
                                                                        Add
                                        </button>
                                                                </div>
                                                                {editData.volunteerSettings.requiredSkills && editData.volunteerSettings.requiredSkills.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                                        {editData.volunteerSettings.requiredSkills.map((skill, index) => (
                                                                            <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#d4af37]/20 text-[#800020] border-2 border-[#d4af37]/40 rounded-full">
                                                                                {skill}
                                        <button 
                                            type="button" 
                                                                                    className="text-[#800020] hover:text-[#a0002a] transition-colors"
                                                                                    onClick={() => setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: removeTokenFromArray(prev.volunteerSettings.requiredSkills || [], skill) } }))}
                                        >
                                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                                    </svg>
                                        </button>
                                                                            </span>
                                                                        ))}
                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                        </svg>
                                                                    </div>
                                                                    <span>Department Access</span>
                                                                </label>
                                                                <select
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                    value={editData.volunteerSettings.departmentRestrictionType}
                                                                    onChange={e => setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, departmentRestrictionType: e.target.value, allowedDepartments: e.target.value === 'all' ? [] : prev.volunteerSettings.allowedDepartments } }))}
                                                                >
                                                                    <option value="all">All Departments</option>
                                                                    <option value="specific">Specific Departments</option>
                                                                </select>
                                                                {editData.volunteerSettings.departmentRestrictionType === 'specific' && (
                                                                    <div className="space-y-2 mt-2">
                                                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                                                            <select
                                                                                className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                value={editSelectedDept}
                                                                                onChange={e => setEditSelectedDept(e.target.value)}
                                                                            >
                                                                                <option value="">Select department</option>
                                                                                {DEPARTMENTS.filter(d => !(editData.volunteerSettings.allowedDepartments || []).includes(d)).map(d => (
                                                                                    <option key={d} value={d}>{d}</option>
                                                                                ))}
                                                                            </select>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!editSelectedDept) return
                                                                                    setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: addTokenToArray(prev.volunteerSettings.allowedDepartments || [], editSelectedDept) } }))
                                                                                    setEditSelectedDept('')
                                                                                }}
                                                                                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#a0002a] text-white text-sm font-semibold hover:from-[#a0002a] hover:to-[#800020] transition-all shadow-md hover:shadow-lg whitespace-nowrap w-full sm:w-auto"
                                                                            >
                                                                                Add
                                                                            </button>
                                                                        </div>
                                                                        {editData.volunteerSettings.allowedDepartments && editData.volunteerSettings.allowedDepartments.length > 0 && (
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {editData.volunteerSettings.allowedDepartments.map((dep, index) => (
                                                                                    <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#d4af37]/20 text-[#800020] border-2 border-[#d4af37]/40 rounded-full">
                                                                                        {dep}
                                                                                        <button
                                                                                            type="button"
                                                                                            className="text-[#800020] hover:text-[#a0002a] transition-colors"
                                                                                            onClick={() => setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: removeTokenFromArray(prev.volunteerSettings.allowedDepartments || [], dep) } }))}
                                                                                        >
                                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                                                            </svg>
                                                                                        </button>
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="md:col-span-2 space-y-2">
                                                                <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                    <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                        <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                        </svg>
                                                                    </div>
                                                                    <span>Additional Notes</span>
                                                                </label>
                                                                <textarea
                                                                    rows={3}
                                                                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white resize-none"
                                                                    value={editData.volunteerSettings.notes}
                                                                    onChange={e => setEditData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, notes: e.target.value } }))}
                                                                    placeholder="Any additional requirements or notes for volunteers..."
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </form>
                            </div>
                            
                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowEditModal(false)}
                                    className="bg-white text-gray-700 px-6 py-2.5 rounded-lg border border-gray-300 font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    form="edit-event-form"
                                    className="bg-gradient-to-r from-[#800020] to-[#900000] text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 hover:from-[#900000] hover:to-[#A00000] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2"
                                >
                                    Update Event
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowDeleteModal(false)
                            }
                        }}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
                            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 7h16" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-black">Delete Proposed Event</h3>
                                </div>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-gray-100"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-gray-700">Are you sure you want to delete this proposed event? This action cannot be undone.</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setShowDeleteModal(false)}
                                    className="bg-white text-gray-700 px-5 py-2.5 rounded-xl border border-gray-300 font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => deleteEventId && handleDelete(deleteEventId)}
                                    className="bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:bg-red-800 hover:shadow-sm active:scale-[0.98]"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Confirmation Modal */}
                {showConfirmModal && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-modal-in"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowConfirmModal(false)
                                setPendingCancelEventId(null)
                                setPendingCancelSeriesId(null)
                                setConfirmMessage('')
                            }
                        }}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-scale-in">
                            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shadow-sm">
                                        <svg className="w-6 h-6 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-gray-900">Confirm Action</h3>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowConfirmModal(false)
                                        setPendingCancelEventId(null)
                                        setPendingCancelSeriesId(null)
                                        setConfirmMessage('')
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-2 hover:bg-white/50"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="px-6 py-6">
                                <p className="text-gray-700 text-base leading-relaxed">{confirmMessage}</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowConfirmModal(false)
                                        setPendingCancelEventId(null)
                                        setPendingCancelSeriesId(null)
                                        setConfirmMessage('')
                                    }}
                                    className="bg-white text-gray-700 px-6 py-2.5 rounded-xl border border-gray-300 font-semibold transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        try {
                                            if (pendingCancelEventId) {
                                                // Cancel single event
                                                const deletePromise = axios.delete(backendUrl + `api/events/${pendingCancelEventId}`, { withCredentials: true })
                                                toast.promise(deletePromise, {
                                                    pending: 'Cancelling event...',
                                                    success: 'Event cancelled successfully',
                                                    error: 'Failed to cancel event'
                                                })

                                                const res = await deletePromise
                                                if (res.data.message === 'Event deleted successfully') {
                                                    // Refresh events list
                                                    const eventsRes = await axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                                                    setEvents(eventsRes.data || [])
                                                }
                                            } else if (pendingCancelSeriesId) {
                                                // Cancel series
                                                const seriesEvents = events.filter(e => e.seriesId === pendingCancelSeriesId)
                                                
                                                if (seriesEvents.length === 0) {
                                                    toast.warning('No events found in this series')
                                                } else {
                                                    // Delete all events in the series
                                                    const deletePromises = seriesEvents.map(event => 
                                                        axios.delete(backendUrl + `api/events/${event._id}`, { withCredentials: true })
                                                    )

                                                    toast.promise(Promise.all(deletePromises), {
                                                        pending: `Cancelling ${seriesEvents.length} event(s)...`,
                                                        success: `Successfully cancelled ${seriesEvents.length} event(s)`,
                                                        error: 'Failed to cancel some events'
                                                    })

                                                    await Promise.all(deletePromises)
                                                    
                                                    // Refresh events list
                                                    const eventsRes = await axios.get(backendUrl + 'api/events/my-events', { withCredentials: true })
                                                    setEvents(eventsRes.data || [])
                                                }
                                            }
                                        } catch (error) {
                                            toast.error(error?.response?.data?.message || 'Failed to cancel')
                                        } finally {
                                            setShowConfirmModal(false)
                                            setPendingCancelEventId(null)
                                            setPendingCancelSeriesId(null)
                                            setConfirmMessage('')
                                        }
                                    }}
                                    className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:from-red-700 hover:to-red-800 hover:shadow-md active:scale-[0.98] shadow-sm"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Calendar Modal (Month View) */}
                {showCalendar && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-modal-in"
                        style={{ marginTop: 0 }}
                        onClick={(e) => { if (e.target === e.currentTarget) setShowCalendar(false) }}
                    >
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] my-auto overflow-hidden border-2 border-gray-200 animate-modal-in relative">
                            <div className="sticky top-0 bg-gray-200 text-gray-800 px-6 py-4 z-10 shadow-xl border-b-2 border-gray-300">
                                <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg border-2 border-gray-400">
                                            <svg className="w-6 h-6 text-[#800020]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <button className="p-2 rounded-lg border-2 border-gray-400 hover:bg-gray-300 transition-all" onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth()-1, 1))}>
                                            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                        <div className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                            <span>{calendarCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
                                            
                                    </div>
                                        <button className="p-2 rounded-lg border-2 border-gray-400 hover:bg-gray-300 transition-all" onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth()+1, 1))}>
                                            <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                        <select value={calendarFilter} onChange={(e) => setCalendarFilter(e.target.value)} className="border-2 border-gray-400 bg-white text-gray-800 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-500">
                                            <option value="all" className="text-gray-900">All</option>
                                            <option value="Proposed" className="text-gray-900">Proposed</option>
                                            <option value="Approved" className="text-gray-900">Approved</option>
                                            <option value="Upcoming" className="text-gray-900">Upcoming</option>
                                            <option value="Ongoing" className="text-gray-900">Ongoing</option>
                                            <option value="Completed" className="text-gray-900">Completed</option>
                                    </select>
                                        <button className="text-gray-700 hover:text-gray-900 hover:bg-gray-300 transition-all rounded-xl p-2 border border-gray-400 hover:border-gray-500" onClick={() => setShowCalendar(false)}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 overflow-auto h-[calc(90vh-56px)]">
                                {(() => {
                                    const year = calendarCursor.getFullYear()
                                    const month = calendarCursor.getMonth()
                                    const start = new Date(year, month, 1)
                                    const end = new Date(year, month+1, 0)
                                    const startDay = start.getDay()
                                    const daysInMonth = end.getDate()
                                    const cells = []
                                    const firstDate = new Date(year, month, 1 - startDay)
                                    for (let i = 0; i < 42; i++) {
                                        const d = new Date(firstDate)
                                        d.setDate(firstDate.getDate() + i)
                                        const isCurrent = d.getMonth() === month
                                        const dayEvents = sortedEvents.filter(ev => {
                                            const evDate = new Date(ev.startDate)
                                            return evDate.getFullYear() === d.getFullYear() && evDate.getMonth() === d.getMonth() && evDate.getDate() === d.getDate()
                                        }).filter(ev => calendarFilter === 'all' ? true : (ev.status === calendarFilter))
                                        cells.push(
                                            <div key={i} className={`border-2 rounded-lg p-2 min-h-[110px] transition-all ${isCurrent ? 'bg-white border-[#d4af37]/30 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className={`text-xs mb-1 font-semibold ${isCurrent ? 'text-[#800020]' : 'text-gray-400'}`}>{d.getDate()}</div>
                                                <div className="space-y-1">
                                                    {dayEvents.slice(0,3).map(ev => (
                                                        <button key={ev._id} title={ev.title} onClick={() => setSelectedCalEvent(ev)} className={`w-full text-left truncate px-2 py-1 rounded text-xs font-medium transition-all hover:shadow-md ${ev.seriesId ? 'bg-[#d4af37]/20 text-[#800020] border border-[#d4af37]/40 hover:bg-[#d4af37]/30' : 'bg-[#800020]/10 text-[#800020] border border-[#800020]/20 hover:bg-[#800020]/20'}`}>
                                                            {ev.title}
                                                        </button>
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <div className="text-xs text-[#800020] font-medium">+{dayEvents.length-3} more</div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    }
                                    return (
                                        <div className="grid grid-cols-7 gap-2">
                                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w => (
                                                <div key={w} className="text-xs font-bold text-[#800020] px-2 py-2 bg-[#d4af37]/10 rounded-lg text-center border border-[#d4af37]/20">{w}</div>
                                            ))}
                                            {cells}
                                        </div>
                                    )
                                })()}
                            </div>
                            {selectedCalEvent && (
                                <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                                    <div className="pointer-events-auto w-full max-w-xl m-4 bg-white border-2 border-[#d4af37]/30 rounded-2xl shadow-2xl animate-modal-in">
                                        <div className="p-5 border-b-2 border-[#d4af37]/20 bg-gradient-to-r from-[#800020]/5 to-[#a0002a]/5 flex items-center justify-between">
                                            <div>
                                                <div className="text-lg font-bold text-[#800020] flex items-center gap-2">
                                                    <span>{selectedCalEvent.title}</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                            </div>
                                                <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {new Date(selectedCalEvent.startDate).toLocaleString()} — {new Date(selectedCalEvent.endDate).toLocaleString()}
                                                </div>
                                            </div>
                                            <button className="text-[#800020] hover:text-[#a0002a] hover:bg-[#d4af37]/20 rounded-xl p-2 border border-[#d4af37]/30 transition-all" onClick={() => setSelectedCalEvent(null)}>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <div className="p-5 space-y-3 bg-white">
                                            <div className="text-sm text-[#800020] flex items-center gap-2">
                                                <svg className="w-4 h-4 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span><span className="font-bold">Location:</span> {selectedCalEvent.location || 'TBA'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedCalEvent.seriesId && <span className="text-xs px-2 py-1 rounded-full border-2 border-[#d4af37] bg-[#d4af37]/20 text-[#800020] font-semibold">Recurring</span>}
                                                <span className={`text-xs px-2 py-1 rounded-full border-2 font-semibold ${selectedCalEvent.status === 'Approved' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>{selectedCalEvent.status || 'Proposed'}</span>
                                            </div>
                                        </div>
                                        <div className="p-5 border-t-2 border-[#d4af37]/20 bg-gradient-to-r from-[#800020]/5 to-[#a0002a]/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className="px-3 py-2 text-sm rounded-lg border-2 border-[#800020] text-[#800020] hover:bg-[#800020] hover:text-white transition-all font-semibold"
                                                    onClick={() => {
                                                        const ev = selectedCalEvent
                                                        const start = new Date(ev.startDate)
                                                        const end = new Date(ev.endDate)
                                                        const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Eumatter//Event//EN\nBEGIN:VEVENT\nUID:${ev._id || 'local'}@eumatter\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').split('.')[0]}Z\nDTSTART:${start.toISOString().replace(/[-:]/g,'').split('.')[0]}Z\nDTEND:${end.toISOString().replace(/[-:]/g,'').split('.')[0]}Z\nSUMMARY:${(ev.title||'Event').replace(/\n/g,' ')}\nLOCATION:${(ev.location||'').replace(/\n/g,' ')}\nEND:VEVENT\nEND:VCALENDAR`;
                                                        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
                                                        const url = URL.createObjectURL(blob)
                                                        const a = document.createElement('a')
                                                        a.href = url
                                                        a.download = `${(ev.title||'event')}.ics`
                                                        a.click()
                                                        setTimeout(() => URL.revokeObjectURL(url), 1000)
                                                    }}
                                                >
                                                    Add to Calendar (ICS)
                                                </button>
                                                {/* Subscribe/Unsubscribe */}
                                                <button
                                                    className="px-3 py-2 text-sm rounded-lg border-2 border-[#d4af37] bg-[#d4af37]/20 text-[#800020] hover:bg-[#d4af37] hover:text-white transition-all font-semibold"
                                                    onClick={async () => {
                                                        try {
                                                            const isSub = mySubscriptions.some(s => s.scope === 'event' && s.targetId === selectedCalEvent._id)
                                                            const url = isSub ? 'api/subscriptions/unsubscribe' : 'api/subscriptions/subscribe'
                                                            await axios.post(backendUrl + url, { scope: 'event', targetId: selectedCalEvent._id }, { withCredentials: true })
                                                            const { data } = await axios.get(backendUrl + 'api/subscriptions', { withCredentials: true })
                                                            setMySubscriptions(Array.isArray(data) ? data.map(s => ({ ...s, targetId: s.targetId?.toString?.() || s.targetId })) : [])
                                                        } catch (_) {}
                                                    }}
                                                >
                                                    {mySubscriptions.some(s => s.scope === 'event' && s.targetId === selectedCalEvent._id) ? 'Unsubscribe' : 'Subscribe'}
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="px-3 py-2 text-sm rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition-all" onClick={() => setSelectedCalEvent(null)}>Close</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Events List Section */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
                    <div className="px-4 sm:px-6 py-5 border-b border-gray-200">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white border border-gray-300 flex items-center justify-center shadow-sm">
                                    <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight mb-1">Proposed Events</h2>
                                    <p className="text-sm text-gray-600 leading-snug">Review, track, and manage proposals from departments.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={sortBy}
                                        onChange={e => setSortBy(e.target.value)}
                                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#800000]/40 focus:border-[#800000] transition"
                                    >
                                        <option value="date">Sort: Date</option>
                                        <option value="status">Sort: Status</option>
                                    </select>
                                    <select
                                        value={sortOrder}
                                        onChange={e => setSortOrder(e.target.value)}
                                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#800000]/40 focus:border-[#800000] transition"
                                    >
                                        <option value="desc">Newest</option>
                                        <option value="asc">Oldest</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 sm:px-6 py-6">
                        {sortedEvents.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-600 mb-2">No events found</h3>
                                <p className="text-gray-500">Start by proposing your first event!</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Event</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Schedule</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {sortedEvents.map(event => (
                                            <tr key={event._id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900 truncate max-w-xs">{event.title}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Created {new Date(event.createdAt).toLocaleString()} • {event.location || 'No location'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {new Date(event.startDate).toLocaleString()}<br />
                                                    {event.endDate ? new Date(event.endDate).toLocaleString() : 'No end date'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${event.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' : event.status === 'Declined' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                                        {event.status || 'Proposed'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {/* Proposed Status: Show only Edit and Cancel */}
                                                        {event.status === 'Proposed' || !event.status ? (
                                                            <>
                                                        <button 
                                                                    className="px-2.5 py-1.5 rounded-lg bg-[#800000] text-white text-xs font-semibold hover:bg-[#900000] transition-all whitespace-nowrap" 
                                                                    onClick={() => handleEditClick(event)}
                                                                    title="Edit Proposed Event"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button 
                                                                    className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 transition-all whitespace-nowrap" 
                                                                    onClick={() => handleCancelProposal(event)}
                                                                    title="Cancel Proposed Event (will notify CRD)"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : event.status === 'Approved' ? (
                                                            /* Approved Status: Show View and Volunteer buttons */
                                                            <>
                                                                <button 
                                                                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all whitespace-nowrap" 
                                                                    onClick={() => navigate(`/department/events/${event._id}/details`)}
                                                                    title="View Approved Event Details (includes Analytics and Volunteer Management)"
                                                                >
                                                                    View
                                                                </button>
                                                                <button 
                                                                    className="px-2.5 py-1.5 rounded-lg bg-[#800000] text-white text-xs font-semibold hover:bg-[#900000] transition-all whitespace-nowrap" 
                                                                    onClick={() => navigate(`/department/volunteer-management/${event._id}`)}
                                                                    title="Volunteer Management with Attendance"
                                                                >
                                                                    Volunteer
                                                                </button>
                                                            </>
                                                        ) : (
                                                            /* Other statuses: Show View button */
                                                            <button 
                                                                className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-all whitespace-nowrap" 
                                                                onClick={() => navigate(`/department/events/${event._id}/details`)}
                                                                title="View Event Details"
                                                            >
                                                                View
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            {/* Facebook Settings Modal */}
            <FacebookSettingsModal
                isOpen={showFacebookSettings}
                onClose={() => setShowFacebookSettings(false)}
                backendUrl={backendUrl}
                onConfigSaved={(config) => {
                    setFacebookPageAccessToken(config.pageAccessToken)
                    setSelectedFacebookPage(config.pageId)
                    setFacebookConnected(!!config.pageAccessToken && !!config.pageId)
                    setAutoPostToFacebook(config.autoPost || false)
                }}
            />
        </div>
    )
}

export default EventManagement
 
// Edit Modal (placed after export to keep file focused above)
