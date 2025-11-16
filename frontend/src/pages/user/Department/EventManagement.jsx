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
        'CBA','CCJC','CAS','CIHTM','CNAHS','CCMS','CAFA','CME','SHS','JHS'
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
        donationTarget: '',
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
        donationTarget: '',
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

    const [eventViewMode, setEventViewMode] = useState('card')

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
            // Validate donation target if donations are enabled
            if (formData.isOpenForDonation && (!formData.donationTarget || parseFloat(formData.donationTarget) <= 0)) {
                toast.error('Please enter a valid donation target amount when donations are enabled')
                return
            }
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
                if (formData.isOpenForDonation) {
                    fd.append('donationTarget', formData.donationTarget || '0')
                }
                if (formData.isOpenForVolunteer) {
                    fd.append('volunteerSettings', JSON.stringify(formData.volunteerSettings))
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
                    donationTarget: '',
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
                    formDataToSend.append(key, updatedData[key])
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
                                className="inline-flex items-center justify-center bg-red-900 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-red-800 transition-colors duration-200 font-medium shadow-sm w-full md:w-auto"
                            >
                                Propose Event
                            </button>
                            <button
                                onClick={() => setShowPostModal(true)}
                                className="inline-flex items-center justify-center bg-white text-red-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-red-300 hover:bg-red-50 transition-colors duration-200 font-medium shadow-sm w-full md:w-auto"
                            >
                                Post Event
                            </button>
                            <button
                                onClick={() => setShowCalendar(true)}
                                className="inline-flex items-center justify-center bg-white text-gray-800 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors duration-200 font-medium shadow-sm w-full md:w-auto"
                            >
                                Calendar
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
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] my-auto overflow-hidden border-2 border-gray-200 animate-modal-in relative">
                            {/* Enhanced Header with Maroon/Gold Theme */}
                            <div className="sticky top-0 bg-gradient-to-r from-[#800020] via-[#a0002a] to-[#800020] text-white px-8 py-6 z-10 shadow-xl border-b-2 border-[#d4af37]/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/30">
                                            <svg className="w-8 h-8 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                                <span>Propose New Event</span>
                                                <span className="text-[#d4af37] text-lg">✨</span>
                                            </h2>
                                            <p className="text-white/90 text-sm mt-0.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-[#d4af37]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                Submit your event proposal for review
                                            </p>
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
                                                    donationTarget: '',
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
                            
                            <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)] scrollbar-thin">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {/* Section 1: Basic Information */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                        </div>
                                                <span>Event Title <span className="text-[#800020] font-bold">*</span></span>
                                            </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
                                                placeholder="Enter a catchy event title"
                                    required
                                />
                            </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
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
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span>Location <span className="text-[#800020] font-bold">*</span></span>
                                            </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
                                                placeholder="Enter event location or venue"
                                    required
                                />
                            </div>

                                        {/* Date & Time */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Start Date & Time <span className="text-[#800020] font-bold">*</span></span>
                                                </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.startDate}
                                        onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        min={nowLocal}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
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
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>End Date & Time <span className="text-[#800020] font-bold">*</span></span>
                                                </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.endDate}
                                        onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        min={formData.startDate || nowLocal}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
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
                            
                                    {/* Section 2: Recurrence Settings */}
                                    <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-6 space-y-4 animate-slide-down shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                                                    <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </div>
                                <div>
                                                    <label className="text-base font-bold text-[#800020]">Recurring Event</label>
                                                    <p className="text-xs text-gray-600">Schedule this event to repeat</p>
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
                            
                                    {/* Section 3: Media & Documents */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span>Media & Documents</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                                </h3>
                                                <p className="text-sm text-gray-600">Upload images and supporting documents</p>
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
                                        accept="image/*"
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
                            
                                    {/* Section 4: Event Options */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                        <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span>Event Options</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                                </h3>
                                                <p className="text-sm text-gray-600">Configure donation and volunteer settings</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Donations Toggle */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
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

                                            {/* Donation Target - Show when donations are enabled */}
                                            {formData.isOpenForDonation && (
                                                <div className="mt-6 bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-6 animate-slide-down shadow-sm">
                                                    <div className="flex items-center space-x-3 mb-5">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-[#800020]">Donation Goal</p>
                                                            <p className="text-xs text-gray-600">Set the target amount for donations</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-semibold text-[#800020]">
                                                            Target Amount (PHP) <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative">
                                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                                <span className="text-gray-500 font-semibold">₱</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={formData.donationTarget}
                                                                onChange={e => setFormData(prev => ({ ...prev, donationTarget: e.target.value }))}
                                                                className="w-full rounded-xl border-2 border-gray-200 pl-10 pr-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
                                                                placeholder="Enter target donation amount (e.g., 50000)"
                                                                required={formData.isOpenForDonation}
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            This amount will be displayed as the donation goal for this event. Users will see how much has been raised towards this goal.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Volunteers Toggle */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                        </div>
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
                                    </div>
                                </div>

                                        {/* Volunteer Requirements */}
                                {formData.isOpenForVolunteer && (
                                            <div className="mt-6 bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-6 animate-slide-down shadow-sm">
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                            <div>
                                                            <p className="text-sm font-bold text-[#800020]">Volunteer Requirements</p>
                                                            <p className="text-xs text-gray-600">Configure who can join and any limits</p>
                                            </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-white rounded-full px-3 py-1.5 border-2 border-[#d4af37]/30 shadow-sm">
                                                        <span className={`text-xs font-medium transition-colors ${formData.volunteerSettings.mode === 'open_for_all' ? 'text-[#800020]' : 'text-gray-400'}`}>Open for all</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, mode: prev.volunteerSettings.mode === 'open_for_all' ? 'with_requirements' : 'open_for_all' } }))}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] ${
                                                                formData.volunteerSettings.mode === 'with_requirements' ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-md' : 'bg-gray-300'
                                                            }`}
                                                    aria-pressed={formData.volunteerSettings.mode === 'with_requirements'}
                                                >
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                                                                formData.volunteerSettings.mode === 'with_requirements' ? 'translate-x-5' : 'translate-x-0.5'
                                                            }`} />
                                                </button>
                                                        <span className={`text-xs font-medium transition-colors ${formData.volunteerSettings.mode === 'with_requirements' ? 'text-[#800020]' : 'text-gray-400'}`}>With requirements</span>
                                            </div>
                                        </div>

                                        {formData.volunteerSettings.mode === 'with_requirements' && (
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
                                                    <div className="flex items-center gap-2">
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
                                                                        setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: [...new Set([...prev.volunteerSettings.requiredSkills, ...tokens])] } }))
                                                                        setReqSkillInput('')
                                                                    }
                                                                }
                                                            }}
                                                                    placeholder="Type a skill and press Enter"
                                                        />
                                                                <button 
                                                                    type="button" 
                                                                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#a0002a] text-white text-sm font-semibold hover:from-[#a0002a] hover:to-[#800020] transition-all shadow-md hover:shadow-lg" 
                                                                    onClick={() => {
                                                            const tokens = reqSkillInput.split(',').map(s => s.trim()).filter(Boolean)
                                                            if (tokens.length) {
                                                                setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: [...new Set([...prev.volunteerSettings.requiredSkills, ...tokens])] } }))
                                                                setReqSkillInput('')
                                                            }
                                                                    }}
                                                                >
                                                                    Add
                                                                </button>
                                                    </div>
                                                    {formData.volunteerSettings.requiredSkills.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {formData.volunteerSettings.requiredSkills.map(skill => (
                                                                        <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#d4af37]/20 text-[#800020] border-2 border-[#d4af37]/40 rounded-full">
                                                                    {skill}
                                                                            <button 
                                                                                type="button" 
                                                                                className="text-[#800020] hover:text-[#a0002a] transition-colors" 
                                                                                onClick={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, requiredSkills: removeTokenFromArray(prev.volunteerSettings.requiredSkills, skill) } }))}
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
                                                
                                                        <div className="md:col-span-2 space-y-3">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                                    </svg>
                                                                </div>
                                                                <span>Department Access</span>
                                                            </label>
                                                            <div className="flex items-center gap-4 p-3 bg-white rounded-lg border-2 border-[#d4af37]/20 shadow-sm">
                                                                <label className="flex items-center gap-2 text-sm font-medium text-[#800020] cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="deptAccess"
                                                                checked={formData.volunteerSettings.departmentRestrictionType === 'all'}
                                                                onChange={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, departmentRestrictionType: 'all', allowedDepartments: [] } }))}
                                                                        className="w-4 h-4 text-[#800020] focus:ring-[#800020]"
                                                            />
                                                                    <span>All Departments</span>
                                                        </label>
                                                                <label className="flex items-center gap-2 text-sm font-medium text-[#800020] cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="deptAccess"
                                                                checked={formData.volunteerSettings.departmentRestrictionType === 'specific'}
                                                                onChange={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, departmentRestrictionType: 'specific' } }))}
                                                                        className="w-4 h-4 text-[#800020] focus:ring-[#800020]"
                                                            />
                                                                    <span>Specific Departments</span>
                                        </label>
                                    </div>
                                                    {formData.volunteerSettings.departmentRestrictionType === 'specific' && (
                                                                <div className="space-y-2 animate-slide-down">
                                                            <div className="flex items-center gap-2">
                                                                        <select 
                                                                            className="flex-1 rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white" 
                                                                            value={selectedDept} 
                                                                            onChange={e => setSelectedDept(e.target.value)}
                                                                        >
                                                                    <option value="">Select department</option>
                                                                    {DEPARTMENTS.filter(d => !formData.volunteerSettings.allowedDepartments.includes(d)).map(d => (
                                                                        <option key={d} value={d}>{d}</option>
                                                                    ))}
                                                                </select>
                                                                        <button 
                                                                            type="button" 
                                                                            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#800020] to-[#a0002a] text-white text-sm font-semibold hover:from-[#a0002a] hover:to-[#800020] transition-all shadow-md hover:shadow-lg" 
                                                                            onClick={() => {
                                                                    if (!selectedDept) return
                                                                    setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: addTokenToArray(prev.volunteerSettings.allowedDepartments, selectedDept) } }))
                                                                    setSelectedDept('')
                                                                            }}
                                                                        >
                                                                            Add
                                                                        </button>
                                </div>
                                                            {formData.volunteerSettings.allowedDepartments.length > 0 && (
                                                                        <div className="flex flex-wrap gap-2">
                                                                    {formData.volunteerSettings.allowedDepartments.map(dep => (
                                                                                <span key={dep} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#d4af37]/20 text-[#800020] border-2 border-[#d4af37]/40 rounded-full">
                                                                            {dep}
                                                                                    <button 
                                                                                        type="button" 
                                                                                        className="text-[#800020] hover:text-[#a0002a] transition-colors" 
                                                                                        onClick={() => setFormData(prev => ({ ...prev, volunteerSettings: { ...prev.volunteerSettings, allowedDepartments: removeTokenFromArray(prev.volunteerSettings.allowedDepartments, dep) } }))}
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
                                                
                                                {/* Time In/Out Schedule Section */}
                                                {formData.startDate && formData.endDate && (() => {
                                                    const start = new Date(formData.startDate)
                                                    const end = new Date(formData.endDate)
                                                    const isMultiDay = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) > 1
                                                    const days = []
                                                    
                                                    if (isMultiDay) {
                                                        // Generate array of days for multi-day event
                                                        const currentDate = new Date(start)
                                                        while (currentDate <= end) {
                                                            days.push(new Date(currentDate))
                                                            currentDate.setDate(currentDate.getDate() + 1)
                                                        }
                                                    } else {
                                                        // Single day event
                                                        days.push(new Date(start))
                                                    }
                                                    
                                                    // Initialize dailySchedule if not exists
                                                    if (!formData.volunteerSettings.dailySchedule || formData.volunteerSettings.dailySchedule.length !== days.length) {
                                                        const defaultSchedule = days.map(day => ({
                                                            date: day.toISOString(),
                                                            timeIn: '08:00',
                                                            timeOut: '17:00',
                                                            notes: ''
                                                        }))
                                                        if (!formData.volunteerSettings.dailySchedule || JSON.stringify(formData.volunteerSettings.dailySchedule) !== JSON.stringify(defaultSchedule)) {
                                                            setTimeout(() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    volunteerSettings: {
                                                                        ...prev.volunteerSettings,
                                                                        dailySchedule: defaultSchedule,
                                                                        requireTimeTracking: true
                                                                    }
                                                                }))
                                                            }, 0)
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <div className="md:col-span-2 space-y-3">
                                                            <label className="flex items-center space-x-2 text-xs font-semibold text-[#800020]">
                                                                <div className="w-6 h-6 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                                    <svg className="w-3.5 h-3.5 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <span>Volunteer Time Schedule {isMultiDay ? `(${days.length} days)` : '(Single Day)'}</span>
                                                            </label>
                                                            <div className="space-y-3 bg-blue-50/50 rounded-lg p-4 border-2 border-blue-200/30">
                                                                {days.map((day, index) => {
                                                                    const daySchedule = formData.volunteerSettings.dailySchedule?.[index] || {
                                                                        date: day.toISOString(),
                                                                        timeIn: '08:00',
                                                                        timeOut: '17:00',
                                                                        notes: ''
                                                                    }
                                                                    const dayLabel = isMultiDay 
                                                                        ? day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                                                        : 'Event Day'
                                                                    
                                                                    return (
                                                                        <div key={index} className="bg-white rounded-lg p-4 border-2 border-gray-200 space-y-3">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-sm font-semibold text-[#800020]">{dayLabel}</span>
                                                                                {isMultiDay && <span className="text-xs text-gray-500">Day {index + 1}</span>}
                                                                            </div>
                                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                <div className="space-y-1">
                                                                                    <label className="text-xs font-medium text-gray-700">Time In</label>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={daySchedule.timeIn || '08:00'}
                                                                                        onChange={e => {
                                                                                            const updatedSchedule = [...(formData.volunteerSettings.dailySchedule || [])]
                                                                                            updatedSchedule[index] = {
                                                                                                ...daySchedule,
                                                                                                timeIn: e.target.value
                                                                                            }
                                                                                            setFormData(prev => ({
                                                                                                ...prev,
                                                                                                volunteerSettings: {
                                                                                                    ...prev.volunteerSettings,
                                                                                                    dailySchedule: updatedSchedule
                                                                                                }
                                                                                            }))
                                                                                        }}
                                                                                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                    />
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <label className="text-xs font-medium text-gray-700">Time Out</label>
                                                                                    <input
                                                                                        type="time"
                                                                                        value={daySchedule.timeOut || '17:00'}
                                                                                        onChange={e => {
                                                                                            const updatedSchedule = [...(formData.volunteerSettings.dailySchedule || [])]
                                                                                            updatedSchedule[index] = {
                                                                                                ...daySchedule,
                                                                                                timeOut: e.target.value
                                                                                            }
                                                                                            setFormData(prev => ({
                                                                                                ...prev,
                                                                                                volunteerSettings: {
                                                                                                    ...prev.volunteerSettings,
                                                                                                    dailySchedule: updatedSchedule
                                                                                                }
                                                                                            }))
                                                                                        }}
                                                                                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            {isMultiDay && (
                                                                                <div className="space-y-1">
                                                                                    <label className="text-xs font-medium text-gray-700">Day Notes (Optional)</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={daySchedule.notes || ''}
                                                                                        onChange={e => {
                                                                                            const updatedSchedule = [...(formData.volunteerSettings.dailySchedule || [])]
                                                                                            updatedSchedule[index] = {
                                                                                                ...daySchedule,
                                                                                                notes: e.target.value
                                                                                            }
                                                                                            setFormData(prev => ({
                                                                                                ...prev,
                                                                                                volunteerSettings: {
                                                                                                    ...prev.volunteerSettings,
                                                                                                    dailySchedule: updatedSchedule
                                                                                                }
                                                                                            }))
                                                                                        }}
                                                                                        placeholder="e.g., Special instructions for this day"
                                                                                        className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-[#800020] focus:border-[#800020] transition-all bg-white"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })}
                                                                <p className="text-xs text-gray-600 mt-2">
                                                                    <strong>Note:</strong> Volunteers must check in (time in) and check out (time out) for each day. 
                                                                    {isMultiDay ? ' For multi-day events, volunteers need to check in/out daily.' : ' After time out, volunteers will be asked to complete an evaluation form.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4 pt-6 border-t-2 border-[#d4af37]/20 sticky bottom-0 bg-white pb-2">
                                        <button 
                                            type="button" 
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
                                            className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#800020] to-[#a0002a] text-white font-bold shadow-lg transition-all duration-200 hover:from-[#a0002a] hover:to-[#800020] hover:shadow-xl hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2 flex items-center space-x-2 border-2 border-[#d4af37]/30"
                                        >
                                            <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Propose Event</span>
                                        </button>
                                    </div>
                                </form>
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
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] my-auto overflow-hidden border-2 border-gray-200 animate-modal-in relative">
                            {/* Enhanced Header with Maroon/Gold Theme */}
                            <div className="sticky top-0 bg-gradient-to-r from-[#800020] via-[#a0002a] to-[#800020] text-white px-8 py-6 z-10 shadow-xl border-b-2 border-[#d4af37]/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/30">
                                            <svg className="w-8 h-8 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                                <span>Post Event</span>
                                                <span className="text-[#d4af37] text-lg">✨</span>
                                            </h2>
                                            <p className="text-white/90 text-sm mt-0.5 flex items-center gap-1">
                                                <svg className="w-3.5 h-3.5 text-[#d4af37]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                                Publish your event immediately
                                            </p>
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

                            <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)] scrollbar-thin">
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
                                    className="space-y-8"
                                >
                                    {/* Section 1: Basic Information */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                                    </svg>
                                                </div>
                                                <span>Event Title <span className="text-[#800020] font-bold">*</span></span>
                                            </label>
                                        <input
                                            type="text"
                                            value={postForm.title}
                                            onChange={e => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
                                                placeholder="Enter a catchy event title"
                                            required
                                        />
                                    </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
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
                                            <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                    <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                </div>
                                                <span>Location <span className="text-[#800020] font-bold">*</span></span>
                                            </label>
                                        <input
                                            type="text"
                                            value={postForm.location}
                                            onChange={e => setPostForm(prev => ({ ...prev, location: e.target.value }))}
                                                className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
                                                placeholder="Enter event location or venue"
                                            required
                                        />
                                    </div>

                                        {/* Date & Time */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>Start Date & Time <span className="text-[#800020] font-bold">*</span></span>
                                                </label>
                                            <input
                                                type="datetime-local"
                                                value={postForm.startDate}
                                                onChange={e => setPostForm(prev => ({ ...prev, startDate: e.target.value }))}
                                                min={nowLocal}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
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
                                                <label className="flex items-center space-x-2 text-sm font-semibold text-[#800020]">
                                                    <div className="w-8 h-8 bg-[#d4af37]/10 rounded-lg flex items-center justify-center border border-[#d4af37]/30">
                                                        <svg className="w-4 h-4 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <span>End Date & Time <span className="text-[#800020] font-bold">*</span></span>
                                                </label>
                                            <input
                                                type="datetime-local"
                                                value={postForm.endDate}
                                                onChange={e => setPostForm(prev => ({ ...prev, endDate: e.target.value }))}
                                                min={postForm.startDate || nowLocal}
                                                    className="w-full rounded-xl border-2 border-gray-200 px-4 py-3.5 text-gray-900 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 transition-all duration-200 bg-white/50 focus:bg-white shadow-sm"
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

                                    {/* Section 2: Recurrence Settings */}
                                    <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-6 space-y-4 animate-slide-down shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
                                                    <svg className="w-6 h-6 text-[#800020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <label className="text-base font-bold text-[#800020]">Recurring Event</label>
                                                    <p className="text-xs text-gray-600">Schedule this event to repeat</p>
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

                                    {/* Section 3: Media & Documents */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span>Media & Documents</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                                </h3>
                                                <p className="text-sm text-gray-600">Upload images and supporting documents</p>
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
                                                accept="image/*"
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
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-2xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span>Event Options</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                                </h3>
                                                <p className="text-sm text-gray-600">Configure donation and volunteer settings</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Donations Toggle */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
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

                                            {/* Volunteers Toggle */}
                                            <div className="bg-gradient-to-br from-[#d4af37]/5 to-[#f4d03f]/10 border-2 border-[#d4af37]/30 rounded-2xl p-5 hover:shadow-md transition-all duration-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                            </svg>
                                                        </div>
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
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 5: Facebook Integration */}
                                    <div className="space-y-6 animate-slide-down">
                                        <div className="flex items-center space-x-3 pb-3 border-b-2 border-[#d4af37]/20">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg border-2 border-blue-400/30">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                    <span>Facebook Integration</span>
                                                    <span className="text-[#d4af37] text-sm">★</span>
                                                </h3>
                                                <p className="text-sm text-gray-600">Automatically share your event on Facebook</p>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-2 border-blue-200/50 rounded-2xl p-6 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3 flex-1">
                                                    <div className="w-12 h-12 bg-gradient-to-br from-[#800020] to-[#a0002a] rounded-xl flex items-center justify-center shadow-lg border-2 border-[#d4af37]/30">
                                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-[#800020]">Auto-Post to Facebook</p>
                                                        <p className="text-xs text-gray-600 mt-0.5">Share this event on your Facebook page</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setAutoPostToFacebook(!autoPostToFacebook)}
                                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:ring-offset-2 ${
                                                        autoPostToFacebook ? 'bg-gradient-to-r from-[#d4af37] to-[#f4d03f] shadow-lg' : 'bg-gray-300'
                                                    }`}
                                                >
                                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                                                        autoPostToFacebook ? 'translate-x-6' : 'translate-x-1'
                                                    }`} />
                                                </button>
                                            </div>

                                            {autoPostToFacebook && (
                                                <div className="mt-4 space-y-3 animate-slide-down">
                                                    {!facebookConnected ? (
                                                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                                                            <div className="flex items-start space-x-3">
                                                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-yellow-900">Facebook Not Connected</p>
                                                                    <p className="text-xs text-yellow-700 mt-1">Please connect your Facebook page to enable automatic posting.</p>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowFacebookSettings(true)}
                                                                        className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-colors shadow-md"
                                                                    >
                                                                        Connect Facebook Page
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white border-2 border-green-200 rounded-xl p-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-gray-900">Connected to Facebook</p>
                                                                        <p className="text-xs text-gray-600">Page ID: {selectedFacebookPage}</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowFacebookSettings(true)}
                                                                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                                >
                                                                    Change
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Submit Buttons */}
                                    <div className="flex justify-end gap-4 pt-6 border-t-2 border-[#d4af37]/20 sticky bottom-0 bg-white pb-2">
                                        <button 
                                            type="button" 
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
                                            className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#800020] to-[#a0002a] text-white font-bold shadow-lg transition-all duration-200 hover:from-[#a0002a] hover:to-[#800020] hover:shadow-xl hover:-translate-y-0.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2 flex items-center space-x-2 border-2 border-[#d4af37]/30"
                                        >
                                            <svg className="w-5 h-5 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>Post Event</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Event Modal */}
                {showEditModal && (
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowEditModal(false)
                            }
                        }}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-100">
                            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-200 px-8 py-6 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mr-4">
                                            <svg className="w-6 h-6 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4h2a2 2 0 012 2v2m-6 8l8-8M7 18l-3 1 1-3 9-9a2 2 0 112 2l-9 9z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-extrabold text-black">Edit Proposed Event</h2>
                                            <p className="text-gray-600">Update your proposal details</p>
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

                            <div className="p-8">
                                <form
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
                                    <div>
                                        <label className={controlLabel}>Event Title</label>
                                        <input
                                            type="text"
                                            value={editData.title}
                                            onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                            className={`${inputBase} ${editData.title ? 'text-black' : 'text-gray-600'}`}
                                            placeholder="Enter event title"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={controlLabel}>Description</label>
                                        <RichTextEditor
                                            value={editData.description}
                                            onChange={(val) => setEditData(prev => ({ ...prev, description: val }))}
                                            placeholder="Describe your event in detail"
                                        />
                                    </div>
                                    <div>
                                        <label className={controlLabel}>Location</label>
                                        <input
                                            type="text"
                                            value={editData.location}
                                            onChange={e => setEditData(prev => ({ ...prev, location: e.target.value }))}
                                            className={`${inputBase} ${editData.location ? 'text-black' : 'text-gray-600'}`}
                                            placeholder="Enter event location"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={controlLabel}>Start Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={editData.startDate}
                                                onChange={e => setEditData(prev => ({ ...prev, startDate: e.target.value }))}
                                                min={nowLocal}
                                                className={`${inputBase} ${editData.startDate ? 'text-black' : 'text-gray-600'}`}
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Use your local date and time.</p>
                                        </div>
                                        <div>
                                            <label className={controlLabel}>End Date & Time</label>
                                            <input
                                                type="datetime-local"
                                                value={editData.endDate}
                                                onChange={e => setEditData(prev => ({ ...prev, endDate: e.target.value }))}
                                                min={editData.startDate || nowLocal}
                                                className={`${inputBase} ${editData.endDate ? 'text-black' : 'text-gray-600'}`}
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Must be after the start date/time.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className={controlLabel}>Event Image</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => setEditImageFile(e.target.files[0])}
                                                className={`${inputBase} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100`}
                                            />
                                            {editImagePreviewUrl && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <img src={editImagePreviewUrl} alt="Preview" className="h-24 w-24 object-cover rounded-lg border" />
                                                    <div className="text-sm text-gray-700">
                                                        <p className="font-medium truncate max-w-[220px]">{editImageFile?.name}</p>
                                                        <button type="button" className="mt-1 text-red-700 hover:underline" onClick={() => { setEditImageFile(null) }}>Remove</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className={controlLabel}>Proposal Document</label>
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={e => setEditDocumentFile(e.target.files[0])}
                                                className={`${inputBase} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100`}
                                            />
                                            {editDocPreviewName && (
                                                <div className="mt-3 inline-flex items-center gap-3 rounded-lg border px-3 py-2 bg-gray-50">
                                                    <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 3h8l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
                                                    <span className="text-sm text-gray-800 truncate max-w-[240px]">{editDocPreviewName}</span>
                                                    <button type="button" className="text-red-700 hover:underline" onClick={() => setEditDocumentFile(null)}>Remove</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Event Options</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-center justify-between bg-white rounded-lg border p-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">Open for Donations</p>
                                            <p className="text-xs text-gray-500">Allow users to donate to this event</p>
                                            </div>
                                        <button type="button" onClick={() => setEditData(prev => ({ ...prev, isOpenForDonation: !prev.isOpenForDonation }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editData.isOpenForDonation ? 'bg-red-900' : 'bg-gray-300'}`}>
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${editData.isOpenForDonation ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                            </div>
                                    <div className="flex items-center justify-between bg-white rounded-lg border p-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">Open for Volunteers</p>
                                            <p className="text-xs text-gray-500">Allow users to join as volunteers</p>
                                        </div>
                                        <button type="button" onClick={() => setEditData(prev => ({ ...prev, isOpenForVolunteer: !prev.isOpenForVolunteer }))} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editData.isOpenForVolunteer ? 'bg-red-900' : 'bg-gray-300'}`}>
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${editData.isOpenForVolunteer ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-4 pt-4">
                                        <button 
                                            type="submit" 
                                            className="bg-red-900 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:bg-red-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-900 focus-visible:ring-offset-2"
                                        >
                                            Update Event
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowEditModal(false)}
                                            className="bg-white text-gray-700 px-8 py-3 rounded-xl border border-gray-300 font-semibold transition-all duration-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
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

                {/* Calendar Modal (Month View) */}
                {showCalendar && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-modal-in"
                        style={{ marginTop: 0 }}
                        onClick={(e) => { if (e.target === e.currentTarget) setShowCalendar(false) }}
                    >
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] my-auto overflow-hidden border-2 border-gray-200 animate-modal-in relative">
                            <div className="sticky top-0 bg-gradient-to-r from-[#800020] via-[#a0002a] to-[#800020] text-white px-6 py-4 z-10 shadow-xl border-b-2 border-[#d4af37]/30">
                                <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] to-[#f4d03f] rounded-xl flex items-center justify-center shadow-lg border-2 border-white/30">
                                            <svg className="w-6 h-6 text-[#800020]" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                        <button className="p-2 rounded-lg border-2 border-white/20 hover:bg-[#d4af37]/20 transition-all" onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth()-1, 1))}>
                                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                        <div className="text-lg font-bold text-white flex items-center gap-2">
                                            <span>{calendarCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
                                            <span className="text-[#d4af37] text-sm">📅</span>
                                    </div>
                                        <button className="p-2 rounded-lg border-2 border-white/20 hover:bg-[#d4af37]/20 transition-all" onClick={() => setCalendarCursor(prev => new Date(prev.getFullYear(), prev.getMonth()+1, 1))}>
                                            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                                <div className="flex items-center gap-3">
                                        <select value={calendarFilter} onChange={(e) => setCalendarFilter(e.target.value)} className="border-2 border-white/30 bg-white/10 text-white rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#d4af37] focus:border-[#d4af37] backdrop-blur-sm">
                                            <option value="all" className="text-gray-900">All</option>
                                            <option value="Proposed" className="text-gray-900">Proposed</option>
                                            <option value="Approved" className="text-gray-900">Approved</option>
                                            <option value="Upcoming" className="text-gray-900">Upcoming</option>
                                            <option value="Ongoing" className="text-gray-900">Ongoing</option>
                                            <option value="Completed" className="text-gray-900">Completed</option>
                                    </select>
                                        <button className="text-white/90 hover:text-white hover:bg-[#d4af37]/20 transition-all rounded-xl p-2 border border-white/20 hover:border-[#d4af37]/40" onClick={() => setShowCalendar(false)}>
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
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#800000] to-[#C21807] text-white flex items-center justify-center shadow-inner">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight mb-1">Proposed Events</h2>
                                    <p className="text-sm text-gray-600 leading-snug">Review, track, and manage proposals from departments.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1.5">
                                    <button
                                        onClick={() => setEventViewMode('card')}
                                        className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all ${eventViewMode === 'card' ? 'bg-white text-[#800000] shadow' : 'text-gray-600 hover:text-[#800000]'}`}
                                    >Card View</button>
                                    <button
                                        onClick={() => setEventViewMode('table')}
                                        className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full transition-all ${eventViewMode === 'table' ? 'bg-white text-[#800000] shadow' : 'text-gray-600 hover:text-[#800000]'}`}
                                    >Table View</button>
                                </div>
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
                        ) : eventViewMode === 'card' ? (
                            <div className="grid gap-4 lg:gap-5">
                                {sortedEvents.map(event => (
                                    <div key={event._id} className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#800000]/10 text-[#800000] border border-[#800000]/20">{event.status || 'Proposed'}</span>
                                                    <span className="text-[11px] text-gray-500">Created {new Date(event.createdAt).toLocaleString()}</span>
                                                </div>
                                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 truncate">{event.title}</h3>
                                                <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: event.description?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') || '' }} />
                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        <span className="truncate">{event.location || 'No location set'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        <span>{new Date(event.startDate).toLocaleString()} – {event.endDate ? new Date(event.endDate).toLocaleString() : 'No end date'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 lg:items-end">
                                                <div className="flex flex-wrap gap-2">
                                                    <button 
                                                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#800000] to-[#900000] text-white hover:shadow-lg font-semibold transition-all flex items-center gap-1.5" 
                                                        onClick={() => navigate(`/department/events/${event._id}/details`)}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                        Analytics
                                                    </button>
                                                    {event.status === 'Ongoing' && (
                                                        <button className="px-3 py-2 rounded-lg border border-green-200 text-green-700 bg-white hover:bg-green-50 hover:shadow" onClick={() => { setAttendanceForEvent(event); setShowAttendanceModal(true); }}>Attendance QR</button>
                                                    )}
                                                    {event.isOpenForVolunteer && (
                                                        <button className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 hover:shadow" onClick={() => navigate(`/department/volunteer-management/${event._id}`)}>Volunteers</button>
                                                    )}
                                                    {event.seriesId && (
                                                        <button className="px-3 py-2 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50 hover:shadow" onClick={() => handleCancelSeries(event.seriesId)}>Cancel Series</button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    <button className="px-4 py-2 rounded-full bg-gradient-to-r from-[#800000] to-[#C21807] text-white text-xs sm:text-sm font-semibold shadow hover:shadow-md" onClick={() => handleEditClick(event)}>Edit</button>
                                                    <button className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50" onClick={() => handlePostFromProposal(event)}>Post</button>
                                                    <button className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 text-xs sm:text-sm hover:bg-gray-50" onClick={() => handleCloneEvent(event)}>Duplicate</button>
                                                    <button className="px-4 py-2 rounded-full border border-red-200 text-red-600 text-xs sm:text-sm hover:bg-red-50" onClick={() => handleCancelProposal(event)}>Cancel</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                                                    <div className="flex flex-wrap gap-2">
                                                        <button 
                                                            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#800000] to-[#900000] text-white text-xs font-semibold hover:shadow-md transition-all" 
                                                            onClick={() => navigate(`/department/events/${event._id}/details`)}
                                                        >
                                                            Analytics
                                                        </button>
                                                        <button className="px-3 py-1.5 rounded-full bg-[#800000] text-white text-xs font-semibold" onClick={() => handleEditClick(event)}>Edit</button>
                                                        <button className="px-3 py-1.5 rounded-full border border-gray-300 text-xs font-semibold" onClick={() => handlePostFromProposal(event)}>Post</button>
                                                        <button className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 font-semibold" onClick={() => handleCloneEvent(event)}>Duplicate</button>
                                                        <button className="px-3 py-1.5 rounded-full border border-red-200 text-xs text-red-600 font-semibold" onClick={() => handleCancelProposal(event)}>Cancel</button>
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
