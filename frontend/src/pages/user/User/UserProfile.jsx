import React, { useContext, useState, useEffect, useRef } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
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
        email: ''
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
                email: userData.email || ''
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
            const { data } = await axios.put(backendUrl + 'api/user/profile', {
                name: formData.name,
                email: formData.email
            })
            
            if (data.success) {
                toast.success('Profile updated successfully!')
                setUserData(prev => ({
                    ...prev,
                    name: formData.name,
                    email: formData.email
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
        <div className="min-h-screen bg-gray-50">
            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
            <Header />
            
            <main className="max-w-4xl mx-auto px-6 py-8">
                {/* Page Header */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-black mb-2">Profile Settings</h1>
                            <p className="text-gray-600">Manage your account information and preferences.</p>
                        </div>
                        {/* Back to Dashboard removed per role UX */}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Overview */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
                            <div className="text-center">
                                {/* Enhanced Profile Picture Section */}
                                <div className="relative inline-block mb-6">
                                    <div className="relative w-32 h-32 mx-auto">
                                        {(profileImage || userData?.profileImage) ? (
                                            <div className="relative w-full h-full rounded-full overflow-hidden ring-4 ring-[#800000] ring-offset-4 ring-offset-white shadow-xl">
                                                <img
                                                    src={profileImage || userData?.profileImage}
                                                    alt={userData?.name || 'User'}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-full"></div>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000] flex items-center justify-center text-4xl font-bold text-white shadow-xl ring-4 ring-[#800000] ring-offset-4 ring-offset-white">
                                                {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                            </div>
                                        )}
                                        
                                        {/* Change Photo Button */}
                                        <button
                                            onClick={handleOpenImageModal}
                                            className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center cursor-pointer hover:from-[#900000] hover:to-[#800000] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95 group border-4 border-white"
                                            aria-label="Change profile picture"
                                        >
                                            <FaCamera className="w-5 h-5 text-white group-hover:scale-110 transition-transform duration-300" />
                                        </button>
                                    </div>
                                </div>

                                {/* Update Button */}
                                {profileImage && profileImage !== userData?.profileImage && (
                                    <div className="mb-4 animate-fadeIn">
                                        <Button
                                            onClick={handleUpdateProfileImage}
                                            disabled={isImageLoading}
                                            size="sm"
                                            className="shadow-md hover:shadow-lg transition-all duration-300"
                                        >
                                            {isImageLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Updating...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <FaUpload className="w-4 h-4" />
                                                    Save Changes
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                )}
                                
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{userData?.name || 'User'}</h2>
                                <p className="text-gray-600 mb-3 text-sm">{userData?.email || 'user@example.com'}</p>
                                <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-[#800000]/10 to-[#900000]/10 text-[#800000] rounded-full text-sm font-semibold border border-[#800000]/20">
                                    {userData?.role || 'User'}
                                </span>
                            </div>
                            
                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Account Status</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        userData?.isAccountVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {userData?.isAccountVerified ? 'Verified' : 'Unverified'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                                    <span className="text-gray-600">Member Since</span>
                                    <span className="text-sm text-gray-800 font-medium">
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

                    {/* Profile Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-semibold text-black">Basic Information</h3>
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-2 rounded-lg transition-colors duration-200 ${
                                        isEditing 
                                            ? 'text-red-600 hover:bg-red-50' 
                                            : 'text-red-900 hover:bg-red-50'
                                    }`}
                                    title={isEditing ? 'Cancel' : 'Edit Profile'}
                                >
                                    {isEditing ? (
                                        <FaTimes className="w-5 h-5" />
                                    ) : (
                                        <FaEdit className="w-5 h-5" />
                                    )}
                                </button>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-black mb-2">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Updating...' : 'Update Profile'}
                                        </Button>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Account Actions */}
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h3 className="text-xl font-semibold text-black mb-6">Account Actions</h3>
                            
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-gray-200 rounded-lg">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-black mb-1">Change Password</h4>
                                        <p className="text-sm text-gray-600">Update your account password</p>
                                    </div>
                                    <button
                                        onClick={() => setIsPasswordModalOpen(true)}
                                        className="px-4 py-2 border-2 border-red-900 text-red-900 rounded-lg font-medium hover:bg-red-900 hover:text-white transition-colors duration-200 whitespace-nowrap flex-shrink-0"
                                    >
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Change Password Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-modal-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8 animate-modal-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Change Password</h3>
                            <button
                                onClick={handleClosePasswordModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Step 1: Request OTP */}
                        {passwordStep === 1 && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-800">
                                        We'll send a verification code to your email address: <strong>{userData?.email}</strong>
                                    </p>
                                </div>
                                <Button
                                    onClick={handleRequestOtp}
                                    disabled={isLoading}
                                    className="w-full"
                                >
                                    {isLoading ? 'Sending...' : 'Send Verification Code'}
                                </Button>
                            </div>
                        )}

                        {/* Step 2: Enter OTP */}
                        {passwordStep === 2 && (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-800">
                                        Verification code sent to <strong>{userData?.email}</strong>. Please check your email.
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                                        Enter Verification Code
                                    </label>
                                    <input
                                        id="otp"
                                        type="text"
                                        maxLength={6}
                                        value={passwordChangeData.otp}
                                        onChange={(e) => setPasswordChangeData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '') }))}
                                        placeholder="000000"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900 text-center text-2xl tracking-widest"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Enter the 6-digit code from your email</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outlineLight"
                                        onClick={() => {
                                            setPasswordStep(1)
                                            setIsOtpSent(false)
                                            setPasswordChangeData(prev => ({ ...prev, otp: '' }))
                                        }}
                                        className="flex-1"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={handleVerifyOtp}
                                        disabled={isLoading || passwordChangeData.otp.length !== 6}
                                        className="flex-1"
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify Code'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Change Password */}
                        {passwordStep === 3 && (
                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-800">
                                        OTP verified! Please enter your new password.
                                    </p>
                                </div>
                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                        New Password
                                    </label>
                                    <input
                                        id="newPassword"
                                        type="password"
                                        value={passwordChangeData.newPassword}
                                        onChange={(e) => setPasswordChangeData(prev => ({ ...prev, newPassword: e.target.value }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                                        required
                                    />
                                </div>
                                    <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                            Confirm New Password
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                        value={passwordChangeData.confirmPassword}
                                        onChange={(e) => setPasswordChangeData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-900"
                                        required
                                        />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outlineLight"
                                        onClick={() => {
                                            setPasswordStep(2)
                                            setPasswordChangeData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }))
                                        }}
                                        className="flex-1"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1"
                                    >
                                        {isLoading ? 'Changing...' : 'Change Password'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Image Upload/Camera Modal */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scaleIn">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#800000] to-[#900000]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-white">Change Profile Picture</h3>
                                <button
                                    onClick={handleCloseImageModal}
                                    className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
                                    aria-label="Close"
                                >
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {!imageSource && (
                                <div className="space-y-4">
                                    <p className="text-gray-600 text-center mb-6">Choose how you want to update your profile picture</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Camera Option */}
                                        <button
                                            onClick={handleChooseCamera}
                                            className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-[#800000] hover:bg-[#800000]/5 transition-all duration-300 group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#800000] to-[#900000] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                                <FaCamera className="w-8 h-8 text-white" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-2">Take Photo</h4>
                                            <p className="text-sm text-gray-600 text-center">Use your device camera to take a new photo</p>
                                        </button>

                                        {/* Upload Option */}
                                        <button
                                            onClick={handleChooseUpload}
                                            className="flex flex-col items-center justify-center p-8 border-2 border-gray-200 rounded-xl hover:border-[#800000] hover:bg-[#800000]/5 transition-all duration-300 group"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#800000] to-[#900000] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                                <FaImage className="w-8 h-8 text-white" />
                                            </div>
                                            <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Photo</h4>
                                            <p className="text-sm text-gray-600 text-center">Choose an existing photo from your device</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Camera View */}
                            {imageSource === 'camera' && !capturedImage && (
                                <div className="space-y-4">
                                    <div className="relative bg-black rounded-xl overflow-hidden">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-auto max-h-[60vh]"
                                        />
                                        <div className="absolute inset-0 border-4 border-white/50 rounded-xl pointer-events-none"></div>
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button
                                            onClick={handleCapturePhoto}
                                            className="px-6 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
                                        >
                                            <FaCamera className="w-5 h-5" />
                                            Capture Photo
                                        </button>
                                        <button
                                            onClick={handleCloseImageModal}
                                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Preview Section (for both camera and upload) */}
                            {previewImage && (
                                <div className="space-y-4">
                                    <div className="relative bg-gray-100 rounded-xl overflow-hidden">
                                        <img
                                            src={previewImage}
                                            alt="Preview"
                                            className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                                        />
                                    </div>
                                    <div className="flex justify-center gap-4">
                                        <button
                                            onClick={handleConfirmImage}
                                            className="px-6 py-3 bg-gradient-to-r from-[#800000] to-[#900000] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
                                        >
                                            <FaCheck className="w-5 h-5" />
                                            Use This Photo
                                        </button>
                                        {imageSource === 'camera' ? (
                                            <button
                                                onClick={handleRetakePhoto}
                                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300 flex items-center gap-2"
                                            >
                                                <FaUndo className="w-5 h-5" />
                                                Retake
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setPreviewImage(null)
                                                    handleChooseUpload()
                                                }}
                                                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300 flex items-center gap-2"
                                            >
                                                <FaUndo className="w-5 h-5" />
                                                Choose Another
                                            </button>
                                        )}
                                        <button
                                            onClick={handleCloseImageModal}
                                            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
                                        >
                                            Cancel
                                        </button>
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
