import React, { useContext, useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../../context/AppContext.jsx';
import axios from 'axios';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEnvelope, FaLock, FaExclamationCircle, FaEye, FaEyeSlash, FaShieldAlt, FaHome } from 'react-icons/fa';
import EuMatterLogo from '../../assets/Eumatter-logo.png';
import EnvergaLogo from '../../assets/enverga-logo.png';
import MaintenanceMode from '../MaintenanceMode';

const Login = () => {
    const navigate = useNavigate();
    const { backendUrl, setIsLoggedIn, setUserData, getDashboardRoute, isLoggedIn, userData, isLoading } = useContext(AppContent);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({ email: '', password: '', general: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [isDesktop, setIsDesktop] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceAllowedRoles, setMaintenanceAllowedRoles] = useState(['System Administrator', 'CRD Staff']);
    const [showMaintenancePage, setShowMaintenancePage] = useState(false);
    const [maintenanceInfo, setMaintenanceInfo] = useState({ message: '', estimatedEndTime: null });
    const [timeRemaining, setTimeRemaining] = useState(null);

    // Detect if device is desktop
    useEffect(() => {
        const checkDevice = () => {
            setIsDesktop(window.innerWidth >= 1024);
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    const checkMaintenanceStatus = useCallback(async () => {
        try {
            const { data } = await axios.get(backendUrl + 'api/system-settings/maintenance-mode');
            if (data.success) {
                const isEnabled = Boolean(data.maintenanceMode);
                setMaintenanceMode(isEnabled);
                setMaintenanceAllowedRoles(data.allowedRoles || ['System Administrator', 'CRD Staff']);
                if (isEnabled) {
                    setMaintenanceInfo({
                        message: data.message || 'We are currently performing scheduled maintenance. Please check back soon.',
                        estimatedEndTime: data.estimatedEndTime || null,
                    });
                } else {
                    setMaintenanceInfo({ message: '', estimatedEndTime: null });
                }
            } else {
                setMaintenanceMode(false);
                setMaintenanceAllowedRoles(['System Administrator', 'CRD Staff']);
                setMaintenanceInfo({ message: '', estimatedEndTime: null });
            }
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
            setMaintenanceMode(false);
            setMaintenanceAllowedRoles(['System Administrator', 'CRD Staff']);
            setMaintenanceInfo({ message: '', estimatedEndTime: null });
        }
    }, [backendUrl]);

    // Check maintenance mode status on mount and at intervals
    useEffect(() => {
        checkMaintenanceStatus();
        const interval = setInterval(checkMaintenanceStatus, 15000);
        return () => clearInterval(interval);
    }, [checkMaintenanceStatus]);

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && isLoggedIn && userData) {
            const dashboardRoute = getDashboardRoute(userData.role);
            navigate(dashboardRoute);
        }
    }, [isLoading, isLoggedIn, userData, navigate, getDashboardRoute]);

    if (isLoading) {
        return <LoadingSpinner fullScreen text="Loading..." />;
    }

    // Validation functions
    const validateEmail = (emailValue) => {
        if (!emailValue) {
            return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    const validatePassword = (passwordValue) => {
        if (!passwordValue) {
            return 'Password is required';
        }
        if (passwordValue.length < 6) {
            return 'Password must be at least 6 characters';
        }
        return '';
    };

    // Parse error message to determine specific field error
    const parseErrorMessage = (message) => {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('invalid email or password')) {
            // Show error on both fields since we can't determine which one is wrong
            return {
                email: 'Email or password is incorrect',
                password: 'Email or password is incorrect',
                general: 'Invalid email or password. Please check your credentials.'
            };
        }
        
        if (lowerMessage.includes('email') && (lowerMessage.includes('not found') || lowerMessage.includes('not registered'))) {
            return {
                email: 'This email is not registered',
                password: '',
                general: ''
            };
        }
        
        if (lowerMessage.includes('password') && (lowerMessage.includes('incorrect') || lowerMessage.includes('wrong') || lowerMessage.includes('not match'))) {
            return {
                email: '',
                password: 'Password is incorrect',
                general: ''
            };
        }
        
        if (lowerMessage.includes('all fields are required')) {
            return {
                email: 'Email is required',
                password: 'Password is required',
                general: ''
            };
        }
        
        return {
            email: '',
            password: '',
            general: message
        };
    };

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setFieldErrors(prev => ({ ...prev, email: '' }));
        
        if (touched.email) {
            const error = validateEmail(value);
            setErrors(prev => ({ ...prev, email: error }));
        }
        
        if (errors.general || fieldErrors.email) {
            setErrors(prev => ({ ...prev, general: '' }));
            setFieldErrors(prev => ({ ...prev, email: '' }));
        }
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        setFieldErrors(prev => ({ ...prev, password: '' }));
        
        if (touched.password) {
            const error = validatePassword(value);
            setErrors(prev => ({ ...prev, password: error }));
        }
        
        if (errors.general || fieldErrors.password) {
            setErrors(prev => ({ ...prev, general: '' }));
            setFieldErrors(prev => ({ ...prev, password: '' }));
        }
    };

    const handleBlur = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'email') {
            const error = validateEmail(email);
            setErrors(prev => ({ ...prev, email: error }));
        } else if (field === 'password') {
            const error = validatePassword(password);
            setErrors(prev => ({ ...prev, password: error }));
        }
    };

    const showError = (message) => {
        const parsedErrors = parseErrorMessage(message);
        
        // Mark fields as touched so errors show up
        setTouched({ email: true, password: true });
        
        if (isDesktop) {
            toast.error(message);
            // Also set field errors for visual feedback on desktop
            setFieldErrors({
                email: parsedErrors.email || '',
                password: parsedErrors.password || ''
            });
        } else {
            setErrors({
                email: parsedErrors.email || '',
                password: parsedErrors.password || '',
                general: parsedErrors.general || message
            });
            setFieldErrors({
                email: parsedErrors.email || '',
                password: parsedErrors.password || ''
            });
        }
    };

    const showSuccess = (message) => {
        if (isDesktop) {
            toast.success(message);
        }
    };

    const showWarning = (message) => {
        if (isDesktop) {
            toast.warning(message);
        } else {
            setErrors(prev => ({ ...prev, general: message }));
        }
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        
        setTouched({ email: true, password: true });
        setErrors({ email: '', password: '', general: '' });
        setFieldErrors({ email: '', password: '' });

        const emailError = validateEmail(email);
        const passwordError = validatePassword(password);

        if (emailError || passwordError) {
            setErrors({
                email: emailError,
                password: passwordError,
                general: ''
            });
            if (!isDesktop) {
                if (emailError) {
                    document.getElementById('email')?.focus();
                } else if (passwordError) {
                    document.getElementById('password')?.focus();
                }
            }
            return;
        }

        setIsSubmitting(true);
        setErrors({ email: '', password: '', general: '' });
        setFieldErrors({ email: '', password: '' });

        try {
            axios.defaults.withCredentials = true;
            const baseUrl = backendUrl.replace(/\/+$/, '');
            const response = await axios.post(`${baseUrl}/api/auth/login`, {
                email,
                password
            }, {
                timeout: 30000, // 30 seconds timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const { data } = response;

            if (data.success) {
                // Check if user's role is in the allowed roles during maintenance
                const userRole = data.user.role;
                const canAccess = maintenanceAllowedRoles.includes(userRole);
                
                // If maintenance mode is enabled, only allow selected roles to login
                if (maintenanceMode && !canAccess) {
                    // Show maintenance page instead of logging in
                    // DO NOT set userData or setIsLoggedIn - prevent login
                    try {
                        await axios.post(`${baseUrl}/api/auth/logout`);
                    } catch (logoutError) {
                        console.warn('Logout during maintenance enforcement failed:', logoutError?.message || logoutError);
                    } finally {
                        setIsLoggedIn(false);
                        setUserData(null);
                    }
                    setShowMaintenancePage(true);
                    // Clear the form
                    setEmail('');
                    setPassword('');
                    setTouched({ email: false, password: false });
                    setIsSubmitting(false);
                    return;
                }
                
                // Only log in if user's role is allowed during maintenance
                setUserData(data.user);
                setIsLoggedIn(true);
                
                const rolesRequiringVerification = ['User'];
                if (rolesRequiringVerification.includes(data.user.role) && !data.user.isAccountVerified) {
                    // Store email in sessionStorage for verification page (in case of refresh)
                    sessionStorage.setItem('verificationEmail', data.user.email.trim().toLowerCase())
                    
                    showWarning('Please verify your email address to continue');
                    navigate('/email-verify', { 
                        state: { email: data.user.email } 
                    });
                    return;
                }
                
                const dashboardRoute = getDashboardRoute(data.user.role);
                showSuccess(`Welcome back, ${data.user.name}!`);
                navigate(dashboardRoute);
            } else if (data.requiresVerification) {
                const rolesRequiringVerification = ['User'];
                if (rolesRequiringVerification.includes(data.user.role)) {
                    // Store email in sessionStorage for verification page (in case of refresh)
                    sessionStorage.setItem('verificationEmail', data.user.email.trim().toLowerCase())
                    
                    setUserData(data.user);
                    setIsLoggedIn(true);
                    showWarning(data.message || 'Please verify your email address to continue');
                    navigate('/email-verify', { 
                        state: { email: data.user.email } 
                    });
                } else {
                    showError(data.message || 'Login failed');
                }
            } else {
                // Handle case where login fails but no specific error is returned
                showError(data.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please try again.';
            
            // Handle network errors specifically
            if (error.code === 'ERR_NETWORK' || error.code === 'ERR_NETWORK_CHANGED' || error.message?.includes('Network Error')) {
                errorMessage = 'Network connection error. Please check your internet connection and try again.';
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMessage = 'Request timed out. The server is taking too long to respond. Please try again.';
            } else if (error.response?.status === 404) {
                errorMessage = 'Login service not found. Please check the API URL.';
            } else if (error.response?.status === 500) {
                errorMessage = 'Server error occurred. Please try again in a moment.';
            } else if (error.response?.status === 503) {
                errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.request && !error.response) {
                // Request was made but no response received
                errorMessage = 'No response from server. Please check your internet connection and try again.';
            } else if (error.message) {
                errorMessage = `Connection error: ${error.message}`;
            }
            
            showError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const emailHasError = (touched.email && errors.email) || fieldErrors.email;
    const passwordHasError = (touched.password && errors.password) || fieldErrors.password;
    const emailErrorText = fieldErrors.email || errors.email;
    const passwordErrorText = fieldErrors.password || errors.password;

    useEffect(() => {
        if (showMaintenancePage && maintenanceInfo.estimatedEndTime) {
            const timer = setInterval(() => {
                const now = new Date();
                const endTime = new Date(maintenanceInfo.estimatedEndTime);
                const diff = endTime - now;

                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeRemaining({ days, hours, minutes, seconds });
                } else {
                    setTimeRemaining(null);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [showMaintenancePage, maintenanceInfo.estimatedEndTime]);

    // If maintenance mode is disabled, hide maintenance page and reset timer
    useEffect(() => {
        if (!maintenanceMode) {
            setShowMaintenancePage(false);
            setTimeRemaining(null);
        }
    }, [maintenanceMode]);

    // Login page is always accessible, but login attempts are validated based on role during maintenance

    // Show maintenance page if user tried to login during maintenance
    // This prevents login and shows the full maintenance page
    if (showMaintenancePage) {
        return <MaintenanceMode />;
    }

    return (
        <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-white">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-yellow-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/20 to-cyan-100/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="relative z-10 min-h-screen flex flex-col w-full overflow-x-hidden">
                <Header />
                
                {/* Maintenance Mode Banner - Show when maintenance is enabled, positioned under header */}
                {maintenanceMode && (
                    <div className="w-full bg-gradient-to-r from-[#800000] to-[#EE1212] text-white py-3 px-4 text-center text-sm font-semibold z-40 mt-2">
                        <div className="flex items-center justify-center space-x-2">
                            <FaShieldAlt className="w-4 h-4" />
                            <span>System Under Maintenance</span>
                        </div>
                    </div>
                )}

                <main className="flex-1 flex items-center justify-center py-4 px-4 md:py-6 md:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
                    <div className="bg-white backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.1)] rounded-2xl flex flex-col lg:flex-row w-full max-w-5xl lg:h-[calc(85vh-20px)] max-h-[680px] overflow-hidden border border-gray-100 mx-auto">
                        {/* Column 1: Visual Design */}
                        <div className="hidden lg:flex relative w-full lg:w-1/2 flex-col items-center justify-between p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-l-2xl">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="flex flex-col items-center justify-center flex-grow"
                            >
                                <img
                                    src={EuMatterLogo}
                                    alt="EuMatter Logo"
                                    className="w-48 xl:w-56 object-contain"
                                />
                            </motion.div>

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

                        {/* Column 2: Login Form */}
                        <div className="w-full lg:w-1/2 p-6 md:p-8 lg:p-10 flex flex-col justify-center bg-gradient-to-bl from-[#800000] to-[#EE1212] rounded-2xl lg:rounded-r-2xl lg:rounded-l-none overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-center md:text-left space-y-1 mb-6"
                            >
                                <h1 className="text-2xl md:text-4xl font-extrabold text-white">Welcome Back!</h1>
                                <p className="text-sm md:text-base text-gray-200">Login to continue to EuMatter</p>
                            </motion.div>

                            {/* General Error Message (Mobile/Tablet only) */}
                            <AnimatePresence>
                                {!isDesktop && errors.general && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="mb-4 p-3 bg-[#800000]/30 border border-[#FFD700]/50 rounded-lg flex items-start space-x-2"
                                    >
                                        <FaExclamationCircle className="w-5 h-5 text-[#FFD700] flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-white flex-1">{errors.general}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={onSubmitHandler} className="space-y-4">
                                {/* Email Field */}
                                <div className="space-y-1.5">
                                    <label htmlFor="email" className="block text-sm font-medium text-white">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <FaEnvelope className={`w-5 h-5 transition-colors duration-200 ${
                                                emailHasError ? 'text-[#FFD700]' : 'text-gray-400'
                                            }`} />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={handleEmailChange}
                                            onBlur={() => handleBlur('email')}
                                            className={`w-full rounded-lg border bg-white text-gray-900 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                emailHasError
                                                    ? 'border-[#FFD700] focus:ring-[#FFD700] focus:border-[#FFD700]'
                                                    : 'border-gray-400 focus:ring-[#FFD700] focus:border-[#FFD700]'
                                            }`}
                                        />
                                    </div>
                                    <AnimatePresence>
                                        {emailHasError && emailErrorText && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center space-x-1.5 text-[#FFD700] text-xs"
                                            >
                                                <FaExclamationCircle className="w-3 h-3 flex-shrink-0" />
                                                <span>{emailErrorText}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-1.5">
                                    <label htmlFor="password" className="block text-sm font-medium text-white">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <FaLock className={`w-5 h-5 transition-colors duration-200 ${
                                                passwordHasError ? 'text-[#FFD700]' : 'text-gray-400'
                                            }`} />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={handlePasswordChange}
                                            onBlur={() => handleBlur('password')}
                                            className={`w-full rounded-lg border bg-white text-gray-900 pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
                                                passwordHasError
                                                    ? 'border-[#FFD700] focus:ring-[#FFD700] focus:border-[#FFD700]'
                                                    : 'border-gray-400 focus:ring-[#FFD700] focus:border-[#FFD700]'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <FaEyeSlash className="w-5 h-5" /> : <FaEye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {passwordHasError && passwordErrorText && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center space-x-1.5 text-[#FFD700] text-xs"
                                            >
                                                <FaExclamationCircle className="w-3 h-3 flex-shrink-0" />
                                                <span>{passwordErrorText}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Remember Me & Forgot Password */}
                                <div className="flex items-center justify-between text-xs md:text-sm">
                                    <div className="flex items-center">
                                        <input
                                            id="remember-me"
                                            name="remember-me"
                                            type="checkbox"
                                            className="h-3.5 w-3.5 text-[#FFD700] focus:ring-[#FFD700] border-gray-300 rounded"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-gray-200">
                                            Keep me logged in
                                        </label>
                                    </div>
                                    <a href="/reset-password" className="text-[#FFD700] hover:underline font-medium text-xs md:text-sm transition-colors">
                                        Forgot Password?
                                    </a>
                                </div>

                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        type="submit"
                                        className="w-full mt-4"
                                        variant="goldLogin"
                                        size="lg"
                                        disabled={isSubmitting || (touched.email && errors.email) || (touched.password && errors.password)}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <LoadingSpinner size="tiny" inline />
                                                <span>Logging in...</span>
                                            </>
                                        ) : (
                                            'Login'
                                        )}
                                    </Button>
                                </motion.div>
                            </form>

                            {/* Sign Up Link */}
                            <div className="text-center text-xs md:text-sm mt-5 text-gray-200">
                                Don't have an account yet? <a href="/register" className="text-[#FFD700] hover:underline font-bold transition-colors">Sign Up</a>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Login;
