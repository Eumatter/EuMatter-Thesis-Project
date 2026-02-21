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
        <div className="min-h-screen bg-gray-50/80">
            <Header />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Header: minimalist */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#800000] flex items-center justify-center">
                                <FaBook className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[#800000] tracking-tight">User Manual</h1>
                                <p className="text-gray-600 text-sm sm:text-base mt-0.5">Complete guide to the EuMatter platform</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[#800000] text-white hover:bg-[#6b0000] active:scale-[0.98] transition-all duration-200 ${isGeneratingPDF ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <FaDownload className="w-4 h-4 flex-shrink-0" />
                                <span className="hidden sm:inline">{isGeneratingPDF ? 'Generating…' : 'Download PDF'}</span>
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-gray-600 text-white hover:bg-gray-700 active:scale-[0.98] transition-all duration-200"
                            >
                                <FaPrint className="w-4 h-4 flex-shrink-0" />
                                <span className="hidden sm:inline">Print</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                    {/* Sidebar: table of contents */}
                    <aside className="lg:w-56 xl:w-60 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sticky top-24 z-10 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">Contents</h2>
                            <nav className="space-y-0.5">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    const isActive = activeSection === section.id;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => scrollToSection(section.id)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm rounded-xl transition-colors duration-200 ${
                                                isActive
                                                    ? 'bg-[#800000] text-white font-medium'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-[#800000]'}`} />
                                            <span>{section.title}</span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        <div ref={manualRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 lg:p-10">
                            {/* Introduction */}
                            <section id="introduction" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">Introduction</h2>
                                <div className="prose prose-sm max-w-none">
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mt-4 mb-2">What is EuMatter?</h3>
                                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                                        EuMatter is a web-based platform for community engagement, volunteer management, and donation tracking for Manuel S. Enverga University Foundation (MSEUF). Students, faculty, staff, departments, and partners can participate in community service, make donations, and track contributions.
                                    </p>

                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mt-4 mb-2">Key Features</h3>
                                    <ul className="list-disc list-inside space-y-1.5 text-gray-600 text-sm sm:text-base mb-4">
                                        <li><strong className="text-gray-800">Event Management:</strong> Create, manage, and join community events</li>
                                        <li><strong className="text-gray-800">Donation System:</strong> Financial and in-kind donations; multiple payment methods</li>
                                        <li><strong className="text-gray-800">Volunteer Tracking:</strong> Register, track hours, and certificates</li>
                                        <li><strong className="text-gray-800">Reporting & Analytics:</strong> Reports and analytics for stakeholders</li>
                                        <li><strong className="text-gray-800">NSTP Integration:</strong> NSTP hours and requirements</li>
                                        <li><strong className="text-gray-800">Social:</strong> Comment, react, and engage with events</li>
                                    </ul>

                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mt-4 mb-2">System Requirements</h3>
                                    <ul className="list-disc list-inside space-y-1.5 text-gray-600 text-sm sm:text-base mb-4">
                                        <li><strong className="text-gray-800">Browser:</strong> Chrome, Firefox, Safari, or Edge (latest)</li>
                                        <li><strong className="text-gray-800">Connection:</strong> Stable internet required</li>
                                        <li><strong className="text-gray-800">Mobile:</strong> PWA — installable on phones and tablets</li>
                                        <li><strong className="text-gray-800">Display:</strong> Responsive; works on all screen sizes</li>
                                    </ul>

                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mt-6 flex gap-3">
                                        <FaInfoCircle className="w-5 h-5 text-[#800000] flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-gray-700">
                                            <strong className="text-gray-900">Note:</strong> This manual is organized by role. Use the contents to jump to the section for your role.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Getting Started */}
                            <section id="getting-started" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">Getting Started</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">1. Account Registration</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                            <p className="text-sm text-gray-600 mb-2"><strong>Step 1:</strong> Access Registration Page</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Navigate to the EuMatter homepage</li>
                                                <li>Click on <strong>"Register"</strong> or <strong>"Sign Up"</strong> button in the top navigation</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
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
                                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                            <p className="text-sm text-gray-600 mb-2"><strong>Step 3:</strong> Complete Profile Information</p>
                                            <ol className="list-decimal list-inside space-y-1 text-gray-700 ml-4">
                                                <li>Select <strong>User Type:</strong> MSEUF or Outsider</li>
                                                <li>If MSEUF: Select Category (Student, Faculty, or Staff) and enter relevant details</li>
                                                <li>If Outsider: Select Category (Alumni, External Partner, or General Public)</li>
                                                <li>Enter additional information (Birthday, Gender, Address, Contact Number - all optional)</li>
                                            </ol>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">2. Logging In</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">3. Password Reset</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                            <section id="user-role" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">User Role Guide</h2>
                                <p className="text-gray-700 mb-4">
                                    The <strong>User</strong> role is for regular users including students, faculty, staff, alumni, and general public. Users can browse events, make donations, volunteer for events, and track their contributions.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Dashboard</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/user/dashboard</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                            <p className="font-semibold text-gray-800 mb-2">Features:</p>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                                                <li><strong>Upcoming Events:</strong> View events you're registered for or interested in</li>
                                                <li><strong>Quick Stats:</strong> See your total donations, volunteer hours, and events participated</li>
                                                <li><strong>Quick Actions:</strong> Quick links to donate, browse events, and view volunteer history</li>
                                                <li><strong>Event Feed:</strong> Scroll through approved events with details</li>
                                                <li><strong>Notifications:</strong> View recent notifications</li>
                                            </ul>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                            <p className="text-sm text-gray-700">
                                                <strong className="text-gray-900">How to Use:</strong> Access dashboard from the menu. Browse events in the feed, click a card for details, and use quick actions for common tasks.
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Browse Events</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/user/events</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Making Donations</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> Event Details Page or <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/donate</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Volunteering for Events</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> Event Details Page</p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                            <section id="crd-staff" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">CRD Staff Guide</h2>
                                <p className="text-gray-600 text-sm sm:text-base mb-4">
                                    <strong>CRD Staff</strong> manages event approvals, donation records, and generates comprehensive reports for the organization.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Dashboard</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/crd-staff/dashboard</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Event Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/crd-staff/events</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Reports & Analytics</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/crd-staff/reports</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Department Leaderboard</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/crd-staff/leaderboard</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-gray-700">
                                                View department rankings based on donations and volunteer participation. The leaderboard shows top-performing departments and their contributions to community events.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Department Guide */}
                            <section id="department" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">Department/Organization Guide</h2>
                                <p className="text-gray-700 mb-4">
                                    <strong>Department/Organization</strong> users can create event proposals, manage volunteers, and track department-specific donations and activities.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Creating Event Proposals</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/department/events</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Volunteer Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/department/volunteer-management/:eventId</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Department Reports</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/department/reports</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-gray-700">
                                                View department-specific reports including event statistics, donation totals, volunteer participation, and other analytics relevant to your department.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* System Admin Guide */}
                            <section id="system-admin" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">System Administrator Guide</h2>
                                <p className="text-gray-700 mb-4">
                                    <strong>System Administrator</strong> manages the entire system including users, roles, wallets, system settings, and generates system-wide reports.
                                </p>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">User Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/system-admin/users</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">System Settings</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/system-admin/settings</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Wallet Management</h3>
                                        <p className="text-gray-700 mb-3"><strong>Location:</strong> <code className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-sm font-mono">/system-admin/wallets</code></p>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-gray-700">
                                                Manage department wallet configurations, verify payment credentials, and monitor wallet transactions. Ensure payment gateways are properly configured for each department.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Common Features */}
                            <section id="common-features" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">Common Features</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Profile Management</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Notifications</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
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
                                        <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900">Calendar View</h3>
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-gray-700">
                                                All users can access a calendar view to see upcoming events, holidays, and important dates. The calendar is role-specific and shows relevant events based on your permissions.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Troubleshooting */}
                            <section id="troubleshooting" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">Troubleshooting</h2>

                                <div className="space-y-4">
                                    <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Email Verification Issues</h3>
                                        <p className="text-sm text-gray-700">
                                            Check spam folder. Use "Resend Code" if the code expires. Ensure your email is correct.
                                        </p>
                                    </div>

                                    <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Login Problems</h3>
                                        <p className="text-sm text-gray-700">
                                            Confirm your email is verified. Use "Forgot Password" to reset. Clear cache and cookies if issues persist.
                                        </p>
                                    </div>

                                    <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-4">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Payment Issues</h3>
                                        <p className="text-sm text-gray-700">
                                            Verify payment method details. For wallet payments, ensure the department wallet is configured. Contact support if problems continue.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* FAQs */}
                            <section id="faqs" className="mb-10 sm:mb-12 scroll-mt-28">
                                <h2 className="text-xl sm:text-2xl font-bold text-[#800000] mb-4 pb-2 border-b border-gray-100">Frequently Asked Questions</h2>

                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Q: How do I change my role?</h3>
                                        <p className="text-gray-700">
                                            A: Role changes must be approved by a System Administrator. Contact your administrator or submit a request through the system.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Q: Can I volunteer for multiple events?</h3>
                                        <p className="text-gray-700 text-sm">A: Yes. Each event requires separate registration and approval.</p>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Q: How do I track my volunteer hours?</h3>
                                        <p className="text-gray-700 text-sm">A: Hours are tracked when you check in and out at events. View history in your dashboard or profile.</p>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Q: What payment methods are accepted?</h3>
                                        <p className="text-gray-700 text-sm">A: Wallet, Cash, and Cheque. In-kind donations are accepted for approved item types.</p>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <h3 className="font-semibold text-gray-900 mb-1.5 text-sm">Q: How long does event approval take?</h3>
                                        <p className="text-gray-700 text-sm">A: Typically 1–3 business days. You’ll get a notification when the event is approved or declined.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Footer */}
                            <div className="mt-10 pt-6 border-t border-gray-100">
                                <p className="text-center text-gray-500 text-sm">
                                    <strong className="text-gray-700">EuMatter User Manual</strong> · Version 1.0 · {new Date().getFullYear()}
                                </p>
                                <p className="text-center text-gray-400 text-xs mt-1">
                                    For support, contact the CRD Office or System Administrator.
                                </p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default UserManual;

