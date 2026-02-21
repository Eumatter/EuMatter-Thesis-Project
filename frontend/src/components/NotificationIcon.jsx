import React from 'react';
import {
    FaBell,
    FaCalendarAlt,
    FaSyncAlt,
    FaTimesCircle,
    FaClock,
    FaUsers,
    FaCheckCircle,
    FaUserPlus,
    FaHandHoldingHeart,
    FaCreditCard,
    FaExclamationTriangle,
    FaComment,
    FaThumbsUp,
} from 'react-icons/fa';

const TYPE_TO_ICON = {
    event_created: FaCalendarAlt,
    event_updated: FaSyncAlt,
    event_cancelled: FaTimesCircle,
    event_reminder: FaClock,
    volunteer_invitation: FaUsers,
    volunteer_approved: FaCheckCircle,
    volunteer_registered: FaUserPlus,
    volunteer_invitation_accepted: FaCheckCircle,
    donation_received: FaHandHoldingHeart,
    donation_success: FaCreditCard,
    feedback_deadline: FaExclamationTriangle,
    attendance_recorded: FaCheckCircle,
    comment_added: FaComment,
    reaction_added: FaThumbsUp,
};

const ICON_SIZES = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

/** Single color for all notification icons (all roles). No background. */
const NOTIFICATION_ICON_COLOR = 'text-[#800000]';

/**
 * Shared notification icon: solid icon only, same color for all roles.
 * No background — use in Header dropdown and Notifications page.
 */
const NotificationIcon = ({ type = 'system', size = 'md', className = '' }) => {
    const Icon = TYPE_TO_ICON[type] || FaBell;
    const iconClass = ICON_SIZES[size] || ICON_SIZES.md;

    return (
        <span className={`flex-shrink-0 flex items-center justify-center ${NOTIFICATION_ICON_COLOR} ${className}`} aria-hidden>
            <Icon className={iconClass} />
        </span>
    );
};

export default NotificationIcon;
