import mongoose from "mongoose";

// Category mapping for action types
export const ACTION_CATEGORIES = {
    // Authentication & Authorization
    USER_LOGIN: 'Authentication & Authorization',
    USER_LOGOUT: 'Authentication & Authorization',
    LOGIN_FAILURE: 'Authentication & Authorization',
    PASSWORD_RESET_REQUEST: 'Authentication & Authorization',
    PASSWORD_CHANGE: 'Authentication & Authorization',
    EMAIL_VERIFICATION: 'Authentication & Authorization',
    ACCOUNT_LOCKOUT: 'Authentication & Authorization',
    ACCOUNT_UNLOCK: 'Authentication & Authorization',
    SESSION_TIMEOUT: 'Authentication & Authorization',
    MFA_EVENT: 'Authentication & Authorization',
    
    // User Management
    USER_CREATED: 'User Management',
    USER_DELETED: 'User Management',
    USER_ROLE_CHANGED: 'User Management',
    USER_PROFILE_UPDATED: 'User Management',
    USER_VERIFICATION_CHANGED: 'User Management',
    USER_ACTIVATED: 'User Management',
    USER_DEACTIVATED: 'User Management',
    BULK_USER_OPERATION: 'User Management',
    
    // System Administrator Actions
    SYSTEM_SETTINGS_CHANGED: 'System Administrator Actions',
    CONFIGURATION_MODIFIED: 'System Administrator Actions',
    SYSTEM_MAINTENANCE: 'System Administrator Actions',
    DATABASE_BACKUP: 'System Administrator Actions',
    DATABASE_RESTORE: 'System Administrator Actions',
    CONFIG_EXPORT: 'System Administrator Actions',
    SENSITIVE_DATA_ACCESS: 'System Administrator Actions',
    ADMIN_PRIVILEGE_ESCALATION: 'System Administrator Actions',
    
    // Wallet Management
    WALLET_CREATED: 'Wallet Management',
    WALLET_UPDATED: 'Wallet Management',
    WALLET_ACTIVATED: 'Wallet Management',
    WALLET_DEACTIVATED: 'Wallet Management',
    WEBHOOK_SECRET_CHANGED: 'Wallet Management',
    WALLET_KEY_REGENERATED: 'Wallet Management',
    WALLET_ACCESS_ATTEMPT: 'Wallet Management',
    WALLET_VERIFICATION_CHANGED: 'Wallet Management',
    
    // Event Management
    EVENT_CREATED: 'Event Management',
    EVENT_UPDATED: 'Event Management',
    EVENT_DELETED: 'Event Management',
    EVENT_APPROVED: 'Event Management',
    EVENT_REJECTED: 'Event Management',
    EVENT_STATUS_CHANGED: 'Event Management',
    EVENT_CANCELLED: 'Event Management',
    EVENT_PUBLISHED: 'Event Management',
    EVENT_UNPUBLISHED: 'Event Management',
    
    // Donation Transactions
    DONATION_CREATED: 'Donation Transactions',
    DONATION_STATUS_CHANGED: 'Donation Transactions',
    PAYMENT_PROCESSING_ATTEMPT: 'Donation Transactions',
    PAYMENT_SUCCESS: 'Donation Transactions',
    PAYMENT_FAILURE: 'Donation Transactions',
    REFUND_PROCESSED: 'Donation Transactions',
    IN_KIND_DONATION_CREATED: 'Donation Transactions',
    IN_KIND_DONATION_UPDATED: 'Donation Transactions',
    FINANCIAL_DATA_EXPORT: 'Donation Transactions',
    RECEIPT_GENERATED: 'Donation Transactions',
    
    // Volunteer Management
    VOLUNTEER_REGISTERED: 'Volunteer Management',
    VOLUNTEER_APPROVED: 'Volunteer Management',
    VOLUNTEER_REJECTED: 'Volunteer Management',
    ATTENDANCE_MARKED: 'Volunteer Management',
    ATTENDANCE_MODIFIED: 'Volunteer Management',
    VOLUNTEER_HOURS_UPDATED: 'Volunteer Management',
    VOLUNTEER_REMOVED: 'Volunteer Management',
    
    // Data Access & Privacy
    SENSITIVE_DATA_ACCESSED: 'Data Access & Privacy',
    DATA_EXPORTED: 'Data Access & Privacy',
    DATA_DELETION_REQUEST: 'Data Access & Privacy',
    PRIVACY_POLICY_ACCEPTED: 'Data Access & Privacy',
    GDPR_ACTION: 'Data Access & Privacy',
    
    // System Operations
    SYSTEM_ERROR: 'System Operations',
    API_RATE_LIMIT_VIOLATION: 'System Operations',
    UNAUTHORIZED_ACCESS_ATTEMPT: 'System Operations',
    SECURITY_POLICY_VIOLATION: 'System Operations',
    SYSTEM_PERFORMANCE_ISSUE: 'System Operations',
    DATABASE_QUERY_FAILURE: 'System Operations',
    EXTERNAL_API_FAILURE: 'System Operations',
    
    // Content Management
    NOTIFICATION_CREATED: 'Content Management',
    NOTIFICATION_SENT: 'Content Management',
    SYSTEM_ANNOUNCEMENT: 'Content Management',
    CONTENT_MODERATION: 'Content Management',
    FILE_UPLOADED: 'Content Management',
    FILE_DOWNLOADED: 'Content Management',
    DOCUMENT_GENERATED: 'Content Management',
    IMAGE_OPERATION: 'Content Management',
    
    // Settings & Configuration
    SETTINGS_CHANGED: 'Settings & Configuration',
    EMAIL_CONFIG_CHANGED: 'Settings & Configuration',
    PAYMENT_GATEWAY_CONFIG_CHANGED: 'Settings & Configuration',
    NOTIFICATION_PREFERENCES_CHANGED: 'Settings & Configuration',
    FEATURE_TOGGLE: 'Settings & Configuration',
    MAINTENANCE_MODE: 'Settings & Configuration',
    
    // Reports & Analytics
    REPORT_GENERATED: 'Reports & Analytics',
    REPORT_EXPORTED: 'Reports & Analytics',
    ANALYTICS_DATA_ACCESSED: 'Reports & Analytics',
    DASHBOARD_ACCESSED: 'Reports & Analytics',
    SCHEDULED_REPORT_EXECUTED: 'Reports & Analytics',
    
    // Integration Events
    WEBHOOK_DELIVERED: 'Integration Events',
    WEBHOOK_FAILED: 'Integration Events',
    EXTERNAL_API_CALL: 'Integration Events',
    THIRD_PARTY_SERVICE_FAILURE: 'Integration Events',
    INTEGRATION_CONFIG_CHANGED: 'Integration Events',
    
    // Compliance & Audit
    AUDIT_LOG_ACCESSED: 'Compliance & Audit',
    AUDIT_LOG_EXPORTED: 'Compliance & Audit',
    COMPLIANCE_REPORT_GENERATED: 'Compliance & Audit',
    DATA_RETENTION_ENFORCED: 'Compliance & Audit',
    LEGAL_ACTION: 'Compliance & Audit',
    
    // Department/Organization Actions
    DEPARTMENT_WALLET_OPERATION: 'Department/Organization Actions',
    DEPARTMENT_EVENT_MANAGEMENT: 'Department/Organization Actions',
    DEPARTMENT_FINANCIAL_TRANSACTION: 'Department/Organization Actions',
    DEPARTMENT_SETTINGS_CHANGED: 'Department/Organization Actions',
};

// Priority levels
export const PRIORITY_LEVELS = {
    CRITICAL: 'Critical',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low'
};

// Retention periods in days
export const RETENTION_PERIODS = {
    Critical: 7 * 365, // 7 years
    High: 7 * 365,     // 7 years
    Medium: 2 * 365,  // 2 years
    Low: 365          // 1 year
};

const auditLogSchema = new mongoose.Schema({
    // Timestamp
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    
    // User Information
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true
    },
    userEmail: {
        type: String,
        index: true
    },
    userRole: {
        type: String,
        enum: ["User", "System Administrator", "CRD Staff", "Department/Organization", "Auditor"],
        index: true
    },
    
    // Action Details
    actionType: {
        type: String,
        required: true,
        index: true
    },
    category: {
        type: String,
        index: true
    },
    resourceType: {
        type: String, // e.g., "user", "event", "donation", "wallet"
        index: true
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId
    },
    
    // Request Information
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    requestMethod: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    },
    requestEndpoint: {
        type: String
    },
    requestPayload: {
        type: mongoose.Schema.Types.Mixed // Sanitized payload (no sensitive data)
    },
    
    // Response Information
    responseStatus: {
        type: Number
    },
    success: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    },
    errorMessage: {
        type: String
    },
    
    // Change Tracking
    previousValues: {
        type: mongoose.Schema.Types.Mixed
    },
    newValues: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // Session Information
    sessionId: {
        type: String
    },
    
    // Geographic Location (if available)
    location: {
        country: String,
        region: String,
        city: String
    },
    
    // Priority Level
    priority: {
        type: String,
        enum: Object.values(PRIORITY_LEVELS),
        required: true,
        default: PRIORITY_LEVELS.MEDIUM,
        index: true
    },
    
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

// Compound indexes for common queries
auditLogSchema.index({ timestamp: -1, priority: 1 });
auditLogSchema.index({ category: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ actionType: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, timestamp: -1 });

// Text index for search functionality
auditLogSchema.index({
    actionType: 'text',
    userEmail: 'text',
    resourceType: 'text',
    errorMessage: 'text'
});

// Static method to get category from action type
auditLogSchema.statics.getCategory = function(actionType) {
    return ACTION_CATEGORIES[actionType] || 'System Operations';
};

// Static method to determine priority based on action type
auditLogSchema.statics.getPriority = function(actionType) {
    const criticalActions = [
        'LOGIN_FAILURE',
        'UNAUTHORIZED_ACCESS_ATTEMPT',
        'SECURITY_POLICY_VIOLATION',
        'USER_DELETED',
        'WALLET_KEY_REGENERATED',
        'PAYMENT_FAILURE',
        'SYSTEM_ERROR',
        'DATABASE_QUERY_FAILURE'
    ];
    
    const highActions = [
        'USER_ROLE_CHANGED',
        'SYSTEM_SETTINGS_CHANGED',
        'DATA_EXPORTED',
        'WALLET_CREATED',
        'WALLET_UPDATED',
        'ADMIN_PRIVILEGE_ESCALATION',
        'FINANCIAL_DATA_EXPORT'
    ];
    
    if (criticalActions.includes(actionType)) {
        return PRIORITY_LEVELS.CRITICAL;
    } else if (highActions.includes(actionType)) {
        return PRIORITY_LEVELS.HIGH;
    } else {
        return PRIORITY_LEVELS.MEDIUM;
    }
};

// Method to check if log should be retained
auditLogSchema.methods.shouldRetain = function() {
    const retentionDays = RETENTION_PERIODS[this.priority] || RETENTION_PERIODS.Low;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - retentionDays);
    return this.timestamp >= expiryDate;
};

// Pre-save middleware to set category and priority if not provided
auditLogSchema.pre('save', function(next) {
    // Only set category if it's not already set
    if (!this.category && this.actionType) {
        this.category = ACTION_CATEGORIES[this.actionType] || 'System Operations';
    }
    
    // Only set priority if it's not already set
    if (!this.priority && this.actionType) {
        const criticalActions = [
            'LOGIN_FAILURE',
            'UNAUTHORIZED_ACCESS_ATTEMPT',
            'SECURITY_POLICY_VIOLATION',
            'USER_DELETED',
            'WALLET_KEY_REGENERATED',
            'PAYMENT_FAILURE',
            'SYSTEM_ERROR',
            'DATABASE_QUERY_FAILURE'
        ];
        
        const highActions = [
            'USER_ROLE_CHANGED',
            'SYSTEM_SETTINGS_CHANGED',
            'DATA_EXPORTED',
            'WALLET_CREATED',
            'WALLET_UPDATED',
            'ADMIN_PRIVILEGE_ESCALATION',
            'FINANCIAL_DATA_EXPORT'
        ];
        
        if (criticalActions.includes(this.actionType)) {
            this.priority = PRIORITY_LEVELS.CRITICAL;
        } else if (highActions.includes(this.actionType)) {
            this.priority = PRIORITY_LEVELS.HIGH;
        } else {
            this.priority = PRIORITY_LEVELS.MEDIUM;
        }
    }
    next();
});

const AuditLog = mongoose.model('auditLog', auditLogSchema);

export default AuditLog;

