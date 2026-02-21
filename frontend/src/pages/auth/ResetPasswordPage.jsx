import React, { useContext, useState, useEffect } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useNavigate } from 'react-router-dom'
import { AppContent } from '../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'
import { motion, AnimatePresence } from 'framer-motion'
import { FaLock, FaEnvelope, FaKey, FaCheckCircle, FaArrowLeft, FaClock } from 'react-icons/fa'
import EuMatterLogo from '../../assets/Eumatter-logo.png'
import EnvergaLogo from '../../assets/enverga-logo.png'

const ResetPasswordPage = () => {
    const navigate = useNavigate()
    const { backendUrl } = useContext(AppContent)
    
    const [step, setStep] = useState(1)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)
    const [otpExpiry, setOtpExpiry] = useState(null)
    const otpInputRefs = React.useRef([])

    // Countdown timer for resend OTP
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    // OTP expiry countdown
    useEffect(() => {
        if (otpExpiry) {
            const timer = setInterval(() => {
                const remaining = Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000))
                if (remaining === 0) {
                    setOtpExpiry(null)
                }
            }, 1000)
            return () => clearInterval(timer)
        }
    }, [otpExpiry])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleSendOtp = async (e) => {
        e.preventDefault()
        
        if (!email) {
            toast.error('Please enter your email address')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/send-reset-otp', {
                email
            })
            
            if (data.success) {
                toast.success('Password reset code sent to your email!')
                setStep(2)
                setResendCooldown(60) // 60 seconds cooldown
                setOtpExpiry(Date.now() + 15 * 60 * 1000) // 15 minutes expiry
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || 'Failed to send reset code')
        } finally {
            setIsLoading(false)
        }
    }

    const handleOtpChange = (index, value) => {
        if (value.length > 1) return // Prevent pasting multiple characters
        if (!/^\d*$/.test(value)) return // Only allow digits

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus()
        }
    }

    const handleOtpPaste = (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        const newOtp = [...otp]
        for (let i = 0; i < 6; i++) {
            newOtp[i] = pastedData[i] || ''
        }
        setOtp(newOtp)
        otpInputRefs.current[Math.min(5, pastedData.length - 1)]?.focus()
    }

    const handleVerifyOtp = async (e) => {
        e.preventDefault()
        
        const otpString = otp.join('')
        if (otpString.length !== 6) {
            toast.error('Please enter the complete 6-digit code')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/verify-reset-otp', {
                email,
                otp: otpString
            })
            
            if (data.success) {
                toast.success('Code verified successfully!')
                setStep(3)
                setOtpExpiry(null)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || 'Invalid verification code')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/send-reset-otp', {
                email
            })
            
            if (data.success) {
                toast.success('New code sent to your email!')
                setResendCooldown(60)
                setOtpExpiry(Date.now() + 15 * 60 * 1000)
                setOtp(['', '', '', '', '', ''])
                otpInputRefs.current[0]?.focus()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || 'Failed to resend code')
        } finally {
            setIsLoading(false)
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()
        
        if (!newPassword || !confirmPassword) {
            toast.error('Please fill in all fields')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/reset-password', {
                email,
                otp: otp.join(''),
                newPassword
            })
            
            if (data.success) {
                toast.success('Password reset successfully! Redirecting to login...')
                setTimeout(() => {
                navigate('/login')
                }, 1500)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message || 'Failed to reset password')
        } finally {
            setIsLoading(false)
        }
    }

    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, label: '', color: '' }
        let strength = 0
        if (password.length >= 6) strength++
        if (password.length >= 8) strength++
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
        if (/\d/.test(password)) strength++
        if (/[^a-zA-Z\d]/.test(password)) strength++

        if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' }
        if (strength <= 3) return { strength, label: 'Medium', color: 'bg-yellow-500' }
        return { strength, label: 'Strong', color: 'bg-green-500' }
    }

    const passwordStrength = getPasswordStrength(newPassword)

    const stepVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-white">
            {/* Modern blur effect background layers */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-red-200/30 to-pink-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-orange-200/30 to-yellow-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-red-100/20 to-orange-100/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 min-h-screen flex flex-col w-full overflow-x-hidden">
                <Header />

                <main className="flex-1 flex items-center justify-center py-4 px-4 md:py-6 md:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
                    <div className="bg-white backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.1)] rounded-2xl flex flex-col lg:flex-row w-full max-w-5xl lg:h-[calc(85vh-20px)] max-h-[680px] overflow-hidden border border-gray-100 mx-auto">
                        {/* Column 1: Visual Design - Hidden on mobile/tablet, shown on desktop */}
                        <div className="hidden lg:flex relative w-full lg:w-1/2 flex-col items-center justify-between p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-l-2xl">
                            <div className="flex flex-col items-center justify-center flex-grow space-y-6">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <img
                                        src={EuMatterLogo}
                                        alt="EuMatter Logo"
                                        className="w-48 xl:w-56 object-contain"
                                    />
                                </motion.div>
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                    className="text-center space-y-2"
                                >
                                    <FaLock className="w-16 h-16 text-[#800000] mx-auto" />
                                    <h2 className="text-2xl font-bold text-gray-800">Secure Password Reset</h2>
                                    <p className="text-gray-600">Follow the steps to reset your password securely</p>
                                </motion.div>
                            </div>

                            {/* Enverga University Logo */}
                            <div className="flex items-center space-x-3">
                                <img
                                    src={EnvergaLogo}
                                    alt="Enverga University Logo"
                                    className="w-8 h-8 object-contain"
                                />
                                <span className="text-lg font-bold tracking-wide text-red-900">
                                    ENVERGA UNIVERSITY
                                </span>
                            </div>
                        </div>

                        {/* Column 2: Reset Password Form - Maroon Themed */}
                        <div className="w-full lg:w-1/2 p-6 md:p-8 lg:p-10 flex flex-col justify-center bg-gradient-to-bl from-[#800000] to-[#EE1212] rounded-2xl lg:rounded-r-2xl lg:rounded-l-none overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {/* Step 1: Enter Email */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center md:text-left space-y-2 mb-6">
                                            <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                                    <FaEnvelope className="w-6 h-6 text-white" />
                                                </div>
                                                <h1 className="text-2xl md:text-4xl font-extrabold text-white">Forgot Password?</h1>
                                            </div>
                                            <p className="text-sm md:text-base text-gray-200">Enter your email address and we'll send you a verification code to reset your password</p>
                                        </div>

        <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-2">
                                                <label htmlFor="email" className="block text-sm font-medium text-white">Email Address</label>
                                                <div className="relative">
                                                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    id="email"
                    type="email"
                                                        placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-400 bg-white text-gray-900 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                                        required
                />
                                                </div>
            </div>

                                            <Button
                type="submit"
                                                className="w-full mt-4"
                                                variant="goldLogin"
                                                size="lg"
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <LoadingSpinner size="tiny" inline />
                                                        <span>Sending Code...</span>
                    </>
                ) : (
                                                    <>
                                                        <FaEnvelope className="mr-2" />
                                                        Send Verification Code
                                                    </>
                )}
                                            </Button>
        </form>
                                    </motion.div>
                                )}

                                {/* Step 2: Verify OTP */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center md:text-left space-y-2 mb-6">
                                            <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                                    <FaKey className="w-6 h-6 text-white" />
                                                </div>
                                                <h1 className="text-2xl md:text-4xl font-extrabold text-white">Verify Your Email</h1>
                                            </div>
                                            <p className="text-sm md:text-base text-gray-200">
                                                We've sent a 6-digit verification code to
                                            </p>
                                            <p className="text-[#FFD700] font-semibold text-base">{email}</p>
                                            {otpExpiry && (
                                                <div className="flex items-center justify-center md:justify-start space-x-2 text-yellow-300 text-sm">
                                                    <FaClock className="w-4 h-4" />
                                                    <span>Code expires in: {formatTime(Math.max(0, Math.floor((otpExpiry - Date.now()) / 1000)))}</span>
                                                </div>
                                            )}
                                        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-5">
                                            <div className="space-y-3">
                                                <label className="block text-sm font-medium text-white text-center">Enter Verification Code</label>
                                                <div className="flex justify-center space-x-2 md:space-x-3">
                                                    {otp.map((digit, index) => (
                <input
                                                            key={index}
                                                            ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                                                            inputMode="numeric"
                                                            maxLength={1}
                                                            value={digit}
                                                            onChange={(e) => handleOtpChange(index, e.target.value)}
                                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                                            onPaste={index === 0 ? handleOtpPaste : undefined}
                                                            className="w-12 h-14 md:w-14 md:h-16 rounded-lg border-2 border-gray-400 bg-white text-center text-2xl md:text-3xl font-bold text-[#800000] focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-[#FFD700] transition-all"
                                                        />
                                                    ))}
                                                </div>
            </div>

                                            <Button
                type="submit"
                                                className="w-full mt-4"
                                                variant="goldLogin"
                                                size="lg"
                                                disabled={isLoading || otp.join('').length !== 6}
            >
                {isLoading ? (
                    <>
                        <LoadingSpinner size="tiny" inline />
                        <span>Verifying...</span>
                    </>
                ) : (
                                                    <>
                                                        <FaCheckCircle className="mr-2" />
                                                        Verify Code
                                                    </>
                                                )}
                                            </Button>
                                        </form>

                                        <div className="text-center space-y-3">
                                            <p className="text-sm text-gray-200">
                                                Didn't receive the code?
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleResendOtp}
                                                disabled={isLoading || resendCooldown > 0}
                                                className="text-[#FFD700] hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Step 3: Set New Password */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        variants={stepVariants}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        transition={{ duration: 0.3 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center md:text-left space-y-2 mb-6">
                                            <div className="flex items-center justify-center md:justify-start space-x-3 mb-2">
                                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                                    <FaLock className="w-6 h-6 text-white" />
                                                </div>
                                                <h1 className="text-2xl md:text-4xl font-extrabold text-white">Set New Password</h1>
                                            </div>
                                            <p className="text-sm md:text-base text-gray-200">Create a strong password for your account</p>
                                        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2">
                                                <label htmlFor="newPassword" className="block text-sm font-medium text-white">New Password</label>
                                                <div className="relative">
                                                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    id="newPassword"
                                                        type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                                                        className="w-full rounded-lg border border-gray-400 bg-white text-gray-900 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                                    </button>
                                                </div>
                                                {newPassword && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-xs text-gray-200">
                                                            <span>Password Strength:</span>
                                                            <span className="font-semibold">{passwordStrength.label}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-300 rounded-full h-2">
                                                            <div
                                                                className={`${passwordStrength.color} h-2 rounded-full transition-all duration-300`}
                                                                style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}
            </div>

            <div className="space-y-2">
                                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">Confirm New Password</label>
                                                <div className="relative">
                                                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    id="confirmPassword"
                                                        type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={`w-full rounded-lg border bg-white text-gray-900 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] ${
                                                            confirmPassword && newPassword !== confirmPassword
                                                                ? 'border-red-500 focus:ring-red-500'
                                                                : confirmPassword && newPassword === confirmPassword
                                                                ? 'border-green-500 focus:ring-green-500'
                                                                : 'border-gray-400'
                                                        }`}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                    >
                                                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                                    </button>
                                                </div>
                                                {confirmPassword && (
                                                    <p className={`text-xs ${newPassword === confirmPassword ? 'text-green-300' : 'text-red-300'}`}>
                                                        {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                                    </p>
                                                )}
            </div>

                                            <Button
                type="submit"
                                                className="w-full mt-4"
                                                variant="goldLogin"
                                                size="lg"
                                                disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 6}
            >
                {isLoading ? (
                    <>
                        <LoadingSpinner size="tiny" inline />
                                                        <span>Resetting Password...</span>
                    </>
                ) : (
                                                    <>
                                                        <FaLock className="mr-2" />
                                                        Reset Password
                                                    </>
                )}
                                            </Button>
        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Navigation */}
                            <div className="mt-6 pt-6 border-t border-white/20">
                                <div className="flex items-center justify-between">
                        {step > 1 && (
                            <button
                                            onClick={() => {
                                                setStep(step - 1)
                                                if (step === 2) {
                                                    setOtp(['', '', '', '', '', ''])
                                                    setOtpExpiry(null)
                                                }
                                            }}
                                            className="flex items-center space-x-2 text-white hover:text-[#FFD700] transition-colors duration-200"
                                        >
                                            <FaArrowLeft className="w-4 h-4" />
                                            <span>Back</span>
                            </button>
                        )}
                            <button
                                onClick={() => navigate('/login')}
                                        className="ml-auto text-white hover:text-[#FFD700] transition-colors duration-200 text-sm"
                            >
                                ← Back to Login
                            </button>
                                </div>
                        </div>
                    </div>
                </div>
            </main>
            </div>
        </div>
    )
}

export default ResetPasswordPage
