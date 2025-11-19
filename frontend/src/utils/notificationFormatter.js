/**
 * Format notification payload into human-readable text
 */
export function formatNotificationPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const formatted = [];
    
    // Handle different notification types
    switch (payload.type) {
        case 'event_created':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.eventName) {
                formatted.push({ label: 'Event Name', value: payload.eventName });
            }
            break;
            
        case 'event_updated':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.changes) {
                formatted.push({ label: 'Changes', value: Object.keys(payload.changes).join(', ') });
            }
            break;
            
        case 'volunteer_invitation':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.eventName) {
                formatted.push({ label: 'Event', value: payload.eventName });
            }
            if (payload.invitedBy) {
                formatted.push({ label: 'Invited By', value: payload.invitedBy });
            }
            break;
            
        case 'volunteer_approved':
        case 'volunteer_registered':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.eventName) {
                formatted.push({ label: 'Event', value: payload.eventName });
            }
            break;
            
        case 'volunteer_invitation_accepted':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.volunteerName) {
                formatted.push({ label: 'Volunteer', value: payload.volunteerName });
            }
            break;
            
        case 'donation_received':
        case 'donation_success':
            if (payload.donationId) {
                formatted.push({ label: 'Donation ID', value: payload.donationId });
            }
            if (payload.amount) {
                formatted.push({ label: 'Amount', value: `₱${parseFloat(payload.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` });
            }
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            break;
            
        case 'feedback_deadline':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.deadline) {
                formatted.push({ label: 'Deadline', value: new Date(payload.deadline).toLocaleString() });
            }
            break;
            
        case 'attendance_recorded':
            if (payload.eventId) {
                formatted.push({ label: 'Event ID', value: payload.eventId });
            }
            if (payload.hoursWorked) {
                formatted.push({ label: 'Hours Worked', value: `${payload.hoursWorked} hours` });
            }
            break;
            
        default:
            // Generic formatting for unknown types
            Object.keys(payload).forEach(key => {
                if (key !== 'type' && key !== 'url') {
                    let value = payload[key];
                    if (typeof value === 'object') {
                        value = JSON.stringify(value);
                    }
                    formatted.push({ 
                        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), 
                        value: String(value) 
                    });
                }
            });
    }
    
    return formatted.length > 0 ? formatted : null;
}

/**
 * Get notification icon type name for React Icons
 * Returns the icon name that should be imported from react-icons/fa
 */
export function getNotificationIconType(type) {
    const iconMap = {
        'event_created': 'FaCalendarAlt',
        'event_updated': 'FaSyncAlt',
        'event_cancelled': 'FaTimesCircle',
        'event_reminder': 'FaClock',
        'volunteer_invitation': 'FaUsers',
        'volunteer_approved': 'FaCheckCircle',
        'volunteer_registered': 'FaUserCheck',
        'volunteer_invitation_accepted': 'FaCheckCircle',
        'donation_received': 'FaHandHoldingHeart',
        'donation_success': 'FaCreditCard',
        'feedback_deadline': 'FaExclamationCircle',
        'attendance_recorded': 'FaCheckCircle',
        'comment_added': 'FaComment',
        'reaction_added': 'FaThumbsUp',
    };
    
    return iconMap[type] || 'FaBell';
}

/**
 * Get notification color class based on type
 * All icons use maroon color for consistency
 */
export function getNotificationColorClass(type) {
    // All notifications use maroon gradient for consistency
    return 'from-[#800000] to-[#900000]';
}

