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
    FaBookOpen, 
    FaHeart, 
    FaLeaf, 
    FaHandsHelping, 
    FaGraduationCap, 
    FaUmbrella,
    FaUsers,
    FaChartLine,
    FaHandHoldingHeart,
    FaBuilding,
    FaArrowRight,
    FaCheckCircle
} from 'react-icons/fa';

const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Program = () => {
    const navigate = useNavigate();
    const { backendUrl, isLoggedIn } = useContext(AppContent);
    const [activePrograms, setActivePrograms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        totalPrograms: 0,
        totalVolunteers: 0,
        totalDonations: 0,
        totalBeneficiaries: 0
    });

    useEffect(() => {
        fetchActivePrograms();
        fetchStatistics();
    }, []);

    const fetchActivePrograms = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const response = await axios.get(backendUrl + 'api/events');
            
            if (response.data && Array.isArray(response.data)) {
                const active = response.data
                    .filter(event => ['Approved', 'Upcoming', 'Ongoing'].includes(event.status))
                    .slice(0, 6);
                setActivePrograms(active);
            }
        } catch (error) {
            console.error('Error fetching programs:', error);
            setActivePrograms([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            // This would ideally come from a statistics endpoint
            // For now, we'll use placeholder values
            setStats({
                totalPrograms: 0,
                totalVolunteers: 0,
                totalDonations: 0,
                totalBeneficiaries: 0
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const programCategories = [
        {
            icon: FaGraduationCap,
            title: "Educational Programs",
            description: "Tutoring, scholarship support, literacy programs, and educational workshops",
            color: "from-blue-500 to-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            icon: FaHeart,
            title: "Health & Wellness",
            description: "Medical missions, health awareness campaigns, vaccination drives, and wellness programs",
            color: "from-red-500 to-red-600",
            bgColor: "bg-red-50"
        },
        {
            icon: FaLeaf,
            title: "Environmental Initiatives",
            description: "Tree planting, clean-up drives, sustainability programs, and environmental education",
            color: "from-green-500 to-green-600",
            bgColor: "bg-green-50"
        },
        {
            icon: FaHandsHelping,
            title: "Social Services",
            description: "Food drives, clothing donations, community support, and social welfare programs",
            color: "from-purple-500 to-purple-600",
            bgColor: "bg-purple-50"
        },
        {
            icon: FaGraduationCap,
            title: "Youth Development",
            description: "Leadership training, skills development, mentorship programs, and career guidance",
            color: "from-amber-500 to-amber-600",
            bgColor: "bg-amber-50"
        },
        {
            icon: FaUmbrella,
            title: "Disaster Relief",
            description: "Emergency response, disaster preparedness, recovery efforts, and relief operations",
            color: "from-orange-500 to-orange-600",
            bgColor: "bg-orange-50"
        }
    ];

    const howItWorks = [
        {
            step: "1",
            title: "Department Creates Program",
            description: "Departments propose events and programs aligned with community needs"
        },
        {
            step: "2",
            title: "CRD Review & Approval",
            description: "Community Relations Department reviews and approves programs"
        },
        {
            step: "3",
            title: "Community Participation",
            description: "Community members can volunteer or donate to support programs"
        },
        {
            step: "4",
            title: "Real-Time Tracking",
            description: "Track progress, impact, and resource allocation in real-time"
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
                                Community Programs & Initiatives
                            </span>
                        </motion.div>
                        
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
                            Community Programs
                            <span className="block text-[#FFD700] mt-2">& Initiatives</span>
                        </h1>
                        
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
                            Discover meaningful programs that make a difference in our community. 
                            Connect with impactful initiatives at Enverga University.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                            <Button 
                                variant="gold" 
                                onClick={() => navigate('/campaigns')}
                                className="px-8 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                            >
                                Browse Active Programs
                            </Button>
                            {isLoggedIn && (
                                <Button 
                                    variant="maroonOutline"
                                    onClick={() => navigate('/department/events')}
                                    className="px-8 py-4 text-lg font-bold bg-white/10 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-[#800000] transition-all duration-200"
                                >
                                    Create a Program
                                </Button>
                            )}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* What Are Community Programs Section */}
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
                            What Are Community Programs?
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                            Community programs at MSEUF are initiatives designed to create positive impact 
                            through education, health, environment, and social services.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
                        >
                            <div className="w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-6">
                                <FaBuilding className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Department-Driven</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Departments at MSEUF create and manage programs that address specific 
                                community needs, ensuring relevance and local impact.
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
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Community-Centered</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Programs are designed with community input and participation, ensuring 
                                they meet real needs and create lasting positive change.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Program Categories Section */}
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
                            Program Categories
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Explore the diverse range of programs we offer to serve our community.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {programCategories.map((category, index) => {
                            const IconComponent = category.icon;
                            return (
                                <motion.div
                                    key={index}
                                    variants={cardVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.3 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                                    
                                    <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${category.bgColor} flex items-center justify-center mb-6 shadow-md group-hover:shadow-lg transform group-hover:scale-110 transition-all duration-300`}>
                                        <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 text-gray-800`} />
                                    </div>
                                    
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 group-hover:text-[#800000] transition-colors duration-300">
                                        {category.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                        {category.description}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How Programs Work Section */}
            <section id="how-programs-work" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-gray-50 to-white scroll-mt-20">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            How Programs Work
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            A simple, transparent process from creation to impact.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {howItWorks.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.15 }}
                                className="relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                            >
                                <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-2xl font-bold text-white">{step.step}</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 mt-4">
                                    {step.title}
                                </h3>
                                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                    {step.description}
                                </p>
                                {index < howItWorks.length - 1 && (
                                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                                        <FaArrowRight className="w-6 h-6 text-[#800000]/30" />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Programs Section */}
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
                            Featured Programs
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Explore our active programs making a difference right now.
                        </p>
                    </motion.div>

                    {isLoading ? (
                        <div className="py-12">
                            <LoadingSpinner size="medium" text="Loading programs..." />
                        </div>
                    ) : activePrograms.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FaBookOpen className="w-12 h-12 text-gray-400" />
                            </div>
                            <p className="text-gray-600 text-lg font-medium">No active programs at the moment.</p>
                            <p className="text-gray-500 text-sm mt-2">Check back soon for new opportunities!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {activePrograms.map((program, index) => {
                                let imageUrl = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
                                if (program.image) {
                                    if (program.image.startsWith('data:image')) {
                                        imageUrl = program.image;
                                    } else if (program.image.startsWith('http://') || program.image.startsWith('https://')) {
                                        imageUrl = program.image;
                                    } else {
                                        imageUrl = `data:image/jpeg;base64,${program.image}`;
                                    }
                                }
                                
                                return (
                                    <motion.div
                                        key={program._id}
                                        initial={{ opacity: 0, y: 50 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-200 cursor-pointer"
                                        onClick={() => {
                                            if (isLoggedIn) {
                                                navigate(`/user/events/${program._id}`);
                                            } else {
                                                navigate('/login');
                                            }
                                        }}
                                    >
                                        <div className="relative h-48 sm:h-56 overflow-hidden bg-gray-200">
                                            <div 
                                                className="absolute inset-0 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
                                                style={{ backgroundImage: `url("${imageUrl}")` }}
                                            ></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                            <div className="absolute bottom-4 left-4 right-4">
                                                <h3 className="text-xl sm:text-2xl font-bold text-white line-clamp-2">
                                                    {program.title}
                                                </h3>
                                            </div>
                                        </div>
                                        
                                        <div className="p-5 sm:p-6 space-y-4">
                                            <p className="text-sm sm:text-base text-gray-600 line-clamp-3 min-h-[4rem]">
                                                {program.description || 'Join us in making a difference in our community.'}
                                            </p>
                                            
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="px-3 py-1 bg-[#800000]/10 text-[#800000] rounded-full text-xs sm:text-sm font-semibold">
                                                    {program.status}
                                                </span>
                                                <button className="text-[#800000] font-semibold hover:text-[#900000] flex items-center gap-2 group-hover:gap-3 transition-all">
                                                    View Details
                                                    <FaArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                    
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-center mt-12 sm:mt-16"
                    >
                        <Button
                            onClick={() => navigate('/campaigns')}
                            variant="maroon"
                            size="lg"
                            className="px-8 py-4 text-lg font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
                        >
                            View All Programs
                            <FaArrowRight className="inline-block ml-2" />
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* How to Participate Section */}
            <section id="how-to-participate" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000] relative overflow-hidden scroll-mt-20">
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
                            How to Participate
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto">
                            There are multiple ways to get involved and make a difference.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {[
                            {
                                icon: FaUsers,
                                title: "As a Volunteer",
                                description: "Join events, contribute time and skills, and make a direct impact in your community.",
                                action: "Browse Events"
                            },
                            {
                                icon: FaHandHoldingHeart,
                                title: "As a Donor",
                                description: "Support programs financially or through in-kind donations to help initiatives succeed.",
                                action: "Make a Donation"
                            },
                            {
                                icon: FaBuilding,
                                title: "As a Department",
                                description: "Create and manage your own programs to address community needs and create impact.",
                                action: "Create Program"
                            },
                            {
                                icon: FaHeart,
                                title: "As a Beneficiary",
                                description: "Access program services and support designed to help you and your community thrive.",
                                action: "View Programs"
                            }
                        ].map((item, index) => {
                            const IconComponent = item.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/20 hover:bg-white/20 transition-all duration-300"
                                >
                                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-white/90 leading-relaxed mb-6">
                                        {item.description}
                                    </p>
                                    <button
                                        onClick={() => {
                                            if (!isLoggedIn) {
                                                navigate('/login');
                                            } else if (item.action === "Create Program") {
                                                navigate('/department/events');
                                            } else if (item.action === "Make a Donation") {
                                                navigate('/donate');
                                            } else {
                                                navigate('/campaigns');
                                            }
                                        }}
                                        className="text-white font-semibold hover:text-[#FFD700] flex items-center gap-2 transition-colors"
                                    >
                                        {item.action}
                                        <FaArrowRight className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Program Impact Statistics Section */}
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
                            Program Impact
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            See the measurable difference our programs make in the community.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {[
                            { icon: FaBookOpen, label: "Programs Completed", value: stats.totalPrograms || "50+" },
                            { icon: FaUsers, label: "Volunteers Engaged", value: stats.totalVolunteers || "500+" },
                            { icon: FaHandHoldingHeart, label: "Donations Received", value: `₱${(stats.totalDonations || 0).toLocaleString()}` },
                            { icon: FaChartLine, label: "Beneficiaries Reached", value: stats.totalBeneficiaries || "1000+" }
                        ].map((stat, index) => {
                            const IconComponent = stat.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100 text-center hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300"
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

            <Footer />
        </div>
    );
};

export default Program;

