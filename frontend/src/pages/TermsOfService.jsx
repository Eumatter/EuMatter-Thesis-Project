import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { 
    FaFileContract, 
    FaGavel, 
    FaUserCheck, 
    FaShieldAlt,
    FaExclamationTriangle,
    FaCheckCircle,
    FaArrowLeft,
    FaEnvelope,
    FaHandshake,
    FaLock,
    FaUsers,
    FaChartLine
} from 'react-icons/fa';

const TermsOfService = () => {
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

    const sections = [
        {
            title: "Service Description",
            icon: FaFileContract,
            content: [
                {
                    subtitle: "Platform Overview",
                    points: [
                        "EuMatter is a community engagement platform for managing events, donations, and volunteer activities",
                        "The platform is operated by Manuel S. Enverga University Foundation (MSEUF) Community Relations Department",
                        "Services include event management, volunteer coordination, donation processing, and community engagement tools",
                        "Access to certain features may require user registration and account verification"
                    ]
                },
                {
                    subtitle: "Service Availability",
                    points: [
                        "We strive to maintain platform availability but do not guarantee uninterrupted access",
                        "Services may be temporarily unavailable due to maintenance, updates, or technical issues",
                        "We reserve the right to modify, suspend, or discontinue any service at any time",
                        "Users will be notified of significant service changes when possible"
                    ]
                }
            ]
        },
        {
            title: "User Obligations",
            icon: FaUserCheck,
            content: [
                {
                    subtitle: "Account Responsibilities",
                    points: [
                        "Provide accurate and complete information during registration",
                        "Maintain the security and confidentiality of your account credentials",
                        "Notify us immediately of any unauthorized access or security breaches",
                        "Ensure your account information remains current and up to date"
                    ]
                },
                {
                    subtitle: "Acceptable Use",
                    points: [
                        "Use the platform only for lawful purposes and in accordance with these terms",
                        "Respect the rights and privacy of other users",
                        "Do not engage in activities that could harm or disrupt the platform",
                        "Comply with all applicable laws and regulations"
                    ]
                },
                {
                    subtitle: "Prohibited Activities",
                    points: [
                        "Uploading malicious software, viruses, or harmful code",
                        "Impersonating others or providing false information",
                        "Harassing, threatening, or abusing other users",
                        "Violating intellectual property rights or privacy of others",
                        "Using automated systems to access the platform without authorization"
                    ]
                }
            ]
        },
        {
            title: "Service Rules and Guidelines",
            icon: FaGavel,
            content: [
                {
                    subtitle: "Event Participation",
                    points: [
                        "Event registration is subject to availability and organizer approval",
                        "Participants must attend registered events or provide proper cancellation notice",
                        "Failure to attend without notice may affect future event registrations",
                        "Event organizers reserve the right to manage participant lists"
                    ]
                },
                {
                    subtitle: "Volunteer Activities",
                    points: [
                        "Volunteer participation is voluntary and at your own risk",
                        "You must follow all safety guidelines and event instructions",
                        "Volunteer hours are tracked and verified through the platform",
                        "NSTP hours are automatically recorded for eligible participants"
                    ]
                },
                {
                    subtitle: "Donation Terms",
                    points: [
                        "Donations are processed through secure payment gateways",
                        "All donations are final unless otherwise specified by the receiving organization",
                        "Receipts are provided electronically for all transactions",
                        "Refund requests must be directed to the event organizer or CRD staff"
                    ]
                }
            ]
        },
        {
            title: "Intellectual Property",
            icon: FaLock,
            content: [
                {
                    subtitle: "Platform Content",
                    points: [
                        "All platform content, including text, graphics, logos, and software, is protected by copyright",
                        "Content is owned by MSEUF or its licensors and may not be used without permission",
                        "Users may not copy, modify, or distribute platform content without authorization",
                        "Trademarks and service marks are the property of their respective owners"
                    ]
                },
                {
                    subtitle: "User Content",
                    points: [
                        "You retain ownership of content you upload to the platform",
                        "By uploading content, you grant MSEUF a license to use it for platform purposes",
                        "You represent that you have the right to share any content you upload",
                        "We reserve the right to remove content that violates these terms"
                    ]
                }
            ]
        },
        {
            title: "Limitations and Disclaimers",
            icon: FaExclamationTriangle,
            content: [
                {
                    subtitle: "Service Disclaimer",
                    points: [
                        "The platform is provided 'as is' without warranties of any kind",
                        "We do not guarantee the accuracy, completeness, or reliability of platform content",
                        "We are not responsible for user-generated content or third-party links",
                        "Platform availability and functionality may vary"
                    ]
                },
                {
                    subtitle: "Liability Limitations",
                    points: [
                        "MSEUF shall not be liable for indirect, incidental, or consequential damages",
                        "Our liability is limited to the maximum extent permitted by law",
                        "We are not responsible for losses resulting from platform use or unavailability",
                        "Users participate in events and activities at their own risk"
                    ]
                }
            ]
        },
        {
            title: "Account Management",
            icon: FaUsers,
            content: [
                {
                    subtitle: "Account Suspension",
                    points: [
                        "We may suspend accounts that violate these terms or engage in prohibited activities",
                        "Suspended accounts may have limited access to platform features",
                        "Users will be notified of account suspension and the reason for it",
                        "Suspension may be temporary or permanent depending on the violation"
                    ]
                },
                {
                    subtitle: "Account Termination",
                    points: [
                        "Users may terminate their account at any time by contacting CRD staff",
                        "We reserve the right to terminate accounts for serious violations",
                        "Upon termination, access to platform services will be revoked",
                        "Some data may be retained as required by law or for legitimate business purposes"
                    ]
                },
                {
                    subtitle: "Data Retention",
                    points: [
                        "Account data may be retained after account closure for legal and operational purposes",
                        "Users may request data deletion subject to applicable laws",
                        "Transaction records and event history may be retained for reporting",
                        "See our Privacy Policy for details on data handling"
                    ]
                }
            ]
        }
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
                            <FaFileContract className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
                            Terms of Service
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                            Please read these terms carefully before using EuMatter. By using our platform, you agree to these terms.
                        </p>
                        <p className="text-sm sm:text-base text-white/80">
                            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Introduction */}
            <section className="py-12 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200"
                    >
                        <h2 className="text-2xl font-bold text-[#800000] mb-4">Introduction</h2>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            Welcome to EuMatter. These Terms of Service ("Terms") govern your access to and use of the EuMatter platform 
                            operated by Manuel S. Enverga University Foundation (MSEUF) Community Relations Department. By accessing 
                            or using our platform, you agree to be bound by these Terms.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            If you do not agree to these Terms, please do not use the platform. We may update these Terms from time to 
                            time, and your continued use of the platform after such changes constitutes acceptance of the updated Terms.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Main Content Sections */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-b from-white to-gray-50">
                <div className="max-w-7xl mx-auto space-y-12">
                    {sections.map((section, sectionIndex) => {
                        const IconComponent = section.icon;
                        return (
                            <motion.div
                                key={sectionIndex}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
                                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#900000] rounded-xl flex items-center justify-center">
                                        <IconComponent className="w-7 h-7 text-white" />
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#800000]">
                                        {section.title}
                                    </h2>
                                </div>
                                
                                <div className="space-y-6">
                                    {section.content.map((item, itemIndex) => (
                                        <div key={itemIndex} className="border-l-4 border-[#800000] pl-6">
                                            <h3 className="text-xl font-bold text-gray-900 mb-3">
                                                {item.subtitle}
                                            </h3>
                                            <ul className="space-y-2">
                                                {item.points.map((point, pointIndex) => (
                                                    <li key={pointIndex} className="flex items-start gap-2">
                                                        <FaCheckCircle className="w-5 h-5 text-[#800000] flex-shrink-0 mt-0.5" />
                                                        <span className="text-gray-700 leading-relaxed">{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            {/* Additional Terms Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-4xl mx-auto space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="space-y-6"
                    >
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200">
                            <h2 className="text-2xl font-bold text-[#800000] mb-4">Modifications to Terms</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We reserve the right to modify these Terms of Service at any time. We will notify users of significant 
                                changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued 
                                use of the platform after such modifications constitutes your acceptance of the updated Terms. We encourage 
                                you to review these Terms periodically.
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200">
                            <h2 className="text-2xl font-bold text-[#800000] mb-4">Governing Law</h2>
                            <p className="text-gray-700 leading-relaxed">
                                These Terms of Service shall be governed by and construed in accordance with the laws of the Republic of 
                                the Philippines. Any disputes arising from or relating to these Terms or your use of the platform shall 
                                be subject to the exclusive jurisdiction of the courts of the Philippines.
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-[#800000] to-[#900000] rounded-2xl p-8 sm:p-10 text-white text-center">
                            <FaHandshake className="w-16 h-16 mx-auto mb-6 text-[#FFD700]" />
                            <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
                                Questions About Our Terms?
                            </h2>
                            <p className="text-lg text-white/90 mb-6 leading-relaxed">
                                If you have questions or concerns about these Terms of Service, please contact the Community Relations 
                                Department. We're here to help clarify any aspects of our service terms.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    variant="gold"
                                    onClick={() => handleNavigation('/about', 'contact-us')}
                                    className="px-8 py-3 text-base font-semibold"
                                >
                                    Contact Us
                                </Button>
                                <Button
                                    variant="maroonOutline"
                                    onClick={() => navigate('/')}
                                    className="px-8 py-3 text-base font-semibold bg-white/10 border-2 border-white text-white hover:bg-white hover:!text-[#800000] transition-all duration-200"
                                >
                                    <FaArrowLeft className="inline-block mr-2" />
                                    Back to Home
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default TermsOfService;

