import eventModel from "../models/eventModel.js";
import userModel from "../models/userModel.js";
import volunteerAttendanceModel from "../models/volunteerAttendanceModel.js";
import QRCode from 'qrcode';
import crypto from 'crypto';

// Get event volunteers
export const getEventVolunteers = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        console.log('getEventVolunteers called:', {
            eventId,
            userId,
            userRole: req.user.role,
            userName: req.user.name
        });

        const event = await eventModel.findById(eventId)
            .populate('volunteerRegistrations.user', 'name email profileImage')
            .populate('createdBy', 'name email role');

        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        console.log('Event found:', {
            eventId: event._id,
            eventTitle: event.title,
            eventCreatedBy: event.createdBy._id,
            eventCreatedByName: event.createdBy.name
        });

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();
        
        // Check if user is the event creator or has permission
        console.log('Authorization check:', {
            eventCreatedBy: creatorId,
            userId: currentUserId,
            userRole: req.user.role,
            isCreator: creatorId === currentUserId,
            isSystemAdmin: req.user.role === 'System Administrator',
            isCRDStaff: req.user.role === 'CRD Staff'
        });
        
        // Allow access if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized to view volunteers" });
        }

        return res.json({ success: true, event, volunteers: event.volunteerRegistrations });
    } catch (error) {
        console.error('Get event volunteers error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Approve/Reject volunteer
export const updateVolunteerStatus = async (req, res) => {
    try {
        const { eventId, volunteerId } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'
        const userId = req.user._id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const volunteerIndex = event.volunteerRegistrations.findIndex(
            reg => reg.user.toString() === volunteerId
        );

        if (volunteerIndex === -1) {
            return res.status(404).json({ success: false, message: "Volunteer not found" });
        }

        event.volunteerRegistrations[volunteerIndex].status = status;
        await event.save();

        // Send notification to volunteer
        try {
            const { notifyUsers } = await import("../utils/notify.js");
            const volunteerReg = event.volunteerRegistrations[volunteerIndex];
            await notifyUsers({
                userIds: [volunteerId],
                title: status === "approved" ? "Volunteer Application Approved" : "Volunteer Application Rejected",
                message: status === "approved"
                    ? `Your volunteer application for "${event.title}" has been approved. You can now attend the event.`
                    : `Your volunteer application for "${event.title}" has been rejected.`,
                payload: {
                    eventId: event._id,
                    type: status === "approved" ? "volunteer_approved" : "volunteer_rejected",
                    status: status
                }
            });
        } catch (notifError) {
            console.error("Error sending notification:", notifError);
            // Don't fail the request if notification fails
        }

        return res.json({ 
            success: true, 
            message: `Volunteer ${status} successfully`,
            volunteer: event.volunteerRegistrations[volunteerIndex]
        });
    } catch (error) {
        console.error('Update volunteer status error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Remove volunteer from event
export const removeVolunteer = async (req, res) => {
    try {
        const { eventId, volunteerId } = req.params;
        const userId = req.user._id;

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        event.volunteerRegistrations = event.volunteerRegistrations.filter(
            reg => reg.user.toString() !== volunteerId
        );

        await event.save();

        return res.json({ success: true, message: "Volunteer removed successfully" });
    } catch (error) {
        console.error('Remove volunteer error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Generate QR code for attendance (Time In - for check-in)
export const generateAttendanceQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;
        const { type = 'checkIn' } = req.body; // 'checkIn' or 'checkOut'

        const event = await eventModel.findById(eventId)
            .populate('createdBy', 'name email role');
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy?._id ? event.createdBy._id.toString() : (event.createdBy?.toString() || String(event.createdBy));
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const now = new Date();
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        // Calculate if event is single-day or multi-day
        const eventDuration = Math.ceil((eventEnd - eventStart) / (1000 * 60 * 60 * 24));
        const isSingleDay = eventDuration <= 1;
        const isMultiDay = eventDuration > 1;
        
        // For check-in QR: Allow generation 1 day before start (single-day) or during ongoing event
        if (type === 'checkIn') {
            const oneDayBefore = new Date(eventStart.getTime() - (24 * 60 * 60 * 1000));
            
            // Check if event has ended
            if (now > eventEnd) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Event has already ended" 
                });
            }
            
            // For single-day events: allow 1 day before start
            // For ongoing events: always allow during event
            if (isSingleDay && now < oneDayBefore) {
                return res.status(400).json({ 
                    success: false, 
                    message: "QR code can only be generated 1 day before event starts for single-day events",
                    earliestGeneration: oneDayBefore
                });
            }
        }
        
        // For check-out/evaluation QR: Only allow if 5 minutes before end or during event
        // For multi-day events, evaluation QR should only appear on the last day
        if (type === 'checkOut') {
            const fiveMinutesBeforeEnd = new Date(eventEnd.getTime() - (5 * 60 * 1000));
            
            // Check if this is a multi-day event
            if (isMultiDay) {
                // Get today's date and check if it's the last day
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const lastDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());
                
                // For multi-day events, evaluation QR should only be available on the last day
                if (today.getTime() !== lastDay.getTime()) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "Evaluation QR code can only be generated on the last day of the event"
                    });
                }
            }
            
            if (now < fiveMinutesBeforeEnd && now < eventStart) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Evaluation QR code can only be generated 5 minutes before event end or during the event"
                });
            }
        }

        // Get today's date in YYYY-MM-DD format
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Generate unique QR code
        const qrData = {
            eventId: event._id.toString(),
            type: type, // 'checkIn' or 'checkOut'
            date: todayStr,
            generatedAt: now.toISOString(),
            generatedBy: userId.toString(),
            random: crypto.randomBytes(16).toString('hex')
        };

        const qrString = JSON.stringify(qrData);
        const qrCodeImage = await QRCode.toDataURL(qrString);

        // Update qrCodes array in event model
        if (!event.qrCodes) {
            event.qrCodes = [];
        }
        
        // Find or create QR code entry for today
        let qrEntry = event.qrCodes.find(qr => qr.date === todayStr);
        if (!qrEntry) {
            qrEntry = {
                date: todayStr,
                checkIn: '',
                checkOut: '',
                generatedAt: now,
                generatedBy: userId,
                isActive: true,
                expiresAt: eventEnd
            };
            event.qrCodes.push(qrEntry);
        }
        
        // Update the appropriate QR code (checkIn or checkOut)
        if (type === 'checkIn') {
            qrEntry.checkIn = qrString;
        } else if (type === 'checkOut') {
            qrEntry.checkOut = qrString;
        }
        qrEntry.isActive = true;
        qrEntry.generatedAt = now;
        qrEntry.generatedBy = userId;
        qrEntry.expiresAt = eventEnd;

        // Also update legacy attendanceQR for backward compatibility (only for checkIn)
        if (type === 'checkIn') {
            event.attendanceQR = {
                code: qrString,
                generatedAt: now,
                generatedBy: userId,
                isActive: true,
                expiresAt: eventEnd
            };
        }

        await event.save();

        return res.json({ 
            success: true, 
            message: `${type === 'checkIn' ? 'Check-in' : 'Evaluation/Check-out'} QR code generated successfully`,
            qrCode: qrCodeImage,
            type: type,
            date: todayStr,
            expiresAt: eventEnd,
            isActive: true
        });
    } catch (error) {
        console.error('Generate QR code error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to generate QR code',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Close evaluation QR code (can be done anytime by department)
export const closeEvaluationQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { date } = req.body; // Optional: specific date, otherwise closes all active evaluation QRs
        const userId = req.user._id;

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        if (!event.qrCodes || event.qrCodes.length === 0) {
            return res.status(400).json({ success: false, message: "No QR codes found for this event" });
        }

        // Close evaluation QR codes
        let closedCount = 0;
        if (date) {
            // Close specific date's checkOut QR
            const qrEntry = event.qrCodes.find(qr => qr.date === date);
            if (qrEntry && qrEntry.checkOut) {
                qrEntry.isActive = false;
                closedCount = 1;
            }
        } else {
            // Close all active checkOut QRs
            event.qrCodes.forEach(qr => {
                if (qr.checkOut && qr.isActive) {
                    qr.isActive = false;
                    closedCount++;
                }
            });
        }

        await event.save();

        return res.json({ 
            success: true, 
            message: `Closed ${closedCount} evaluation QR code(s)`,
            closedCount
        });
    } catch (error) {
        console.error('Close evaluation QR error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get current QR code status
export const getQRStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { date } = req.query; // Optional: get QR for specific date
        const userId = req.user._id;

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const targetDate = date || todayStr;

        // Get QR codes for the specified date (or today)
        let qrEntry = null;
        if (event.qrCodes && event.qrCodes.length > 0) {
            qrEntry = event.qrCodes.find(qr => qr.date === targetDate);
        }

        // Legacy support: check attendanceQR if no qrCodes entry found
        const legacyQR = event.attendanceQR;
        const isLegacyExpired = legacyQR?.expiresAt && now > legacyQR.expiresAt;

        // Get check-in QR
        let checkInQR = null;
        if (qrEntry && qrEntry.checkIn && qrEntry.isActive) {
            checkInQR = await QRCode.toDataURL(qrEntry.checkIn);
        } else if (legacyQR?.code && legacyQR.isActive && !isLegacyExpired) {
            checkInQR = await QRCode.toDataURL(legacyQR.code);
        }

        // Get check-out/evaluation QR
        let checkOutQR = null;
        if (qrEntry && qrEntry.checkOut && qrEntry.isActive) {
            checkOutQR = await QRCode.toDataURL(qrEntry.checkOut);
        }

        return res.json({ 
            success: true,
            date: targetDate,
            hasCheckInQR: !!checkInQR,
            hasCheckOutQR: !!checkOutQR,
            checkInQR: checkInQR,
            checkOutQR: checkOutQR,
            checkInActive: qrEntry ? (qrEntry.checkIn && qrEntry.isActive) : (legacyQR?.isActive && !isLegacyExpired),
            checkOutActive: qrEntry ? (qrEntry.checkOut && qrEntry.isActive) : false,
            generatedAt: qrEntry?.generatedAt || legacyQR?.generatedAt,
            expiresAt: qrEntry?.expiresAt || legacyQR?.expiresAt,
            // Legacy fields for backward compatibility
            hasQR: !!checkInQR,
            isActive: qrEntry ? qrEntry.isActive : (legacyQR?.isActive && !isLegacyExpired),
            qrCode: checkInQR
        });
    } catch (error) {
        console.error('Get QR status error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Record volunteer attendance (time in/out)
export const recordAttendance = async (req, res) => {
    try {
        const { qrCode, action } = req.body; // action: 'timein' or 'timeout'
        const userId = req.user._id;

        if (!['timein', 'timeout'].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }

        // Parse QR code data
        let qrData;
        try {
            qrData = JSON.parse(qrCode);
        } catch (error) {
            return res.status(400).json({ success: false, message: "Invalid QR code" });
        }

        const event = await eventModel.findById(qrData.eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        // Determine QR type from QR data or action
        const qrType = qrData.type || (action === 'timein' ? 'checkIn' : 'checkOut');
        
        // Check if QR code is still active - check new qrCodes array first, then legacy
        let qrEntry = null;
        if (event.qrCodes && event.qrCodes.length > 0) {
            qrEntry = event.qrCodes.find(qr => qr.date === (qrData.date || todayStr));
        }
        
        let isQRActive = false;
        if (qrEntry) {
            if (qrType === 'checkIn' && qrEntry.checkIn) {
                isQRActive = qrEntry.isActive && qrEntry.checkIn === qrCode;
            } else if (qrType === 'checkOut' && qrEntry.checkOut) {
                isQRActive = qrEntry.isActive && qrEntry.checkOut === qrCode;
            }
        } else {
            // Fallback to legacy attendanceQR for backward compatibility
            const legacyQR = event.attendanceQR;
            if (legacyQR && legacyQR.code === qrCode) {
                isQRActive = legacyQR.isActive && (!legacyQR.expiresAt || now <= legacyQR.expiresAt);
            }
        }
        
        if (!isQRActive) {
            return res.status(400).json({ success: false, message: "QR code is not active or has expired" });
        }
        
        // Validate QR type matches action
        if ((qrType === 'checkIn' && action !== 'timein') || (qrType === 'checkOut' && action !== 'timeout')) {
            return res.status(400).json({ 
                success: false, 
                message: `QR code type (${qrType}) does not match action (${action})` 
            });
        }

        // Check if user is registered as volunteer
        const volunteerReg = event.volunteerRegistrations.find(
            reg => reg.user.toString() === userId.toString()
        );

        if (!volunteerReg || volunteerReg.status !== 'approved') {
            return res.status(403).json({ 
                success: false, 
                message: "You are not an approved volunteer for this event" 
            });
        }

        // Get today's date (start of day)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find existing attendance record for today
        let attendanceRecord = volunteerReg.attendanceRecords.find(
            record => record.date.getTime() === today.getTime()
        );

        // Sync with standalone attendance collection
        const startOfDay = new Date(now)
        startOfDay.setHours(0,0,0,0)
        const endOfDay = new Date(now)
        endOfDay.setHours(23,59,59,999)

        const requiresFeedback = event.feedbackRules?.requireFeedback !== false
        const deadlineHours = Number(event.feedbackRules?.deadlineHours) || 24

        let attendanceDoc = await volunteerAttendanceModel.findOne({
            event: event._id,
            volunteer: userId,
            date: { $gte: startOfDay, $lte: endOfDay }
        })

        if (action === 'timein') {
            if (attendanceRecord && attendanceRecord.timeIn) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You have already recorded time in for today" 
                });
            }

            // For multi-day events, check if there's a previous day's attendance with paused hours
            const eventDuration = Math.ceil((new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24));
            const isMultiDay = eventDuration > 1;
            let previousDayHours = 0;
            
            if (isMultiDay) {
                // Find all previous attendance records for this event
                const previousAttendances = await volunteerAttendanceModel.find({
                    event: event._id,
                    volunteer: userId,
                    date: { $lt: today }
                }).sort({ date: -1 });
                
                // Calculate total hours from previous days
                previousDayHours = previousAttendances.reduce((total, att) => {
                    if (att.timeIn && att.timeOut && att.isValid && !att.voidedHours) {
                        const hours = (new Date(att.timeOut) - new Date(att.timeIn)) / (1000 * 60 * 60);
                        return total + hours;
                    }
                    return total;
                }, 0);
            }

            if (!attendanceRecord) {
                attendanceRecord = {
                    date: today,
                    timeIn: now,
                    qrCode: qrCode,
                    isValid: true,
                    totalHours: previousDayHours // Store previous hours for reference
                };
                volunteerReg.attendanceRecords.push(attendanceRecord);
            } else {
                attendanceRecord.timeIn = now;
                attendanceRecord.qrCode = qrCode;
                attendanceRecord.isValid = true;
                attendanceRecord.totalHours = previousDayHours;
            }

            if (!attendanceDoc) {
                attendanceDoc = await volunteerAttendanceModel.create({
                    event: event._id,
                    volunteer: userId,
                    date: now,
                    timeIn: now,
                    qrCode,
                    status: requiresFeedback ? 'pending' : 'not_required',
                    isValid: true,
                    voidedHours: false,
                    // Store previous day hours for multi-day events
                    previousDayHours: isMultiDay ? previousDayHours : 0
                })
            } else {
                if (attendanceDoc.timeIn) {
                    return res.status(400).json({ 
                        success: false, 
                        message: "You have already recorded time in for today" 
                    });
                }
                attendanceDoc.timeIn = now
                attendanceDoc.qrCode = qrCode
                attendanceDoc.isValid = true
                attendanceDoc.status = requiresFeedback ? 'pending' : 'not_required'
                attendanceDoc.voidedHours = false
                attendanceDoc.previousDayHours = isMultiDay ? previousDayHours : 0
                await attendanceDoc.save()
            }

        } else if (action === 'timeout') {
            if (!attendanceRecord || !attendanceRecord.timeIn) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You must record time in before time out" 
                });
            }

            if (attendanceRecord.timeOut) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You have already recorded time out for today" 
                });
            }

            // Check if this is the last day of a multi-day event
            const eventDuration = Math.ceil((new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24));
            const isMultiDay = eventDuration > 1;
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const lastDay = new Date(event.endDate.getFullYear(), event.endDate.getMonth(), event.endDate.getDate());
            const isLastDay = !isMultiDay || (today.getTime() === lastDay.getTime());

            attendanceRecord.timeOut = now;
            
            // Calculate hours worked for this day
            const hoursWorkedToday = (now.getTime() - attendanceRecord.timeIn.getTime()) / (1000 * 60 * 60);
            const hoursWorkedTodayRounded = Math.round(hoursWorkedToday * 100) / 100;
            
            // For multi-day events, add previous day hours
            let totalHours = hoursWorkedTodayRounded;
            if (isMultiDay && attendanceDoc && attendanceDoc.previousDayHours) {
                totalHours = attendanceDoc.previousDayHours + hoursWorkedTodayRounded;
            }
            
            attendanceRecord.totalHours = totalHours;

            if (!attendanceDoc || !attendanceDoc.timeIn) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You must record time in before time out" 
                });
            }
            if (attendanceDoc.timeOut) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You have already recorded time out for today" 
                });
            }
            
            attendanceDoc.timeOut = now
            attendanceDoc.hoursWorked = hoursWorkedTodayRounded // Hours for this day only
            attendanceDoc.totalHours = totalHours // Total hours including previous days
            
            // Only trigger evaluation on the last day
            if (isLastDay) {
                if (requiresFeedback) {
                    const base = new Date(Math.min(new Date(event.endDate).getTime(), now.getTime()))
                    attendanceDoc.deadlineAt = new Date(base.getTime() + deadlineHours * 3600000)
                    attendanceDoc.status = 'pending'
                } else {
                    attendanceDoc.status = 'not_required'
                }
            } else {
                // For non-last days, mark as not requiring feedback (hours are paused)
                attendanceDoc.status = 'not_required'
            }
            
            attendanceDoc.voidedHours = false
            await attendanceDoc.save()
        }

        await event.save();

        return res.json({ 
            success: true, 
            message: `${action === 'timein' ? 'Time in' : 'Time out'} recorded successfully`,
            attendanceRecord
        });
    } catch (error) {
        console.error('Record attendance error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get volunteer attendance records
export const getVolunteerAttendance = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        const event = await eventModel.findById(eventId)
            .populate('volunteerRegistrations.user', 'name email profileImage');

        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        // Process attendance records for each volunteer
        const volunteerAttendance = event.volunteerRegistrations.map(reg => {
            const totalHours = reg.attendanceRecords.reduce((sum, record) => {
                return sum + (record.totalHours || 0);
            }, 0);

            const validRecords = reg.attendanceRecords.filter(record => record.isValid);
            const invalidRecords = reg.attendanceRecords.filter(record => !record.isValid);

            return {
                volunteer: reg.user,
                status: reg.status,
                totalHours,
                validRecords,
                invalidRecords,
                totalRecords: reg.attendanceRecords.length
            };
        });

        return res.json({ 
            success: true, 
            attendance: volunteerAttendance 
        });
    } catch (error) {
        console.error('Get volunteer attendance error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Validate attendance records (invalidate incomplete records)
export const validateAttendance = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Get the creator ID (handle both populated and non-populated cases)
        const creatorId = event.createdBy._id ? event.createdBy._id.toString() : event.createdBy.toString();
        const currentUserId = userId.toString();

        // Check if user is the event creator, System Administrator, or CRD Staff
        if (creatorId !== currentUserId && 
            req.user.role !== 'System Administrator' && 
            req.user.role !== 'CRD Staff') {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        let invalidatedCount = 0;

        // Check each volunteer's attendance records
        event.volunteerRegistrations.forEach(reg => {
            reg.attendanceRecords.forEach(record => {
                // If there's a time in but no time out, invalidate the record
                if (record.timeIn && !record.timeOut && record.isValid) {
                    record.isValid = false;
                    record.totalHours = 0;
                    invalidatedCount++;
                }
            });
        });

        await event.save();

        return res.json({ 
            success: true, 
            message: `Attendance validation completed. ${invalidatedCount} records invalidated.`,
            invalidatedCount
        });
    } catch (error) {
        console.error('Validate attendance error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

