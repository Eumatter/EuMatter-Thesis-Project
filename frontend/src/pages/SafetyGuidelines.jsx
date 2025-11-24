import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { 
    FaShieldAlt, 
    FaUserShield, 
    FaLock, 
    FaExclamationTriangle, 
    FaCheckCircle,
    FaArrowLeft,
    FaUsers,
    FaHandshake,
    FaEye
} from 'react-icons/fa';

const SafetyGuidelines = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Handle navigation with scroll
    const handleNavigation = (path, scrollToId = null) => {
        if (location.pathname === path && scrollToId) {
            // If already on the page, just scroll
            setTimeout(() => {
                const element = document.getElementById(scrollToId);
                if (element) {
                    const headerOffset = 80;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        } else {
            // Navigate to the page
            navigate(path);
            // Scroll after navigation - wait for page to load
            if (scrollToId) {
                setTimeout(() => {
                    const element = document.getElementById(scrollToId);
                    if (element) {
                        const headerOffset = 80;
                        const elementPosition = element.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                        window.scrollTo({
                            top: offsetPosition,
                            behavior: 'smooth'
                        });
                    } else {
                        // Retry if element not found yet
                        setTimeout(() => {
                            const retryElement = document.getElementById(scrollToId);
                            if (retryElement) {
                                const headerOffset = 80;
                                const elementPosition = retryElement.getBoundingClientRect().top;
                                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                                window.scrollTo({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                });
                            }
                        }, 500);
                    }
                }, 100);
            }
        }
    };

    const guidelines = [
        {
            icon: FaUserShield,
            title: "Personal Information Protection",
            points: [
                "Never share your login credentials with anyone",
                "Use a strong, unique password for your account",
                "Log out from shared or public devices",
                "Report any suspicious activity on your account immediately",
                "Keep your contact information up to date"
            ]
        },
        {
            icon: FaHandshake,
            title: "Event Participation Safety",
            points: [
                "Verify event details before participating",
                "Attend events in groups when possible",
                "Inform a trusted contact about your participation",
                "Follow all event safety protocols and instructions",
                "Report any safety concerns to event organizers or CRD staff"
            ]
        },
        {
            icon: FaLock,
            title: "Financial Safety",
            points: [
                "Only make donations through official EuMatter payment channels",
                "Verify event authenticity before donating",
                "Keep records of all donation transactions",
                "Report any suspicious payment requests",
                "Never share payment information via email or phone"
            ]
        },
        {
            icon: FaUsers,
            title: "Community Interaction",
            points: [
                "Respect all community members and their privacy",
                "Report inappropriate behavior or content",
                "Follow community guidelines and codes of conduct",
                "Maintain professional communication at all times",
                "Respect diversity and inclusion principles"
            ]
        },
        {
            icon: FaEye,
            title: "Data Privacy",
            points: [
                "Review privacy settings regularly",
                "Be mindful of information you share in public forums",
                "Understand how your data is used and stored",
                "Contact CRD if you have privacy concerns",
                "Familiarize yourself with our Privacy Policy"
            ]
        },
        {
            icon: FaExclamationTriangle,
            title: "Reporting Safety Issues",
            points: [
                "Report safety concerns immediately to CRD staff",
                "Use the platform's reporting features when available",
                "Contact emergency services for urgent safety issues",
                "Document incidents with details and evidence when possible",
                "Follow up on reported issues to ensure resolution"
            ]
        }
    ];

    const bestPractices = [
        "Always verify the identity of event organizers before participating",
        "Keep your account information confidential and secure",
        "Regularly review your account activity for unauthorized access",
        "Stay informed about platform updates and security features",
        "Participate in safety training sessions when offered",
        "Follow all local laws and regulations during events"
    ];

    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-white flex flex-col">
            <Header />

            {/* Hero Section */}
            <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-20 sm:py-24 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000]">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                </div>
                
                <div className="relative z-10 w-full max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-6"
                    >
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaShieldAlt className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
                            Safety Guidelines
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                            Your safety and security are our top priorities. Follow these guidelines to ensure a safe and positive experience.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Guidelines Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            Safety Guidelines
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Essential safety practices for all EuMatter users.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {guidelines.map((guideline, index) => {
                            const IconComponent = guideline.icon;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center mb-6">
                                        <IconComponent className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                                        {guideline.title}
                                    </h3>
                                    <ul className="space-y-3">
                                        {guideline.points.map((point, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                <FaCheckCircle className="w-5 h-5 text-[#800000] flex-shrink-0 mt-0.5" />
                                                <span className="text-sm text-gray-600 leading-relaxed">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Best Practices Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12 sm:mb-16"
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 sm:mb-6 text-[#800000]">
                            Best Practices
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Additional recommendations for a secure experience.
                        </p>
                    </motion.div>

                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                            <ul className="space-y-4">
                                {bestPractices.map((practice, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.6, delay: index * 0.1 }}
                                        className="flex items-start gap-3"
                                    >
                                        <FaCheckCircle className="w-6 h-6 text-[#800000] flex-shrink-0 mt-0.5" />
                                        <span className="text-base text-gray-700 leading-relaxed">{practice}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="bg-gradient-to-br from-[#800000] to-[#900000] rounded-2xl p-8 sm:p-10 text-white"
                    >
                        <FaExclamationTriangle className="w-16 h-16 mx-auto mb-6 text-[#FFD700]" />
                        <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
                            Need Help or Have Concerns?
                        </h2>
                        <p className="text-lg text-white/90 mb-6 leading-relaxed">
                            If you encounter any safety issues or have concerns, please contact the Community Relations Department immediately.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                variant="gold"
                                onClick={() => handleNavigation('/about', 'contact-us')}
                                className="px-8 py-3 text-base font-semibold"
                            >
                                Contact CRD
                            </Button>
                            <Button
                                variant="maroonOutline"
                                onClick={() => navigate('/')}
                                className="px-8 py-3 text-base font-semibold bg-white/10 border-2 border-white text-white hover:bg-white hover:text-[#800000]"
                            >
                                <FaArrowLeft className="inline-block mr-2" />
                                Back to Home
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default SafetyGuidelines;

