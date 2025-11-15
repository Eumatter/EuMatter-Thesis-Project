import eventModel from '../models/eventModel.js';
import volunteerAttendanceModel from '../models/volunteerAttendanceModel.js';
import mongoose from 'mongoose';

/**
 * Get comprehensive analytics for an event
 * Includes: volunteer hours (by event, user, time period), feedback statistics
 */
export async function getEventAnalytics(req, res) {
    try {
        const { eventId } = req.params;
        const { period = 'all' } = req.query; // 'all', 'week', 'month', 'year', 'custom'
        const { startDate, endDate } = req.query;
        
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Get event
        const event = await eventModel.findById(eventId)
            .populate('createdBy', 'name email')
            .lean();

        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        // Check if user is organizer or has permission
        const isOrganizer = event.createdBy?._id?.toString() === userId.toString();
        const isAdmin = ['System Administrator', 'CRD Staff'].includes(req.user?.role);
        
        if (!isOrganizer && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this event analytics' });
        }

        // Build date filter for time period
        let dateFilter = {};
        if (period === 'custom' && startDate && endDate) {
            dateFilter.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (period === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            dateFilter.date = { $gte: weekAgo };
        } else if (period === 'month') {
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            dateFilter.date = { $gte: monthAgo };
        } else if (period === 'year') {
            const yearAgo = new Date();
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            dateFilter.date = { $gte: yearAgo };
        }

        // Get all attendance records for this event
        const attendanceRecords = await volunteerAttendanceModel.find({
            event: new mongoose.Types.ObjectId(eventId),
            ...dateFilter
        })
            .populate('volunteer', 'name email role profileImage')
            .sort({ date: -1 })
            .lean();

        // Calculate volunteer hours statistics
        let totalHours = 0;
        let totalVoidedHours = 0;
        const hoursByUser = new Map();
        const hoursByDate = new Map();
        const userStats = [];

        attendanceRecords.forEach(record => {
            const hours = record.totalHours || 0;
            const isVoided = record.voidedHours || false;
            
            if (!isVoided) {
                totalHours += hours;
            } else {
                totalVoidedHours += hours;
            }

            // Hours by user
            const volunteerId = record.volunteer?._id?.toString() || 'unknown';
            const volunteerName = record.volunteer?.name || 'Unknown';
            const volunteerEmail = record.volunteer?.email || '';
            const volunteerRole = record.volunteer?.role || '';
            const volunteerImage = record.volunteer?.profileImage || '';

            if (!hoursByUser.has(volunteerId)) {
                hoursByUser.set(volunteerId, {
                    volunteerId,
                    volunteerName,
                    volunteerEmail,
                    volunteerRole,
                    volunteerImage,
                    totalHours: 0,
                    totalVoidedHours: 0,
                    records: []
                });
            }

            const userEntry = hoursByUser.get(volunteerId);
            if (!isVoided) {
                userEntry.totalHours += hours;
            } else {
                userEntry.totalVoidedHours += hours;
            }
            userEntry.records.push({
                date: record.date,
                timeIn: record.timeIn,
                timeOut: record.timeOut,
                hours: isVoided ? 0 : hours,
                voided: isVoided,
                status: record.status
            });

            // Hours by date
            const dateStr = new Date(record.date).toISOString().split('T')[0];
            if (!hoursByDate.has(dateStr)) {
                hoursByDate.set(dateStr, {
                    date: dateStr,
                    totalHours: 0,
                    totalVoidedHours: 0,
                    volunteerCount: 0,
                    records: []
                });
            }

            const dateEntry = hoursByDate.get(dateStr);
            if (!isVoided) {
                dateEntry.totalHours += hours;
            } else {
                dateEntry.totalVoidedHours += hours;
            }
            dateEntry.records.push({
                volunteerId,
                volunteerName,
                hours: isVoided ? 0 : hours,
                voided: isVoided
            });
        });

        // Convert maps to arrays and sort
        const hoursByUserArray = Array.from(hoursByUser.values())
            .map(user => ({
                ...user,
                volunteerCount: user.records.length
            }))
            .sort((a, b) => b.totalHours - a.totalHours);

        const hoursByDateArray = Array.from(hoursByDate.values())
            .map(date => ({
                ...date,
                volunteerCount: new Set(date.records.map(r => r.volunteerId)).size
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate feedback statistics
        const feedbackRecords = attendanceRecords.filter(r => r.feedback && r.feedback.rating);
        const totalFeedbackResponses = feedbackRecords.length;
        
        let averageRating = 0;
        let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;

        if (totalFeedbackResponses > 0) {
            feedbackRecords.forEach(record => {
                const rating = record.feedback.rating;
                if (rating >= 1 && rating <= 5) {
                    ratingDistribution[rating]++;
                    totalRating += rating;
                }
            });
            averageRating = totalRating / totalFeedbackResponses;
        }

        // Get feedback comments
        const feedbackComments = feedbackRecords
            .filter(r => r.feedback.comment)
            .map(r => ({
                volunteerName: r.volunteer?.name || 'Unknown',
                volunteerEmail: r.volunteer?.email || '',
                rating: r.feedback.rating,
                comment: r.feedback.comment,
                submittedAt: r.feedback.submittedAt,
                overridden: r.feedback.overridden || false
            }))
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        // Calculate satisfaction score (percentage of 4-5 star ratings)
        const satisfactionScore = totalFeedbackResponses > 0
            ? ((ratingDistribution[4] + ratingDistribution[5]) / totalFeedbackResponses) * 100
            : 0;

        // Additional statistics
        const totalVolunteers = new Set(attendanceRecords.map(r => r.volunteer?._id?.toString()).filter(Boolean)).size;
        const volunteersWithFeedback = new Set(feedbackRecords.map(r => r.volunteer?._id?.toString()).filter(Boolean)).size;
        const feedbackResponseRate = totalVolunteers > 0 ? (volunteersWithFeedback / totalVolunteers) * 100 : 0;

        // Get event feedback summary from event model
        const eventFeedbackSummary = event.feedbackSummary || {
            averageRating: 0,
            totalResponses: 0,
            lastCalculatedAt: null
        };

        res.json({
            success: true,
            event: {
                id: event._id,
                title: event.title,
                startDate: event.startDate,
                endDate: event.endDate,
                location: event.location,
                status: event.status,
                feedbackSummary: eventFeedbackSummary
            },
            volunteerHours: {
                total: totalHours,
                totalVoided: totalVoidedHours,
                totalValid: totalHours,
                byUser: hoursByUserArray,
                byDate: hoursByDateArray,
                totalVolunteers: totalVolunteers,
                averageHoursPerVolunteer: totalVolunteers > 0 ? totalHours / totalVolunteers : 0
            },
            feedback: {
                totalResponses: totalFeedbackResponses,
                averageRating: Math.round(averageRating * 100) / 100,
                satisfactionScore: Math.round(satisfactionScore * 100) / 100,
                ratingDistribution,
                feedbackResponseRate: Math.round(feedbackResponseRate * 100) / 100,
                comments: feedbackComments,
                volunteersWithFeedback: volunteersWithFeedback,
                totalVolunteers: totalVolunteers
            },
            period: {
                type: period,
                startDate: startDate || null,
                endDate: endDate || null
            }
        });
    } catch (error) {
        console.error('Error getting event analytics:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to get event analytics' });
    }
}

