import React, { useMemo, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { AppContent } from '../context/AppContext.jsx';
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
        <div className="min-h-screen bg-gray-50 font-poppins">
            <Header />

            <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-10 sm:py-12">
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
                                        
                                        {/* Action Button */}
                                        {/* Show "Donate Now" only when donations ONLY (no volunteer) */}
                                        {/* Show "Volunteer Now" when volunteer is enabled (even if donations also enabled) */}
                                        {/* Otherwise show "View Details" */}
                                        {c.isOpenForDonation && !c.isOpenForVolunteer ? (
                                            <Button
                                                variant="maroon"
                                                className="w-full mt-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000] focus-visible:ring-offset-2"
                                                onClick={() => setActiveCampaign(c)}
                                            >
                                                Donate Now
                                            </Button>
                                        ) : c.isOpenForVolunteer ? (
                                            <Button
                                                variant="maroon"
                                                className="w-full mt-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000] focus-visible:ring-offset-2"
                                                onClick={() => setActiveCampaign(c)}
                                            >
                                                Volunteer Now
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="maroon"
                                                className="w-full mt-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000] focus-visible:ring-offset-2"
                                                onClick={() => setActiveCampaign(c)}
                                            >
                                                View Details
                                            </Button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </section>

            <AnimatePresence>
                {activeCampaign && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div
                            className="absolute inset-0 bg-black/50"
                            onClick={() => setActiveCampaign(null)}
                        />
                        <motion.div
                            className="relative z-10 w-[95%] max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden"
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                        >
                            <div
                                className="h-56 bg-gray-200 bg-cover bg-center relative"
                                style={{ 
                                    backgroundImage: `url('${activeCampaign.image 
                                        ? (activeCampaign.image.startsWith('data:image') 
                                            ? activeCampaign.image 
                                            : `data:image/jpeg;base64,${activeCampaign.image}`)
                                        : "https://images.unsplash.com/photo-1559027615-cd4628902d4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80"}')` 
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                            </div>
                            <div className="p-6 max-h-[calc(100vh-400px)] overflow-y-auto">
                                <h2 className="text-2xl font-bold text-black mb-3">{activeCampaign.title}</h2>
                                {activeCampaign.location && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        📍 {activeCampaign.location}
                                    </p>
                                )}
                                {activeCampaign.startDate && (
                                    <p className="text-sm text-gray-600 mb-2">
                                        📅 {new Date(activeCampaign.startDate).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                        {activeCampaign.endDate && ` - ${new Date(activeCampaign.endDate).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}`}
                                    </p>
                                )}
                                <div className="mt-3 mb-4">
                                    {activeCampaign.description ? (
                                        <div 
                                            className="text-gray-700 prose prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: activeCampaign.description }}
                                        />
                                    ) : (
                                        <p className="text-gray-700">{activeCampaign.summary}</p>
                                    )}
                                </div>
                                
                                {/* Donation Tag - Show only when donations are enabled */}
                                {activeCampaign.isOpenForDonation && (
                                    <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-[#d4af37]/10 to-[#f4d03f]/10 border border-[#d4af37]/30 rounded-full mb-4">
                                        <span className="text-sm font-semibold text-[#800000]">
                                            This event is open for donations.
                                        </span>
                                    </div>
                                )}
                                
                                {/* Volunteer Progress Bar - Show only when volunteering is enabled */}
                                {activeCampaign.isOpenForVolunteer && (
                                    <div className="space-y-2 mb-4">
                                        {activeCampaign.maxVolunteers ? (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-semibold text-[#800000]">
                                                        {activeCampaign.volunteerCount || 0} volunteer{(activeCampaign.volunteerCount || 0) !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        of {activeCampaign.maxVolunteers} needed
                                                    </span>
                                                </div>
                                                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-[#800000] to-[#9c0000] rounded-full transition-all duration-500 shadow-inner"
                                                        style={{ width: `${Math.min(100, ((activeCampaign.volunteerCount || 0) / activeCampaign.maxVolunteers) * 100)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {Math.min(100, ((activeCampaign.volunteerCount || 0) / activeCampaign.maxVolunteers) * 100).toFixed(0)}% volunteers
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-600">
                                                <span className="font-semibold text-[#800000]">{activeCampaign.volunteerCount || 0}</span> volunteer{(activeCampaign.volunteerCount || 0) !== 1 ? 's' : ''} joined
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="mt-6 flex justify-end gap-3">
                                    <Button variant="maroonOutline" onClick={() => setActiveCampaign(null)}>Close</Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
};

export default PublicCampaigns;


