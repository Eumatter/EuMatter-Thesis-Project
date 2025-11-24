import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { AppContent } from '../context/AppContext.jsx';
import axios from 'axios';
import { 
    FaGraduationCap, 
    FaClock, 
    FaQrcode, 
    FaCertificate, 
    FaChartLine,
    FaCheckCircle,
    FaUsers,
    FaHandsHelping,
    FaArrowRight,
    FaBookOpen,
    FaCalendarAlt,
    FaFileAlt,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaShieldAlt,
    FaUserCheck
} from 'react-icons/fa';

const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const NSTP = () => {
    const navigate = useNavigate();
    const { backendUrl, isLoggedIn, userData } = useContext(AppContent);
    const [nstpEvents, setNstpEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalHours: 0,
        totalStudents: 0,
        totalEvents: 0
    });

    useEffect(() => {
        fetchNSTPEvents();
        fetchStatistics();
    }, []);

    const fetchNSTPEvents = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const response = await axios.get(backendUrl + 'api/events');
            
            if (response.data && Array.isArray(response.data)) {
                // Filter for NSTP-eligible events (you may need to adjust this based on your event model)
                const nstp = response.data
                    .filter(event => ['Approved', 'Upcoming', 'Ongoing'].includes(event.status))
                    .slice(0, 6);
                setNstpEvents(nstp);
            }
        } catch (error) {
            console.error('Error fetching NSTP events:', error);
            setNstpEvents([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            // This would ideally come from a statistics endpoint
            setStats({
                totalHours: 0,
                totalStudents: 0,
                totalEvents: 0
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const nstpComponents = [
        {
            name: "CWTS",
            fullName: "Civic Welfare Training Service",
            description: "Focuses on community service and development activities that enhance civic consciousness and defense preparedness.",
            icon: FaHandsHelping,
            color: "from-blue-500 to-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            name: "ROTC",
            fullName: "Reserve Officers' Training Corps",
            description: "Provides military training to develop leadership skills, discipline, and national defense capabilities.",
            icon: FaShieldAlt,
            color: "from-green-500 to-green-600",
            bgColor: "bg-green-50"
        }
    ];

    const gettingStartedSteps = [
        {
            step: "1",
            title: "Create an Account",
            description: "Sign up on EuMatter to access NSTP opportunities and track your progress.",
            icon: FaUserCheck
        },
        {
            step: "2",
            title: "Browse Opportunities",
            description: "Explore available volunteer opportunities that align with your NSTP requirements.",
            icon: FaBookOpen
        },
        {
            step: "3",
            title: "Register for Events",
            description: "Register for events that match your NSTP component (CWTS or ROTC).",
            icon: FaCalendarAlt
        },
        {
            step: "4",
            title: "Attend & Scan QR",
            description: "Attend events and scan QR codes for automatic attendance verification.",
            icon: FaQrcode
        },
        {
            step: "5",
            title: "Track Your Hours",
            description: "Monitor your volunteer hours and progress in real-time through your dashboard.",
            icon: FaChartLine
        },
        {
            step: "6",
            title: "Download Certificates",
            description: "Generate and download certificates and reports for your NSTP requirements.",
            icon: FaCertificate
        }
    ];

    const benefits = [
        {
            icon: FaHandsHelping,
            title: "Real Impact",
            description: "Contribute to meaningful community projects that create lasting positive change."
        },
        {
            icon: FaGraduationCap,
            title: "Skill Development",
            description: "Gain practical experience and develop valuable skills for your future career."
        },
        {
            icon: FaUsers,
            title: "Networking",
            description: "Connect with like-minded students and community members who share your passion."
        },
        {
            icon: FaClock,
            title: "Convenience",
            description: "Easy registration and tracking system makes fulfilling NSTP requirements simple."
        },
        {
            icon: FaCheckCircle,
            title: "Transparency",
            description: "Clear records of your service hours with verified attendance tracking."
        },
        {
            icon: FaCertificate,
            title: "Recognition",
            description: "Receive certificates and recognition for your valuable contributions."
        }
    ];

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-white">
            <Header />

            {/* Hero Section */}
            <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-20 sm:py-24 md:py-32">
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000]"></div>
                <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                ></div>
                
                <div className="relative z-10 w-full max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-6"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="inline-block"
                        >
                            <span className="px-4 py-2 bg-[#FFD700]/20 backdrop-blur-sm border border-[#FFD700]/30 rounded-full text-[#FFD700] font-semibold text-sm sm:text-base">
                                National Service Training Program
                            </span>
                        </motion.div>
                        
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
                            NSTP Community
                            <span className="block text-[#FFD700] mt-2">Service Program</span>
                        </h1>
                        
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
                            Fulfill your NSTP requirements while making a real impact in the community. 
                            EuMatter helps MSEUF students complete NSTP through meaningful community service.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                            <Button 
                                variant="gold" 
                                onClick={() => navigate('/campaigns')}
                                className="px-8 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                            >
                                Browse NSTP Opportunities
                            </Button>
                            {isLoggedIn && (
                                <Button 
                                    variant="maroonOutline"
                                    onClick={() => navigate('/user/dashboard')}
                                    className="px-8 py-4 text-lg font-bold bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-[#800000] transition-all duration-200"
                                >
                                    Track My NSTP Hours
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* What is NSTP Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            What is NSTP?
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            The National Service Training Program (NSTP) is a program aimed at enhancing 
                            civic consciousness and defense preparedness in the youth.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-6">
                                <FaGraduationCap className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">NSTP Requirements</h3>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                All college students in the Philippines are required to complete NSTP as part 
                                of their curriculum. This program instills patriotism, civic consciousness, 
                                and defense preparedness.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                NSTP is a mandatory program that helps students develop their social responsibility 
                                and contribute to nation-building through community service and training.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-[#FFD700] to-[#FFC700] rounded-xl flex items-center justify-center mb-6">
                                <FaUsers className="w-8 h-8 text-[#800000]" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">NSTP at MSEUF</h3>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                Manuel S. Enverga University Foundation integrates NSTP with the Community 
                                Relations Department to provide meaningful service opportunities for students.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                Through EuMatter, students can easily find, register for, and track their 
                                NSTP activities, making the fulfillment of requirements seamless and impactful.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* NSTP Components Section - CWTS and ROTC Only */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            NSTP Components at Enverga University
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-4">
                            Manuel S. Enverga University Foundation offers two NSTP components:
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#800000]/10 rounded-full">
                            <FaCheckCircle className="text-[#800000]" />
                            <span className="text-sm sm:text-base font-semibold text-[#800000]">
                                CWTS (Civic Welfare Training Service) and ROTC (Reserve Officers' Training Corps)
                            </span>
                        </div>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
                        {nstpComponents.map((component, index) => {
                            const IconComponent = component.icon;
                            return (
                                <motion.div
                                    key={index}
                                    variants={cardVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: index * 0.2 }}
                                    className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-2 border-2 border-gray-100 overflow-hidden"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${component.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                                    
                                    <div className={`relative w-20 h-20 rounded-2xl ${component.bgColor} flex items-center justify-center mb-6 shadow-md group-hover:shadow-lg transform group-hover:scale-110 transition-all duration-300`}>
                                        <IconComponent className="w-10 h-10 text-gray-800" />
                                    </div>
                                    
                                    <div className="relative">
                                        <span className="inline-block px-3 py-1 bg-[#800000]/10 text-[#800000] rounded-full text-xs font-semibold mb-3">
                                            {component.name}
                                        </span>
                                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 group-hover:text-[#800000] transition-colors duration-300">
                                            {component.fullName}
                                        </h3>
                                        <p className="text-base text-gray-600 leading-relaxed">
                                            {component.description}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How EuMatter Supports NSTP Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            How EuMatter Supports NSTP
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Comprehensive tools and features to make your NSTP journey smooth and impactful.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {[
                            {
                                icon: FaBookOpen,
                                title: "Volunteer Opportunities",
                                description: "Access to various community service events aligned with NSTP requirements."
                            },
                            {
                                icon: FaClock,
                                title: "Hour Tracking",
                                description: "Automated tracking of volunteer hours with real-time updates."
                            },
                            {
                                icon: FaQrcode,
                                title: "Attendance Verification",
                                description: "QR code-based attendance system for accurate and verified records."
                            },
                            {
                                icon: FaCertificate,
                                title: "Certificate Generation",
                                description: "Automatic certificates for completed service hours and activities."
                            },
                            {
                                icon: FaChartLine,
                                title: "Progress Monitoring",
                                description: "Real-time tracking of NSTP requirements and completion status."
                            },
                            {
                                icon: FaFileAlt,
                                title: "Documentation",
                                description: "Generate reports and documentation for NSTP submission."
                            },
                            {
                                icon: FaUsers,
                                title: "Event Filtering",
                                description: "Filter events by NSTP component (CWTS or ROTC) and category."
                            },
                            {
                                icon: FaCheckCircle,
                                title: "Requirement Tracking",
                                description: "Monitor minimum hours required and track your progress toward completion."
                            }
                        ].map((feature, index) => {
                            const IconComponent = feature.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-4">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Getting Started Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            Getting Started with NSTP
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Follow these simple steps to begin your NSTP journey with EuMatter.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {gettingStartedSteps.map((step, index) => {
                            const IconComponent = step.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center shadow-lg">
                                        <span className="text-2xl font-bold text-white">{step.step}</span>
                                    </div>
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#FFD700] to-[#FFC700] rounded-xl flex items-center justify-center mb-4 mt-4">
                                        <IconComponent className="w-7 h-7 text-[#800000]" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                        {step.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000] relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-white">
                            Benefits of NSTP Through EuMatter
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
                            Why choose EuMatter for your NSTP requirements?
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {benefits.map((benefit, index) => {
                            const IconComponent = benefit.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300"
                                >
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                                        {benefit.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                                        {benefit.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* NSTP Statistics Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            NSTP Statistics
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            See the impact of NSTP programs through EuMatter.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                        {[
                            { icon: FaClock, label: "Total NSTP Hours Completed", value: stats.totalHours || "5,000+" },
                            { icon: FaUsers, label: "Students Participating", value: stats.totalStudents || "500+" },
                            { icon: FaCalendarAlt, label: "NSTP Events", value: stats.totalEvents || "50+" }
                        ].map((stat, index) => {
                            const IconComponent = stat.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#800000] mb-2">
                                        {stat.value}
                                    </div>
                                    <div className="text-sm sm:text-base text-gray-600 font-medium">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Student Resources Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            Student Resources
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Everything you need to successfully complete your NSTP requirements.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {[
                            {
                                icon: FaFileAlt,
                                title: "NSTP Guidelines",
                                description: "Download comprehensive guidelines and requirements for NSTP participation.",
                                action: "Download PDF"
                            },
                            {
                                icon: FaBookOpen,
                                title: "FAQ",
                                description: "Find answers to common questions about NSTP and EuMatter.",
                                action: "View FAQ"
                            },
                            {
                                icon: FaEnvelope,
                                title: "Contact Coordinator",
                                description: "Get in touch with NSTP coordinators for assistance and support.",
                                action: "Contact Us"
                            },
                            {
                                icon: FaGraduationCap,
                                title: "Tutorials",
                                description: "Learn how to use EuMatter for NSTP with step-by-step tutorials.",
                                action: "View Tutorials"
                            }
                        ].map((resource, index) => {
                            const IconComponent = resource.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-4">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                                        {resource.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                        {resource.description}
                                    </p>
                                    <button className="text-[#800000] font-semibold hover:text-[#900000] flex items-center gap-2 transition-colors">
                                        {resource.action}
                                        <FaArrowRight className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="bg-gradient-to-br from-[#800000] to-[#900000] rounded-3xl p-8 sm:p-12 shadow-2xl"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6">
                            Ready to Start Your NSTP Journey?
                        </h2>
                        <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                            Join hundreds of students making a difference while fulfilling their NSTP requirements.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={() => navigate('/campaigns')}
                                variant="gold"
                                size="lg"
                                className="px-8 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                            >
                                Browse NSTP Opportunities
                            </Button>
                            <Button
                                onClick={() => navigate('/register')}
                                variant="maroonOutline"
                                size="lg"
                                className="px-8 py-3 text-base font-semibold bg-white/10 border-2 border-white text-white hover:bg-white hover:!text-[#800000] transition-all duration-200"
                            >
                                Create Account
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default NSTP;

