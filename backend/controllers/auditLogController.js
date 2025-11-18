import AuditLog, { ACTION_CATEGORIES, PRIORITY_LEVELS } from '../models/auditLogModel.js';
import userModel from '../models/userModel.js';

// Get all audit logs with filtering and pagination
export const getAuditLogs = async (req, res) => {
    try {
        // Check if user is System Administrator
        if (req.user?.role !== 'System Administrator') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only System Administrators can access audit logs' 
            });
        }

        const {
            page = 1,
            limit = 50,
            category,
            startDate,
            endDate,
            userId,
            actionType,
            priority,
            success,
            search,
            resourceType,
            resourceId
        } = req.query;

        // Build query
        const query = {};

        // Category filter
        if (category) {
            query.category = category;
        }

        // Date range filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate);
            }
        }

        // User filter
        if (userId) {
            query.userId = userId;
        }

        // Action type filter
        if (actionType) {
            query.actionType = actionType;
        }

        // Priority filter
        if (priority) {
            query.priority = priority;
        }

        // Success filter
        if (success !== undefined) {
            query.success = success === 'true';
        }

        // Resource type filter
        if (resourceType) {
            query.resourceType = resourceType;
        }

        // Resource ID filter
        if (resourceId) {
            query.resourceId = resourceId;
        }

        // Text search
        if (search) {
            query.$or = [
                { actionType: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } },
                { resourceType: { $regex: search, $options: 'i' } },
                { errorMessage: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination
        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 }) // Most recent first
            .skip(skip)
            .limit(limitNum)
            .populate('userId', 'name email role')
            .lean();

        // Get total count for pagination
        const total = await AuditLog.countDocuments(query);

        // Format response
        const formattedLogs = logs.map(log => ({
            _id: log._id,
            timestamp: log.timestamp,
            userId: log.userId?._id || log.userId,
            userEmail: log.userEmail || log.userId?.email,
            userName: log.userId?.name,
            userRole: log.userRole || log.userId?.role,
            actionType: log.actionType,
            category: log.category,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            requestMethod: log.requestMethod,
            requestEndpoint: log.requestEndpoint,
            requestPayload: log.requestPayload,
            responseStatus: log.responseStatus,
            success: log.success,
            errorMessage: log.errorMessage,
            previousValues: log.previousValues,
            newValues: log.newValues,
            sessionId: log.sessionId,
            location: log.location,
            priority: log.priority,
            metadata: log.metadata
        }));

        res.json({
            success: true,
            logs: formattedLogs,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get audit logs by category
export const getAuditLogsByCategory = async (req, res) => {
    try {
        // Check if user is System Administrator
        if (req.user?.role !== 'System Administrator') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only System Administrators can access audit logs' 
            });
        }

        const { category } = req.params;
        const {
            page = 1,
            limit = 50,
            startDate,
            endDate,
            priority,
            success
        } = req.query;

        // Build query
        const query = { category };

        // Date range filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                query.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                query.timestamp.$lte = new Date(endDate);
            }
        }

        // Priority filter
        if (priority) {
            query.priority = priority;
        }

        // Success filter
        if (success !== undefined) {
            query.success = success === 'true';
        }

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute query
        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate('userId', 'name email role')
            .lean();

        // Get total count
        const total = await AuditLog.countDocuments(query);

        // Format response
        const formattedLogs = logs.map(log => ({
            _id: log._id,
            timestamp: log.timestamp,
            userId: log.userId?._id || log.userId,
            userEmail: log.userEmail || log.userId?.email,
            userName: log.userId?.name,
            userRole: log.userRole || log.userId?.role,
            actionType: log.actionType,
            category: log.category,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            requestMethod: log.requestMethod,
            requestEndpoint: log.requestEndpoint,
            requestPayload: log.requestPayload,
            responseStatus: log.responseStatus,
            success: log.success,
            errorMessage: log.errorMessage,
            previousValues: log.previousValues,
            newValues: log.newValues,
            sessionId: log.sessionId,
            location: log.location,
            priority: log.priority,
            metadata: log.metadata
        }));

        res.json({
            success: true,
            logs: formattedLogs,
            category,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching audit logs by category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs by category',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get audit log statistics
export const getAuditLogStats = async (req, res) => {
    try {
        // Check if user is System Administrator
        if (req.user?.role !== 'System Administrator') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only System Administrators can access audit log statistics' 
            });
        }

        const { startDate, endDate } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.timestamp = {};
            if (startDate) {
                dateFilter.timestamp.$gte = new Date(startDate);
            }
            if (endDate) {
                dateFilter.timestamp.$lte = new Date(endDate);
            }
        }

        // Get counts by category
        const categoryStats = await AuditLog.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    successCount: {
                        $sum: { $cond: ['$success', 1, 0] }
                    },
                    failureCount: {
                        $sum: { $cond: ['$success', 0, 1] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get counts by priority
        const priorityStats = await AuditLog.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Get counts by action type (top 10)
        const actionTypeStats = await AuditLog.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$actionType',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get total counts
        const totalLogs = await AuditLog.countDocuments(dateFilter);
        const successCount = await AuditLog.countDocuments({ ...dateFilter, success: true });
        const failureCount = await AuditLog.countDocuments({ ...dateFilter, success: false });

        // Get recent activity (last 24 hours)
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);
        const recentActivity = await AuditLog.countDocuments({
            timestamp: { $gte: last24Hours }
        });

        // Get unique users count
        const uniqueUsers = await AuditLog.distinct('userId', dateFilter);

        res.json({
            success: true,
            stats: {
                total: totalLogs,
                success: successCount,
                failure: failureCount,
                recentActivity24h: recentActivity,
                uniqueUsers: uniqueUsers.length,
                byCategory: categoryStats,
                byPriority: priorityStats,
                topActions: actionTypeStats
            }
        });
    } catch (error) {
        console.error('Error fetching audit log statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit log statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function to create audit log (can be used by other controllers)
export const createAuditLog = async (logData) => {
    try {
        const {
            userId,
            userEmail,
            userRole,
            actionType,
            resourceType,
            resourceId,
            ipAddress,
            userAgent,
            requestMethod,
            requestEndpoint,
            requestPayload,
            responseStatus,
            success = true,
            errorMessage,
            previousValues,
            newValues,
            sessionId,
            location,
            priority,
            metadata
        } = logData;

        // Sanitize request payload (remove sensitive data)
        const sanitizedPayload = sanitizePayload(requestPayload);

        // Get category and priority if not provided
        // Use ACTION_CATEGORIES directly (already imported at top)
        const category = logData.category || ACTION_CATEGORIES[actionType] || 'System Operations';
        
        // Determine priority
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
        
        let finalPriority = priority;
        if (!finalPriority) {
            if (criticalActions.includes(actionType)) {
                finalPriority = PRIORITY_LEVELS.CRITICAL;
            } else if (highActions.includes(actionType)) {
                finalPriority = PRIORITY_LEVELS.HIGH;
            } else {
                finalPriority = PRIORITY_LEVELS.MEDIUM;
            }
        }

        // Get user info if userId provided but email/role not
        let finalUserEmail = userEmail;
        let finalUserRole = userRole;
        
        if (userId && (!userEmail || !userRole)) {
            try {
                const user = await userModel.findById(userId).select('email role');
                if (user) {
                    finalUserEmail = finalUserEmail || user.email;
                    finalUserRole = finalUserRole || user.role;
                }
            } catch (err) {
                console.error('Error fetching user for audit log:', err);
            }
        }

        const auditLog = new AuditLog({
            timestamp: new Date(),
            userId,
            userEmail: finalUserEmail,
            userRole: finalUserRole,
            actionType,
            category,
            resourceType,
            resourceId,
            ipAddress,
            userAgent,
            requestMethod,
            requestEndpoint,
            requestPayload: sanitizedPayload,
            responseStatus,
            success,
            errorMessage,
            previousValues,
            newValues,
            sessionId,
            location,
            priority: finalPriority,
            metadata
        });

        await auditLog.save();
        return auditLog;
    } catch (error) {
        console.error('Error creating audit log:', error);
        // Don't throw error - audit logging should not break main functionality
        return null;
    }
};

// Helper function to sanitize payload (remove sensitive data)
const sanitizePayload = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return payload;
    }

    const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'apiKey',
        'accessToken',
        'refreshToken',
        'authorization',
        'creditCard',
        'cvv',
        'ssn',
        'socialSecurityNumber'
    ];

    const sanitized = Array.isArray(payload) ? [...payload] : { ...payload };

    for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizePayload(sanitized[key]);
        }
    }

    return sanitized;
};

