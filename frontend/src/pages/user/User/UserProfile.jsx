import React, { useContext, useState, useEffect } from 'react'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import Button from '../../../components/Button'
import { AppContent } from '../../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { FaEdit, FaTimes } from 'react-icons/fa'

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

    useEffect(() => {
        if (userData) {
            setFormData({
                name: userData.name || '',
                email: userData.email || ''
            })
            setProfileImage(userData.profileImage || '')
        }
    }, [userData])

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

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <div className="text-center">
                                <div className="relative w-24 h-24 mx-auto mb-4">
                                    {(profileImage || userData?.profileImage) ? (
                                        <img
                                            src={profileImage || userData?.profileImage}
                                            alt={userData?.name || 'User'}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-red-900"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full border-4 border-red-900 bg-red-900 text-white flex items-center justify-center text-2xl font-bold">
                                            {(userData?.name || 'User').split(' ').slice(0,2).map(n=>n.charAt(0).toUpperCase()).join('')}
                                        </div>
                                    )}
                                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-red-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-red-800 transition-colors duration-200">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </label>
                                </div>
                                
                                {profileImage !== userData?.profileImage && (
                                    <div className="mb-4">
                                        <Button
                                            onClick={handleUpdateProfileImage}
                                            disabled={isImageLoading}
                                            size="sm"
                                        >
                                            {isImageLoading ? 'Updating...' : 'Update Image'}
                                        </Button>
                                    </div>
                                )}
                                
                                <h2 className="text-xl font-semibold text-black mb-1">{userData?.name || 'User'}</h2>
                                <p className="text-gray-600 mb-2">{userData?.email || 'user@example.com'}</p>
                                <span className="inline-block px-3 py-1 bg-red-100 text-red-900 rounded-full text-sm font-medium">
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
                                    <span className="text-sm text-gray-800">
                                        {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
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

            <Footer />
        </div>
    )
}

export default UserProfile
