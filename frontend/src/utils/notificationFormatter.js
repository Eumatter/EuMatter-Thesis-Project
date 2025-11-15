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
 * Get notification icon based on type
 */
export function getNotificationIcon(type) {
    const iconMap = {
        'event_created': '📅',
        'event_updated': '🔄',
        'event_cancelled': '❌',
        'event_reminder': '⏰',
        'volunteer_invitation': '👥',
        'volunteer_approved': '✅',
        'volunteer_registered': '📝',
        'volunteer_invitation_accepted': '🎉',
        'donation_received': '💰',
        'donation_success': '💳',
        'feedback_deadline': '⚠️',
        'attendance_recorded': '✅',
        'comment_added': '💬',
        'reaction_added': '👍',
    };
    
    return iconMap[type] || '🔔';
}

/**
 * Get notification color class based on type
 */
export function getNotificationColorClass(type) {
    const colorMap = {
        'event_created': 'from-[#800000] to-[#900000]',
        'event_updated': 'from-[#D4AF37] to-[#C9A227]', // Gold
        'event_cancelled': 'from-red-500 to-red-600',
        'event_reminder': 'from-[#D4AF37] to-[#C9A227]', // Gold
        'volunteer_invitation': 'from-[#800000] to-[#900000]',
        'volunteer_approved': 'from-green-500 to-green-600',
        'volunteer_registered': 'from-blue-500 to-blue-600',
        'volunteer_invitation_accepted': 'from-[#D4AF37] to-[#C9A227]', // Gold
        'donation_received': 'from-[#D4AF37] to-[#C9A227]', // Gold
        'donation_success': 'from-green-500 to-green-600',
        'feedback_deadline': 'from-orange-500 to-orange-600',
        'attendance_recorded': 'from-green-500 to-green-600',
        'comment_added': 'from-blue-500 to-blue-600',
        'reaction_added': 'from-purple-500 to-purple-600',
    };
    
    return colorMap[type] || 'from-[#800000] to-[#900000]';
}

