import React, { useMemo, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContent } from '../context/AppContext.jsx';
import { stripHtml } from '../utils/stripHtml';
import axios from 'axios';
import { FaArrowLeft } from 'react-icons/fa';

const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const PublicCampaigns = () => {
    const navigate = useNavigate();
    const { backendUrl } = useContext(AppContent);
    const [query, setQuery] = useState('');
    const [activeCampaign, setActiveCampaign] = useState(null);
    const [campaigns, setCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchActiveEvents();
    }, []);

    const fetchActiveEvents = async () => {
        try {
            setIsLoading(true);
            axios.defaults.withCredentials = true;
            const response = await axios.get(backendUrl + 'api/events');
            
            if (response.data && Array.isArray(response.data)) {
                // Filter for active events (Approved, Upcoming, Ongoing) and not completed/declined
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

                // Transform events to campaign format
                const transformedCampaigns = activeEvents.map(event => {
                    const endDate = event.endDate ? new Date(event.endDate) : null;
                    const now = new Date();
                    const daysRemaining = endDate 
                        ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
                        : 0;

                    // Extract description (remove HTML tags if present)
                    const description = event.description 
                        ? event.description.replace(/<[^>]*>/g, '').substring(0, 150) + '...'
                        : '';

                    // Calculate volunteer count
                    const volunteerCount = event.volunteers?.length || 0;
                    const maxVolunteers = event.volunteerSettings?.maxVolunteers || null;

                    return {
                        id: event._id,
                        title: event.title,
                        image: event.image || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                        summary: description || event.title,
                        raised: event.totalDonations || 0,
                        daysRemaining: daysRemaining,
                        status: event.status,
                        description: event.description || '',
                        location: event.location || '',
                        startDate: event.startDate || '',
                        endDate: event.endDate || '',
                        isOpenForDonation: event.isOpenForDonation || false,
                        isOpenForVolunteer: event.isOpenForVolunteer || false,
                        volunteerCount: volunteerCount,
                        maxVolunteers: maxVolunteers,
                        createdBy: event.createdBy || null,
                        createdAt: event.createdAt || new Date(),
                    };
                });

                // Sort by status priority, then by creation date (newest first)
                const sortedCampaigns = transformedCampaigns.sort((a, b) => {
                    // Sort by status priority: Ongoing > Upcoming > Approved
                    const statusOrder = { 'Ongoing': 1, 'Upcoming': 2, 'Approved': 3 };
                    const aOrder = statusOrder[a.status] || 999;
                    const bOrder = statusOrder[b.status] || 999;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    // Then by creation date (newest first)
                    const aDate = new Date(a.createdAt);
                    const bDate = new Date(b.createdAt);
                    return bDate - aDate;
                });

                setCampaigns(sortedCampaigns);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            setCampaigns([]);
        } finally {
            setIsLoading(false);
        }
    };

    const filtered = useMemo(
        () => campaigns.filter(c => 
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            (c.summary && c.summary.toLowerCase().includes(query.toLowerCase()))
        ),
        [campaigns, query]
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />

            <section className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-10 sm:py-12 w-full">
                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2 text-[#800000] hover:text-[#9c0000] font-semibold transition-colors duration-200 group"
                    >
                        <FaArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                        <span>Back to Home</span>
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-[#800000]">Active Campaigns</h1>
                        <p className="text-gray-600 mt-1">Public view of ongoing campaigns.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search campaigns..."
                            className="w-full sm:w-80 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#800000]"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-12">
                        <LoadingSpinner size="medium" text="Loading campaigns..." />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center text-gray-600 py-16">
                        <p className="text-lg font-medium">No active campaigns found.</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {query ? 'Try adjusting your search terms.' : 'Check back soon for new opportunities!'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((c, index) => {
                            const imageUrl = c.image 
                                ? (c.image.startsWith('data:image') || c.image.startsWith('http://') || c.image.startsWith('https://')
                                    ? c.image 
                                    : `data:image/jpeg;base64,${c.image}`)
                                : "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80";
                            
                            return (
                                <motion.div
                                    key={c.id}
                                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl border border-gray-200 transform transition-all duration-300 hover:-translate-y-1"
                                    variants={cardVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.4 }}
                                    transition={{ delay: index * 0.06 }}
                                >
                                    <div
                                        className="h-44 bg-gray-200 bg-cover bg-center relative"
                                        style={{ backgroundImage: `url('${imageUrl}')` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                        {c.daysRemaining > 0 && (
                                            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-md">
                                                <span className="text-xs font-bold text-[#800000]">
                                                    {c.daysRemaining} {c.daysRemaining === 1 ? 'day' : 'days'} left
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold text-black line-clamp-2 mb-2">{c.title}</h3>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{c.summary}</p>
                                        
                                        {/* Donation Tag - Show only when donations are enabled */}
                                        {c.isOpenForDonation && (
                                            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#d4af37]/10 to-[#f4d03f]/10 border border-[#d4af37]/30 rounded-full mb-3">
                                                <span className="text-xs font-semibold text-[#800000]">
                                                    This event is open for donations.
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Volunteer Progress Bar - Show only when volunteering is enabled */}
                                        {c.isOpenForVolunteer && (
                                            <div className="space-y-2 mb-3">
                                                {c.maxVolunteers ? (
                                                    <>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="font-semibold text-[#800000]">
                                                                {c.volunteerCount} volunteer{c.volunteerCount !== 1 ? 's' : ''}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                of {c.maxVolunteers} needed
                                                            </span>
                                                        </div>
                                                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-[#800000] to-[#9c0000] rounded-full transition-all duration-500 shadow-inner"
                                                                style={{ width: `${Math.min(100, (c.volunteerCount / c.maxVolunteers) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {Math.min(100, (c.volunteerCount / c.maxVolunteers) * 100).toFixed(0)}% volunteers
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-semibold text-[#800000]">{c.volunteerCount}</span> volunteer{c.volunteerCount !== 1 ? 's' : ''} joined
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Action Button - Always show "View Details" */}
                                        <Button
                                            variant="maroon"
                                            className="w-full mt-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000] focus-visible:ring-offset-2"
                                            onClick={() => setActiveCampaign(c)}
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </section>

            <AnimatePresence>
                {activeCampaign && (
                    <>
                        {/* Backdrop with blur effect */}
                        <motion.div
                            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setActiveCampaign(null)}
                        />
                        
                        {/* Modal Container - Fixed below header, responsive and scrollable */}
                        <motion.div
                            className="fixed inset-0 z-[151] flex items-start justify-center pt-20 sm:pt-24 md:pt-28 pb-4 sm:pb-6 px-4 sm:px-6 pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setActiveCampaign(null)}
                        >
                            <motion.div
                                className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-6rem)] sm:max-h-[calc(100vh-7rem)] md:max-h-[calc(100vh-8rem)] pointer-events-auto"
                                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                            {/* Close Button - Top Right */}
                            <button
                                onClick={() => setActiveCampaign(null)}
                                className="absolute top-4 right-4 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all duration-200 group"
                                aria-label="Close modal"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 group-hover:text-[#800000] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            {/* Image Header */}
                            <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 bg-gray-200 overflow-hidden">
                                <div
                                    className="absolute inset-0 bg-cover bg-center transform transition-transform duration-700"
                                    style={{ 
                                        backgroundImage: `url('${activeCampaign.image 
                                            ? (activeCampaign.image.startsWith('data:image') || activeCampaign.image.startsWith('http')
                                                ? activeCampaign.image 
                                                : `data:image/jpeg;base64,${activeCampaign.image}`)
                                            : "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"}')` 
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                                
                                {/* Days Remaining Badge */}
                                {activeCampaign.daysRemaining > 0 && (
                                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                                        <span className="text-sm font-bold text-[#800000]">
                                            {activeCampaign.daysRemaining} {activeCampaign.daysRemaining === 1 ? 'day' : 'days'} remaining
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto overscroll-contain">
                                <div className="p-6 sm:p-8 md:p-10 space-y-6">
                                    {/* Title */}
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
                                            {activeCampaign.title}
                                        </h2>
                                        
                                        {/* Metadata Icons */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm sm:text-base">
                                            {activeCampaign.location && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <svg className="w-5 h-5 text-[#800000] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="font-medium">{activeCampaign.location}</span>
                                                </div>
                                            )}
                                            {activeCampaign.startDate && (
                                                <div className="flex items-center gap-2 text-gray-700">
                                                    <svg className="w-5 h-5 text-[#800000] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <span className="font-medium">
                                                        {new Date(activeCampaign.startDate).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        })}
                                                        {activeCampaign.endDate && ` - ${new Date(activeCampaign.endDate).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        })}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tags Section */}
                                    <div className="flex flex-wrap gap-3">
                                        {/* Donation Tag */}
                                        {activeCampaign.isOpenForDonation && (
                                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#d4af37]/15 to-[#f4d03f]/15 border-2 border-[#d4af37]/40 rounded-full shadow-sm">
                                                <svg className="w-5 h-5 text-[#d4af37] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span className="text-sm font-semibold text-[#800000]">
                                                    Open for Donations
                                                </span>
                                            </div>
                                        )}
                                        
                                        {/* Volunteer Tag */}
                                        {activeCampaign.isOpenForVolunteer && (
                                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#800000]/10 to-[#9c0000]/10 border-2 border-[#800000]/30 rounded-full shadow-sm">
                                                <svg className="w-5 h-5 text-[#800000] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span className="text-sm font-semibold text-[#800000]">
                                                    Open for Volunteers
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div className="prose prose-sm sm:prose-base max-w-none">
                                        <div className="border-l-4 border-[#800000] pl-4 sm:pl-6">
                                            {activeCampaign.description ? (
                                                <p 
                                                    className="text-gray-700 leading-relaxed"
                                                    style={{
                                                        wordWrap: 'break-word',
                                                        overflowWrap: 'break-word'
                                                    }}
                                                >
                                                    {stripHtml(activeCampaign.description)}
                                                </p>
                                            ) : (
                                                <p className="text-gray-700 leading-relaxed">{activeCampaign.summary}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Volunteer Progress Bar */}
                                    {activeCampaign.isOpenForVolunteer && (
                                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-6 h-6 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    <h3 className="text-lg font-bold text-gray-900">Volunteer Participation</h3>
                                                </div>
                                                {activeCampaign.maxVolunteers ? (
                                                    <>
                                                        <div className="flex justify-between items-center text-base">
                                                            <span className="font-bold text-[#800000]">
                                                                {activeCampaign.volunteerCount || 0} volunteer{(activeCampaign.volunteerCount || 0) !== 1 ? 's' : ''}
                                                            </span>
                                                            <span className="text-gray-600">
                                                                of {activeCampaign.maxVolunteers} needed
                                                            </span>
                                                        </div>
                                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                                            <motion.div 
                                                                className="h-full bg-gradient-to-r from-[#800000] to-[#9c0000] rounded-full"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min(100, ((activeCampaign.volunteerCount || 0) / activeCampaign.maxVolunteers) * 100)}%` }}
                                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                            />
                                                        </div>
                                                        <div className="text-sm text-gray-600 font-medium">
                                                            {Math.min(100, ((activeCampaign.volunteerCount || 0) / activeCampaign.maxVolunteers) * 100).toFixed(0)}% complete
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-base text-gray-700">
                                                        <span className="font-bold text-[#800000]">{activeCampaign.volunteerCount || 0}</span> volunteer{(activeCampaign.volunteerCount || 0) !== 1 ? 's' : ''} have joined this event
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer with Close Button */}
                            <div className="border-t border-gray-200 bg-gray-50 px-6 sm:px-8 md:px-10 py-4 sm:py-5 flex justify-end">
                                <Button 
                                    variant="maroon" 
                                    onClick={() => setActiveCampaign(null)}
                                    className="px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Close
                                </Button>
                            </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default PublicCampaigns;


