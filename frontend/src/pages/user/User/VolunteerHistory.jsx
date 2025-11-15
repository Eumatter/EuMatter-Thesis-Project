import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Button from '../../../components/Button';
import api from '../../../utils/api';
import { notifyError, notifySuccess } from '../../../utils/notify';
import { FaStar } from 'react-icons/fa';

const VolunteerHistory = () => {
    const navigate = useNavigate();
    const [attendanceSummary, setAttendanceSummary] = useState({ totalHours: 0, totalEvents: 0, events: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [pendingFeedback, setPendingFeedback] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackForms, setFeedbackForms] = useState({});

    useEffect(() => {
        const fetchAttendanceSummary = async () => {
            try {
                const { data } = await api.get('/api/attendance/me/summary');
                if (data?.success) {
                    setAttendanceSummary({
                        totalHours: data.totalHours || 0,
                        totalEvents: data.totalEvents || 0,
                        events: Array.isArray(data.events) ? data.events : []
                    });
                }
            } catch (error) {
                console.error('Error fetching attendance summary:', error);
                const message = error.response?.data?.message || 'Failed to load volunteer history.';
                notifyError('Volunteer history unavailable', message);
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendanceSummary();
        fetchPendingFeedback();
        
        // Check if redirected from QR scanner for feedback
        const urlParams = new URLSearchParams(window.location.search);
        const fromQR = urlParams.get('fromQR');
        if (fromQR === 'true') {
            // Scroll to feedback section after a short delay
            setTimeout(() => {
                const feedbackSection = document.getElementById('pending-feedback-section');
                if (feedbackSection) {
                    feedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
            // Clean up URL
            window.history.replaceState({}, '', '/user/volunteer-history');
        }
    }, [navigate]);

    const fetchPendingFeedback = async () => {
        try {
            setFeedbackLoading(true);
            const { data } = await api.get('/api/feedback/me/pending');
            if (data?.success) {
                setPendingFeedback(data.records || []);
            }
        } catch (error) {
            console.error('Error fetching pending feedback:', error);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const handleFeedbackChange = (attendanceId, field, value) => {
        setFeedbackForms(prev => ({
            ...prev,
            [attendanceId]: {
                ...prev[attendanceId],
                [field]: value
            }
        }));
    };

    const handleSubmitFeedback = async (attendanceId) => {
        const form = feedbackForms[attendanceId] || {};
        if (!form.rating || form.rating < 1 || form.rating > 5) {
            notifyError('Rating Required', 'Please select a rating from 1 to 5 stars');
            return;
        }

        setFeedbackForms(prev => ({
            ...prev,
            [attendanceId]: { ...prev[attendanceId], submitting: true }
        }));

        try {
            const { data } = await api.post(`/api/feedback/${attendanceId}`, {
                rating: Number(form.rating),
                comment: form.comment || ''
            });

            if (data?.success) {
                notifySuccess('Feedback Submitted', 'Thank you for your feedback!');
                setPendingFeedback(prev => prev.filter(entry => String(entry._id) !== String(attendanceId)));
                setFeedbackForms(prev => {
                    const updated = { ...prev };
                    delete updated[attendanceId];
                    return updated;
                });
                // Refresh attendance summary to update status
                const { data: summaryData } = await api.get('/api/attendance/me/summary');
                if (summaryData?.success) {
                    setAttendanceSummary({
                        totalHours: summaryData.totalHours || 0,
                        totalEvents: summaryData.totalEvents || 0,
                        events: Array.isArray(summaryData.events) ? summaryData.events : []
                    });
                }
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to submit feedback';
            
            // Show more specific error messages
            if (error.response?.status === 400) {
                if (errorMessage.includes('not completed')) {
                    notifyError('Attendance Not Completed', 'Please complete your attendance (Time Out) before submitting feedback');
                } else if (errorMessage.includes('deadline')) {
                    notifyError('Deadline Passed', 'The feedback deadline has passed. Please contact the event organizer.');
                } else if (errorMessage.includes('already submitted')) {
                    notifyError('Already Submitted', 'Feedback has already been submitted for this attendance');
                } else if (errorMessage.includes('Rating must be')) {
                    notifyError('Invalid Rating', 'Please select a valid rating from 1 to 5 stars');
                } else {
                    notifyError('Submission Failed', errorMessage);
                }
            } else if (error.response?.status === 403) {
                notifyError('Permission Denied', 'You do not have permission to submit feedback for this attendance');
            } else if (error.response?.status === 404) {
                notifyError('Not Found', 'Attendance record not found. Please refresh the page.');
            } else {
                notifyError('Submission Failed', errorMessage);
            }
        } finally {
            setFeedbackForms(prev => ({
                ...prev,
                [attendanceId]: { ...prev[attendanceId], submitting: false }
            }));
        }
    };

    const eventsJoined = attendanceSummary.totalEvents || 0;
    const totalHours = attendanceSummary.totalHours || 0;
    const hoursDisplay = Number(totalHours).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });

    return (
        <div className="min-h-screen bg-[#f7f5f2]">
            <Header />

            <main className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                {/* Pending Volunteer Feedback Section */}
                {(feedbackLoading || pendingFeedback.length > 0) && (
                    <section id="pending-feedback-section" className="mb-8 sm:mb-10">
                        <div className="bg-white border border-[#f1e6d8] rounded-2xl shadow-sm p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-[#800000]">Pending Volunteer Feedback</h2>
                                    <p className="text-sm text-gray-600">Submit your feedback within the deadline to keep your volunteer hours valid.</p>
                                </div>
                            </div>

                            {feedbackLoading && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <LoadingSpinner size="small" />
                                    <span>Loading feedback tasks...</span>
                                </div>
                            )}

                            {!feedbackLoading && pendingFeedback.length === 0 && (
                                <p className="text-gray-600">No pending feedback. Thank you for staying on top of your volunteer tasks!</p>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {pendingFeedback.map(record => {
                                    const form = feedbackForms[record._id] || {};
                                    const deadline = record.deadlineAt ? new Date(record.deadlineAt) : null;
                                    const overdue = record.overdue;
                                    const event = record.event || {};
                                    return (
                                        <div key={record._id} className="bg-[#fffdfa] border border-[#ecd8c4] rounded-xl p-4 shadow-sm">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-[#800000]">{event.title || 'Event'}</h3>
                                                    <p className="text-xs text-gray-500">
                                                        Attended on{' '}
                                                        {new Date(record.date).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${overdue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {overdue ? 'Overdue' : 'Pending'}
                                                </span>
                                            </div>

                                            {deadline && (
                                                <p className="text-xs text-gray-500 mb-3">
                                                    Deadline: {deadline.toLocaleString(undefined, {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            )}

                                            <div className="mb-3">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Rate your experience</p>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map(value => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => handleFeedbackChange(record._id, 'rating', value)}
                                                            className="focus:outline-none transition-transform hover:scale-110"
                                                        >
                                                            <FaStar
                                                                className={`w-7 h-7 transition-colors ${
                                                                    (form.rating || 0) >= value ? 'text-[#FFD700] fill-[#FFD700]' : 'text-gray-300'
                                                                }`}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <label className="text-sm font-medium text-gray-700 mb-2 block">Feedback (optional)</label>
                                                <textarea
                                                    rows={3}
                                                    value={form.comment || ''}
                                                    onChange={(e) => handleFeedbackChange(record._id, 'comment', e.target.value)}
                                                    className="w-full border border-[#e5d2bf] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#800000]/30 focus:outline-none resize-none"
                                                    placeholder="Share highlights, challenges, or suggestions..."
                                                    maxLength={2000}
                                                />
                                                <div className="text-xs text-gray-400 text-right mt-1">
                                                    {(form.comment || '').length}/2000
                                                </div>
                                            </div>

                                            <Button
                                                variant="maroon"
                                                disabled={form.submitting}
                                                onClick={() => handleSubmitFeedback(record._id)}
                                                className="w-full"
                                            >
                                                {form.submitting ? 'Submitting...' : 'Submit Feedback'}
                                            </Button>

                                            {overdue && (
                                                <p className="mt-3 text-xs text-red-600">
                                                    Feedback deadline passed. Submit now and coordinate with the organizer if you need assistance.
                                                </p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </section>
                )}

                <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#771010] via-[#8f2a2a] to-[#b3622c] px-6 pt-10 pb-12 sm:px-10 sm:pt-12 sm:pb-14 shadow-xl">
                    <div className="absolute inset-0 opacity-30 mix-blend-overlay" aria-hidden="true">
                        <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]"></div>
                    </div>
                    <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                        <div className="max-w-2xl text-white">
                            <p className="uppercase tracking-[0.4em] text-xs sm:text-sm text-white/70 mb-3">Volunteer Journey</p>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight drop-shadow-sm">
                                Volunteer Hours & Event History
                            </h1>
                            <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed">
                                Visualize your impact, revisit memories from past events, and keep track of your volunteer milestones in one elegant timeline.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full lg:w-auto">
                            <div className="group rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm px-6 py-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/20">
                                <p className="text-xs uppercase tracking-wide text-white/70">Total Hours</p>
                                <p className="mt-2 text-3xl font-semibold">{hoursDisplay}</p>
                                <p className="mt-1 text-xs text-white/70">Across all recorded attendance</p>
                            </div>
                            <div className="group rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm px-6 py-5 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-white/20">
                                <p className="text-xs uppercase tracking-wide text-white/70">Events Joined</p>
                                <p className="mt-2 text-3xl font-semibold">{eventsJoined}</p>
                                <p className="mt-1 text-xs text-white/70">Memorable experiences completed</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="relative mt-10 lg:mt-14 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-[#541616]">Timeline of Impact</h2>
                            <p className="text-sm text-gray-600">
                                Every entry captures the hours you’ve dedicated and the stories you’ve helped create.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="secondary"
                                className="border border-[#d9c2af] bg-white text-[#541616] hover:bg-[#f2e7dd] transition-all duration-200"
                                onClick={() => navigate('/user/dashboard')}
                            >
                                Back to Dashboard
                            </Button>
                            <Button
                                className="bg-[#812020] text-white hover:bg-[#611313] transition-all duration-200"
                                onClick={() => navigate('/user/events')}
                            >
                                Join New Event
                            </Button>
                        </div>
                    </div>

                    <div className="relative rounded-3xl border border-[#e6d8c9] bg-white shadow-[0_20px_40px_rgba(117,45,45,0.08)]">
                        <div className="absolute inset-x-8 top-0 h-24 rounded-b-full bg-gradient-to-b from-[#f4e4d6] to-transparent opacity-80 blur-2xl pointer-events-none"></div>
                        <div className="relative p-6 sm:p-8 lg:p-10">
                            {isLoading ? (
                                <div className="py-16 flex flex-col items-center justify-center text-gray-600 gap-4">
                                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border-4 border-dashed border-[#c18d6d] animate-spin"></span>
                                    <div className="text-center">
                                        <p className="text-base font-semibold text-[#541616]">Gathering your journey...</p>
                                        <p className="text-sm text-gray-500">Please wait while we load your volunteer records.</p>
                                    </div>
                                </div>
                            ) : attendanceSummary.events.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[#edd9c7] bg-[#fff9f4] px-6 py-14 text-center shadow-inner">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
                                        <svg className="h-8 w-8 text-[#c27949]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                    </div>
                                    <h3 className="mt-6 text-lg font-semibold text-[#541616]">No volunteer attendance recorded yet</h3>
                                    <p className="mt-2 text-sm text-gray-600">
                                        Your timeline is ready to be filled with meaningful impact. Join an event and scan the QR code to start tracking your hours.
                                    </p>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-4 sm:left-6 top-1 bottom-1 w-px bg-gradient-to-b from-transparent via-[#f0ded0] to-transparent"></div>
                                    <div className="space-y-8">
                                        {attendanceSummary.events.map((event, eventIndex) => (
                                            <div key={event.eventId} className="relative pl-12 sm:pl-16">
                                                <div className="absolute left-3 sm:left-5 top-2">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#c18d6d] bg-[#fff6ef] text-[#9b512b] font-semibold shadow-md">
                                                        {eventIndex + 1}
                                                    </span>
                                                </div>
                                                <article className="rounded-2xl border border-[#efdac9] bg-[#fffaf6] p-5 sm:p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                                                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                                        <div className="flex-1">
                                                            {event.image && (
                                                                <div className="mb-4 rounded-lg overflow-hidden">
                                                                    <img 
                                                                        src={`data:image/jpeg;base64,${event.image}`} 
                                                                        alt={event.title}
                                                                        className="w-full h-48 object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <h3 className="text-lg sm:text-xl font-semibold text-[#541616] leading-snug">
                                                                {event.title}
                                                            </h3>
                                                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
                                                                    <svg className="h-4 w-4 text-[#b56b3b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                    {new Date(event.startDate).toLocaleDateString()} – {new Date(event.endDate).toLocaleDateString()}
                                                                </span>
                                                                {event.location && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
                                                                        <svg className="h-4 w-4 text-[#b56b3b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                        </svg>
                                                                        {event.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-end gap-4">
                                                            <div className="text-right">
                                                                <p className="text-sm text-gray-500 uppercase tracking-widest">Total Hours</p>
                                                                <p className="text-2xl font-bold text-[#812020]">
                                                                    {Number(event.totalHours || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {event.records.length} attendance day{event.records.length === 1 ? '' : 's'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 rounded-xl border border-[#f2e1d4] bg-white/70">
                                                        <ul className="divide-y divide-[#f4e6db]">
                                                            {event.records.map(record => (
                                                                <li key={record.attendanceId} className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
                                                                    <div className="relative">
                                                                        <span className="absolute left-[-36px] top-2 hidden sm:flex h-2.5 w-2.5 rounded-full bg-[#c18d6d] shadow-[0_0_0_6px_rgba(193,141,109,0.15)]"></span>
                                                                        <p className="text-sm font-semibold text-[#492121]">
                                                                            {new Date(record.date).toLocaleDateString(undefined, {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: 'numeric'
                                                                            })}
                                                                        </p>
                                                                        <p className="mt-1 text-xs sm:text-sm text-gray-500">
                                                                            {record.timeIn ? `In: ${new Date(record.timeIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No time-in recorded'} ·{' '}
                                                                            {record.timeOut ? `Out: ${new Date(record.timeOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'No time-out recorded'}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-3">
                                                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2e7] px-3 py-1 text-sm font-semibold text-[#7f3c1f] shadow-sm">
                                                                            <svg className="h-4 w-4 text-[#b56b3b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8" />
                                                                            </svg>
                                                                            {Number(record.totalHours || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} hrs
                                                                        </span>
                                                                        <span
                                                                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                                                                                record.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' :
                                                                                record.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                                record.status === 'missed' ? 'bg-red-100 text-red-700' :
                                                                                record.status === 'overridden' ? 'bg-blue-100 text-blue-700' :
                                                                                record.status === 'voided' ? 'bg-gray-200 text-gray-600' :
                                                                                'bg-gray-100 text-gray-500'
                                                                            }`}
                                                                        >
                                                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                            {record.status.replace('_', ' ')}
                                                                        </span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </article>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default VolunteerHistory;

