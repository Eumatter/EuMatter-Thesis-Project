import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { FaBook, FaDownload, FaPrint, FaChevronRight, FaUser, FaUsers, FaUserTie, FaCog, FaHandHoldingHeart, FaCalendarAlt, FaChartBar, FaFileAlt, FaCheckCircle, FaTimes, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const sections = [
    { id: 'introduction', title: 'Introduction', icon: FaInfoCircle },
    { id: 'getting-started', title: 'Getting Started', icon: FaCheckCircle },
    { id: 'user-role', title: 'User Role Guide', icon: FaUser },
    { id: 'crd-staff', title: 'CRD Staff Guide', icon: FaUsers },
    { id: 'department', title: 'Department Guide', icon: FaUserTie },
    { id: 'system-admin', title: 'System Admin Guide', icon: FaCog },
    { id: 'common-features', title: 'Common Features', icon: FaHandHoldingHeart },
    { id: 'troubleshooting', title: 'Troubleshooting', icon: FaExclamationTriangle },
    { id: 'faqs', title: 'FAQs', icon: FaFileAlt }
];

const UserManual = () => {
    const [activeSection, setActiveSection] = useState('introduction');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const manualRef = useRef(null);

    // Scroll to section with offset for header
    const scrollToSection = (sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) {
            const headerOffset = 100; // Account for header height
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveSection(sectionId);
        }
    };

    // Scroll spy to highlight active section
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 150; // Offset for header

            sections.forEach((section) => {
                const element = document.getElementById(section.id);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section.id);
                    }
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleDownloadPDF = async () => {
        if (isGeneratingPDF) return; // Prevent multiple simultaneous generations
        
        try {
            setIsGeneratingPDF(true);
            const element = manualRef.current;
            if (!element) {
                alert('Error: Content not found. Please refresh the page and try again.');
                setIsGeneratingPDF(false);
                return;
            }

            // Temporarily add comprehensive CSS override to convert oklch colors and fix gradient text
            // This must be added before html2canvas processes the document
            const style = document.createElement('style');
            style.id = 'pdf-conversion-styles';
            style.textContent = `
                /* Override oklch colors and gradient text for html2canvas compatibility */
                /* Convert all text colors to rgb */
                * {
                    color: rgb(128, 0, 32) !important;
                }
                /* Fix gradient text headings - convert to solid color */
                h1, h2, h3, h4, h5, h6 {
                    -webkit-text-fill-color: rgb(128, 0, 32) !important;
                    color: rgb(128, 0, 32) !important;
                    background-image: none !important;
                    -webkit-background-clip: unset !important;
                    background-clip: unset !important;
                }
                /* Remove gradient backgrounds from any element */
                [style*="backgroundImage"] {
                    background-image: none !important;
                }
                [style*="WebkitBackgroundClip"] {
                    -webkit-background-clip: unset !important;
                    background-clip: unset !important;
                }
                /* Ensure all headings have solid color */
                h1[style*="backgroundImage"], 
                h2[style*="backgroundImage"], 
                h3[style*="backgroundImage"],
                h4[style*="backgroundImage"],
                h5[style*="backgroundImage"],
                h6[style*="backgroundImage"] {
                    -webkit-text-fill-color: rgb(128, 0, 32) !important;
                    color: rgb(128, 0, 32) !important;
                    background-image: none !important;
                }
            `;
            document.head.appendChild(style);
            
            // Wait a moment for styles to apply and force reflow
            await new Promise(resolve => setTimeout(resolve, 200));
            void element.offsetHeight; // Force reflow

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
                backgroundColor: '#ffffff',
                removeContainer: false,
                imageTimeout: 0,
                proxy: undefined, // Don't use proxy
                foreignObjectRendering: false, // Use canvas rendering
                onclone: (clonedDoc, clonedElement) => {
                    // Convert oklch colors and fix gradient text for html2canvas compatibility
                    try {
                        // First, add a style element to the cloned document to override oklch
                        const styleEl = clonedDoc.createElement('style');
                        styleEl.textContent = `
                            * {
                                color: rgb(128, 0, 32) !important;
                            }
                            h1, h2, h3, h4, h5, h6 {
                                -webkit-text-fill-color: rgb(128, 0, 32) !important;
                                color: rgb(128, 0, 32) !important;
                                background-image: none !important;
                                -webkit-background-clip: unset !important;
                                background-clip: unset !important;
                            }
                        `;
                        clonedDoc.head.appendChild(styleEl);
                        
                        // Fix gradient text elements
                        const gradientElements = clonedDoc.querySelectorAll('[style*="backgroundImage"], [style*="WebkitBackgroundClip"], h1, h2, h3, h4, h5, h6');
                        gradientElements.forEach((el) => {
                            if (el.style) {
                                // Remove gradient background and use solid color instead
                                el.style.setProperty('background-image', 'none', 'important');
                                el.style.setProperty('-webkit-background-clip', 'unset', 'important');
                                el.style.setProperty('background-clip', 'unset', 'important');
                                el.style.setProperty('-webkit-text-fill-color', 'rgb(128, 0, 32)', 'important');
                                el.style.setProperty('color', 'rgb(128, 0, 32)', 'important');
                            }
                        });
                        
                        // Process all elements in the cloned document for oklch colors
                        const allElements = clonedDoc.querySelectorAll('*');
                        allElements.forEach((el) => {
                            // Handle inline styles via attribute
                            if (el.hasAttribute('style')) {
                                const styleText = el.getAttribute('style');
                                if (styleText) {
                                    // Replace oklch() function calls with rgb equivalent
                                    let updatedStyle = styleText.replace(/oklch\([^)]+\)/g, 'rgb(128, 0, 32)');
                                    // Remove gradient-related properties
                                    updatedStyle = updatedStyle.replace(/backgroundImage[^;]*/g, '');
                                    updatedStyle = updatedStyle.replace(/webkitBackgroundClip[^;]*/g, '');
                                    updatedStyle = updatedStyle.replace(/webkitTextFillColor[^;]*/g, '');
                                    updatedStyle = updatedStyle.replace(/backgroundClip[^;]*/g, '');
                                    // Clean up multiple semicolons
                                    updatedStyle = updatedStyle.replace(/;;+/g, ';').replace(/^;|;$/g, '');
                                    if (updatedStyle !== styleText) {
                                        el.setAttribute('style', updatedStyle);
                                        // Ensure color is set
                                        if (!updatedStyle.includes('color')) {
                                            el.style.setProperty('color', 'rgb(128, 0, 32)', 'important');
                                        }
                                    }
                                }
                            }
                            
                            // Handle style property directly
                            if (el.style) {
                                // Remove problematic gradient properties
                                el.style.setProperty('background-image', 'none', 'important');
                                el.style.setProperty('-webkit-background-clip', 'unset', 'important');
                                el.style.setProperty('background-clip', 'unset', 'important');
                                
                                // Set solid color for headings
                                if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName)) {
                                    el.style.setProperty('-webkit-text-fill-color', 'rgb(128, 0, 32)', 'important');
                                    el.style.setProperty('color', 'rgb(128, 0, 32)', 'important');
                                }
                                
                                // Convert oklch colors in all style properties
                                const styleProps = ['color', 'background', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
                                styleProps.forEach(prop => {
                                    try {
                                        const value = el.style.getPropertyValue(prop);
                                        if (value && (value.includes('oklch') || value.includes('oklch'))) {
                                            el.style.setProperty(prop, 'rgb(128, 0, 32)', 'important');
                                        }
                                    } catch (e) {
                                        // Ignore errors for individual properties
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        console.warn('Error processing colors in cloned document:', e);
                    }
                },
                ignoreElements: (element) => {
                    // Ignore elements that might cause issues
                    return element.classList?.contains('no-print') || false;
                }
            }).catch((error) => {
                console.error('html2canvas error:', error);
                // If html2canvas fails, suggest using print instead
                if (error.message?.includes('blocked') || error.name === 'SecurityError') {
                    throw new Error('PDF generation blocked by browser. Please use the Print button instead, or disable ad blockers/extensions and try again.');
                }
                throw error;
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('EuMatter_User_Manual.pdf');
            
            // Remove temporary style
            const tempStyle = document.getElementById('pdf-conversion-styles');
            if (tempStyle) {
                tempStyle.remove();
            }
            
            setIsGeneratingPDF(false);
        } catch (error) {
            console.error('Error generating PDF:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            
            // Remove temporary style on error
            const tempStyle = document.getElementById('pdf-conversion-styles');
            if (tempStyle) {
                tempStyle.remove();
            }
            
            setIsGeneratingPDF(false);
            
            if (errorMessage.includes('blocked') || errorMessage.includes('SecurityError')) {
                alert('PDF generation was blocked. This is usually caused by browser extensions (ad blockers, privacy tools).\n\nSolutions:\n1. Disable ad blockers/extensions temporarily\n2. Use the Print button instead (Ctrl+P or Cmd+P)\n3. Try a different browser');
            } else if (errorMessage.includes('oklch') || errorMessage.includes('color')) {
                alert('PDF generation encountered a color format issue (oklch colors not supported by html2canvas).\n\nPlease use the Print button instead (Ctrl+P or Cmd+P) and save as PDF from the print dialog.\n\nThis method provides better results and preserves all formatting.');
            } else {
                alert(`Error generating PDF: ${errorMessage}\n\nPlease try using the Print button instead, or refresh the page and try again.`);
            }
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Header Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-[#800020] to-[#9c0000] rounded-xl">
                                <FaBook className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    User Manual
                                </h1>
                                <p className="text-gray-600 text-base sm:text-lg">Complete guide to using the EuMatter platform</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className={`flex items-center gap-2 px-4 py-2 bg-[#800020] text-white rounded-lg hover:bg-[#9c0000] transition-colors duration-200 shadow-md hover:shadow-lg ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <FaDownload className="w-4 h-4" />
                                <span className="hidden sm:inline">
                                    {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
                                </span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 shadow-md hover:shadow-lg"
                            >
                                <FaPrint className="w-4 h-4" />
                                <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Navigation */}
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-xl shadow-lg p-4 sticky top-24 border border-gray-200 z-10 max-h-[calc(100vh-8rem)] overflow-y-auto">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">Table of Contents</h2>
                            <nav className="space-y-1">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                                                activeSection === section.id
                                                    ? 'bg-gradient-to-r from-[#800020] to-[#9c0000] text-white shadow-md'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4 flex-shrink-0" />
                                            <span className="text-left">{section.title}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div ref={manualRef} className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 border border-gray-200">
                            {/* Introduction */}
                            <section id="introduction" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-4" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Introduction
                                </h2>
                                <div className="prose max-w-none">
                                    <h3 className="text-xl font-semibold mb-3 text-gray-800">What is EuMatter?</h3>
                                    <p className="text-gray-700 mb-4 leading-relaxed">
                                        EuMatter is a comprehensive web-based platform designed to facilitate community engagement, volunteer management, and donation tracking for Manuel S. Enverga University Foundation (MSEUF). The system enables students, faculty, staff, departments, and external partners to participate in community service activities, make donations, and track their contributions.
                                    </p>

                                    <h3 className="text-xl font-semibold mb-3 text-gray-800">Key Features</h3>
                                    <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
                                        <li><strong>Event Management:</strong> Create, manage, and participate in community events</li>
                                        <li><strong>Donation System:</strong> Make financial and in-kind donations with multiple payment methods</li>
                                        <li><strong>Volunteer Tracking:</strong> Register for events, track volunteer hours, and generate certificates</li>
                                        <li><strong>Reporting & Analytics:</strong> Comprehensive reports and analytics for all stakeholders</li>
                                        <li><strong>NSTP Integration:</strong> Track NSTP hours and requirements</li>
                                        <li><strong>Social Features:</strong> Comment, react, and engage with events</li>
                                    </ul>

                                    <h3 className="text-xl font-semibold mb-3 text-gray-800">System Requirements</h3>
                                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                                        <li><strong>Web Browser:</strong> Chrome, Firefox, Safari, or Edge (latest versions)</li>
                                        <li><strong>Internet Connection:</strong> Stable internet connection required</li>
                                        <li><strong>Mobile Support:</strong> Progressive Web App (PWA) - can be installed on mobile devices</li>
                                        <li><strong>Screen Resolution:</strong> Responsive design supports all screen sizes</li>
                                    </ul>

                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded">
                                        <div className="flex items-start">
                                            <FaInfoCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm text-blue-800">
                                                    <strong>Note:</strong> This manual is organized by user roles. Please refer to the section relevant to your role for specific instructions.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Getting Started */}
                            <section id="getting-started" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Getting Started
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">1. Account Registration</h3>
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-gray-600 mb-2"><strong>Step 1:</strong> Access Registration Page</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to the EuMatter homepage</li>
                                                <li>Click on <strong>"Register"</strong> or <strong>"Sign Up"</strong> button in the top navigation</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-gray-600 mb-2"><strong>Step 2:</strong> Fill Registration Form</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Enter your <strong>Full Name</strong></li>
                                                <li>Enter your <strong>Email Address</strong> (must be valid and unique)</li>
                                                <li>Enter a <strong>Password</strong> (minimum 6 characters)</li>
                                                <li>Select your <strong>Role</strong>:
                                                    <ul className="list-disc list-inside ml-6 mt-1">
                                                        <li><strong>User:</strong> For students, faculty, staff, alumni, and general public</li>
                                                        <li><strong>Department/Organization:</strong> For MSEUF departments and organizations</li>
                                                        <li><strong>CRD Staff:</strong> For CRD office staff (requires approval)</li>
                                                        <li><strong>System Administrator:</strong> For system administrators (requires approval)</li>
                                                    </ul>
                                                </li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                            <p className="text-sm text-gray-600 mb-2"><strong>Step 3:</strong> Complete Profile Information</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Select <strong>User Type:</strong> MSEUF or Outsider</li>
                                                <li>If MSEUF: Select Category (Student, Faculty, or Staff) and enter relevant details</li>
                                                <li>If Outsider: Select Category (Alumni, External Partner, or General Public)</li>
                                                <li>Enter additional information (Birthday, Gender, Address, Contact Number - all optional)</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-sm text-gray-600 mb-2"><strong>Step 4:</strong> Email Verification</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Check your email inbox for verification code</li>
                                                <li>Enter the <strong>OTP (One-Time Password)</strong> sent to your email</li>
                                                <li>Click <strong>"Verify Email"</strong></li>
                                                <li>If code expires, click <strong>"Resend Code"</strong></li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">2. Logging In</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to the homepage</li>
                                                <li>Click <strong>"Login"</strong> button</li>
                                                <li>Enter your <strong>Email</strong> and <strong>Password</strong></li>
                                                <li>Click <strong>"Sign In"</strong></li>
                                                <li>You will be redirected to your role-specific dashboard</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">3. Password Reset</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700 mb-2">If you forgot your password:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Click <strong>"Forgot Password?"</strong> on the login page</li>
                                                <li>Enter your email address</li>
                                                <li>Check your email for the OTP code</li>
                                                <li>Enter the OTP and your new password</li>
                                                <li>Click <strong>"Reset Password"</strong></li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* User Role Guide */}
                            <section id="user-role" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    User Role Guide
                                </h2>
                                <p className="text-gray-700 mb-4">
                                    The <strong>User</strong> role is for regular users including students, faculty, staff, alumni, and general public. Users can browse events, make donations, volunteer for events, and track their contributions.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Dashboard</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/user/dashboard</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                            <p className="font-semibold text-gray-800 mb-2">Features:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                                <li><strong>Upcoming Events:</strong> View events you're registered for or interested in</li>
                                                <li><strong>Quick Stats:</strong> See your total donations, volunteer hours, and events participated</li>
                                                <li><strong>Quick Actions:</strong> Quick links to donate, browse events, and view volunteer history</li>
                                                <li><strong>Event Feed:</strong> Scroll through approved events with details</li>
                                                <li><strong>Notifications:</strong> View recent notifications</li>
                                            </ul>
                                        </div>
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                            <p className="text-sm text-blue-800">
                                                <strong>How to Use:</strong> Access dashboard from navigation menu. Browse events in the feed. Click on an event card to view details. Use quick action buttons for common tasks.
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Browse Events</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/user/events</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Browse Events:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Click <strong>"Events"</strong> in navigation menu</li>
                                                <li>Use search bar to find specific events</li>
                                                <li>Use filter dropdown to filter by type</li>
                                                <li>Click on an event card to view full details</li>
                                                <li>Click <strong>"View Details"</strong> to see complete information</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Making Donations</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> Event Details Page or <code className="bg-gray-100 px-2 py-1 rounded">/donate</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Make a Donation:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to an event details page or click <strong>"Donate"</strong> button</li>
                                                <li>Select donation type: <strong>Financial</strong> or <strong>In-Kind</strong></li>
                                                <li>Enter donation amount (for financial) or item details (for in-kind)</li>
                                                <li>Choose payment method: Wallet, Cash, or Cheque</li>
                                                <li>Complete payment process</li>
                                                <li>Receive confirmation and receipt</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Volunteering for Events</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> Event Details Page</p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Register as Volunteer:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to event details page</li>
                                                <li>Click <strong>"Volunteer"</strong> button</li>
                                                <li>Review volunteer requirements (if any)</li>
                                                <li>Confirm your registration</li>
                                                <li>Wait for approval from event organizer</li>
                                                <li>Check your notifications for approval status</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* CRD Staff Guide */}
                            <section id="crd-staff" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    CRD Staff Guide
                                </h2>
                                <p className="text-gray-700 mb-4">
                                    <strong>CRD Staff</strong> manages event approvals, donation records, and generates comprehensive reports for the organization.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Dashboard</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/crd-staff/dashboard</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Features:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Overview of all activities and statistics</li>
                                                <li>Recent events, donations, and volunteers</li>
                                                <li>Quick access to key functions</li>
                                                <li>Calendar view of events and holidays</li>
                                                <li>All events feed</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Event Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/crd-staff/events</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Approve/Decline Events:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to <strong>"Event Management"</strong> from menu</li>
                                                <li>View pending event proposals</li>
                                                <li>Click on an event to review details</li>
                                                <li>Click <strong>"Approve"</strong> or <strong>"Decline"</strong> button</li>
                                                <li>Add comments or feedback (optional)</li>
                                                <li>Confirm your decision</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Reports & Analytics</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/crd-staff/reports</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Generate Reports:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to <strong>"Reports"</strong> from menu</li>
                                                <li>Select report type: Overview, Events, Donations, Expenditures, Volunteers, Users, or Donor Demographics</li>
                                                <li>View charts and statistics</li>
                                                <li>Click <strong>"Print Report"</strong> to print or export</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Department Leaderboard</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/crd-staff/leaderboard</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700">
                                                View department rankings based on donations and volunteer participation. The leaderboard shows top-performing departments and their contributions to community events.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Department Guide */}
                            <section id="department" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Department/Organization Guide
                                </h2>
                                <p className="text-gray-700 mb-4">
                                    <strong>Department/Organization</strong> users can create event proposals, manage volunteers, and track department-specific donations and activities.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Creating Event Proposals</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/department/events</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Create Event Proposal:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to <strong>"Events"</strong> from menu</li>
                                                <li>Click <strong>"Create Event"</strong> button</li>
                                                <li>Fill out event form:
                                                    <ul className="list-disc list-inside ml-6 mt-1">
                                                        <li>Event title and description</li>
                                                        <li>Event date and time</li>
                                                        <li>Location</li>
                                                        <li>Event type (Volunteer, Donation, or Both)</li>
                                                        <li>Volunteer requirements (if applicable)</li>
                                                        <li>Donation goal (if applicable)</li>
                                                    </ul>
                                                </li>
                                                <li>Upload event image (optional)</li>
                                                <li>Click <strong>"Submit for Approval"</strong></li>
                                                <li>Wait for CRD Staff approval</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Volunteer Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/department/volunteer-management/:eventId</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Manage Volunteers:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to your event details page</li>
                                                <li>Click <strong>"Manage Volunteers"</strong> button</li>
                                                <li>View list of volunteer registrations</li>
                                                <li>Approve or reject volunteer applications</li>
                                                <li>Generate QR codes for event attendance</li>
                                                <li>Track volunteer attendance during the event</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Department Reports</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/department/reports</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700">
                                                View department-specific reports including event statistics, donation totals, volunteer participation, and other analytics relevant to your department.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* System Admin Guide */}
                            <section id="system-admin" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    System Administrator Guide
                                </h2>
                                <p className="text-gray-700 mb-4">
                                    <strong>System Administrator</strong> manages the entire system including users, roles, wallets, system settings, and generates system-wide reports.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">User Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/system-admin/users</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Steps to Create New User:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to <strong>"User Management"</strong> from sidebar</li>
                                                <li>Click <strong>"Create User"</strong> button</li>
                                                <li>Fill out form with user details</li>
                                                <li>Select user role</li>
                                                <li>Click <strong>"Create User"</strong></li>
                                                <li>User receives email with account details</li>
                                            </ol>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">System Settings</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/system-admin/settings</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="font-semibold text-gray-800 mb-2">Available Settings:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                                <li><strong>Maintenance Mode:</strong> Enable/disable system maintenance</li>
                                                <li><strong>In-Kind Donation Settings:</strong> Configure allowed donation types and instructions</li>
                                                <li><strong>Email Notifications:</strong> Configure email settings</li>
                                                <li><strong>Password Policy:</strong> Set password requirements</li>
                                                <li><strong>Two-Factor Authentication:</strong> Enable/disable 2FA</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Wallet Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 px-2 py-1 rounded">/system-admin/wallets</code></p>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700">
                                                Manage department wallet configurations, verify payment credentials, and monitor wallet transactions. Ensure payment gateways are properly configured for each department.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Common Features */}
                            <section id="common-features" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Common Features
                                </h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Profile Management</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700 mb-2">All users can manage their profiles:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Update personal information</li>
                                                <li>Upload profile picture</li>
                                                <li>Change password</li>
                                                <li>Update contact information</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Notifications</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700 mb-2">The system sends notifications for:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Event approvals and updates</li>
                                                <li>Volunteer registration status</li>
                                                <li>Donation confirmations</li>
                                                <li>System announcements</li>
                                            </ul>
                                            <p className="text-gray-700 mt-3">
                                                Configure notification preferences in <strong>Settings</strong> → <strong>Notification Preferences</strong>
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-800">Calendar View</h3>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <p className="text-gray-700">
                                                All users can access a calendar view to see upcoming events, holidays, and important dates. The calendar is role-specific and shows relevant events based on your permissions.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Troubleshooting */}
                            <section id="troubleshooting" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Troubleshooting
                                </h2>

                                <div className="space-y-4">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                                        <h3 className="font-semibold text-yellow-800 mb-2">Email Verification Issues</h3>
                                        <p className="text-sm text-yellow-700">
                                            If you don't receive the verification email, check your spam folder. Click "Resend Code" if the code expires. Ensure your email address is correct.
                                        </p>
                                    </div>

                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                                        <h3 className="font-semibold text-yellow-800 mb-2">Login Problems</h3>
                                        <p className="text-sm text-yellow-700">
                                            If you cannot log in, verify your email is confirmed. Use "Forgot Password" to reset your password. Clear browser cache and cookies if issues persist.
                                        </p>
                                    </div>

                                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                                        <h3 className="font-semibold text-yellow-800 mb-2">Payment Issues</h3>
                                        <p className="text-sm text-yellow-700">
                                            If payment fails, check your payment method details. For wallet payments, ensure your department wallet is properly configured. Contact support if problems continue.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* FAQs */}
                            <section id="faqs" className="mb-12 scroll-mt-24">
                                <h2 className="text-3xl font-bold mb-6" style={{ backgroundImage: 'linear-gradient(to right, #800020, #9c0000)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Frequently Asked Questions
                                </h2>

                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-800 mb-2">Q: How do I change my role?</h3>
                                        <p className="text-gray-700">
                                            A: Role changes must be approved by a System Administrator. Contact your administrator or submit a request through the system.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-800 mb-2">Q: Can I volunteer for multiple events?</h3>
                                        <p className="text-gray-700">
                                            A: Yes, you can register as a volunteer for multiple events. Each event requires separate registration and approval.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-800 mb-2">Q: How do I track my volunteer hours?</h3>
                                        <p className="text-gray-700">
                                            A: Your volunteer hours are automatically tracked when you check in and check out at events. View your volunteer history in your dashboard or profile.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-800 mb-2">Q: What payment methods are accepted?</h3>
                                        <p className="text-gray-700">
                                            A: The system accepts Wallet payments, Cash, and Cheque. In-kind donations are also accepted for approved item types.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-800 mb-2">Q: How long does event approval take?</h3>
                                        <p className="text-gray-700">
                                            A: Event approval typically takes 1-3 business days. You will receive a notification once your event is approved or declined.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Footer Note */}
                            <div className="mt-12 pt-8 border-t border-gray-200">
                                <p className="text-center text-gray-600 text-sm">
                                    <strong>EuMatter User Manual</strong> | Version 1.0 | Last Updated: {new Date().getFullYear()}
                                </p>
                                <p className="text-center text-gray-500 text-xs mt-2">
                                    For additional support, please contact the CRD Office or System Administrator.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default UserManual;

