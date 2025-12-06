import React from 'react';
import { FaInbox, FaSearch, FaFolderOpen, FaCalendarAlt, FaHandHoldingHeart, FaUsers, FaBoxOpen } from 'react-icons/fa';
import Button from './Button';

/**
 * Reusable Empty State Component
 * 
 * Provides consistent empty state messaging across the application
 * with helpful icons, messages, and call-to-action buttons
 */
const EmptyState = ({
    icon = 'inbox',
    title,
    message,
    actionLabel,
    onAction,
    className = ''
}) => {
    const iconMap = {
        inbox: <FaInbox className="w-16 h-16" />,
        search: <FaSearch className="w-16 h-16" />,
        folder: <FaFolderOpen className="w-16 h-16" />,
        calendar: <FaCalendarAlt className="w-16 h-16" />,
        donation: <FaHandHoldingHeart className="w-16 h-16" />,
        users: <FaUsers className="w-16 h-16" />,
        box: <FaBoxOpen className="w-16 h-16" />
    };

    const selectedIcon = iconMap[icon] || iconMap.inbox;

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
            {/* Icon */}
            <div className="mb-4 text-gray-400" aria-hidden="true">
                {selectedIcon}
            </div>

            {/* Title */}
            {title && (
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {title}
                </h3>
            )}

            {/* Message */}
            {message && (
                <p className="text-gray-600 mb-6 max-w-md">
                    {message}
                </p>
            )}

            {/* Action Button */}
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    variant="maroon"
                    size="md"
                    aria-label={actionLabel}
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export default EmptyState;

