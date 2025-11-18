import React, { useContext, useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AppContent } from '../../context/AppContext.jsx';
import { 
    FaArrowLeft, 
    FaArrowRight, 
    FaCheck, 
    FaUser, 
    FaEnvelope, 
    FaLock, 
    FaCalendar, 
    FaVenusMars, 
    FaMapMarkerAlt, 
    FaPhone, 
    FaGraduationCap, 
    FaBuilding, 
    FaChevronRight,
    FaUniversity,
    FaUsers,
    FaChalkboard,
    FaUserTie,
    FaCheckCircle,
    FaUserGraduate,
    FaHandshake,
    FaGlobe
} from 'react-icons/fa';

// Import your visual assets (for desktop only)
import EuMatterLogo from '../../assets/Eumatter-logo.png';
import EnvergaLogo from '../../assets/enverga-logo.png';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { backendUrl, setIsLoggedIn, setUserData, getDashboardRoute } = useContext(AppContent);

    // Step management - Restore from sessionStorage if available
    const [currentStep, setCurrentStep] = useState(() => {
        const savedStep = sessionStorage.getItem('registrationStep');
        return savedStep ? parseInt(savedStep, 10) : 1;
    });
    const totalSteps = 6;

    // Form data - Restore from sessionStorage if available
    const [formData, setFormData] = useState(() => {
        const savedFormData = sessionStorage.getItem('registrationFormData');
        if (savedFormData) {
            try {
                return JSON.parse(savedFormData);
            } catch (e) {
                console.error('Error parsing saved form data:', e);
            }
        }
        return {
            // Step 1: User Type
            userType: '', // MSEUF or Outsider
            
            // Step 2: Basic Information
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            
            // Step 3: Personal Information
            birthday: '',
            gender: '',
            address: '',
            contact: '',
            
            // Step 4: Category (MSEUF or Outsider)
            mseufCategory: '', // Student, Faculty, Staff, Alumni (for MSEUF)
            outsiderCategory: '', // External Partner, General Public (for Outsider)
            
            // Step 5: Student Information (MSEUF only)
            studentYear: '',
            department: '',
            course: '',
            
            // Step 6: Terms & Conditions
            acceptedTerms: false
        };
    });

    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Scroll to terms section when returning from terms page on step 6
    useEffect(() => {
        if (currentStep === 6) {
            // Small delay to ensure DOM is rendered
            const timer = setTimeout(() => {
                const termsSection = document.getElementById('terms-section');
                if (termsSection) {
                    // Scroll the terms section into view within its scrollable container
                    termsSection.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [currentStep]);

    // Helper function to validate MSEUF email
    const validateMSEUFEmail = (email) => {
        // Student format: A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph
        // Format: [Letter][2 digits]-[5 digits]@student.mseuf.edu.ph
        const studentPattern = /^[A-Z]\d{2}-\d{5}@student\.mseuf\.edu\.ph$/i;
        
        // Faculty format: juan.delacruz@mseuf.edu.ph
        // Format: name.name@mseuf.edu.ph (must NOT be @student.mseuf.edu.ph)
        const facultyPattern = /^.+@mseuf\.edu\.ph$/i;
        
        // Check if it's a student email
        if (studentPattern.test(email)) {
            return true;
        }
        
        // Check if it's a faculty email (must be @mseuf.edu.ph but NOT @student.mseuf.edu.ph)
        if (facultyPattern.test(email) && !email.toLowerCase().includes('@student.mseuf.edu.ph')) {
            return true;
        }
        
        return false;
    };

    // Validation functions
    const validateStep1 = () => {
        const newErrors = {};
        if (!formData.userType) newErrors.userType = 'Please select your user type';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else {
            // Validate email based on userType
            if (formData.userType === 'MSEUF') {
                if (!validateMSEUFEmail(formData.email)) {
                    newErrors.email = 'Invalid MSEUF email format. Students: A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph. Faculty: juan.delacruz@mseuf.edu.ph';
                }
            } else if (formData.userType === 'Outsider') {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                    newErrors.email = 'Invalid email format';
                }
            } else {
                // User type not selected yet
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                    newErrors.email = 'Invalid email format';
                }
            }
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors = {};
        if (!formData.birthday) newErrors.birthday = 'Birthday is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.contact.trim()) newErrors.contact = 'Contact number is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep4 = () => {
        const newErrors = {};
        if (formData.userType === 'MSEUF' && !formData.mseufCategory) {
            newErrors.mseufCategory = 'Please select Student, Faculty, Staff, or Alumni';
        } else if (formData.userType === 'Outsider' && !formData.outsiderCategory) {
            newErrors.outsiderCategory = 'Please select your category';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep5 = () => {
        const newErrors = {};
        
        if (formData.userType === 'MSEUF') {
            // Students need Year, Department, and Course
            if (formData.mseufCategory === 'Student') {
                if (!formData.studentYear) newErrors.studentYear = 'Student year is required';
                if (!formData.department.trim()) newErrors.department = 'Department is required';
                if (!formData.course.trim()) newErrors.course = 'Course is required';
            }
            // Faculty and Staff only need Department (optional - can be empty or required based on business logic)
            // For now, we'll make it optional for Faculty/Staff
        } else if (formData.userType === 'Outsider') {
            // For Outsiders, Step 5 is mainly for confirmation/information display
            // Add validation here if additional fields are needed in the future
            // For now, no additional validation needed
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        let isValid = false;
        
        switch (currentStep) {
            case 1:
                isValid = validateStep1();
                break;
            case 2:
                isValid = validateStep2();
                break;
            case 3:
                isValid = validateStep3();
                break;
            case 4:
                isValid = validateStep4();
                // Both MSEUF and Outsider users go to step 5
                break;
            case 5:
                isValid = validateStep5();
                break;
            default:
                isValid = true;
        }

        if (isValid && currentStep < totalSteps) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            sessionStorage.setItem('registrationStep', nextStep.toString());
            setErrors({});
        }
    };

        const handleBack = () => {
            if (currentStep > 1) {
                const previousStep = currentStep - 1;
                setCurrentStep(previousStep);
                sessionStorage.setItem('registrationStep', previousStep.toString());
                setErrors({});
            }
        };

    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Save to sessionStorage whenever form data changes
            sessionStorage.setItem('registrationFormData', JSON.stringify(updated));
            return updated;
        });
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Handle terms checkbox change
    const handleTermsChange = (checked) => {
        handleChange('acceptedTerms', checked);
        // Scroll to top of terms section if error exists
        if (errors.acceptedTerms && checked) {
            const termsElement = document.getElementById('acceptedTerms');
            if (termsElement) {
                termsElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate terms and conditions acceptance
        if (!formData.acceptedTerms) {
            toast.error('You must accept the Terms and Conditions to create an account');
            setErrors({ ...errors, acceptedTerms: 'You must accept the Terms and Conditions to continue' });
            return;
        }
        
        // Validate based on user type - all MSEUF users go through step 5
        if (formData.userType === 'MSEUF') {
            if (!validateStep5()) {
            return;
            }
        }

        setIsLoading(true);
        try {
            axios.defaults.withCredentials = true;
            const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
            
            const registrationData = {
                name: fullName, 
                email: formData.email,
                password: formData.password,
                role: 'User',
                birthday: formData.birthday,
                gender: formData.gender,
                address: formData.address,
                contact: formData.contact,
                userType: formData.userType,
                mseufCategory: formData.userType === 'MSEUF' ? formData.mseufCategory : '',
                outsiderCategory: formData.userType === 'Outsider' ? formData.outsiderCategory : '',
                studentYear: formData.userType === 'MSEUF' && formData.mseufCategory === 'Student' ? formData.studentYear : '',
                department: formData.userType === 'MSEUF' && formData.mseufCategory === 'Student' ? formData.department : '',
                course: formData.userType === 'MSEUF' && formData.mseufCategory === 'Student' ? formData.course : ''
            };

            const { data } = await axios.post(backendUrl + 'api/auth/register', registrationData, {
                timeout: 50000 // 50 seconds timeout for registration (email is sent synchronously now)
            });
            
            if (data.success) {
                // Clear sessionStorage on successful registration
                sessionStorage.removeItem('registrationStep');
                sessionStorage.removeItem('registrationFormData');
                
                setUserData(data.user);
                setIsLoggedIn(true);
                
                if (data.requiresVerification) {
                    // Show success message with email info
                    const emailType = formData.email.includes('@student.mseuf.edu.ph') 
                        ? 'MSEUF Student' 
                        : formData.email.includes('@mseuf.edu.ph') 
                            ? 'MSEUF Faculty/Staff' 
                            : 'Guest/Outsider';
                    
                    toast.success(`Registration successful! Verification code is being sent to ${formData.email}. Please check your inbox in a few moments.`, {
                        autoClose: 5000
                    });
                    
                    // Store email in sessionStorage for verification page (in case of refresh)
                    sessionStorage.setItem('verificationEmail', formData.email.trim().toLowerCase())
                    
                    // Navigate immediately - email is sent in background, OTP is already saved
                navigate('/email-verify', { 
                    state: { email: formData.email } 
                });
                } else {
                    toast.success('Registration successful! Redirecting to dashboard...');
                    const dashboardRoute = getDashboardRoute(data.user.role);
                    navigate(dashboardRoute);
                }
            } else {
                toast.error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle different error types
            if (error.response?.status === 503) {
                toast.error('Service temporarily unavailable. Please try again in a few moments.');
            } else if (error.response?.status === 404) {
                toast.error('Registration endpoint not found. Please contact support.');
            } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('Timed')) {
                // Registration may have succeeded but request timed out
                toast.warning('Request timed out. Registration may have succeeded. Please check your email for the verification code.');
                // Store email in sessionStorage for verification page (in case of refresh)
                sessionStorage.setItem('verificationEmail', formData.email.trim().toLowerCase())
                
                navigate('/email-verify', { 
                    state: { email: formData.email } 
                });
            } else if (error.response?.data?.message) {
                // Server returned an error message
                toast.error(error.response.data.message);
            } else if (error.message) {
                // Network or other error
                if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
                    toast.error('Network error. Please check your connection and try again.');
                } else {
                toast.error(error.message);
                }
            } else {
                // Generic error
                toast.error('Registration failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Departments and Courses - MSEUF Official List
    const departments = [
        'College of Education',
        'College of Architecture and Fine Arts',
        'College of Criminal Justice and Criminology',
        'College of Engineering',
        'College of Nursing and Allied Health Sciences',
        'College of Arts and Sciences',
        'College of Business and Accountancy',
        'College of Computing and Multimedia Studies',
        'College of Maritime Education',
        'College of International Tourism and Hospitality Management'
    ];

    const courses = {
        'College of Education': [
            'Bachelor of Elementary Education',
            'Bachelor of Secondary Education',
            'Bachelor of Culture and Arts Education',
            'Bachelor of Physical Education',
            'Bachelor of Library and Information Science'
        ],
        'College of Architecture and Fine Arts': [
            'Bachelor of Fine Arts',
            'BS in Architecture'
        ],
        'College of Criminal Justice and Criminology': [
            'BS in Criminology'
        ],
        'College of Engineering': [
            'BS in Computer Engineering',
            'BS in Electronics Engineering',
            'BS in Electrical Engineering',
            'BS in Mechanical Engineering',
            'BS in Industrial Engineering',
            'BS in Geodetic Engineering',
            'BS in Civil Engineering'
        ],
        'College of Nursing and Allied Health Sciences': [
            'BS in Nursing',
            'BS in Medical Technology'
        ],
        'College of Arts and Sciences': [
            'Bachelor of Arts in Communication',
            'Bachelor of Arts in Political Science',
            'Bachelor of Arts in English Language',
            'BS in Psychology',
            'BS in Public Administration',
            'BS in Environmental Science',
            'BS in Economics',
            'BS in Biology'
        ],
        'College of Business and Accountancy': [
            'BS in Accountancy',
            'BS in Management Accounting',
            'BS in Office Administration',
            'BS in Business Administration'
        ],
        'College of Computing and Multimedia Studies': [
            'BS in Information Technology',
            'BS in Computer Science',
            'BS in Entertainment & Multimedia Computing'
        ],
        'College of Maritime Education': [
            'BS in Marine Engineering',
            'BS in Marine Transportation'
        ],
        'College of International Tourism and Hospitality Management': [
            'BS in Tourism Management',
            'BS in Hospitality Management'
        ]
    };

    const getRelevantSteps = () => {
        const steps = [1, 2, 3]; // Always show steps 1, 2, 3
        
        // Show step 4 only if userType is selected and is MSEUF, or if we're past step 3
        if (formData.userType === 'MSEUF' || currentStep >= 4) {
            if (formData.userType === 'MSEUF') {
                steps.push(4); // MSEUF Category
                // Show step 5 only if category is Student, or if we're on step 5
                if (formData.mseufCategory === 'Student' || currentStep === 5) {
                    steps.push(5); // Student Information
                }
            }
        }
        
        steps.push(6); // Review (always last)
        return steps;
    };

    const renderStepIndicator = () => {
        // Always show all 6 steps for clarity, but highlight relevant ones
        const stepLabels = {
            1: ['User', 'Type'],
            2: ['Basic', 'Info'],
            3: ['Personal', 'Info'],
            4: ['Category'],
            5: formData.userType === 'MSEUF' 
                ? (formData.mseufCategory === 'Student' ? ['Student', 'Info'] : formData.mseufCategory === 'Faculty' ? ['Faculty', 'Info'] : formData.mseufCategory === 'Staff' ? ['Staff', 'Info'] : formData.mseufCategory === 'Alumni' ? ['Alumni', 'Info'] : ['MSEUF', 'Info'])
                : (formData.outsiderCategory === 'External Partner' ? ['External', 'Partner'] : formData.outsiderCategory === 'General Public' ? ['General', 'Public'] : ['Guest', 'Info']),
            6: ['Review']
        };
        
        const isStepCompleted = (stepNum) => {
            if (stepNum < currentStep) return true;
            // Step 4 is completed if we're past it and category is selected
            if (stepNum === 4 && currentStep > 4) {
                if (formData.userType === 'MSEUF' && formData.mseufCategory) return true;
                if (formData.userType === 'Outsider' && formData.outsiderCategory) return true;
            }
            // Step 5 is completed if we're past it (both MSEUF and Outsider go through Step 5)
            if (stepNum === 5 && currentStep > 5) return true;
            return false;
        };
        
        const isStepSkipped = (stepNum) => {
            // No steps are skipped now - both user types go through all steps
            return false;
    };
    
    return (
            <div className="w-full mb-1.5 md:mb-2 px-1 sm:px-2">
                <div className="flex items-start justify-between max-w-4xl mx-auto">
                    {[1, 2, 3, 4, 5, 6].map((stepNum, index) => {
                        const isActive = stepNum === currentStep;
                        const isCompleted = isStepCompleted(stepNum);
                        const isSkipped = isStepSkipped(stepNum);
                        const label = stepLabels[stepNum];
                        const isLast = index === 5;
                        
                        return (
                            <React.Fragment key={stepNum}>
                                <div className={`flex flex-col items-center flex-1 min-w-0 ${!isLast ? 'mr-0.5 sm:mr-1' : ''}`}>
                                    {/* Step Circle */}
                                    <div
                                        className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold transition-all duration-300 shadow-lg flex-shrink-0 ${
                                            isCompleted
                                                ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-green-500/50 scale-105'
                                                : isSkipped
                                                ? 'bg-gray-600/50 text-gray-400 opacity-50 border-2 border-gray-500/50'
                                                : isActive
                                                ? 'bg-gradient-to-br from-[#800000] to-red-900 text-white shadow-red-900/50 scale-105 ring-2 ring-yellow-400'
                                                : 'bg-white/30 text-white border-2 border-white/50'
                                        }`}
                                        title={label.join(' ')}
                                    >
                                        {isCompleted ? <FaCheck className="text-[10px] sm:text-xs" /> : <span className="text-[10px] sm:text-xs md:text-sm">{stepNum}</span>}
                                    </div>
                                    
                                    {/* Step Label - Two rows for multi-word labels */}
                                    <div className="mt-1 sm:mt-1.5 text-center leading-tight w-full">
                                        {label.map((word, wordIndex) => (
                                            <div 
                                                key={wordIndex}
                                                className={`text-[8px] sm:text-[9px] md:text-[10px] font-medium whitespace-nowrap ${
                                                    isActive ? 'text-white font-semibold' : 
                                                    isSkipped ? 'text-gray-500 opacity-50' :
                                                    'text-gray-200'
                                                }`}
                                            >
                                                {word}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Connector Line */}
                                {!isLast && (
                                    <div className={`flex-1 h-0.5 sm:h-0.5 md:h-1 mt-3 sm:mt-3.5 md:mt-4 mx-0.5 sm:mx-1 ${
                                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                                    } transition-colors duration-300`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        );
    };
    
    return (
        <div className="min-h-screen flex flex-col font-poppins relative overflow-x-hidden bg-white">
            {/* Modern blur effect background layers */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Animated gradient blur circles */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-200/30 to-yellow-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-100/20 to-cyan-100/20 rounded-full blur-3xl"></div>
            </div>
            
            {/* Content wrapper with relative positioning */}
            <div className="relative z-10 min-h-screen flex flex-col w-full overflow-x-hidden">
            <Header />

                <main className="flex-1 flex items-center justify-center py-4 px-4 md:py-6 md:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
                <div className="bg-white backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.1)] rounded-2xl flex flex-col lg:flex-row w-full max-w-5xl lg:h-[calc(85vh-20px)] max-h-[680px] overflow-hidden border border-gray-100 mx-auto">
                    {/* Column 1: Visual Design - Hidden on mobile/tablet, shown on desktop - Equal width */}
                    <div className="hidden lg:flex relative w-full lg:w-1/2 flex-col items-center justify-between p-6 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-l-2xl">
                        <div className="flex flex-col items-center justify-center flex-grow">
                            <img
                                src={EuMatterLogo}
                                alt="EuMatter Logo"
                                className="w-48 xl:w-56 object-contain"
                            />
                        </div>

                        <div className="flex items-center space-x-3">
                            <img
                                src={EnvergaLogo}
                                alt="Enverga University Logo"
                                className="w-8 h-8 object-contain"
                            />
                            <span className="text-lg font-bold tracking-wide text-red-900">
                                ENVERGA UNIVERSITY
                            </span>
                        </div>
                    </div>

                    {/* Column 2: Registration Form - Equal width, matching login dimensions */}
                    <div className="w-full lg:w-1/2 p-4 md:p-5 lg:p-6 flex flex-col bg-gradient-to-br from-[#800000] via-[#A00000] to-[#EE1212] rounded-2xl lg:rounded-r-2xl lg:rounded-l-none relative overflow-hidden registration-form-container">
                        {/* Animated Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                        
                        <div className="relative z-10 flex flex-col w-full h-full min-h-0">
                            {/* Header Section - More Compact */}
                            <div className="flex-shrink-0 mb-1.5 md:mb-2">
                                <div className="text-center mb-1.5 md:mb-2">
                                    <h1 className="text-xl md:text-2xl lg:text-2xl font-extrabold mb-1 bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                                        Create Account
                                    </h1>
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="h-0.5 w-8 md:w-10 bg-[#FFD700] rounded-full"></div>
                                        <p className="text-[10px] md:text-xs text-gray-200 font-medium">
                                            {currentStep === 6 ? 'Review' : `Step ${currentStep}/${totalSteps}`}
                                        </p>
                                        <div className="h-0.5 w-8 md:w-10 bg-[#FFD700] rounded-full"></div>
                        </div>
                                </div>

                                <div className="mb-1.5 md:mb-2">
                                    {renderStepIndicator()}
                                </div>
                            </div>

                            {/* Form Content - Scrollable for Step 5 only */}
                            <form onSubmit={currentStep === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="flex flex-col w-full flex-1 min-h-0">
                                {/* Content Area - Scrollable for Step 5 and Step 6 */}
                                <div className={`w-full mb-2 md:mb-2.5 registration-form-content ${currentStep === 5 || currentStep === 6 ? 'overflow-y-auto flex-1 min-h-0' : 'flex-shrink-0'}`}>
                            {/* Step 1: User Type */}
                            {currentStep === 1 && (
                                <div className="space-y-2 md:space-y-3 animate-fade-in">
                                    <div className="text-center mb-1.5 md:mb-2">
                                        <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-0.5 flex items-center justify-center">
                                            <FaUsers className="mr-1.5 text-[#FFD700] text-xs md:text-sm" />
                                            User Type
                                        </h3>
                                        <p className="text-gray-200 text-[10px] md:text-xs">
                                            Please select your user type to continue
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                        {/* MSEUF Option */}
                                        <button
                                            type="button"
                                            onClick={() => handleChange('userType', 'MSEUF')}
                                            className={`group relative flex flex-col items-center justify-between p-4 md:p-5 lg:p-6 rounded-xl border-2 transition-all duration-300 ease-in-out hover:shadow-2xl min-h-[180px] md:min-h-[200px] lg:min-h-[220px] ${
                                                formData.userType === 'MSEUF'
                                                    ? 'border-[#FFD700] bg-gradient-to-br from-yellow-50/30 via-yellow-100/20 to-yellow-50/10 shadow-xl shadow-yellow-500/50 scale-[1.02]'
                                                    : 'border-gray-300/50 bg-white/10 hover:border-yellow-400/70 hover:bg-white/15 backdrop-blur-sm hover:scale-[1.01]'
                                            }`}
                                            style={{
                                                borderWidth: '2px',
                                                boxShadow: formData.userType === 'MSEUF' 
                                                    ? '0 0 0 2px rgba(255, 215, 0, 0.3), 0 10px 25px rgba(255, 215, 0, 0.4)' 
                                                    : undefined
                                            }}
                                        >
                                            {/* Selected Indicator */}
                                            {formData.userType === 'MSEUF' && (
                                                <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 bg-[#FFD700] rounded-full flex items-center justify-center animate-bounce-in z-10">
                                                    <FaCheckCircle className="text-[#800000] text-xs md:text-sm" />
                                                </div>
                                            )}
                                            
                                            {/* Icon Container */}
                                            <div className={`flex-shrink-0 mb-3 md:mb-4 flex justify-center transition-transform duration-300 ${formData.userType === 'MSEUF' ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                <div className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                    formData.userType === 'MSEUF'
                                                        ? 'bg-gradient-to-br from-[#FFD700] to-yellow-400 shadow-lg shadow-yellow-500/50'
                                                        : 'bg-white/20 group-hover:bg-white/30'
                                                }`}>
                                                    <FaUniversity className={`text-xl md:text-2xl lg:text-3xl ${
                                                        formData.userType === 'MSEUF' ? 'text-[#800000]' : 'text-white group-hover:text-[#FFD700]'
                                                    } transition-colors duration-300`} />
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-1 md:space-y-1.5 w-full">
                                                <h4 className={`text-base md:text-lg lg:text-xl font-bold transition-colors duration-300 ${
                                                    formData.userType === 'MSEUF' ? 'text-[#FFD700]' : 'text-white group-hover:text-yellow-200'
                                                }`}>
                                                    MSEUF Member
                                                </h4>
                                                <p className="text-gray-200 text-xs md:text-sm leading-relaxed px-2 mb-2 md:mb-3">
                                                    Student, faculty, staff, or alumni
                                                </p>
                                                <div className="flex items-center justify-center space-x-1.5 md:space-x-2 mt-auto pt-2 md:pt-3 border-t border-white/20 w-full">
                                                    <FaGraduationCap className="text-white/70 text-xs md:text-sm" />
                                                    <FaChalkboard className="text-white/70 text-xs md:text-sm" />
                                                    <FaUserTie className="text-white/70 text-xs md:text-sm" />
                                                    <FaUserGraduate className="text-white/70 text-xs md:text-sm" />
                                                </div>
                                            </div>
                                            
                                            {/* Hover Glow Effect */}
                                            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                                formData.userType === 'MSEUF' ? '' : 'bg-gradient-to-br from-yellow-400/10 to-transparent'
                                            }`}></div>
                                        </button>
                                        
                                        {/* Outsider Option */}
                                        <button
                                            type="button"
                                            onClick={() => handleChange('userType', 'Outsider')}
                                            className={`group relative flex flex-col items-center justify-between p-4 md:p-5 lg:p-6 rounded-xl border-2 transition-all duration-300 ease-in-out hover:shadow-2xl min-h-[180px] md:min-h-[200px] lg:min-h-[220px] ${
                                                formData.userType === 'Outsider'
                                                    ? 'border-[#FFD700] bg-gradient-to-br from-yellow-50/30 via-yellow-100/20 to-yellow-50/10 shadow-xl shadow-yellow-500/50 scale-[1.02]'
                                                    : 'border-gray-300/50 bg-white/10 hover:border-yellow-400/70 hover:bg-white/15 backdrop-blur-sm hover:scale-[1.01]'
                                            }`}
                                            style={{
                                                borderWidth: '2px',
                                                boxShadow: formData.userType === 'Outsider' 
                                                    ? '0 0 0 2px rgba(255, 215, 0, 0.3), 0 10px 25px rgba(255, 215, 0, 0.4)' 
                                                    : undefined
                                            }}
                                        >
                                            {/* Selected Indicator */}
                                            {formData.userType === 'Outsider' && (
                                                <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 bg-[#FFD700] rounded-full flex items-center justify-center animate-bounce-in z-10">
                                                    <FaCheckCircle className="text-[#800000] text-xs md:text-sm" />
                                                </div>
                                            )}
                                            
                                            {/* Icon Container */}
                                            <div className={`flex-shrink-0 mb-3 md:mb-4 flex justify-center transition-transform duration-300 ${formData.userType === 'Outsider' ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                <div className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                    formData.userType === 'Outsider'
                                                        ? 'bg-gradient-to-br from-[#FFD700] to-yellow-400 shadow-lg shadow-yellow-500/50'
                                                        : 'bg-white/20 group-hover:bg-white/30'
                                                }`}>
                                                    <FaUsers className={`text-xl md:text-2xl lg:text-3xl ${
                                                        formData.userType === 'Outsider' ? 'text-[#800000]' : 'text-white group-hover:text-[#FFD700]'
                                                    } transition-colors duration-300`} />
                                                </div>
                                            </div>
                                            
                                            {/* Content */}
                                            <div className="flex-grow flex flex-col justify-center items-center text-center space-y-1 md:space-y-1.5 w-full">
                                                <h4 className={`text-base md:text-lg lg:text-xl font-bold transition-colors duration-300 ${
                                                    formData.userType === 'Outsider' ? 'text-[#FFD700]' : 'text-white group-hover:text-yellow-200'
                                                }`}>
                                                    Guest
                                                </h4>
                                                <p className="text-gray-200 text-xs md:text-sm leading-relaxed px-2 mb-2 md:mb-3">
                                                    Guest or external user
                                                </p>
                                                <div className="flex items-center justify-center space-x-1.5 md:space-x-2 mt-auto pt-2 md:pt-3 border-t border-white/20 w-full">
                                                    <FaUser className="text-white/70 text-xs md:text-sm" />
                                                    <FaUsers className="text-white/70 text-xs md:text-sm" />
                                                </div>
                                            </div>
                                            
                                            {/* Hover Glow Effect */}
                                            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                                formData.userType === 'Outsider' ? '' : 'bg-gradient-to-br from-yellow-400/10 to-transparent'
                                            }`}></div>
                                        </button>
                                    </div>
                                    
                                    {errors.userType && (
                                        <div className="mt-2 p-3 bg-red-500/20 border border-red-400/50 rounded-lg animate-shake">
                                            <p className="text-red-200 text-xs flex items-center">
                                                <FaCheckCircle className="mr-2" />
                                                {errors.userType}
                                            </p>
                                        </div>
                                    )}
                        </div>
                            )}

                            {/* Step 2: Basic Information */}
                            {currentStep === 2 && (
                                <div className="space-y-1.5 md:space-y-2 animate-fade-in">
                                    <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-1 flex items-center">
                                        <FaUser className="mr-1.5 text-xs" />
                                        Basic Information
                                    </h3>
                                    
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2">
                                        <div>
                                            <label className="block text-[10px] md:text-xs font-medium text-white mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Jane"
                                                className={`w-full rounded-lg border ${errors.firstName ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                                value={formData.firstName}
                                                onChange={(e) => handleChange('firstName', e.target.value)}
                                            />
                                            {errors.firstName && <p className="text-red-200 text-xs mt-0.5">{errors.firstName}</p>}
                                </div>
                                        <div>
                                            <label className="block text-[10px] md:text-xs font-medium text-white mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Doe"
                                                className={`w-full rounded-lg border ${errors.lastName ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                                value={formData.lastName}
                                                onChange={(e) => handleChange('lastName', e.target.value)}
                                            />
                                            {errors.lastName && <p className="text-red-200 text-xs mt-0.5">{errors.lastName}</p>}
                                </div>
                            </div>
                                    
                                    <div>
                                        <label className="text-[10px] md:text-xs font-medium text-white mb-1 flex items-center">
                                            <FaEnvelope className="mr-1 text-[10px]" />
                                            Email *
                                        </label>
                                <input
                                    type="email"
                                    placeholder={formData.userType === 'MSEUF' ? (formData.mseufCategory === 'Student' ? 'A22-34197@student.mseuf.edu.ph' : 'juan.delacruz@mseuf.edu.ph') : 'you@example.com'}
                                            className={`w-full rounded-lg border ${errors.email ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                            value={formData.email}
                                            onChange={(e) => handleChange('email', e.target.value)}
                                        />
                                        {errors.email && <p className="text-red-200 text-xs mt-0.5">{errors.email}</p>}
                                        {formData.userType === 'MSEUF' && formData.mseufCategory === 'Student' && (
                                            <p className="text-yellow-200 text-[10px] mt-0.5">
                                                Students: A22-34197@student.mseuf.edu.ph or T22-34197@student.mseuf.edu.ph
                                            </p>
                                        )}
                                        {formData.userType === 'MSEUF' && (formData.mseufCategory === 'Faculty' || formData.mseufCategory === 'Staff') && (
                                            <p className="text-yellow-200 text-[10px] mt-0.5">
                                                Faculty/Staff: juan.delacruz@mseuf.edu.ph
                                            </p>
                                        )}
                                        {formData.userType === 'Outsider' && (
                                            <p className="text-yellow-200 text-[10px] mt-0.5">
                                                Use your personal email address
                                            </p>
                                        )}
                            </div>
                                    
                                    <div>
                                        <label className="text-[10px] md:text-xs font-medium text-white mb-1 flex items-center">
                                            <FaLock className="mr-1 text-[10px]" />
                                            Password *
                                        </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                            className={`w-full rounded-lg border ${errors.password ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                            value={formData.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                        />
                                        {errors.password && <p className="text-red-200 text-xs mt-0.5">{errors.password}</p>}
                            </div>
                                    
                                    <div>
                                        <label className="block text-[10px] md:text-xs font-medium text-white mb-1">Confirm Password *</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                            className={`w-full rounded-lg border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                            value={formData.confirmPassword}
                                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                        />
                                        {errors.confirmPassword && <p className="text-red-200 text-xs mt-0.5">{errors.confirmPassword}</p>}
                            </div>
                                </div>
                            )}

                            {/* Step 3: Personal Information */}
                            {currentStep === 3 && (
                                <div className="space-y-1.5 md:space-y-2 animate-fade-in">
                                    <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-1 flex items-center">
                                        <FaUser className="mr-1.5 text-xs" />
                                        Personal Information
                                    </h3>
                                    
                                    <div>
                                        <label className="text-[10px] md:text-xs font-medium text-white mb-1 flex items-center">
                                            <FaCalendar className="mr-1 text-[10px]" />
                                            Birthday *
                                        </label>
                                        <input
                                            type="date"
                                            max={new Date().toISOString().split('T')[0]}
                                            className={`w-full rounded-lg border ${errors.birthday ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                            value={formData.birthday}
                                            onChange={(e) => handleChange('birthday', e.target.value)}
                                        />
                                        {errors.birthday && <p className="text-red-200 text-xs mt-0.5">{errors.birthday}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] md:text-xs font-medium text-white mb-1 flex items-center">
                                            <FaVenusMars className="mr-1 text-[10px]" />
                                            Gender *
                                        </label>
                                        <select
                                            className={`w-full rounded-lg border ${errors.gender ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                            value={formData.gender}
                                            onChange={(e) => handleChange('gender', e.target.value)}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                        {errors.gender && <p className="text-red-200 text-xs mt-0.5">{errors.gender}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] md:text-xs font-medium text-white mb-1 flex items-center">
                                            <FaMapMarkerAlt className="mr-1 text-[10px]" />
                                            Address *
                                        </label>
                                        <textarea
                                            placeholder="Enter your complete address"
                                            rows="2"
                                            className={`w-full rounded-lg border ${errors.address ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] resize-none`}
                                            value={formData.address}
                                            onChange={(e) => handleChange('address', e.target.value)}
                                        />
                                        {errors.address && <p className="text-red-200 text-xs mt-0.5">{errors.address}</p>}
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] md:text-xs font-medium text-white mb-1 flex items-center">
                                            <FaPhone className="mr-1 text-[10px]" />
                                            Contact Number *
                                        </label>
                                        <input
                                            type="tel"
                                            placeholder="09XX XXX XXXX"
                                            className={`w-full rounded-lg border ${errors.contact ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                            value={formData.contact}
                                            onChange={(e) => handleChange('contact', e.target.value)}
                                        />
                                        {errors.contact && <p className="text-red-200 text-xs mt-0.5">{errors.contact}</p>}
                                    </div>
                                </div>
                            )}


                            {/* Step 4: Category Selection (MSEUF or Outsider) */}
                            {currentStep === 4 && (
                                <>
                                    {formData.userType === 'MSEUF' ? (
                                        <div className="space-y-2 md:space-y-3 animate-fade-in">
                                            <div className="text-center mb-1.5 md:mb-2">
                                                <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-0.5 flex items-center justify-center">
                                                    <FaGraduationCap className="mr-1.5 text-[#FFD700] text-xs md:text-sm" />
                                                    MSEUF Category
                                                </h3>
                                                <p className="text-gray-200 text-[10px] md:text-xs">
                                                    Select your affiliation
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                                                {[
                                                    { name: 'Student', icon: FaGraduationCap, description: 'Currently enrolled student' },
                                                    { name: 'Faculty', icon: FaChalkboard, description: 'Teaching staff member' },
                                                    { name: 'Staff', icon: FaUserTie, description: 'Administrative staff' },
                                                    { name: 'Alumni', icon: FaUserGraduate, description: 'Former MSEUF student or graduate' }
                                                ].map(({ name, icon: Icon, description }) => (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => handleChange('mseufCategory', name)}
                                                        className={`group relative flex flex-col items-center justify-between p-3 md:p-4 rounded-xl border-2 transition-all duration-300 ease-in-out hover:shadow-2xl min-h-[140px] md:min-h-[160px] lg:min-h-[180px] ${
                                                            formData.mseufCategory === name
                                                                ? 'border-[#FFD700] bg-gradient-to-br from-yellow-50/30 via-yellow-100/20 to-yellow-50/10 shadow-xl shadow-yellow-500/50 scale-[1.02]'
                                                                : 'border-gray-300/50 bg-white/10 hover:border-yellow-400/70 hover:bg-white/15 backdrop-blur-sm hover:scale-[1.01]'
                                                        }`}
                                                        style={{
                                                            borderWidth: '2px',
                                                            boxShadow: formData.mseufCategory === name 
                                                                ? '0 0 0 2px rgba(255, 215, 0, 0.3), 0 10px 25px rgba(255, 215, 0, 0.4)' 
                                                                : undefined
                                                        }}
                                                    >
                                                        {/* Selected Indicator */}
                                                        {formData.mseufCategory === name && (
                                                            <div className="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 bg-[#FFD700] rounded-full flex items-center justify-center z-10 animate-bounce-in">
                                                                <FaCheckCircle className="text-[#800000] text-[10px] md:text-xs" />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Icon */}
                                                        <div className={`flex-shrink-0 mb-2 md:mb-3 flex justify-center transition-transform duration-300 ${formData.mseufCategory === name ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                            <div className={`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                                formData.mseufCategory === name
                                                                    ? 'bg-gradient-to-br from-[#FFD700] to-yellow-400 shadow-lg shadow-yellow-500/50'
                                                                    : 'bg-white/20 group-hover:bg-white/30'
                                                            }`}>
                                                                <Icon className={`text-lg md:text-xl lg:text-2xl ${
                                                                    formData.mseufCategory === name ? 'text-[#800000]' : 'text-white group-hover:text-[#FFD700]'
                                                                } transition-colors duration-300`} />
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Content */}
                                                        <div className="flex-grow flex flex-col justify-center items-center text-center space-y-1 w-full">
                                                            <h4 className={`text-xs md:text-sm lg:text-base font-bold transition-colors duration-300 ${
                                                                formData.mseufCategory === name ? 'text-[#FFD700]' : 'text-white group-hover:text-yellow-200'
                                                            }`}>
                                                                {name}
                                                            </h4>
                                                            <p className="text-gray-300 text-[9px] md:text-[10px] leading-relaxed px-1 break-words">
                                                                {description}
                                                            </p>
                                                        </div>
                                                        
                                                        {/* Hover Glow */}
                                                        <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                                            formData.mseufCategory === name ? '' : 'bg-gradient-to-br from-yellow-400/10 to-transparent'
                                                        }`}></div>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {errors.mseufCategory && (
                                                <div className="mt-2 p-3 bg-red-500/20 border border-red-400/50 rounded-lg animate-shake">
                                                    <p className="text-red-200 text-xs flex items-center">
                                                        <FaCheckCircle className="mr-2" />
                                                        {errors.mseufCategory}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : formData.userType === 'Outsider' ? (
                                        <div className="space-y-2 md:space-y-3 animate-fade-in">
                                            <div className="text-center mb-1.5 md:mb-2">
                                                <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-0.5 flex items-center justify-center">
                                                    <FaUsers className="mr-1.5 text-[#FFD700] text-xs md:text-sm" />
                                                    Guest Category
                                                </h3>
                                                <p className="text-gray-200 text-[10px] md:text-xs">
                                                    Select your category
                                                </p>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                                {[
                                                    { name: 'External Partner', icon: FaHandshake, description: 'Partner organization or institution' },
                                                    { name: 'General Public', icon: FaGlobe, description: 'Community member or public user' }
                                                ].map(({ name, icon: Icon, description }) => (
                                                    <button
                                                        key={name}
                                                        type="button"
                                                        onClick={() => handleChange('outsiderCategory', name)}
                                                        className={`group relative flex flex-col items-center justify-between p-4 md:p-5 lg:p-6 rounded-xl border-2 transition-all duration-300 ease-in-out hover:shadow-2xl min-h-[180px] md:min-h-[200px] lg:min-h-[220px] ${
                                                            formData.outsiderCategory === name
                                                                ? 'border-[#FFD700] bg-gradient-to-br from-yellow-50/30 via-yellow-100/20 to-yellow-50/10 shadow-xl shadow-yellow-500/50 scale-[1.02]'
                                                                : 'border-gray-300/50 bg-white/10 hover:border-yellow-400/70 hover:bg-white/15 backdrop-blur-sm hover:scale-[1.01]'
                                                        }`}
                                                        style={{
                                                            borderWidth: '2px',
                                                            boxShadow: formData.outsiderCategory === name 
                                                                ? '0 0 0 2px rgba(255, 215, 0, 0.3), 0 10px 25px rgba(255, 215, 0, 0.4)' 
                                                                : undefined
                                                        }}
                                                    >
                                                        {/* Selected Indicator */}
                                                        {formData.outsiderCategory === name && (
                                                            <div className="absolute top-2 right-2 w-6 h-6 md:w-7 md:h-7 bg-[#FFD700] rounded-full flex items-center justify-center z-10 animate-bounce-in">
                                                                <FaCheckCircle className="text-[#800000] text-xs md:text-sm" />
                                                            </div>
                                                        )}
                                                        
                                                        {/* Icon */}
                                                        <div className={`flex-shrink-0 mb-3 md:mb-4 flex justify-center transition-transform duration-300 ${formData.outsiderCategory === name ? 'scale-110' : 'group-hover:scale-110'}`}>
                                                            <div className={`w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                                formData.outsiderCategory === name
                                                                    ? 'bg-gradient-to-br from-[#FFD700] to-yellow-400 shadow-lg shadow-yellow-500/50'
                                                                    : 'bg-white/20 group-hover:bg-white/30'
                                                            }`}>
                                                                <Icon className={`text-xl md:text-2xl lg:text-3xl ${
                                                                    formData.outsiderCategory === name ? 'text-[#800000]' : 'text-white group-hover:text-[#FFD700]'
                                                                } transition-colors duration-300`} />
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Content */}
                                                        <div className="flex-grow flex flex-col justify-center items-center text-center space-y-1 md:space-y-1.5 w-full">
                                                            <h4 className={`text-base md:text-lg lg:text-xl font-bold transition-colors duration-300 ${
                                                                formData.outsiderCategory === name ? 'text-[#FFD700]' : 'text-white group-hover:text-yellow-200'
                                                            }`}>
                                                                {name}
                                                            </h4>
                                                            <p className="text-gray-200 text-xs md:text-sm leading-relaxed px-2 mb-2 md:mb-3">
                                                                {description}
                                                            </p>
                                                        </div>
                                                        
                                                        {/* Hover Glow */}
                                                        <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                                                            formData.outsiderCategory === name ? '' : 'bg-gradient-to-br from-yellow-400/10 to-transparent'
                                                        }`}></div>
                                                    </button>
                                                ))}
                                            </div>
                                            
                                            {errors.outsiderCategory && (
                                                <div className="mt-2 p-3 bg-red-500/20 border border-red-400/50 rounded-lg animate-shake">
                                                    <p className="text-red-200 text-xs flex items-center">
                                                        <FaCheckCircle className="mr-2" />
                                                        {errors.outsiderCategory}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-fade-in">
                                            <p className="text-white text-center">Loading category selection...</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Step 5: MSEUF Information (Student/Faculty/Staff/Alumni) or Guest Information (External Partner/General Public) */}
                            {currentStep === 5 && (
                                <>
                                    {formData.userType === 'MSEUF' ? (
                                <div className="space-y-1.5 md:space-y-2 animate-fade-in">
                                    <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-1 flex items-center">
                                        {formData.mseufCategory === 'Student' ? (
                                            <FaGraduationCap className="mr-2 text-sm" />
                                        ) : formData.mseufCategory === 'Faculty' ? (
                                            <FaChalkboard className="mr-2 text-sm" />
                                        ) : formData.mseufCategory === 'Staff' ? (
                                            <FaUserTie className="mr-2 text-sm" />
                                        ) : (
                                            <FaUserGraduate className="mr-2 text-sm" />
                                        )}
                                        {formData.mseufCategory === 'Student' ? 'Student Information' : formData.mseufCategory === 'Faculty' ? 'Faculty Information' : formData.mseufCategory === 'Staff' ? 'Staff Information' : 'Alumni Information'}
                                    </h3>
                                    
                                    {/* Student-specific fields */}
                                    {formData.mseufCategory === 'Student' && (
                                        <>
                                            <div>
                                                <label className="block text-[10px] md:text-xs font-medium text-white mb-1">Student Year *</label>
                                                <select
                                                    className={`w-full rounded-lg border ${errors.studentYear ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                                    value={formData.studentYear}
                                                    onChange={(e) => handleChange('studentYear', e.target.value)}
                                                >
                                                    <option value="">Select Year</option>
                                                    <option value="1st Year">1st Year</option>
                                                    <option value="2nd Year">2nd Year</option>
                                                    <option value="3rd Year">3rd Year</option>
                                                    <option value="4th Year">4th Year</option>
                                                    <option value="5th Year">5th Year</option>
                                                    <option value="Graduate">Graduate</option>
                                                </select>
                                                {errors.studentYear && <p className="text-red-200 text-xs mt-0.5">{errors.studentYear}</p>}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[10px] md:text-xs font-medium text-white mb-1">Department *</label>
                                                <select
                                                    className={`w-full rounded-lg border ${errors.department ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                                    value={formData.department}
                                                    onChange={(e) => {
                                                        handleChange('department', e.target.value);
                                                        handleChange('course', ''); // Reset course when department changes
                                                    }}
                                                >
                                                    <option value="">Select Department</option>
                                                    {departments.map((dept) => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                                {errors.department && <p className="text-red-200 text-xs mt-0.5">{errors.department}</p>}
                                            </div>
                                            
                                            <div>
                                                <label className="block text-[10px] md:text-xs font-medium text-white mb-1">Course *</label>
                                                <select
                                                    className={`w-full rounded-lg border ${errors.course ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                                    value={formData.course}
                                                    onChange={(e) => handleChange('course', e.target.value)}
                                                    disabled={!formData.department}
                                                >
                                                    <option value="">Select Course</option>
                                                    {formData.department && courses[formData.department]?.map((course) => (
                                                        <option key={course} value={course}>{course}</option>
                                                    ))}
                                                </select>
                                                {errors.course && <p className="text-red-200 text-xs mt-0.5">{errors.course}</p>}
                                                {!formData.department && (
                                                    <p className="text-yellow-200 text-[10px] mt-0.5">Please select a department first</p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* Faculty/Staff/Alumni fields - Department only (optional) */}
                                    {(formData.mseufCategory === 'Faculty' || formData.mseufCategory === 'Staff' || formData.mseufCategory === 'Alumni') && (
                                        <div>
                                            <label className="block text-[10px] md:text-xs font-medium text-white mb-1">Department (Optional)</label>
                                            <select
                                                className={`w-full rounded-lg border ${errors.department ? 'border-red-500' : 'border-gray-400'} bg-white text-gray-900 px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700]`}
                                                value={formData.department}
                                                onChange={(e) => handleChange('department', e.target.value)}
                                            >
                                                <option value="">Select Department (Optional)</option>
                                                {departments.map((dept) => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </select>
                                            {errors.department && <p className="text-red-200 text-xs mt-0.5">{errors.department}</p>}
                                            <p className="text-yellow-200 text-[10px] mt-1">
                                                {formData.mseufCategory === 'Faculty' 
                                                    ? 'Select your teaching department (optional)' 
                                                    : formData.mseufCategory === 'Staff'
                                                    ? 'Select your administrative department (optional)'
                                                    : 'Select your former department (optional)'}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Confirmation message for Faculty/Staff/Alumni */}
                                    {(formData.mseufCategory === 'Faculty' || formData.mseufCategory === 'Staff' || formData.mseufCategory === 'Alumni') && (
                                        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 flex items-start space-x-2">
                                            <FaCheckCircle className="text-blue-300 text-xs mt-0.5 flex-shrink-0" />
                                            <p className="text-blue-100 text-[10px] md:text-xs">
                                                {formData.mseufCategory === 'Faculty' 
                                                    ? 'You have selected Faculty. You can optionally select your department above.'
                                                    : formData.mseufCategory === 'Staff'
                                                    ? 'You have selected Staff. You can optionally select your department above.'
                                                    : 'You have selected Alumni. As a former MSEUF student or graduate, you can participate in events, volunteer activities, and support university initiatives. You can optionally select your former department above.'}
                                            </p>
                                        </div>
                                    )}
                                    </div>
                                    ) : formData.userType === 'Outsider' ? (
                                        <div className="space-y-1.5 md:space-y-2 animate-fade-in">
                                            <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-1 flex items-center">
                                                {formData.outsiderCategory === 'External Partner' ? (
                                                    <FaHandshake className="mr-2 text-sm" />
                                                ) : (
                                                    <FaGlobe className="mr-2 text-sm" />
                                                )}
                                                {formData.outsiderCategory === 'External Partner' ? 'External Partner Information' : 
                                                 formData.outsiderCategory === 'General Public' ? 'General Public Information' : 
                                                 'Guest Information'}
                                            </h3>
                                            
                                            {/* Information Display Card */}
                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/20 shadow-lg">
                                                <div className="space-y-2 md:space-y-3">
                                                    {/* Category Confirmation */}
                                                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/20 to-yellow-400/10 rounded-lg border border-yellow-400/30">
                                                        <span className="text-[10px] text-gray-300 uppercase tracking-wider">Selected Category</span>
                                                        <span className="text-[#FFD700] font-bold text-sm md:text-base">{formData.outsiderCategory}</span>
                                                    </div>
                                                    
                                                    {formData.outsiderCategory === 'External Partner' && (
                                                        <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3 flex items-start space-x-2">
                                                            <FaHandshake className="text-green-300 text-sm mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-green-100 text-xs md:text-sm font-semibold mb-1">External Partner Status</p>
                                                                <p className="text-green-100 text-[10px] md:text-xs">
                                                                    You have selected External Partner category. As a partner organization or institution, you can 
                                                                    collaborate on events and initiatives with MSEUF.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {formData.outsiderCategory === 'General Public' && (
                                                        <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3 flex items-start space-x-2">
                                                            <FaGlobe className="text-purple-300 text-sm mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-purple-100 text-xs md:text-sm font-semibold mb-1">General Public Status</p>
                                                                <p className="text-purple-100 text-[10px] md:text-xs">
                                                                    You have selected General Public category. As a community member, you can participate in public events, 
                                                                    volunteer activities, and support community initiatives.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Confirmation Message */}
                                                    <div className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 border-2 border-gray-700/50 rounded-lg p-3 mt-3">
                                                        <p className="text-white text-xs md:text-sm text-center">
                                                            Please review your information and proceed to the next step to complete your registration.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-fade-in">
                                            <p className="text-white text-center">Loading information...</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Step 6: Review and Submit */}
                            {currentStep === 6 && (
                                <div className="space-y-1.5 md:space-y-2 animate-fade-in">
                                    {/* Header Section */}
                                    <div className="text-center mb-1.5 md:mb-2">
                                        <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#FFD700] to-yellow-400 rounded-full mb-1 shadow-lg shadow-yellow-500/50">
                                            <FaCheckCircle className="text-[#800000] text-sm md:text-lg" />
                                        </div>
                                        <h3 className="text-sm md:text-base lg:text-lg font-bold text-white mb-0.5">Review Information</h3>
                                        <p className="text-gray-200 text-[10px] md:text-xs">Verify before submitting</p>
                            </div>

                                    {/* Information Cards Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2">
                                        {/* Personal Information Card */}
                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-2.5 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                                            <div className="flex items-center mb-1 pb-1 border-b border-white/20">
                                                <div className="w-6 h-6 md:w-7 md:h-7 bg-white/20 rounded-lg flex items-center justify-center mr-1.5">
                                                    <FaUser className="text-[#FFD700] text-[10px] md:text-xs" />
                                                </div>
                                                <h4 className="text-[10px] md:text-xs lg:text-sm font-bold text-white">Personal Info</h4>
                                            </div>
                                            <div className="space-y-1 md:space-y-1.5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">Full Name</span>
                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.firstName} {formData.lastName}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">Email Address</span>
                                                    <span className="text-white font-semibold text-xs md:text-sm break-all">{formData.email}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">Birthday</span>
                                                    <span className="text-white font-semibold text-xs md:text-sm">
                                                        {formData.birthday ? new Date(formData.birthday).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        }) : 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">Gender</span>
                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.gender || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact & Location Card */}
                                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-2.5 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                                            <div className="flex items-center mb-1 pb-1 border-b border-white/20">
                                                <div className="w-6 h-6 md:w-7 md:h-7 bg-white/20 rounded-lg flex items-center justify-center mr-1.5">
                                                    <FaMapMarkerAlt className="text-[#FFD700] text-[10px] md:text-xs" />
                                                </div>
                                                <h4 className="text-[10px] md:text-xs lg:text-sm font-bold text-white">Contact & Location</h4>
                                            </div>
                                            <div className="space-y-1 md:space-y-1.5">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">Address</span>
                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.address || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-0.5">Contact Number</span>
                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.contact || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Account Type Card */}
                                        <div className={`bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-2.5 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 ${formData.userType === 'MSEUF' || formData.userType === 'Outsider' ? 'sm:col-span-2' : ''}`}>
                                            <div className="flex items-center mb-1 pb-1 border-b border-white/20">
                                                <div className="w-6 h-6 md:w-7 md:h-7 bg-white/20 rounded-lg flex items-center justify-center mr-1.5">
                                                    {formData.userType === 'MSEUF' ? (
                                                        <FaUniversity className="text-[#FFD700] text-[10px] md:text-xs" />
                                                    ) : (
                                                        <FaUsers className="text-[#FFD700] text-[10px] md:text-xs" />
                                                    )}
                                                </div>
                                                <h4 className="text-[10px] md:text-xs lg:text-sm font-bold text-white">Account Type</h4>
                                            </div>
                                            <div className="space-y-1 md:space-y-1.5">
                                                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-500/20 to-yellow-400/10 rounded-lg border border-yellow-400/30">
                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider">User Type</span>
                                                    <span className="text-[#FFD700] font-bold text-xs md:text-sm">{formData.userType}</span>
                                                </div>
                                                {formData.userType === 'MSEUF' && (
                                                    <>
                                                        <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                                            <span className="text-[10px] text-gray-300 uppercase tracking-wider">Category</span>
                                                            <span className="text-white font-semibold text-xs md:text-sm">{formData.mseufCategory}</span>
                                                        </div>
                                                        {formData.mseufCategory === 'Student' && (
                                                            <>
                                                                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider">Year Level</span>
                                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.studentYear}</span>
                                                                </div>
                                                                <div className="flex flex-col p-2 bg-white/5 rounded-lg">
                                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Department</span>
                                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.department || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex flex-col p-2 bg-white/5 rounded-lg">
                                                                    <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Course</span>
                                                                    <span className="text-white font-semibold text-xs md:text-sm">{formData.course || 'N/A'}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {(formData.mseufCategory === 'Faculty' || formData.mseufCategory === 'Staff') && formData.department && (
                                                            <div className="flex flex-col p-2 bg-white/5 rounded-lg">
                                                                <span className="text-[10px] text-gray-300 uppercase tracking-wider mb-1">Department</span>
                                                                <span className="text-white font-semibold text-xs md:text-sm">{formData.department}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {formData.userType === 'Outsider' && (
                                                    <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                                                        <span className="text-[10px] text-gray-300 uppercase tracking-wider">Category</span>
                                                        <span className="text-white font-semibold text-xs md:text-sm">{formData.outsiderCategory || 'N/A'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Verification Notice */}
                                    <div className="relative bg-gradient-to-r from-yellow-500/20 via-yellow-400/15 to-yellow-500/20 border-2 border-yellow-400/40 rounded-lg p-2 md:p-2.5 shadow-lg overflow-hidden">
                                        {/* Animated Background */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-transparent animate-pulse"></div>
                                        
                                        <div className="relative z-10 flex items-start space-x-1.5">
                                            <div className="flex-shrink-0 w-6 h-6 md:w-7 md:h-7 bg-yellow-400/30 rounded-full flex items-center justify-center">
                                                <FaEnvelope className="text-yellow-300 text-[10px] md:text-xs" />
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="text-yellow-200 font-bold text-[10px] md:text-xs mb-0.5 flex items-center">
                                                    <FaCheckCircle className="mr-1 text-[10px]" />
                                                    Email Verification Required
                                                </h5>
                                                <p className="text-yellow-100 text-[9px] leading-tight">
                                                    You'll receive a <strong className="text-yellow-200">6-digit code</strong> via email to verify your account.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security Notice */}
                                    <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-1.5 md:p-2 flex items-start space-x-1.5">
                                        <FaCheckCircle className="text-blue-300 text-[10px] mt-0.5 flex-shrink-0" />
                                        <p className="text-blue-100 text-[9px]">
                                            Your information is secure and will only be used for account verification.
                                        </p>
                                    </div>

                                    {/* Terms and Conditions */}
                                    <div id="terms-section" className="bg-gradient-to-r from-gray-800/40 to-gray-900/40 border-2 border-gray-700/50 rounded-lg p-2 md:p-3 space-y-1.5 md:space-y-2">
                                        <div className="flex items-start space-x-3">
                                            <input
                                                type="checkbox"
                                                id="acceptedTerms"
                                                checked={formData.acceptedTerms}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleTermsChange(e.target.checked);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 w-5 h-5 text-[#FFD700] bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2 cursor-pointer flex-shrink-0 accent-[#FFD700]"
                                            />
                                            <div className="flex-1">
                                                <span className="text-white text-xs md:text-sm leading-relaxed">
                                                    I have read and agree to the{' '}
                                                    <button
                                                        type="button"
                                                        className="text-[#FFD700] hover:text-yellow-300 font-bold underline decoration-2 underline-offset-2 hover:decoration-yellow-300 transition-colors duration-200 bg-transparent border-0 p-0 cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Save current step to sessionStorage before navigating
                                                            sessionStorage.setItem('registrationStep', currentStep.toString());
                                                            sessionStorage.setItem('registrationFormData', JSON.stringify(formData));
                                                            navigate('/terms-and-conditions');
                                                        }}
                                                    >
                                                        Terms and Conditions
                                                    </button>
                                                    {' '}of the EuMatter platform. I understand that by creating an account, I agree to comply with all terms and conditions outlined in the agreement.
                                                </span>
                                            </div>
                                        </div>
                                        {errors.acceptedTerms && (
                                            <div className="ml-8 mt-2 p-2 bg-red-500/20 border border-red-400/50 rounded-lg animate-shake">
                                                <p className="text-red-200 text-xs flex items-center">
                                                    <FaCheckCircle className="mr-2" />
                                                    {errors.acceptedTerms}
                                                </p>
                                            </div>
                                        )}
                                        {!formData.acceptedTerms && (
                                            <div className="ml-8 mt-1">
                                                <p className="text-yellow-200 text-[10px] md:text-xs flex items-center">
                                                    <FaCheckCircle className="mr-1.5 text-xs" />
                                                    You must accept the Terms and Conditions to create an account
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                                </div>

                                {/* Navigation Buttons - Fixed at bottom of container */}
                                <div className="flex-shrink-0 flex flex-col space-y-2 md:space-y-2.5 pt-2 md:pt-3 mt-auto border-t border-white/30">
                                    {/* Action Buttons Row */}
                                    <div className="flex justify-between items-center gap-3 w-full">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            disabled={currentStep === 1 || isLoading}
                                            className="group flex items-center justify-center space-x-1.5 px-3 md:px-4 py-2 md:py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10 border border-white/20 hover:border-white/40 hover:shadow-lg transform hover:scale-105 disabled:hover:scale-100 text-xs md:text-sm font-semibold flex-shrink-0 min-w-[80px] md:min-w-[100px]"
                                        >
                                            <FaArrowLeft className="transition-transform duration-300 group-hover:-translate-x-1 text-xs md:text-sm" />
                                            <span>Back</span>
                                        </button>
                                        
                                        {currentStep !== 6 ? (
                                            <button
                                type="submit" 
                                                className="group flex items-center justify-center space-x-1.5 px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-[#FFD700] via-yellow-400 to-[#FFD700] text-[#800000] rounded-lg hover:shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 font-bold text-xs md:text-sm transform hover:scale-105 active:scale-95 border-2 border-yellow-300/50 flex-shrink-0 min-w-[100px] md:min-w-[130px]"
                                            >
                                                <span>Next Step</span>
                                                <FaArrowRight className="transition-transform duration-300 group-hover:translate-x-1 text-xs md:text-sm" />
                                            </button>
                                        ) : (
                                            <button
                                type="submit" 
                                                disabled={isLoading || !formData.acceptedTerms}
                                                className="group flex items-center justify-center space-x-1.5 px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-[#FFD700] via-yellow-400 to-[#FFD700] text-[#800000] rounded-lg hover:shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 font-bold text-xs md:text-sm transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none border-2 border-yellow-300/50 flex-shrink-0 min-w-[120px] md:min-w-[150px]"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <LoadingSpinner size="tiny" inline />
                                                        <span className="text-xs md:text-sm">Creating Account...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Create Account</span>
                                                        <FaCheckCircle className="transition-transform duration-300 group-hover:scale-110 text-sm" />
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Login Link - Clean bottom section */}
                                    <div className="text-center pt-2 border-t border-white/20">
                                        <span className="text-gray-200 text-[10px] md:text-xs">Already have an account? </span>
                                        <Link 
                                            to="/login" 
                                            className="text-[#FFD700] hover:text-yellow-300 font-semibold transition-colors duration-200 underline decoration-2 underline-offset-2 hover:decoration-yellow-300 text-[10px] md:text-xs"
                                        >
                                            Log in
                                        </Link>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
            </div>
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-in-out;
                }
                
                @keyframes bounce-in {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.4s ease-out;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
                
                /* Smooth transitions for form */
                form {
                    transition: all 0.3s ease;
                }
                
                /* Registration form container - no overflow, uses flex layout */
                .registration-form-container {
                    overflow: hidden !important;
                    display: flex;
                    flex-direction: column;
                }
                
                /* Form content - scrollable for Step 5 and Step 6 */
                .registration-form-content {
                    overflow-y: visible !important;
                    flex-shrink: 0;
                }
                
                .registration-form-content.overflow-y-auto {
                    overflow-y: auto !important;
                    flex: 1 1 auto;
                    min-height: 0;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 215, 0, 0.5) transparent;
                }
                
                .registration-form-content.overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }
                
                .registration-form-content.overflow-y-auto::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .registration-form-content.overflow-y-auto::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 215, 0, 0.5);
                    border-radius: 3px;
                }
                
                .registration-form-content.overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255, 215, 0, 0.7);
                }
            `}</style>
        </div>
    );
};

export default RegisterPage;
