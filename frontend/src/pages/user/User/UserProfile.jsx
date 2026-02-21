import React, { useContext, useState, useEffect, useRef } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { FaEdit, FaTimes, FaCamera, FaImage, FaCheck, FaUndo, FaUpload } from 'react-icons/fa'

const UserProfile = () => {
    const navigate = useNavigate()
    const { backendUrl, userData, setUserData } = useContext(AppContent)
    const [isLoading, setIsLoading] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        contact: '',
        address: ''
    })
    const [passwordChangeData, setPasswordChangeData] = useState({
        otp: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
    const [passwordStep, setPasswordStep] = useState(1) // 1: Request OTP, 2: Enter OTP, 3: Change Password
    const [isOtpSent, setIsOtpSent] = useState(false)
    const [profileImage, setProfileImage] = useState('')
    const [isImageLoading, setIsImageLoading] = useState(false)
    const [showImageModal, setShowImageModal] = useState(false)
    const [imageSource, setImageSource] = useState(null) // 'upload' or 'camera'
    const [cameraStream, setCameraStream] = useState(null)
    const [capturedImage, setCapturedImage] = useState(null)
    const [previewImage, setPreviewImage] = useState(null)
    const videoRef = useRef(null)
    const fileInputRef = useRef(null)
    const canvasRef = useRef(null)

    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name || '',
                email: userData.email || '',
                contact: userData.contact || '',
                address: userData.address || ''
            })
            setProfileImage(userData.profileImage || '')
        }
    }, [userData])

    // Fetch fresh user data on component mount to ensure createdAt is available
    useEffect(() => {
        const loadUserData = async () => {
            try {
                axios.defaults.withCredentials = true
                const { data } = await axios.get(backendUrl + 'api/auth/is-authenticated')
                if (data.success && data.user) {
                    // Only update if we got createdAt or if current userData doesn't have it
                    if (data.user.createdAt || !userData?.createdAt) {
                        setUserData(data.user)
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error)
            }
        }
        // Only fetch if createdAt is missing
        if (!userData?.createdAt) {
            loadUserData()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchUserData = async () => {
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.get(backendUrl + 'api/auth/is-authenticated')
            if (data.success) {
                setUserData(data.user)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            toast.error('Failed to load profile data')
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        
        if (!formData.name || !formData.email) {
            toast.error('Name and email are required')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const updateData = {
                name: formData.name,
                email: formData.email
            }
            
            // Include contact and address for Department/Organization users
            if (userData?.role === 'Department/Organization') {
                updateData.contact = formData.contact || ''
                updateData.address = formData.address || ''
            }
            
            const { data } = await axios.put(backendUrl + 'api/user/profile', updateData)
            
            if (data.success) {
                toast.success('Profile updated successfully!')
                setUserData(prev => ({
                    ...prev,
                    name: formData.name,
                    email: formData.email,
                    contact: formData.contact,
                    address: formData.address
                }))
                setIsEditing(false)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update profile')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRequestOtp = async () => {
        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/user/change-password-otp')
            
            if (data.success) {
                toast.success('OTP sent to your email!')
                setIsOtpSent(true)
                setPasswordStep(2)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to send OTP')
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOtp = async () => {
        if (!passwordChangeData.otp) {
            toast.error('Please enter the OTP')
            return
        }

        if (passwordChangeData.otp.length !== 6) {
            toast.error('OTP must be 6 digits')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            // We'll verify OTP when changing password, so just move to next step
            setPasswordStep(3)
            toast.success('OTP verified! Please enter your new password')
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to verify OTP')
        } finally {
            setIsLoading(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        
        if (!passwordChangeData.newPassword || !passwordChangeData.confirmPassword) {
            toast.error('All password fields are required')
            return
        }

        if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (passwordChangeData.newPassword.length < 6) {
            toast.error('New password must be at least 6 characters long')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.put(backendUrl + 'api/user/change-password', {
                otp: passwordChangeData.otp,
                newPassword: passwordChangeData.newPassword
            })
            
            if (data.success) {
                toast.success('Password changed successfully!')
                setIsPasswordModalOpen(false)
                setPasswordStep(1)
                setIsOtpSent(false)
                setPasswordChangeData({
                    otp: '',
                    newPassword: '',
                    confirmPassword: ''
                })
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to change password')
        } finally {
            setIsLoading(false)
        }
    }

    const handleClosePasswordModal = () => {
        setIsPasswordModalOpen(false)
        setPasswordStep(1)
        setIsOtpSent(false)
        setPasswordChangeData({
            otp: '',
            newPassword: '',
            confirmPassword: ''
        })
    }

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop())
            }
        }
    }, [cameraStream])

    const handleOpenImageModal = () => {
        setShowImageModal(true)
        setImageSource(null)
        setCapturedImage(null)
        setPreviewImage(null)
    }

    const handleCloseImageModal = () => {
        // Stop camera if running
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setShowImageModal(false)
        setImageSource(null)
        setCapturedImage(null)
        setPreviewImage(null)
    }

    const handleChooseUpload = () => {
        setImageSource('upload')
        fileInputRef.current?.click()
    }

    const handleChooseCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 1280 }
                } 
            })
            setCameraStream(stream)
            setImageSource('camera')
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (error) {
            console.error('Error accessing camera:', error)
            toast.error('Unable to access camera. Please check permissions.')
            setImageSource(null)
        }
    }

    const handleCapturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')

            // Set canvas size to video size
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0)

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
            setCapturedImage(dataUrl)
            setPreviewImage(dataUrl)

            // Stop camera stream
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop())
                setCameraStream(null)
            }
        }
    }

    const handleRetakePhoto = () => {
        setCapturedImage(null)
        setPreviewImage(null)
        handleChooseCamera()
    }

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size must be less than 5MB')
            return
        }
        
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            setPreviewImage(e.target.result)
        }
        reader.readAsDataURL(file)
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size must be less than 5MB')
                return
            }
            
            if (!file.type.startsWith('image/')) {
                toast.error('Please select a valid image file')
                return
            }

            const reader = new FileReader()
            reader.onload = (e) => {
                setProfileImage(e.target.result)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleConfirmImage = () => {
        if (previewImage) {
            setProfileImage(previewImage)
            handleCloseImageModal()
        }
    }

    const handleUpdateProfileImage = async () => {
        if (!profileImage) {
            toast.error('Please select an image')
            return
        }

        setIsImageLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.put(backendUrl + 'api/user/profile-image', {
                profileImage: profileImage
            })
            
            if (data.success) {
                toast.success('Profile image updated successfully!')
                setUserData(prev => ({
                    ...prev,
                    profileImage: profileImage
                }))
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Failed to update profile image')
        } finally {
            setIsImageLoading(false)
        }
    }


    return (
        <div className="min-h-screen bg-[#F5F5F5]">
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-scaleIn { animation: scaleIn 0.2s ease-out; }
            `}</style>
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-6 py-4 sm:py-5 mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-[#800000] tracking-tight">Profile</h1>
                    <p className="text-sm text-gray-600 mt-0.5">Manage your account information.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                            <div className="text-center">
                                <div className="relative inline-block mb-5">
                                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto">
                                        {(profileImage || userData?.profileImage) ? (
                                            <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-[#800000]/20 ring-offset-2 ring-offset-white">
                                                <img
                                                    src={profileImage || userData?.profileImage}
                                                    alt={userData?.name || 'User'}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-[#800000] flex items-center justify-center text-3xl sm:text-4xl font-bold text-white ring-2 ring-[#800000]/20 ring-offset-2 ring-offset-white">
                                                {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleOpenImageModal}
                                            className="absolute -bottom-1 -right-1 w-10 h-10 bg-[#800000] rounded-full flex items-center justify-center text-white hover:bg-[#6b0000] transition border-2 border-white shadow-sm"
                                            aria-label="Change profile picture"
                                        >
                                            <FaCamera className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {profileImage && profileImage !== userData?.profileImage && (
                                    <div className="mb-4">
                                        <button
                                            type="button"
                                            onClick={handleUpdateProfileImage}
                                            disabled={isImageLoading}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] disabled:opacity-70 transition"
                                        >
                                            {isImageLoading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                    Saving...
                                                </>
                                            ) : (
                                                <><FaUpload className="w-4 h-4" /> Save photo</>
                                            )}
                                        </button>
                                    </div>
                                )}
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-0.5">{userData?.name || 'User'}</h2>
                                <p className="text-sm text-gray-500 mb-3">{userData?.email || '—'}</p>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#800000]/10 text-[#800000] border border-[#800000]/20">
                                    {userData?.role || 'User'}
                                </span>
                            </div>
                            <div className="mt-5 space-y-0 border-t border-gray-100 pt-5">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-sm text-gray-600">Account status</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${userData?.isAccountVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {userData?.isAccountVerified ? 'Verified' : 'Unverified'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-sm text-gray-600">Member since</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {(() => {
                                            // Try multiple possible date field names
                                            const createdAt = userData?.createdAt || userData?.created_at || userData?.joinedAt || userData?.joined_at;
                                            
                                            if (createdAt) {
                                                try {
                                                    const date = new Date(createdAt);
                                                    if (!isNaN(date.getTime())) {
                                                        return date.toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        });
                                                    }
                                                } catch (error) {
                                                    console.error('Error parsing date:', error);
                                                }
                                            }
                                            return 'Loading...';
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-semibold text-[#800000]">Basic information</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(!isEditing)}
                                    className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                                    title={isEditing ? 'Cancel' : 'Edit'}
                                >
                                    {isEditing ? <FaTimes className="w-5 h-5" /> : <FaEdit className="w-5 h-5" />}
                                </button>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                            {userData?.role === 'Department/Organization' ? 'Department name' : 'Full name'}
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            placeholder={userData?.role === 'Department/Organization' ? 'Department name' : 'Full name'}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            placeholder="Email address"
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
                                        />
                                    </div>
                                </div>
                                {userData?.role === 'Department/Organization' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1.5">Contact</label>
                                            <input
                                                id="contact"
                                                name="contact"
                                                type="text"
                                                value={formData.contact}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="Contact number"
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                                            <input
                                                id="address"
                                                name="address"
                                                type="text"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                placeholder="Address"
                                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="flex justify-end pt-2">
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] disabled:opacity-70 transition"
                                        >
                                            {isLoading ? 'Saving...' : 'Save changes'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
                            <h3 className="text-base font-semibold text-[#800000] mb-4">Account actions</h3>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                <div>
                                    <h4 className="font-medium text-gray-900 text-sm">Change password</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Update your account password</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordModalOpen(true)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-[#800000] text-[#800000] hover:bg-[#800000] hover:text-white transition flex-shrink-0"
                                >
                                    Change password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {isPasswordModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Change password</h3>
                            <button
                                type="button"
                                onClick={handleClosePasswordModal}
                                className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {passwordStep === 1 && (
                                <>
                                    <p className="text-sm text-gray-600">We&apos;ll send a verification code to <strong className="text-gray-900">{userData?.email}</strong></p>
                                    <button
                                        type="button"
                                        onClick={handleRequestOtp}
                                        disabled={isLoading}
                                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] disabled:opacity-70 transition"
                                    >
                                        {isLoading ? 'Sending...' : 'Send code'}
                                    </button>
                                </>
                            )}
                            {passwordStep === 2 && (
                                <>
                                    <p className="text-sm text-gray-600">Code sent to <strong className="text-gray-900">{userData?.email}</strong>. Check your email.</p>
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">Verification code</label>
                                        <input
                                            id="otp"
                                            type="text"
                                            maxLength={6}
                                            value={passwordChangeData.otp}
                                            onChange={(e) => setPasswordChangeData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                                            placeholder="000000"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] text-center text-xl tracking-widest"
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5">6-digit code from your email</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setPasswordStep(1); setIsOtpSent(false); setPasswordChangeData(prev => ({ ...prev, otp: '' })) }}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleVerifyOtp}
                                            disabled={isLoading || passwordChangeData.otp.length !== 6}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] disabled:opacity-70 transition"
                                        >
                                            {isLoading ? 'Verifying...' : 'Verify'}
                                        </button>
                                    </div>
                                </>
                            )}
                            {passwordStep === 3 && (
                                <form onSubmit={handleChangePassword} className="space-y-4">
                                    <p className="text-sm text-gray-600">Enter your new password below.</p>
                                    <div>
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                                        <input
                                            id="newPassword"
                                            type="password"
                                            value={passwordChangeData.newPassword}
                                            onChange={(e) => setPasswordChangeData(prev => ({ ...prev, newPassword: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            value={passwordChangeData.confirmPassword}
                                            onChange={(e) => setPasswordChangeData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setPasswordStep(2); setPasswordChangeData(prev => ({ ...prev, newPassword: '', confirmPassword: '' })) }}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] disabled:opacity-70 transition"
                                        >
                                            {isLoading ? 'Changing...' : 'Change password'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showImageModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scaleIn">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Change profile picture</h3>
                            <button type="button" onClick={handleCloseImageModal} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition" aria-label="Close">
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            {!imageSource && (
                                <div className="space-y-5">
                                    <p className="text-sm text-gray-600 text-center">Choose how to update your photo</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={handleChooseCamera}
                                            className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-2xl hover:border-[#800000]/30 hover:bg-[#F5E6E8]/50 transition group"
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-[#800000] flex items-center justify-center mb-3">
                                                <FaCamera className="w-7 h-7 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Take photo</span>
                                            <span className="text-xs text-gray-500 mt-0.5">Use camera</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleChooseUpload}
                                            className="flex flex-col items-center justify-center p-6 border border-gray-200 rounded-2xl hover:border-[#800000]/30 hover:bg-[#F5E6E8]/50 transition group"
                                        >
                                            <div className="w-14 h-14 rounded-xl bg-[#800000] flex items-center justify-center mb-3">
                                                <FaImage className="w-7 h-7 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Upload photo</span>
                                            <span className="text-xs text-gray-500 mt-0.5">From device</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            {imageSource === 'camera' && !capturedImage && (
                                <div className="space-y-4">
                                    <div className="relative bg-black rounded-xl overflow-hidden">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[50vh]" />
                                    </div>
                                    <div className="flex justify-center gap-2">
                                        <button type="button" onClick={handleCapturePhoto} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] transition flex items-center gap-2">
                                            <FaCamera className="w-4 h-4" /> Capture
                                        </button>
                                        <button type="button" onClick={handleCloseImageModal} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                                    </div>
                                </div>
                            )}
                            {previewImage && (
                                <div className="space-y-4">
                                    <div className="bg-gray-100 rounded-xl overflow-hidden">
                                        <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[50vh] object-contain mx-auto" />
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        <button type="button" onClick={handleConfirmImage} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[#800000] text-white hover:bg-[#6b0000] transition flex items-center gap-2">
                                            <FaCheck className="w-4 h-4" /> Use this photo
                                        </button>
                                        {imageSource === 'camera' ? (
                                            <button type="button" onClick={handleRetakePhoto} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                                                <FaUndo className="w-4 h-4" /> Retake
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => { setPreviewImage(null); handleChooseUpload() }} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
                                                <FaUndo className="w-4 h-4" /> Choose another
                                            </button>
                                        )}
                                        <button type="button" onClick={handleCloseImageModal} className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Canvas for capturing photos */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            <Footer />
        </div>
    )
}

export default UserProfile
