import React, { useContext, useState } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import Button from '../../components/Button'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useNavigate, useLocation } from 'react-router-dom'
import { AppContent } from '../../context/AppContext.jsx'
import axios from 'axios'
import { toast } from 'react-toastify'

const VerifyEmailPage = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { backendUrl, setUserData, setIsLoggedIn, getDashboardRoute } = useContext(AppContent)
    
    const [otp, setOtp] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    
    // Get email from location state or use a default
    const email = location.state?.email || ''

    const handleVerifyEmail = async (e) => {
        e.preventDefault()
        
        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/verify-email', {
                email,
                otp
            })
            
            if (data.success) {
                toast.success('Email verified successfully!')
                // Update user data if available
                if (data.user) {
                    setUserData(data.user)
                    setIsLoggedIn(true)
                }
                // Navigate to appropriate dashboard based on user role
                if (data.user?.role) {
                    const dashboardRoute = getDashboardRoute(data.user.role)
                    navigate(dashboardRoute)
                } else {
                    navigate('/login')
                }
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (!email) {
            toast.error('Email not found. Please register again.')
            return
        }

        setIsLoading(true)
        try {
            axios.defaults.withCredentials = true
            const { data } = await axios.post(backendUrl + 'api/auth/send-verify-otp', {
                email
            })
            
            if (data.success) {
                toast.success('OTP sent to your email')
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-black">Verify Your Email</h1>
                        <p className="text-gray-600">
                            We've sent a 6-digit verification code to
                        </p>
                        <p className="text-red-900 font-semibold">{email}</p>
                    </div>

                    <form onSubmit={handleVerifyEmail} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="otp" className="block text-sm font-medium text-black">
                                Verification Code
                            </label>
                            <input
                                id="otp"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-900 text-center text-2xl tracking-widest"
                                maxLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otp.length !== 6}
                            className="w-full bg-red-900 text-white hover:bg-red-800 font-semibold transition-colors duration-200 rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner size="tiny" inline />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                'Verify Email'
                            )}
                        </button>
                    </form>

                    <div className="text-center space-y-4">
                        <p className="text-sm text-gray-600">
                            Didn't receive the code?
                        </p>
                        <button
                            onClick={handleResendOtp}
                            disabled={isLoading}
                            className="text-red-900 hover:underline font-medium disabled:opacity-50"
                        >
                            Resend OTP
                        </button>
                        
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                onClick={() => navigate('/register')}
                                className="text-gray-600 hover:text-red-900 transition-colors duration-200"
                            >
                                ← Back to Registration
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* <Footer /> */}
        </div>
    )
}

export default VerifyEmailPage
