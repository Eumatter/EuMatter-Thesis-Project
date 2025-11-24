import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { 
    FaLock, 
    FaShieldAlt, 
    FaUserShield, 
    FaDatabase,
    FaEye,
    FaEyeSlash,
    FaCheckCircle,
    FaArrowLeft,
    FaEnvelope
} from 'react-icons/fa';

const PrivacyPolicy = () => {
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
            title: "Information We Collect",
            icon: FaDatabase,
            content: [
                {
                    subtitle: "Personal Information",
                    points: [
                        "Name, email address, and contact information",
                        "User account credentials (securely encrypted)",
                        "Profile information including department, course, and role",
                        "Profile images and other uploaded content"
                    ]
                },
                {
                    subtitle: "Usage Information",
                    points: [
                        "Event participation and volunteer activities",
                        "Donation history and transaction records",
                        "Platform interactions and feature usage",
                        "Device and browser information for security"
                    ]
                },
                {
                    subtitle: "Automatically Collected Data",
                    points: [
                        "IP address and location data (for security purposes)",
                        "Cookies and similar tracking technologies",
                        "Log files and system analytics",
                        "Error reports and performance metrics"
                    ]
                }
            ]
        },
        {
            title: "How We Use Your Information",
            icon: FaEye,
            content: [
                {
                    subtitle: "Platform Services",
                    points: [
                        "To provide and maintain platform functionality",
                        "To process event registrations and volunteer activities",
                        "To facilitate donations and payment processing",
                        "To generate certificates and reports"
                    ]
                },
                {
                    subtitle: "Communication",
                    points: [
                        "To send event notifications and updates",
                        "To respond to inquiries and support requests",
                        "To send important platform announcements",
                        "To provide customer service and support"
                    ]
                },
                {
                    subtitle: "Improvement and Security",
                    points: [
                        "To analyze platform usage and improve services",
                        "To detect and prevent fraud or abuse",
                        "To ensure platform security and compliance",
                        "To conduct research and analytics (anonymized)"
                    ]
                }
            ]
        },
        {
            title: "Data Sharing and Disclosure",
            icon: FaUserShield,
            content: [
                {
                    subtitle: "Limited Sharing",
                    points: [
                        "Information is shared only with authorized CRD staff and system administrators",
                        "Event organizers can view volunteer and donation information for their events",
                        "Aggregated, anonymized data may be used for reporting and analytics",
                        "No personal information is sold to third parties"
                    ]
                },
                {
                    subtitle: "Legal Requirements",
                    points: [
                        "We may disclose information if required by law or legal process",
                        "To protect the rights, property, or safety of users",
                        "To comply with government regulations and requests",
                        "In connection with legal proceedings or investigations"
                    ]
                },
                {
                    subtitle: "Service Providers",
                    points: [
                        "We work with trusted service providers for payment processing",
                        "Cloud hosting and infrastructure services",
                        "Email and notification services",
                        "All service providers are bound by confidentiality agreements"
                    ]
                }
            ]
        },
        {
            title: "Data Security",
            icon: FaShieldAlt,
            content: [
                {
                    subtitle: "Security Measures",
                    points: [
                        "Encryption of sensitive data in transit and at rest",
                        "Secure authentication and access controls",
                        "Regular security audits and updates",
                        "Role-based access control (RBAC) for data protection"
                    ]
                },
                {
                    subtitle: "User Responsibilities",
                    points: [
                        "Keep your account credentials secure and confidential",
                        "Use strong, unique passwords",
                        "Log out from shared or public devices",
                        "Report any security concerns immediately"
                    ]
                }
            ]
        },
        {
            title: "Your Privacy Rights",
            icon: FaEyeSlash,
            content: [
                {
                    subtitle: "Access and Control",
                    points: [
                        "Access your personal information through your account dashboard",
                        "Update or correct your information at any time",
                        "Request deletion of your account and associated data",
                        "Opt-out of non-essential communications"
                    ]
                },
                {
                    subtitle: "Data Portability",
                    points: [
                        "Request a copy of your data in a portable format",
                        "Export your volunteer history and donation records",
                        "Download your certificates and documents",
                        "Transfer your data to another service if needed"
                    ]
                }
            ]
        },
        {
            title: "Cookies and Tracking",
            icon: FaLock,
            content: [
                {
                    subtitle: "Cookie Usage",
                    points: [
                        "Essential cookies for platform functionality",
                        "Authentication and session management",
                        "Security and fraud prevention",
                        "Analytics cookies (with user consent)"
                    ]
                },
                {
                    subtitle: "Cookie Management",
                    points: [
                        "You can manage cookie preferences in your browser settings",
                        "Some features may not work if cookies are disabled",
                        "We use cookies to enhance user experience and security",
                        "Third-party cookies are limited and disclosed"
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
                            <FaLock className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
                            Privacy Policy
                        </h1>
                        <p className="text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                            Your privacy is important to us. Learn how we collect, use, and protect your personal information.
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
                            EuMatter ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, 
                            use, disclose, and safeguard your information when you use our platform. By using EuMatter, you consent to the 
                            data practices described in this policy.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            This policy applies to all users of the EuMatter platform, including volunteers, donors, event organizers, and 
                            administrators. We encourage you to read this policy carefully to understand our practices regarding your personal information.
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

            {/* Contact and Updates Section */}
            <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8"
                    >
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200">
                            <h2 className="text-2xl font-bold text-[#800000] mb-4">Policy Updates</h2>
                            <p className="text-gray-700 leading-relaxed">
                                We may update this Privacy Policy from time to time to reflect changes in our practices or for other 
                                operational, legal, or regulatory reasons. We will notify users of significant changes by posting the 
                                new policy on this page and updating the "Last updated" date. Your continued use of the platform 
                                after such changes constitutes acceptance of the updated policy.
                            </p>
                        </div>

                        <div className="bg-gradient-to-br from-[#800000] to-[#900000] rounded-2xl p-8 sm:p-10 text-white text-center">
                            <FaEnvelope className="w-16 h-16 mx-auto mb-6 text-[#FFD700]" />
                            <h2 className="text-2xl sm:text-3xl font-extrabold mb-4">
                                Questions About Privacy?
                            </h2>
                            <p className="text-lg text-white/90 mb-6 leading-relaxed">
                                If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, 
                                please contact the Community Relations Department.
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

export default PrivacyPolicy;

