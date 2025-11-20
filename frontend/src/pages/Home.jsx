import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import communityIcon from '../assets/CommunityDriven.png';
import transparentIcon from '../assets/TransparentImpact.png';
import quickIcon from '../assets/QuickActions.png';
import { motion } from 'framer-motion';
import heroImage from '../assets/hero-image.jpg';
import { AppContent } from '../context/AppContext.jsx';
import axios from 'axios';
import { FaExclamationTriangle, FaTools } from 'react-icons/fa';

// Define card variants for staggered animation
const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const testimonials = [
    {
        quote: "EuMatter has transformed how our community comes together for good. The transparency and impact tracking make all the difference.",
        author: "Sarah Johnson",
        title: "Community Organizer",
    },
    {
        quote: "I've never seen a platform that makes it so easy to create meaningful change. The results speak for themselves.",
        author: "Michael Chen",
        title: "Local Business Owner",
    },
    {
        quote: "The speed at which campaigns get funded and implemented here is incredible. Real change, real fast.",
        author: "Emily Rodriguez",
        title: "Volunteer Coordinator",
    },
];

const features = [
    {
        title: "Community Driven",
        description: "Every campaign is created and supported by real community members who understand local needs.",
        icon: communityIcon,
        color: "from-blue-500 to-blue-600",
        bgColor: "bg-blue-50",
    },
    {
        title: "Transparent Impact",
        description: "Track real-time progress and see exactly how your contributions make a difference.",
        icon: transparentIcon,
        color: "from-green-500 to-green-600",
        bgColor: "bg-green-50",
    },
    {
        title: "Quick Action",
        description: "From idea to impact in days, not months. Our streamlined process gets results fast.",
        icon: quickIcon,
        color: "from-amber-500 to-amber-600",
        bgColor: "bg-amber-50",
    }
];

const Home = () => {
    const navigate = useNavigate();
    const { backendUrl, isLoggedIn } = useContext(AppContent);
    const [campaigns, setCampaigns] = useState([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [maintenanceInfo, setMaintenanceInfo] = useState(null);

    const checkMaintenanceMode = useCallback(async () => {
        try {
            const { data } = await axios.get(backendUrl + 'api/system-settings/maintenance-mode');
            if (data.success) {
                setMaintenanceMode(data.maintenanceMode);
                if (data.maintenanceMode) {
                    setMaintenanceInfo({
                        message: data.message,
                        estimatedEndTime: data.estimatedEndTime
                    });
                }
            }
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
            setMaintenanceMode(false);
        }
    }, [backendUrl]);

    useEffect(() => {
        fetchLatestEvents();
        checkMaintenanceMode();
        // Check maintenance mode every 30 seconds
        const interval = setInterval(checkMaintenanceMode, 30000);
        return () => clearInterval(interval);
    }, [backendUrl, checkMaintenanceMode]);

    const fetchLatestEvents = async () => {
        try {
            setIsLoadingCampaigns(true);
            axios.defaults.withCredentials = true;
            const response = await axios.get(backendUrl + 'api/events');
            
            if (response.data && Array.isArray(response.data)) {
                // Filter for active events (Approved, Upcoming, Ongoing) and not completed
                const activeEvents = response.data.filter(event => {
                    const status = event.status;
                    const isActive = ['Approved', 'Upcoming', 'Ongoing'].includes(status);
                    const notCompleted = status !== 'Completed' && status !== 'Declined';
                    
                    // Also check if event hasn't ended (endDate is in the future)
                    const now = new Date();
                    const endDate = event.endDate ? new Date(event.endDate) : null;
                    const isNotEnded = !endDate || endDate > now;
                    
                    return isActive && notCompleted && isNotEnded;
                });

                // Sort by createdAt (newest first) and take only 3 latest
                const sortedEvents = activeEvents
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 3);

                // Transform events to campaign format
                const transformedCampaigns = sortedEvents.map(event => {
                    const endDate = event.endDate ? new Date(event.endDate) : null;
                    const now = new Date();
                    const daysRemaining = endDate 
                        ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
                        : 0;

                    // Calculate volunteer count
                    const volunteerCount = event.volunteers?.length || 0;
                    const maxVolunteers = event.volunteerSettings?.maxVolunteers || null;
                    
                    return {
                        id: event._id,
                        title: event.title,
                        image: event.image || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                        description: event.description || '',
                        raised: event.totalDonations || 0,
                        goal: event.donationTarget || null, // Use donationTarget from event
                        daysRemaining: daysRemaining,
                        status: event.status,
                        isOpenForDonation: event.isOpenForDonation || false,
                        isOpenForVolunteer: event.isOpenForVolunteer || false,
                        volunteerCount: volunteerCount,
                        maxVolunteers: maxVolunteers,
                    };
                });

                setCampaigns(transformedCampaigns);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            setCampaigns([]); // Set empty array on error
        } finally {
            setIsLoadingCampaigns(false);
        }
    };
    return (
        <div className="min-h-screen w-full overflow-x-hidden bg-white">
            <Header />

            {/* Hero Section - Improved with better balance */}
            <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-16 sm:py-20 md:py-24 -mt-14 sm:-mt-16 md:-mt-20 lg:-mt-20">
                {/* Background Image with better positioning - extends behind header */}
                <div 
                    className="absolute -top-14 sm:-top-16 md:-top-20 lg:-top-20 left-0 right-0 bottom-0 bg-cover bg-no-repeat"
                    style={{ 
                        backgroundImage: `url(${heroImage})`,
                        backgroundPosition: 'center 35%',
                        backgroundSize: 'cover'
                    }}
                ></div>
                <div className="absolute -top-14 sm:-top-16 md:-top-20 lg:-top-20 left-0 right-0 bottom-0 bg-gradient-to-br from-[#800000]/75 via-[#800000]/70 to-[#800000]/80"></div>
                <div className="relative z-10 w-full max-w-7xl mx-auto">
                    <motion.div
                        className="space-y-6 sm:space-y-8 md:space-y-10 text-white"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* Main Heading - Centered for all devices */}
                        <h1 className="text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight tracking-tight max-w-5xl mx-auto">
                            Empower Together with <span className="text-[#FFD700]">EuMatter</span>
                    </h1>
                        
                        {/* Subtitle - Centered for all devices */}
                        <p className="text-center text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed font-medium text-white/95 px-4">
                        Connecting our community with impactful donations and volunteer opportunities at Enverga University.
                    </p>
                        
                        {/* CTA Buttons - Centered for all devices */}
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center pt-4 sm:pt-6">
                            <Button 
                                variant="gold" 
                                onClick={() => navigate('/login')}
                                className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
                            >
                                Join Us
                            </Button>
                            <button 
                                className="w-full sm:w-auto px-8 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-lg bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white hover:text-[#800000] active:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                onClick={() => navigate('/campaigns')}
                            >
                                Explore Campaigns
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Why EuMatter? Section - Improved with better card design */}
            <section id="why-eumatter" className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <motion.div
                        className="text-center mb-12 sm:mb-16 md:mb-20"
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 tracking-tight text-[#800000]">
                        Why EuMatter?
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                        Here's why you should be part of our community.
                        </p>
                    </motion.div>

                    {/* Feature Cards - Improved design */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                className="group relative bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-100 overflow-hidden"
                                variants={cardVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ delay: index * 0.15 }}
                            >
                                {/* Gradient Background on Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                                
                                {/* Icon Container */}
                                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto mb-6 rounded-2xl ${feature.bgColor} flex items-center justify-center shadow-md group-hover:shadow-lg transform group-hover:scale-110 transition-all duration-300`}>
                                    <img 
                                        src={feature.icon} 
                                        alt={`${feature.title} Icon`}
                                        className="w-full h-full object-contain p-3 sm:p-4"
                                    />
                                </div>
                                
                                {/* Content */}
                                <div className="relative text-center space-y-4">
                                    <h3 className="text-xl sm:text-2xl md:text-2xl font-bold text-gray-900 group-hover:text-[#800000] transition-colors duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Campaigns Section - Improved with better card design */}
            <section id="campaigns" className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    {/* Section Header */}
                    <motion.div
                        className="text-center mb-12 sm:mb-16 md:mb-20"
                        initial={{ opacity: 0, y: -20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 tracking-tight text-[#800000]">
                        Featured Campaigns
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                        Support causes that matter to our community.
                        </p>
                    </motion.div>

                    {/* Campaign Cards - Improved design */}
                    {isLoadingCampaigns ? (
                        <div className="py-12">
                            <LoadingSpinner size="medium" text="Loading featured campaigns..." />
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600 text-lg">No active campaigns at the moment.</p>
                            <p className="text-gray-500 text-sm mt-2">Check back soon for new opportunities!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {campaigns.map((campaign, index) => {
                                // Determine image URL - handle base64, data URLs, and regular URLs
                                let imageUrl = "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
                                
                                if (campaign.image) {
                                    // If it's already a data URL, use it as-is
                                    if (campaign.image.startsWith('data:image')) {
                                        imageUrl = campaign.image;
                                    }
                                    // If it's a URL (http:// or https://), use it as-is
                                    else if (campaign.image.startsWith('http://') || campaign.image.startsWith('https://')) {
                                        imageUrl = campaign.image;
                                    }
                                    // Otherwise, assume it's base64 data and prepend data URL prefix
                                    else {
                                        imageUrl = `data:image/jpeg;base64,${campaign.image}`;
                                    }
                                }
                                
                                return (
                            <motion.div
                                key={campaign.id}
                                        className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transform transition-all duration-300 hover:-translate-y-2 border border-gray-200"
                                variants={cardVariants}
                                initial="hidden"
                                whileInView="visible"
                                        viewport={{ once: true, amount: 0.3 }}
                                        transition={{ delay: index * 0.15 }}
                                    >
                                        {/* Campaign Image */}
                                        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden bg-gray-200">
                                            <div 
                                                className="absolute inset-0 bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
                                                style={{ backgroundImage: `url("${imageUrl}")` }}
                                            ></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                            {/* Days Remaining Badge */}
                                            {campaign.daysRemaining > 0 && (
                                                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                                                    <span className="text-xs sm:text-sm font-bold text-[#800000]">
                                                        {campaign.daysRemaining} {campaign.daysRemaining === 1 ? 'day' : 'days'} left
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Campaign Content */}
                                        <div className="p-5 sm:p-6 space-y-4">
                                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 line-clamp-2 min-h-[3.5rem]">
                                                {campaign.title}
                                            </h3>
                                            
                                            {/* Donation Tag - Show only when donations are enabled */}
                                            {campaign.isOpenForDonation && (
                                                <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#d4af37]/10 to-[#f4d03f]/10 border border-[#d4af37]/30 rounded-full">
                                                    <span className="text-xs sm:text-sm font-semibold text-[#800000]">
                                                        This event is open for donations.
                                                    </span>
                                                </div>
                                            )}
                                            
                                            {/* Volunteer Progress Bar - Show only when volunteering is enabled */}
                                            {campaign.isOpenForVolunteer && (
                                                <div className="space-y-2">
                                                    {campaign.maxVolunteers ? (
                                                        <>
                                                            <div className="flex justify-between items-center text-sm">
                                                                <span className="font-semibold text-[#800000]">
                                                                    {campaign.volunteerCount} volunteer{campaign.volunteerCount !== 1 ? 's' : ''}
                                                                </span>
                                                                <span className="text-gray-500">
                                                                    of {campaign.maxVolunteers} needed
                                                                </span>
                                                            </div>
                                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-[#800000] to-[#9c0000] rounded-full transition-all duration-500 shadow-inner"
                                                                    style={{ width: `${Math.min(100, (campaign.volunteerCount / campaign.maxVolunteers) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {Math.min(100, (campaign.volunteerCount / campaign.maxVolunteers) * 100).toFixed(0)}% volunteers
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="text-sm text-gray-600">
                                                            <span className="font-semibold text-[#800000]">{campaign.volunteerCount}</span> volunteer{campaign.volunteerCount !== 1 ? 's' : ''} joined
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Action Button */}
                                            {/* Show "Donate Now" only when donations ONLY (no volunteer) */}
                                            {/* Show "Volunteer Now" when volunteer is enabled (even if donations also enabled) */}
                                            {campaign.isOpenForDonation && !campaign.isOpenForVolunteer ? (
                                                <button
                                                    onClick={() => {
                                                        if (!isLoggedIn) {
                                                            navigate('/login');
                                                        } else {
                                                            navigate('/campaigns');
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white font-semibold rounded-lg hover:from-[#9c0000] hover:to-[#800000] transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
                                                >
                                                    Donate Now
                                                </button>
                                            ) : campaign.isOpenForVolunteer ? (
                                                <button
                                                    onClick={() => {
                                                        if (!isLoggedIn) {
                                                            navigate('/login');
                                                        } else {
                                                            navigate(`/events/${campaign.id}`);
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white font-semibold rounded-lg hover:from-[#9c0000] hover:to-[#800000] transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
                                                >
                                                    Volunteer Now
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        if (!isLoggedIn) {
                                                            navigate('/login');
                                                        } else {
                                                            navigate('/campaigns');
                                                        }
                                                    }}
                                                    className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9c0000] text-white font-semibold rounded-lg hover:from-[#9c0000] hover:to-[#800000] transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg"
                                                >
                                                    View Details
                                                </button>
                                            )}
                                </div>
                            </motion.div>
                                );
                            })}
                    </div>
                    )}
                    
                    {/* View All Button */}
                    <motion.div
                        className="text-center mt-12 sm:mt-16"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        viewport={{ once: true }}
                    >
                        <button
                            onClick={() => navigate('/campaigns')}
                            className="inline-flex items-center px-8 sm:px-10 py-3 sm:py-4 bg-white border-2 border-[#800000] text-[#800000] font-bold rounded-lg hover:bg-[#800000] hover:text-white transform hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-xl text-base sm:text-lg"
                        >
                            View All Campaigns
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* What People Say? Section - Improved with better card design */}
            <section id="testimonials" className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 bg-gradient-to-br from-[#800000] via-[#900000] to-[#800000] relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto">
                    {/* Section Header */}
                    <motion.div
                        className="text-center mb-12 sm:mb-16 md:mb-20"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                    >
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 tracking-tight text-white">
                            What People Say?
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
                            Hear from our community members about their EuMatter experience.
                        </p>
                    </motion.div>

                    {/* Testimonial Cards - Improved design */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        {testimonials.map((testimonial, index) => (
                            <motion.div
                                key={index}
                                variants={cardVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, amount: 0.3 }}
                                transition={{ delay: index * 0.15 }}
                                className="relative bg-white rounded-2xl p-6 sm:p-8 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-3xl border border-gray-100"
                            >
                                {/* Quote Icon */}
                                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.984zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.432.917-3.995 3.638-3.995 5.849h3.983v10h-9.984z"/>
                                    </svg>
                                </div>
                                
                                {/* Testimonial Content */}
                                <div className="pt-4 space-y-5">
                                    <p className="text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed italic">
                                        "{testimonial.quote}"
                                    </p>
                                    <div className="border-t border-gray-200 pt-4">
                                        <p className="font-bold text-base sm:text-lg text-gray-900">
                                            {testimonial.author}
                                        </p>
                                        <p className="text-sm sm:text-base text-gray-600 mt-1">
                                            {testimonial.title}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />

            {/* Maintenance Mode Warning Indicator - Bottom Left */}
            {maintenanceMode && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="fixed bottom-6 left-6 z-[100]"
                >
                    <div className="group relative bg-gradient-to-bl from-[#800000] via-[#800000] to-[#EE1212] text-white px-4 py-3 md:px-5 md:py-3.5 rounded-2xl shadow-[0_8px_24px_rgba(128,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_12px_32px_rgba(128,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.15)] transition-all duration-300 flex items-center gap-2.5 md:gap-3 font-semibold border border-white/20 hover:border-white/30 backdrop-blur-sm overflow-hidden max-w-xs"
                    >
                        {/* Animated background shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        {/* Warning Icon */}
                        <div className="relative z-10 flex items-center justify-center flex-shrink-0">
                            <FaExclamationTriangle className="w-5 h-5 md:w-6 md:h-6 text-[#FFD700] animate-pulse" />
                        </div>
                        
                        {/* Text */}
                        <div className="relative z-10 flex-1 min-w-0">
                            <p className="text-xs md:text-sm font-bold tracking-wide leading-tight">
                                System Under Maintenance
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Home;