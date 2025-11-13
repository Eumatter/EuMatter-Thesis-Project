import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaTools, FaClock, FaEnvelope, FaHome } from 'react-icons/fa';
import axios from 'axios';
import EuMatterLogo from '../assets/Eumatter-logo.png';
import EnvergaLogo from '../assets/enverga-logo.png';

const MaintenanceMode = () => {
    const [maintenanceInfo, setMaintenanceInfo] = useState({
        message: 'We are currently performing scheduled maintenance. Please check back soon.',
        estimatedEndTime: null
    });
    const [timeRemaining, setTimeRemaining] = useState(null);

    useEffect(() => {
        const fetchMaintenanceInfo = async () => {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/';
                const { data } = await axios.get(backendUrl + 'api/system-settings/maintenance-mode');
                if (data.success) {
                    setMaintenanceInfo({
                        message: data.message || maintenanceInfo.message,
                        estimatedEndTime: data.estimatedEndTime
                    });
                }
            } catch (error) {
                console.error('Error fetching maintenance info:', error);
            }
        };

        fetchMaintenanceInfo();
    }, []);

    useEffect(() => {
        if (maintenanceInfo.estimatedEndTime) {
            const timer = setInterval(() => {
                const now = new Date();
                const endTime = new Date(maintenanceInfo.estimatedEndTime);
                const diff = endTime - now;

                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeRemaining({ hours, minutes, seconds });
                } else {
                    setTimeRemaining(null);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [maintenanceInfo.estimatedEndTime]);

    const formatTime = (time) => {
        if (!time) return null;
        return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}:${time.seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-screen flex flex-col font-poppins relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-[#800000]/10 to-[#EE1212]/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-[#800000]/10 to-[#EE1212]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[600px] md:h-[600px] bg-gradient-to-br from-[#800000]/5 to-[#EE1212]/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 flex-1 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full max-w-2xl my-auto"
                >
                    <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 border border-gray-200/50">
                        {/* Logo Section */}
                        <div className="text-center mb-3 sm:mb-4 md:mb-5">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                className="flex justify-center mb-2 sm:mb-3 md:mb-4"
                            >
                                <img
                                    src={EuMatterLogo}
                                    alt="EuMatter Logo"
                                    className="w-20 h-auto sm:w-28 md:w-36 lg:w-40"
                                />
                            </motion.div>
                            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
                                <img
                                    src={EnvergaLogo}
                                    alt="Enverga University Logo"
                                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 object-contain"
                                />
                                <span className="text-xs sm:text-sm md:text-base font-bold tracking-wide text-[#800000]">
                                    ENVERGA UNIVERSITY
                                </span>
                            </div>
                        </div>

                        {/* Maintenance Icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                            className="flex justify-center mb-3 sm:mb-4 md:mb-5"
                        >
                            <div className="relative">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-full flex items-center justify-center shadow-2xl">
                                    <FaTools className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-white animate-spin-slow" />
                                </div>
                                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                    <FaClock className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-white" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Main Content */}
                        <div className="text-center space-y-2 sm:space-y-3 md:space-y-4 mb-3 sm:mb-4 md:mb-5">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#800000]"
                            >
                                Under Maintenance
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed px-2"
                            >
                                {maintenanceInfo.message}
                            </motion.p>

                            {/* Countdown Timer */}
                            {timeRemaining && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.6, duration: 0.5 }}
                                    className="mt-3 sm:mt-4 md:mt-5"
                                >
                                    <div className="inline-flex flex-col items-center space-y-1 sm:space-y-2 bg-gradient-to-br from-[#800000]/10 to-[#EE1212]/10 rounded-lg sm:rounded-xl px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 border-2 border-[#800000]/20">
                                        <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Estimated Time Remaining</p>
                                        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                                            <div className="text-center">
                                                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">
                                                    {timeRemaining.hours}
                                                </div>
                                                <div className="text-[10px] sm:text-xs text-gray-600">Hours</div>
                                            </div>
                                            <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">:</span>
                                            <div className="text-center">
                                                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">
                                                    {timeRemaining.minutes}
                                                </div>
                                                <div className="text-[10px] sm:text-xs text-gray-600">Minutes</div>
                                            </div>
                                            <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">:</span>
                                            <div className="text-center">
                                                <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-[#800000]">
                                                    {timeRemaining.seconds}
                                                </div>
                                                <div className="text-[10px] sm:text-xs text-gray-600">Seconds</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Info Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-5">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7, duration: 0.5 }}
                                className="bg-gradient-to-br from-[#800000]/5 to-[#800000]/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[#800000]/20"
                            >
                                <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FaClock className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
                                    </div>
                                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-900">Scheduled Maintenance</h3>
                                </div>
                                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600">
                                    We're working hard to improve your experience
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.8, duration: 0.5 }}
                                className="bg-gradient-to-br from-[#800000]/5 to-[#800000]/10 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-[#800000]/20"
                            >
                                <div className="flex items-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#800000] to-[#EE1212] rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FaEnvelope className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white" />
                                    </div>
                                    <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-900">Stay Updated</h3>
                                </div>
                                <p className="text-[10px] sm:text-xs md:text-sm text-gray-600">
                                    We'll notify you when we're back online
                                </p>
                            </motion.div>
                        </div>

                        {/* Action Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.9, duration: 0.5 }}
                            className="flex items-center justify-center mb-2 sm:mb-3"
                        >
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full sm:w-auto px-5 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-[#800000] to-[#EE1212] text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2"
                            >
                                <FaHome className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Go Back to Home</span>
                            </button>
                        </motion.div>

                        {/* Footer Note */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 0.5 }}
                            className="text-center text-[10px] sm:text-xs md:text-sm text-gray-500 mt-2 sm:mt-3"
                        >
                            Thank you for your patience. We'll be back shortly!
                        </motion.p>
                    </div>
                </motion.div>
            </div>

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default MaintenanceMode;

