import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { AppContent } from '../context/AppContext.jsx';
import { 
    FaInfoCircle, 
    FaBullseye, 
    FaEye, 
    FaCogs, 
    FaUsers, 
    FaHandHoldingHeart,
    FaChartLine,
    FaShieldAlt,
    FaMobileAlt,
    FaRocket,
    FaBuilding,
    FaGraduationCap,
    FaHeart,
    FaLightbulb,
    FaCheckCircle,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaClock,
    FaFacebook,
    FaInstagram,
    FaLinkedin,
    FaArrowRight,
    FaAward,
    FaHandshake,
    FaCalendarAlt,
    FaFileAlt
} from 'react-icons/fa';

const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const About = () => {
    const navigate = useNavigate();
    const { isLoggedIn } = useContext(AppContent);
    const [stats, setStats] = useState({
        totalEvents: 0,
        totalVolunteers: 0,
        totalDonations: 0,
        totalBeneficiaries: 0,
        totalNSTPHours: 0,
        activeDepartments: 0,
        activeUsers: 0
    });

    useEffect(() => {
        fetchStatistics();
    }, []);

    const fetchStatistics = async () => {
        try {
            // This would ideally come from a statistics endpoint
            // For now, we'll use placeholder values
            setStats({
                totalEvents: 0,
                totalVolunteers: 0,
                totalDonations: 0,
                totalBeneficiaries: 0,
                totalNSTPHours: 0,
                activeDepartments: 0,
                activeUsers: 0
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const missionPoints = [
        {
            icon: FaUsers,
            title: "Community Engagement",
            description: "Foster meaningful connections between MSEUF and the community"
        },
        {
            icon: FaChartLine,
            title: "Transparency",
            description: "Provide clear tracking of donations, volunteers, and impact"
        },
        {
            icon: FaCogs,
            title: "Efficiency",
            description: "Streamline event management and volunteer coordination"
        },
        {
            icon: FaHeart,
            title: "Impact",
            description: "Create measurable positive change in the community"
        },
        {
            icon: FaGraduationCap,
            title: "Education",
            description: "Support student development through NSTP and volunteer programs"
        }
    ];

    const visionPoints = [
        "Become the leading platform for community engagement in the region",
        "Create a sustainable model for community service and donations",
        "Empower students, faculty, and community members to make a difference",
        "Build a strong network of volunteers and donors",
        "Measure and maximize social impact"
    ];

    const keyFeatures = [
        {
            icon: FaCalendarAlt,
            title: "Event Management",
            description: "Create, manage, and track community events with ease"
        },
        {
            icon: FaUsers,
            title: "Volunteer Coordination",
            description: "Easy registration and attendance tracking with QR codes"
        },
        {
            icon: FaHandHoldingHeart,
            title: "Donation System",
            description: "Secure online donations with multiple donation methods"
        },
        {
            icon: FaGraduationCap,
            title: "NSTP Integration",
            description: "Automated tracking of NSTP volunteer hours"
        },
        {
            icon: FaChartLine,
            title: "Transparency",
            description: "Real-time tracking of donations and impact"
        },
        {
            icon: FaFileAlt,
            title: "Reporting",
            description: "Comprehensive analytics and reports"
        },
        {
            icon: FaMobileAlt,
            title: "Mobile-Friendly",
            description: "Accessible on all devices with PWA support"
        },
        {
            icon: FaRocket,
            title: "PWA Support",
            description: "Install as a mobile app for easy access"
        }
    ];

    const values = [
        {
            icon: FaChartLine,
            title: "Transparency",
            description: "Clear and honest communication in all operations"
        },
        {
            icon: FaShieldAlt,
            title: "Accountability",
            description: "Responsible management of resources and trust"
        },
        {
            icon: FaHeart,
            title: "Impact",
            description: "Focus on measurable positive change"
        },
        {
            icon: FaUsers,
            title: "Community",
            description: "Putting the community first in all decisions"
        },
        {
            icon: FaLightbulb,
            title: "Innovation",
            description: "Continuous improvement and innovation"
        },
        {
            icon: FaCheckCircle,
            title: "Integrity",
            description: "Ethical and responsible practices"
        }
    ];

    const howItWorks = [
        {
            role: "Departments",
            icon: FaBuilding,
            features: [
                "Create and propose events/programs",
                "Manage volunteers and donations",
                "Track event progress and impact",
                "Generate reports and analytics"
            ]
        },
        {
            role: "Volunteers",
            icon: FaUsers,
            features: [
                "Browse available volunteer opportunities",
                "Register for events",
                "Track volunteer hours (especially for NSTP)",
                "Receive certificates and recognition"
            ]
        },
        {
            role: "Donors",
            icon: FaHandHoldingHeart,
            features: [
                "Support events through online donations",
                "Make in-kind donations",
                "Track donation history",
                "Download receipts and see impact"
            ]
        },
        {
            role: "CRD Staff",
            icon: FaCogs,
            features: [
                "Review and approve events",
                "Monitor all activities",
                "Generate comprehensive reports",
                "Manage department leaderboards"
            ]
        }
    ];

    const faqs = [
        {
            question: "How do I create an account?",
            answer: "Click on 'Join Us' or 'Register' in the header, fill out the registration form, verify your email, and you're ready to go!"
        },
        {
            question: "How do I volunteer for events?",
            answer: "Browse available events on the campaigns page, click on an event you're interested in, and click 'Register as Volunteer' if the event is open for volunteers."
        },
        {
            question: "How do I make a donation?",
            answer: "Navigate to the campaigns page, select an event that accepts donations, and click 'Donate Now'. You can choose between online payment or in-kind donations."
        },
        {
            question: "How do I track my NSTP hours?",
            answer: "After registering for NSTP-eligible events and attending them (with QR code scanning), your hours are automatically tracked. View your progress in your dashboard."
        },
        {
            question: "How do I create an event as a department?",
            answer: "If you're a department user, go to your dashboard and click 'Create Event'. Fill out the event details and submit for CRD approval."
        },
        {
            question: "How are donations used?",
            answer: "Donations are used directly for the events and programs they're designated for. All usage is tracked and reported for transparency."
        },
        {
            question: "How is transparency ensured?",
            answer: "EuMatter provides real-time tracking of donations, volunteer hours, and program impact. All financial transactions are recorded and can be viewed in reports."
        },
        {
            question: "Who can use EuMatter?",
            answer: "EuMatter is available to MSEUF students, faculty, departments, CRD staff, and community members who want to make a difference."
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
                                About EuMatter
                            </span>
                        </motion.div>
                        
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
                            About
                            <span className="block text-[#FFD700] mt-2">EuMatter</span>
                        </h1>
                        
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
                            Connecting communities through meaningful university initiatives. 
                            Learn more about our mission, vision, and how we make a difference.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                            <Button 
                                variant="gold" 
                                onClick={() => navigate('/register')}
                                className="px-8 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                            >
                                Get Started
                            </Button>
                            <Button 
                                variant="maroonOutline"
                                onClick={() => navigate('/campaigns')}
                                className="px-8 py-4 text-lg font-bold bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-[#800000] transition-all duration-200"
                            >
                                Browse Events
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* What is EuMatter Section */}
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
                            What is EuMatter?
                        </h2>
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
                                <FaInfoCircle className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Platform Overview</h3>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                EuMatter is a Community Relations Department platform for Manuel S. Enverga University Foundation (MSEUF). 
                                It serves as a comprehensive system for managing events, donations, and volunteer activities.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                Our platform connects departments, volunteers, donors, and beneficiaries in a transparent, 
                                efficient, and impactful way, creating measurable positive change in the community.
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
                                <FaBullseye className="w-8 h-8 text-[#800000]" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Purpose</h3>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                EuMatter exists to bridge the gap between university initiatives and community needs, 
                                making it easier for everyone to contribute to meaningful causes.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                We provide the tools and infrastructure needed to create, manage, and track community 
                                programs that make a real difference in people's lives.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Mission Section */}
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
                            Our Mission
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            To create a transparent, efficient, and impactful community engagement platform.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {missionPoints.map((point, index) => {
                            const IconComponent = point.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-4">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                                        {point.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {point.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Vision Section */}
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
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaEye className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 sm:mb-8 text-white">
                            Our Vision
                        </h2>
                    </motion.div>

                    <div className="max-w-4xl mx-auto">
                        <div className="space-y-4">
                            {visionPoints.map((point, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20"
                                >
                                    <FaCheckCircle className="w-6 h-6 text-[#FFD700] flex-shrink-0 mt-1" />
                                    <p className="text-base sm:text-lg text-white leading-relaxed">
                                        {point}
                                    </p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* How EuMatter Works Section */}
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
                            How EuMatter Works
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Different roles, one platform, unlimited impact.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {howItWorks.map((item, index) => {
                            const IconComponent = item.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-6">
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                                        For {item.role}
                                    </h3>
                                    <ul className="space-y-3">
                                        {item.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <FaCheckCircle className="w-5 h-5 text-[#800000] flex-shrink-0 mt-0.5" />
                                                <span className="text-sm text-gray-600">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Key Features Section */}
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
                            Key Features
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Everything you need for effective community engagement.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {keyFeatures.map((feature, index) => {
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
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Our Values Section */}
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
                            Our Values
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            The principles that guide everything we do.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {values.map((value, index) => {
                            const IconComponent = value.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-4">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                                        {value.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {value.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Impact Statistics Section */}
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
                            Impact Statistics
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
                            See the measurable difference we're making together.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {[
                            { icon: FaCalendarAlt, label: "Events Organized", value: stats.totalEvents || "100+" },
                            { icon: FaUsers, label: "Volunteers Engaged", value: stats.totalVolunteers || "1,000+" },
                            { icon: FaHandHoldingHeart, label: "Donations Received", value: `₱${(stats.totalDonations || 0).toLocaleString()}` },
                            { icon: FaChartLine, label: "Beneficiaries Reached", value: stats.totalBeneficiaries || "5,000+" },
                            { icon: FaGraduationCap, label: "NSTP Hours Completed", value: stats.totalNSTPHours || "10,000+" },
                            { icon: FaBuilding, label: "Active Departments", value: stats.activeDepartments || "20+" },
                            { icon: FaUsers, label: "Active Users", value: stats.activeUsers || "2,000+" },
                            { icon: FaAward, label: "Programs Completed", value: stats.totalEvents || "200+" }
                        ].map((stat, index) => {
                            const IconComponent = stat.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center hover:bg-white/20 transition-all duration-300"
                                >
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2">
                                        {stat.value}
                                    </div>
                                    <div className="text-xs sm:text-sm text-white/90 font-medium">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Technology Section */}
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
                            Technology
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Built with modern technology for reliability and performance.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8 max-w-6xl mx-auto">
                        {[
                            { title: "Modern Stack", description: "Built with React, Node.js, and MongoDB" },
                            { title: "Security", description: "Secure authentication and data protection" },
                            { title: "Scalability", description: "Designed to handle growth" },
                            { title: "Accessibility", description: "Accessible to all users" },
                            { title: "Performance", description: "Fast and responsive" }
                        ].map((tech, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center"
                            >
                                <h3 className="text-lg font-bold text-gray-900 mb-3">
                                    {tech.title}
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    {tech.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600">
                            Find answers to common questions about EuMatter.
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                            >
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                                    {faq.question}
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
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
                            Contact Us
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Get in touch with the Community Relations Department.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-6xl mx-auto">
                        {[
                            { icon: FaEnvelope, label: "Email", value: "crd@mseuf.edu.ph", link: "mailto:crd@mseuf.edu.ph" },
                            { icon: FaPhone, label: "Phone", value: "(042) 123-4567", link: "tel:+63421234567" },
                            { icon: FaMapMarkerAlt, label: "Address", value: "Manuel S. Enverga University Foundation, Lucena City", link: null },
                            { icon: FaClock, label: "Office Hours", value: "Monday-Friday, 8:00 AM - 5:00 PM", link: null }
                        ].map((contact, index) => {
                            const IconComponent = contact.icon;
                            const Component = contact.link ? 'a' : 'div';
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                >
                                    <Component
                                        href={contact.link}
                                        className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300"
                                    >
                                        <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <IconComponent className="w-7 h-7 text-white" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                                            {contact.label}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {contact.value}
                                        </p>
                                    </Component>
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-center mt-12"
                    >
                        <div className="flex justify-center gap-4">
                            <a href="#" className="w-12 h-12 bg-[#800000] rounded-full flex items-center justify-center text-white hover:bg-[#900000] transition-colors">
                                <FaFacebook className="w-6 h-6" />
                            </a>
                            <a href="#" className="w-12 h-12 bg-[#800000] rounded-full flex items-center justify-center text-white hover:bg-[#900000] transition-colors">
                                <FaInstagram className="w-6 h-6" />
                            </a>
                            <a href="#" className="w-12 h-12 bg-[#800000] rounded-full flex items-center justify-center text-white hover:bg-[#900000] transition-colors">
                                <FaLinkedin className="w-6 h-6" />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default About;

