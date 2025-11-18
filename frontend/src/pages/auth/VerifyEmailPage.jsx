import React, { useContext, useState, useEffect } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { FaEnvelope, FaCheckCircle, FaArrowLeft, FaClock } from 'react-icons/fa'

const VerifyEmailPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { backendUrl, setUserData, setIsLoggedIn, getDashboardRoute } = useContext(AppContent)
    
    const [otp, setOtp] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [isResending, setIsResending] = useState(false)
    
    // Get email from location state or use a default
    const email = location.state?.email || ''
    
    // Countdown timer for resend OTP
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const handleVerifyEmail = async (e) => {
        e.preventDefault()
        
        if (!email) {
            toast.error('Email not found. Please register again.')
            navigate('/register')
            return
        }
        
        // Normalize OTP - remove whitespace, ensure it's 6 digits
        const normalizedOtp = otp.trim().replace(/\s/g, '')
        
        if (!normalizedOtp || normalizedOtp.length !== 6 || !/^\d{6}$/.test(normalizedOtp)) {
            toast.error('Please enter a valid 6-digit code')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/verify-email', {
                email: email.trim().toLowerCase(),
                otp: normalizedOtp
            }, {
                timeout: 30000 // 30 seconds timeout
            })
            
            if (data.success) {
                toast.success('Email verified successfully! Redirecting...')
                // Update user data if available
                if (data.user) {
                    setUserData(data.user)
                    setIsLoggedIn(true)
                }
                // Small delay for better UX
                setTimeout(() => {
                    // Navigate to appropriate dashboard based on user role
                    if (data.user?.role) {
                        const dashboardRoute = getDashboardRoute(data.user.role)
                        navigate(dashboardRoute)
                    } else {
                        navigate('/login')
                    }
                }, 1000)
            } else {
                // Handle different error scenarios
                if (data.actionRequired === 'code_regenerated' && data.codeSent) {
                    toast.warning(data.message || 'A new code has been sent to your email. Please check your inbox.')
                    setOtp('') // Clear OTP input for new code
                    setResendCooldown(60) // Reset cooldown since new code was sent
                } else if (data.actionRequired === 'resend_otp') {
                    toast.error(data.message || 'Please request a new verification code.')
                    setOtp('')
                } else if (data.remainingAttempts !== undefined) {
                    toast.error(data.message || 'Incorrect code. Please try again.')
                    // Don't clear OTP if there are attempts remaining - let user correct it
                    if (data.remainingAttempts === 0) {
                        setOtp('') // Clear if no attempts left (new code sent)
                        setResendCooldown(60)
                    }
                } else {
                    toast.error(data.message || 'Verification failed. Please try again.')
                    setOtp('')
                }
            }
        } catch (error) {
            console.error('Email verification error:', error)
            const errorMessage = error?.response?.data?.message || error.message || 'Failed to verify email. Please try again.'
            
            // Handle specific error types
            if (error.response?.data?.actionRequired === 'code_regenerated' && error.response?.data?.codeSent) {
                toast.warning(error.response.data.message || 'A new code has been sent to your email.')
                setOtp('')
                setResendCooldown(60)
            } else if (error.response?.data?.actionRequired === 'resend_otp') {
                toast.error(error.response.data.message || 'Please request a new verification code.')
                setOtp('')
            } else if (error.response?.status === 400 && errorMessage.toLowerCase().includes('expired')) {
                toast.error(errorMessage)
                setTimeout(() => {
                    toast.info('A new code may have been sent. Please check your email or click "Resend OTP".')
                }, 2000)
                setOtp('')
            } else if (error.response?.status === 500) {
                toast.error('Server error occurred. Please try again in a moment.')
                setOtp('')
            } else {
                toast.error(errorMessage)
                setOtp('')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (!email) {
            toast.error('Email not found. Please register again.')
            return
        }

        if (resendCooldown > 0) {
            toast.warning(`Please wait ${resendCooldown} seconds before requesting a new code`)
            return
        }

        setIsResending(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/send-verify-otp', {
                email
            }, {
                timeout: 30000 // 30 seconds timeout (backend responds immediately, email sent in background)
            })
            
            if (data.success) {
                // Show backend message or a clearer message about OTP generation
                const message = data.message || 'New verification code is being sent to your email. You can try verifying with the code even if the email hasn\'t arrived yet.'
                toast.success(message)
                setResendCooldown(60) // 60 second cooldown
                setOtp('') // Clear current OTP input
            } else {
                toast.error(data.message || 'Failed to generate OTP')
            }
        } catch (error) {
            console.error('Resend OTP error:', error)
            
            // Handle different error types
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                // Email might still be sent in background, give user info
                toast.warning('Request is taking longer than expected. The email may still be sent. Please check your inbox.')
                // Still show success message as email might be processing
                setResendCooldown(60)
            } else if (error.response?.status === 503) {
                toast.error('Service temporarily unavailable. Please try again in a few moments.')
            } else if (error.response?.status === 404) {
                toast.error('Resend OTP endpoint not found. Please contact support.')
            } else if (error.response?.data?.message) {
                toast.error(error.response.data.message)
            } else if (error.message) {
                if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
                    toast.error('Network error. Please check your connection and try again.')
                } else {
                    toast.error(error.message)
                }
            } else {
                toast.error('Failed to send OTP. Please try again.')
            }
        } finally {
            setIsResending(false)
        }
    }

    // Redirect to register if no email
    useEffect(() => {
        if (!email) {
            toast.warning('No email found. Redirecting to registration...')
            setTimeout(() => {
                navigate('/register')
            }, 2000)
        }
    }, [email, navigate])

    return (
        <div className="min-h-screen flex flex-col bg-white relative overflow-x-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-yellow-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 min-h-screen flex flex-col w-full overflow-x-hidden">
                <Header />

                <main className="flex-1 flex items-center justify-center px-4 md:px-6 py-8 md:py-12">
                    <div className="w-full max-w-md bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] rounded-2xl p-6 md:p-8 space-y-6 border border-gray-100">
                        {/* Header Section */}
                        <div className="text-center space-y-3">
                            <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700] to-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-yellow-500/50">
                                <FaEnvelope className="w-10 h-10 text-[#800000]" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Verify Your Email</h1>
                            <div className="space-y-1">
                                <p className="text-sm md:text-base text-gray-600">
                                    We've sent a 6-digit verification code to
                                </p>
                                <p className="text-[#800000] font-semibold text-base md:text-lg break-all">{email || 'your email'}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    <FaClock className="inline mr-1" />
                                    Code expires in 10 minutes
                                </p>
                            </div>
                        </div>

                        {/* OTP Form */}
                        <form onSubmit={handleVerifyEmail} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                    Enter Verification Code
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                                        setOtp(value)
                                    }}
                                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] text-center text-3xl tracking-[0.5em] font-bold text-gray-900 placeholder:text-gray-300"
                                    maxLength={6}
                                    autoComplete="one-time-code"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 text-center">
                                    {otp.replace(/\s/g, '').length}/6 digits
                                </p>
                                {otp.length > 0 && otp.replace(/\s/g, '').length !== 6 && (
                                    <p className="text-xs text-red-500 text-center">
                                        Please enter exactly 6 digits
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || otp.replace(/\s/g, '').length !== 6}
                                className="w-full bg-gradient-to-r from-[#800000] to-red-900 text-white hover:from-red-900 hover:to-[#800000] font-semibold transition-all duration-200 rounded-lg px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? (
                                    <>
                                        <LoadingSpinner size="tiny" inline />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaCheckCircle className="text-lg" />
                                        <span>Verify Email</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Resend Section */}
                        <div className="text-center space-y-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                Didn't receive the code?
                            </p>
                            <button
                                onClick={handleResendOtp}
                                disabled={isResending || isLoading || resendCooldown > 0}
                                className="text-[#800000] hover:text-red-900 font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                            >
                                {isResending ? (
                                    <>
                                        <LoadingSpinner size="tiny" inline />
                                        <span>Sending...</span>
                                    </>
                                ) : resendCooldown > 0 ? (
                                    <>
                                        <FaClock className="text-sm" />
                                        <span>Resend OTP ({resendCooldown}s)</span>
                                    </>
                                ) : (
                                    <>
                                        <FaEnvelope className="text-sm" />
                                        <span>Resend OTP</span>
                                    </>
                                )}
                            </button>
                            
                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => navigate('/register')}
                                    className="text-gray-600 hover:text-[#800000] transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
                                >
                                    <FaArrowLeft className="text-sm" />
                                    <span>Back to Registration</span>
                                </button>
                            </div>
                        </div>

                        {/* Help Text */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4 space-y-2">
                            <p className="text-xs text-yellow-800 text-center">
                                <strong>Tip:</strong> Check your spam folder if you don't see the email. The code is valid for 10 minutes.
                            </p>
                            <p className="text-xs text-yellow-700 text-center">
                                <strong>Alternative:</strong> Even if the email hasn't arrived yet, the OTP has been generated. 
                                You can try verifying with the code from your previous email, or click "Resend OTP" to get a new code.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

export default VerifyEmailPage
