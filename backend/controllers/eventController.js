import fs from "fs";
import eventModel from "../models/eventModel.js";
import { notifyFollowersOfEvent } from "../utils/notify.js";
import { createAuditLog } from "./auditLogController.js";

// Helper: Convert file to Base64 string
const fileToBase64 = (file) => {
    if (!file) return "";
    const fileData = fs.readFileSync(file.path);
    return fileData.toString("base64");
};

// Create Event
export const createEvent = async (req, res) => {
    const files = [];  // Track files for cleanup
    try {
        console.log('Request body:', req.body);  // Debug log
        console.log('Request files:', req.files);  // Debug log

        const {
            title,
            description,
            startDate,
            endDate,
            location,
            isOpenForDonation,
            isOpenForVolunteer,
            volunteerSettings,
            eventCategory
        } = req.body;

        // Validate required fields
        if (!title || !startDate || !endDate || !location) {
            return res.status(400).json({
                message: "Missing required fields",
                required: "title, startDate, endDate, location"
            });
        }

        // Get user ID from request
        const userId = req.user?._id;  // Assuming auth middleware sets req.user
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        // Convert uploaded files to Base64
        let imageBase64 = "";
        let docBase64 = "";

        if (req.files?.image?.[0]) {
            files.push(req.files.image[0].path);
            imageBase64 = fileToBase64(req.files.image[0]);
        }
        if (req.files?.proposalDocument?.[0]) {
            files.push(req.files.proposalDocument[0].path);
            docBase64 = fileToBase64(req.files.proposalDocument[0]);
        }

        // Parse and validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid start or end date" });
        }
        if (end <= start) {
            return res.status(400).json({ message: "End date/time must be after start date/time" });
        }

        // Calculate event duration
        const eventDuration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const isMultiDay = eventDuration > 1;

        // Parse volunteerSettings
        let parsedVolunteerSettings = null;
        if (volunteerSettings) {
            try {
                parsedVolunteerSettings = typeof volunteerSettings === 'string' ? JSON.parse(volunteerSettings) : volunteerSettings;
            } catch (e) {
                return res.status(400).json({ message: "Invalid volunteerSettings format" });
            }
        }

        // Validate dailySchedule for multi-day events with volunteers
        if (isOpenForVolunteer === 'true' || isOpenForVolunteer === true) {
            if (isMultiDay && parsedVolunteerSettings) {
                if (!parsedVolunteerSettings.dailySchedule || !Array.isArray(parsedVolunteerSettings.dailySchedule) || parsedVolunteerSettings.dailySchedule.length === 0) {
                    return res.status(400).json({ 
                        message: "Multi-day events with volunteers require a daily schedule with time in/out for each day" 
                    });
                }
                
                // Validate that dailySchedule has entries for each day
                if (parsedVolunteerSettings.dailySchedule.length !== eventDuration) {
                    return res.status(400).json({ 
                        message: `Daily schedule must have entries for all ${eventDuration} day(s) of the event` 
                    });
                }

                // Validate each day has timeIn and timeOut
                for (let i = 0; i < parsedVolunteerSettings.dailySchedule.length; i++) {
                    const day = parsedVolunteerSettings.dailySchedule[i];
                    if (!day.timeIn || !day.timeOut) {
                        return res.status(400).json({ 
                            message: `Day ${i + 1} is missing time in or time out` 
                        });
                    }
                }
            } else if (isMultiDay) {
                return res.status(400).json({ 
                    message: "Multi-day events with volunteers require volunteerSettings with dailySchedule" 
                });
            }
        }

        // Determine event category - default to community_relations for Department/Organization users
        let finalEventCategory = eventCategory || 'other';
        if (req.user?.role === 'Department/Organization' && !eventCategory) {
            // Default to community_relations for department users if not specified
            finalEventCategory = 'community_relations';
        }
        
        // Validate event category
        const validCategories = ['community_relations', 'community_extension', 'other'];
        if (!validCategories.includes(finalEventCategory)) {
            finalEventCategory = 'other';
        }

        const newEvent = new eventModel({
            title,
            description,
            startDate: start,
            endDate: end,
            location,
            createdBy: userId,
            image: imageBase64,
            proposalDocument: docBase64,
            isOpenForDonation: isOpenForDonation === 'true' || isOpenForDonation === true,
            isOpenForVolunteer: isOpenForVolunteer === 'true' || isOpenForVolunteer === true,
            volunteerSettings: parsedVolunteerSettings || undefined,
            eventCategory: finalEventCategory
        });

        await newEvent.save();

        // Cleanup uploaded files after conversion
        files.forEach(file => {
            try {
                fs.unlinkSync(file);
            } catch (err) {
                console.error('Error deleting file:', file, err);
            }
        });

        // Populate the event before returning
        const populatedEvent = await eventModel.findById(newEvent._id)
            .populate("createdBy", "name email profileImage")
            .populate("volunteers", "name email")
            .populate("comments.user", "name email profileImage")
            .populate("reviewedBy", "name email profileImage");

        // Emit notification (created/proposed)
        try { await notifyFollowersOfEvent(populatedEvent, 'Event Created', `${title} scheduled on ${start.toLocaleString()}`) } catch (_) {}

        // Log event creation - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: userId,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'EVENT_CREATED',
            resourceType: 'event',
            resourceId: newEvent._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 201,
            success: true,
            newValues: {
                title: title,
                status: newEvent.status || 'Pending',
                eventCategory: finalEventCategory
            }
        }).catch(err => console.error('Failed to log audit:', err));

        res.status(201).json({
            message: "Event created successfully",
            event: populatedEvent
        });
    } catch (error) {
        // Cleanup files on error
        files.forEach(file => {
            try {
                fs.unlinkSync(file);
            } catch (err) {
                console.error('Error deleting file:', file, err);
            }
        });

        console.error('Event creation error:', error);  // Debug log
        res.status(500).json({
            message: "Error creating event",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Get All Events
export const getEvents = async (req, res) => {
    try {
        const events = await eventModel.find()
            .populate("createdBy", "name email profileImage")
            .populate("volunteers", "name email profileImage department course role")
            .populate("volunteerRegistrations.user", "name email profileImage department course role")
            .populate("comments.user", "name email profileImage")
            .populate("reviewedBy", "name email profileImage")
            .sort({ createdAt: -1 }); // Sort by newest first
        
        // For each event, fetch donations from donationModel
        const donationModel = (await import("../models/donationModel.js")).default;
        const eventsWithDonations = await Promise.all(events.map(async (event) => {
            const eventObj = event.toObject();
            const donations = await donationModel.find({ event: event._id, status: "succeeded" })
                .populate("user", "name email profileImage department")
                .sort({ createdAt: -1 })
                .limit(100); // Limit to avoid performance issues
            
            eventObj.donations = donations.map(d => {
                // Ensure user object is properly populated
                const donationObj = d.toObject ? d.toObject() : d;
                return {
                    _id: donationObj._id,
                    donorName: donationObj.donorName,
                    donorEmail: donationObj.donorEmail,
                    amount: donationObj.amount,
                    message: donationObj.message || "",
                    paymentMethod: donationObj.paymentMethod,
                    status: donationObj.status,
                    isAnonymous: donationObj.isAnonymous,
                    user: donationObj.user || null, // Ensure user object is included
                    createdAt: donationObj.createdAt,
                    donatedAt: donationObj.createdAt
                };
            });
            
            return eventObj;
        }));
        
        res.status(200).json(eventsWithDonations);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error: error.message });
    }
};

// Get Events Created by Authenticated User
export const getUserEvents = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const events = await eventModel.find({ createdBy: userId })
            .populate("createdBy", "name email profileImage")
            .populate("volunteers", "name email profileImage department course role")
            .populate("volunteerRegistrations.user", "name email profileImage department course role")
            .populate("comments.user", "name email profileImage")
            .populate("reviewedBy", "name email profileImage")
            .sort({ createdAt: -1 }); // Sort by newest first
        
        // For each event, fetch donations from donationModel
        const donationModel = (await import("../models/donationModel.js")).default;
        const eventsWithDonations = await Promise.all(events.map(async (event) => {
            const eventObj = event.toObject();
            const donations = await donationModel.find({ event: event._id, status: "succeeded" })
                .populate("user", "name email profileImage department")
                .sort({ createdAt: -1 })
                .limit(100);
            
            eventObj.donations = donations.map(d => {
                // Ensure user object is properly populated
                const donationObj = d.toObject ? d.toObject() : d;
                return {
                    _id: donationObj._id,
                    donorName: donationObj.donorName,
                    donorEmail: donationObj.donorEmail,
                    amount: donationObj.amount,
                    message: donationObj.message || "",
                    paymentMethod: donationObj.paymentMethod,
                    status: donationObj.status,
                    isAnonymous: donationObj.isAnonymous,
                    user: donationObj.user || null, // Ensure user object is included
                    createdAt: donationObj.createdAt,
                    donatedAt: donationObj.createdAt
                };
            });
            
            return eventObj;
        }));
        
        res.status(200).json(eventsWithDonations);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user events", error: error.message });
    }
};

// Get Event by ID
export const getEventById = async (req, res) => {
    try {
        const event = await eventModel.findById(req.params.id)
            .populate("createdBy", "name email profileImage")
            .populate("volunteers", "name email profileImage department course role")
            .populate("volunteerRegistrations.user", "name email profileImage department course role")
            .populate("comments.user", "name email profileImage")
            .populate("reviewedBy", "name email profileImage");
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        
        // Fetch donations from donationModel
        const donationModel = (await import("../models/donationModel.js")).default;
        const donations = await donationModel.find({ event: req.params.id, status: "succeeded" })
            .populate("user", "name email profileImage department")
            .sort({ createdAt: -1 });
        
        // Convert donations to event format
        const eventObj = event.toObject();
        eventObj.donations = donations.map(d => {
            // Ensure user object is properly populated
            const donationObj = d.toObject ? d.toObject() : d;
            return {
                _id: donationObj._id,
                donorName: donationObj.donorName,
                donorEmail: donationObj.donorEmail,
                amount: donationObj.amount,
                message: donationObj.message || "",
                paymentMethod: donationObj.paymentMethod,
                status: donationObj.status,
                isAnonymous: donationObj.isAnonymous,
                user: donationObj.user || null, // Ensure user object is included
                createdAt: donationObj.createdAt,
                donatedAt: donationObj.createdAt
            };
        });
        
        res.status(200).json(eventObj);
    } catch (error) {
        res.status(500).json({ message: "Error fetching event", error: error.message });
    }
};

// Update Event
export const updateEvent = async (req, res) => {
    try {
        const updates = { ...req.body };

        // If volunteerSettings is provided as JSON string, parse it
        if (typeof updates.volunteerSettings === 'string') {
            try { updates.volunteerSettings = JSON.parse(updates.volunteerSettings) } catch (_) { delete updates.volunteerSettings }
        }

        // Validate dailySchedule if updating volunteerSettings for multi-day events
        if (updates.volunteerSettings && updates.volunteerSettings.dailySchedule) {
            const event = await eventModel.findById(req.params.id);
            if (event) {
                const eventDuration = Math.ceil((new Date(event.endDate) - new Date(event.startDate)) / (1000 * 60 * 60 * 24));
                const isMultiDay = eventDuration > 1;
                
                if (isMultiDay && event.isOpenForVolunteer) {
                    if (!Array.isArray(updates.volunteerSettings.dailySchedule) || updates.volunteerSettings.dailySchedule.length === 0) {
                        return res.status(400).json({ 
                            message: "Multi-day events with volunteers require a daily schedule with time in/out for each day" 
                        });
                    }
                    
                    if (updates.volunteerSettings.dailySchedule.length !== eventDuration) {
                        return res.status(400).json({ 
                            message: `Daily schedule must have entries for all ${eventDuration} day(s) of the event` 
                        });
                    }

                    for (let i = 0; i < updates.volunteerSettings.dailySchedule.length; i++) {
                        const day = updates.volunteerSettings.dailySchedule[i];
                        if (!day.timeIn || !day.timeOut) {
                            return res.status(400).json({ 
                                message: `Day ${i + 1} is missing time in or time out` 
                            });
                        }
                    }
                }
            }
        }

        // Convert uploaded files to Base64 if provided
        if (req.files?.image?.[0]) {
            updates.image = fileToBase64(req.files.image[0]);
        }
        if (req.files?.proposalDocument?.[0]) {
            updates.proposalDocument = fileToBase64(req.files.proposalDocument[0]);
        }

        // Normalize date updates if provided and validate
        if (updates.startDate) {
            const s = new Date(updates.startDate);
            if (isNaN(s.getTime())) {
                return res.status(400).json({ message: "Invalid start date" });
            }
            updates.startDate = s;
        }
        if (updates.endDate) {
            const e = new Date(updates.endDate);
            if (isNaN(e.getTime())) {
                return res.status(400).json({ message: "Invalid end date" });
            }
            updates.endDate = e;
        }
        if (updates.startDate && updates.endDate && updates.endDate <= updates.startDate) {
            return res.status(400).json({ message: "End date/time must be after start date/time" });
        }

        const updatedEvent = await eventModel.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        )
        .populate("createdBy", "name email profileImage")
        .populate("volunteers", "name email")
        .populate("comments.user", "name email profileImage")
        .populate("reviewedBy", "name email profileImage");

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        try { await notifyFollowersOfEvent(updatedEvent, 'Event Updated', `${updatedEvent.title} was updated`) } catch (_) {}
        res.status(200).json({ message: "Event updated successfully", event: updatedEvent });
    } catch (error) {
        res.status(500).json({ message: "Error updating event", error: error.message });
    }
};

// Delete Event
export const deleteEvent = async (req, res) => {
    try {
        // Get event before deletion for audit log
        const eventBefore = await eventModel.findById(req.params.id).select('title status createdBy');
        
        const deletedEvent = await eventModel.findByIdAndDelete(req.params.id);
        if (!deletedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Log event deletion - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'EVENT_DELETED',
            resourceType: 'event',
            resourceId: deletedEvent._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: {
                title: deletedEvent.title,
                status: deletedEvent.status
            }
        }).catch(err => console.error('Failed to log audit:', err));

        try { await notifyFollowersOfEvent(deletedEvent, 'Event Cancelled', `${deletedEvent.title} was cancelled`) } catch (_) {}
        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting event", error: error.message });
    }
};

// Approve or Decline Event
export const reviewEvent = async (req, res) => {
    try {
        const { status, reviewedBy } = req.body;

        if (!["Approved", "Declined"].includes(status)) {
            return res.status(400).json({ message: "Invalid status. Use Approved or Declined." });
        }

        // Get event before update
        const eventBefore = await eventModel.findById(req.params.id).select('title status');
        if (!eventBefore) {
            return res.status(404).json({ message: "Event not found" });
        }

        const reviewedEvent = await eventModel.findByIdAndUpdate(
            req.params.id,
            { status, reviewedBy, reviewedAt: new Date() },
            { new: true }
        )
        .populate("createdBy", "name email profileImage")
        .populate("volunteers", "name email")
        .populate("comments.user", "name email profileImage")
        .populate("reviewedBy", "name email profileImage");

        // Log event approval/rejection - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: status === "Approved" ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
            resourceType: 'event',
            resourceId: reviewedEvent._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: { status: eventBefore.status },
            newValues: { status: status }
        }).catch(err => console.error('Failed to log audit:', err));

        // Send notification to event creator
        try {
            const { notifyUsers } = await import("../utils/notify.js");
            await notifyUsers({
                userIds: [reviewedEvent.createdBy._id || reviewedEvent.createdBy],
                title: status === "Approved" ? "Event Approved" : "Event Declined",
                message: status === "Approved" 
                    ? `Your event "${reviewedEvent.title}" has been approved and is now active.`
                    : `Your event "${reviewedEvent.title}" has been declined. Please review and resubmit.`,
                payload: {
                    eventId: reviewedEvent._id,
                    type: status === "Approved" ? "event_approved" : "event_declined",
                    status: status
                }
            });
            
            // Also notify subscribers if approved
            if (status === "Approved") {
                await notifyFollowersOfEvent(reviewedEvent, "Event Approved", `${reviewedEvent.title} has been approved and is now available`);
            }
        } catch (notifError) {
            console.error("Error sending notification:", notifError);
            // Don't fail the request if notification fails
        }

        res.status(200).json({ message: `Event ${status.toLowerCase()} successfully`, event: reviewedEvent });
    } catch (error) {
        res.status(500).json({ message: "Error reviewing event", error: error.message });
    }
};

// Accept Event for Reviewing (move to Pending)
export const acceptEventForReview = async (req, res) => {
    try {
        const event = await eventModel.findByIdAndUpdate(
            req.params.id,
            { status: "Pending" },
            { new: true }
        )
        .populate("createdBy", "name email profileImage")
        .populate("volunteers", "name email")
        .populate("comments.user", "name email profileImage")
        .populate("reviewedBy", "name email profileImage");

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event accepted for review", event });
    } catch (error) {
        res.status(500).json({ message: "Error accepting event for review", error: error.message });
    }
};

// Join Event as Volunteer
export const joinEvent = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const event = await eventModel.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check event status - only allow registration for Upcoming or Approved events
        if (event.status === 'Ongoing' || event.status === 'Completed') {
            return res.status(400).json({ 
                message: event.status === 'Ongoing' 
                    ? "Registration is closed. This event is currently ongoing." 
                    : "This event has been completed and registration is no longer available." 
            });
        }

        // Check if event is approved or upcoming
        if (!['Approved', 'Upcoming'].includes(event.status)) {
            return res.status(400).json({ 
                message: "This event is not yet open for registration. Please wait for approval." 
            });
        }

        // Check if event is open for volunteers
        if (!event.isOpenForVolunteer) {
            return res.status(400).json({ message: "This event is not open for volunteers" });
        }

        // Check if user already joined
        if (event.volunteers.includes(userId)) {
            return res.status(400).json({ message: "You have already joined this event" });
        }

        // Check if event has ended (additional date check)
        const now = new Date();
        if (now > new Date(event.endDate)) {
            return res.status(400).json({ message: "This event has already ended" });
        }

        // Optional maxVolunteers check
        const max = event?.volunteerSettings?.maxVolunteers;
        if (max && event.volunteers.length >= max) {
            return res.status(400).json({ message: "Volunteer slots are full" });
        }

        // Add user to volunteers and record registration
        event.volunteers.push(userId);
        if (!Array.isArray(event.volunteerRegistrations)) event.volunteerRegistrations = [];
        event.volunteerRegistrations.push({
            user: userId,
            name: req.user?.name,
            email: req.user?.email,
            age: req.body?.age ? Number(req.body.age) : undefined,
            department: req.body?.department || undefined,
            skills: req.body?.skills || [],
            additionalNotes: req.body?.additionalNotes || ''
        });
        await event.save();

        // Send notification to event creator about new volunteer
        try {
            const { notifyUsers } = await import("../utils/notify.js");
            await notifyUsers({
                userIds: [event.createdBy],
                title: "New Volunteer Registration",
                message: `${req.user?.name || 'A user'} registered as a volunteer for "${event.title}"`,
                payload: {
                    eventId: event._id,
                    userId: userId,
                    type: "volunteer_registered"
                }
            });
        } catch (notifError) {
            console.error("Error sending notification:", notifError);
            // Don't fail the request if notification fails
        }

        res.status(200).json({ 
            success: true, 
            message: "Successfully joined the event as a volunteer" 
        });
    } catch (error) {
        res.status(500).json({ message: "Error joining event", error: error.message });
    }
};

// Donate to Event
export const donateToEvent = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { amount } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid donation amount" });
        }

        const event = await eventModel.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check if event is open for donations
        if (!event.isOpenForDonation) {
            return res.status(400).json({ message: "This event is not open for donations" });
        }

        // Check if event has ended
        const now = new Date();
        if (now > new Date(event.endDate)) {
            return res.status(400).json({ message: "This event has already ended" });
        }

        // Add donation to event
        if (!event.donations) {
            event.donations = [];
        }

        event.donations.push({
            donor: userId,
            amount: amount,
            donatedAt: new Date()
        });

        // Update total donations
        event.totalDonations = (event.totalDonations || 0) + amount;

        await event.save();

        res.status(200).json({ 
            success: true, 
            message: "Thank you for your donation!",
            donation: {
                amount: amount,
                total: event.totalDonations
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Error processing donation", error: error.message });
    }
};

// Create Event by CRD (direct publish/approved)
export const crdCreateEvent = async (req, res) => {
    const files = [];
    try {
        const { title, description, startDate, endDate, location, isOpenForDonation, isOpenForVolunteer, volunteerSettings, status } = req.body;
        if (!title || !startDate || !endDate || !location) {
            return res.status(400).json({ message: "Missing required fields", required: "title, startDate, endDate, location" });
        }
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: "User not authenticated" });

        let imageBase64 = "";
        let docBase64 = "";
        if (req.files?.image?.[0]) { files.push(req.files.image[0].path); imageBase64 = fileToBase64(req.files.image[0]); }
        if (req.files?.proposalDocument?.[0]) { files.push(req.files.proposalDocument[0].path); docBase64 = fileToBase64(req.files.proposalDocument[0]); }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ message: "Invalid start or end date" });
        if (end <= start) return res.status(400).json({ message: "End date/time must be after start date/time" });

        const allowedInitial = ["Approved", "Upcoming", "Pending"];
        const initialStatus = allowedInitial.includes(status) ? status : "Pending";

        const newEvent = new eventModel({
            title,
            description,
            startDate: start,
            endDate: end,
            location,
            createdBy: userId,
            image: imageBase64,
            proposalDocument: docBase64,
            isOpenForDonation: isOpenForDonation === 'true' || isOpenForDonation === true,
            isOpenForVolunteer: isOpenForVolunteer === 'true' || isOpenForVolunteer === true,
            volunteerSettings: (() => {
                try {
                    if (!volunteerSettings) return undefined;
                    const parsed = typeof volunteerSettings === 'string' ? JSON.parse(volunteerSettings) : volunteerSettings;
                    return parsed;
                } catch (_) { return undefined; }
            })(),
            status: initialStatus
        });

        await newEvent.save();
        files.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
        
        // Populate the event before returning
        const populatedEvent = await eventModel.findById(newEvent._id)
            .populate("createdBy", "name email profileImage")
            .populate("volunteers", "name email")
            .populate("comments.user", "name email profileImage")
            .populate("reviewedBy", "name email profileImage");

        // Log CRD event creation - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: userId,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'EVENT_CREATED',
            resourceType: 'event',
            resourceId: newEvent._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 201,
            success: true,
            newValues: {
                title: title,
                status: initialStatus,
                eventCategory: 'other'
            }
        }).catch(err => console.error('Failed to log audit:', err));
        
        res.status(201).json({ message: "Event created successfully", event: populatedEvent });
    } catch (error) {
        files.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
        res.status(500).json({ message: "Error creating event", error: error.message });
    }
};

// Duplicate existing Event (CRD)
export const duplicateEvent = async (req, res) => {
    const files = [];
    try {
        const source = await eventModel.findById(req.params.id);
        if (!source) return res.status(404).json({ message: "Source event not found" });
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: "User not authenticated" });

        const { title, description, location, startDate, endDate, isOpenForDonation, isOpenForVolunteer, volunteerSettings, status } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!startDate || !endDate || isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ message: "Valid startDate and endDate are required" });
        if (end <= start) return res.status(400).json({ message: "End date/time must be after start date/time" });

        let imageBase64 = source.image || "";
        let docBase64 = source.proposalDocument || "";
        if (req.files?.image?.[0]) { files.push(req.files.image[0].path); imageBase64 = fileToBase64(req.files.image[0]); }
        if (req.files?.proposalDocument?.[0]) { files.push(req.files.proposalDocument[0].path); docBase64 = fileToBase64(req.files.proposalDocument[0]); }

        const allowedStatuses = ["Approved", "Upcoming"];
        const nextStatus = allowedStatuses.includes(status) ? status : "Approved";

        const duplicated = new eventModel({
            title: title ?? source.title,
            description: description ?? source.description,
            startDate: start,
            endDate: end,
            location: location ?? source.location,
            createdBy: userId,
            image: imageBase64,
            proposalDocument: docBase64,
            isOpenForDonation: typeof isOpenForDonation !== 'undefined' ? (isOpenForDonation === 'true' || isOpenForDonation === true) : source.isOpenForDonation,
            isOpenForVolunteer: typeof isOpenForVolunteer !== 'undefined' ? (isOpenForVolunteer === 'true' || isOpenForVolunteer === true) : source.isOpenForVolunteer,
            volunteerSettings: (() => {
                try {
                    if (typeof volunteerSettings === 'undefined' || volunteerSettings === null) return source.volunteerSettings;
                    const parsed = typeof volunteerSettings === 'string' ? JSON.parse(volunteerSettings) : volunteerSettings;
                    return parsed;
                } catch (_) { return source.volunteerSettings; }
            })(),
            status: nextStatus,
            volunteers: [],
            volunteerRegistrations: [],
            donations: [],
            totalDonations: 0
        });

        await duplicated.save();
        files.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
        
        // Populate the event before returning
        const populatedEvent = await eventModel.findById(duplicated._id)
            .populate("createdBy", "name email profileImage")
            .populate("volunteers", "name email")
            .populate("comments.user", "name email profileImage")
            .populate("reviewedBy", "name email profileImage");
        
        res.status(201).json({ message: "Event duplicated successfully", event: populatedEvent });
    } catch (error) {
        files.forEach(f => { try { fs.unlinkSync(f); } catch (_) {} });
        res.status(500).json({ message: "Error duplicating event", error: error.message });
    }
};

// Update event status (CRD/System Admin)
export const updateEventStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ["Upcoming", "Ongoing", "Completed"];
        if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status. Use Upcoming, Ongoing, or Completed." });
        
        // Get event before update
        const eventBefore = await eventModel.findById(req.params.id).select('title status');
        if (!eventBefore) return res.status(404).json({ message: "Event not found" });
        
        const updated = await eventModel.findByIdAndUpdate(req.params.id, { status }, { new: true })
        .populate("createdBy", "name email profileImage")
        .populate("volunteers", "name email")
        .populate("comments.user", "name email profileImage")
        .populate("reviewedBy", "name email profileImage");
        if (!updated) return res.status(404).json({ message: "Event not found" });

        // Log event status change - don't await, fire and forget
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        createAuditLog({
            userId: req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            actionType: 'EVENT_STATUS_CHANGED',
            resourceType: 'event',
            resourceId: updated._id,
            ipAddress: clientIp,
            userAgent: userAgent,
            requestMethod: req.method,
            requestEndpoint: req.path,
            responseStatus: 200,
            success: true,
            previousValues: { status: eventBefore.status },
            newValues: { status: status }
        }).catch(err => console.error('Failed to log audit:', err));

        res.status(200).json({ message: "Event status updated", event: updated });
    } catch (error) {
        res.status(500).json({ message: "Error updating status", error: error.message });
    }
};
