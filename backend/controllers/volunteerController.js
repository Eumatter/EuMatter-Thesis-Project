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

        // Check if user is the event creator or has permission
        console.log('Authorization check:', {
            eventCreatedBy: event.createdBy.toString(),
            userId: userId.toString(),
            userRole: req.user.role,
            isCreator: event.createdBy.toString() === userId.toString(),
            isSystemAdmin: req.user.role === 'System Administrator'
        });
        
        if (event.createdBy.toString() !== userId.toString() && req.user.role !== 'System Administrator') {
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

        // Check if user is the event creator
        if (event.createdBy.toString() !== userId.toString()) {
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

        // Check if user is the event creator
        if (event.createdBy.toString() !== userId.toString()) {
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

// Generate QR code for attendance (5 hours before event)
export const generateAttendanceQR = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Check if user is the event creator
        if (event.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const now = new Date();
        const eventStart = new Date(event.startDate);
        const fiveHoursBefore = new Date(eventStart.getTime() - (5 * 60 * 60 * 1000));

        // Check if it's within 5 hours before event start
        if (now < fiveHoursBefore) {
            return res.status(400).json({ 
                success: false, 
                message: "QR code can only be generated 5 hours before event starts",
                earliestGeneration: fiveHoursBefore
            });
        }

        // Check if event has ended
        if (now > eventStart) {
            return res.status(400).json({ 
                success: false, 
                message: "Event has already started or ended" 
            });
        }

        // Generate unique QR code
        const qrData = {
            eventId: event._id.toString(),
            generatedAt: now.toISOString(),
            generatedBy: userId.toString(),
            random: crypto.randomBytes(16).toString('hex')
        };

        const qrString = JSON.stringify(qrData);
        const qrCodeImage = await QRCode.toDataURL(qrString);

        // Save QR code to event
        event.attendanceQR = {
            code: qrString,
            generatedAt: now,
            generatedBy: userId,
            isActive: true,
            expiresAt: eventStart
        };

        await event.save();

        return res.json({ 
            success: true, 
            message: "QR code generated successfully",
            qrCode: qrCodeImage,
            expiresAt: eventStart,
            isActive: true
        });
    } catch (error) {
        console.error('Generate QR code error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Get current QR code status
export const getQRStatus = async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user._id;

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Check if user is the event creator
        if (event.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }

        const now = new Date();
        const isExpired = event.attendanceQR?.expiresAt && now > event.attendanceQR.expiresAt;

        return res.json({ 
            success: true,
            hasQR: !!event.attendanceQR?.code,
            isActive: event.attendanceQR?.isActive && !isExpired,
            generatedAt: event.attendanceQR?.generatedAt,
            expiresAt: event.attendanceQR?.expiresAt,
            qrCode: event.attendanceQR?.isActive && !isExpired ? await QRCode.toDataURL(event.attendanceQR.code) : null
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

        // Check if QR code is still active
        const now = new Date();
        if (!event.attendanceQR?.isActive || now > event.attendanceQR.expiresAt) {
            return res.status(400).json({ success: false, message: "QR code has expired" });
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

        if (action === 'timein') {
            if (attendanceRecord && attendanceRecord.timeIn) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You have already recorded time in for today" 
                });
            }

            if (!attendanceRecord) {
                // Create new attendance record
                attendanceRecord = {
                    date: today,
                    timeIn: now,
                    qrCode: qrCode,
                    isValid: true
                };
                volunteerReg.attendanceRecords.push(attendanceRecord);
            } else {
                attendanceRecord.timeIn = now;
                attendanceRecord.qrCode = qrCode;
                attendanceRecord.isValid = true;
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

            attendanceRecord.timeOut = now;
            
            // Calculate total hours
            const hoursWorked = (now.getTime() - attendanceRecord.timeIn.getTime()) / (1000 * 60 * 60);
            attendanceRecord.totalHours = Math.round(hoursWorked * 100) / 100; // Round to 2 decimal places
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

        // Check if user is the event creator
        if (event.createdBy.toString() !== userId.toString()) {
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

        // Check if user is the event creator
        if (event.createdBy.toString() !== userId.toString()) {
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

