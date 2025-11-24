import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { FaRocket, FaClock, FaArrowLeft } from 'react-icons/fa';

const SuccessStories = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-white flex flex-col">
            <Header />

            <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-200px)] px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-20 sm:py-24">
                <div className="max-w-2xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        {/* Icon */}
                        <div className="w-32 h-32 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center mx-auto shadow-xl">
                            <FaRocket className="w-16 h-16 text-white" />
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#800000]">
                            Success Stories
                        </h1>

                        {/* Coming Soon Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFD700]/20 backdrop-blur-sm border border-[#FFD700]/30 rounded-full">
                            <FaClock className="w-4 h-4 text-[#FFD700]" />
                            <span className="text-sm font-semibold text-[#800000]">Coming Soon</span>
                        </div>

                        {/* Description */}
                        <div className="space-y-4">
                            <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
                                We're working on bringing you inspiring success stories from our community programs.
                            </p>
                            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
                                This page will feature real stories of impact, showcasing how our programs have made a difference 
                                in the lives of beneficiaries, volunteers, and the community at large.
                            </p>
                            <p className="text-sm sm:text-base text-gray-500 italic">
                                Check back soon for updates!
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
                            <Button
                                variant="maroon"
                                onClick={() => navigate('/')}
                                className="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                            >
                                <FaArrowLeft className="w-4 h-4" />
                                Back to Home
                            </Button>
                            <Button
                                variant="gold"
                                onClick={() => navigate('/campaigns')}
                                className="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            >
                                Browse Campaigns
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default SuccessStories;

