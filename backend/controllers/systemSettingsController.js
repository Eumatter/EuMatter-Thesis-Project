import SystemSettings from '../models/systemSettingsModel.js';
import mongoose from 'mongoose';

// Get system settings
export const getSystemSettings = async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: 'Database connection unavailable. Please try again later.' 
            });
        }

        // Check if user is System Administrator
        if (req.user?.role !== 'System Administrator') {
            return res.status(403).json({ success: false, message: 'Only System Administrators can access system settings' });
        }

        // Check if maintenance mode should be auto-disabled
        const { checkMaintenanceModeExpiry } = await import('../utils/maintenanceScheduler.js');
        await checkMaintenanceModeExpiry();

        const settings = await SystemSettings.getSettings();
        res.json({ success: true, settings });
    } catch (error) {
        // Only log if it's not a connection error
        if (error.name !== 'MongooseError' || !error.message.includes('buffering')) {
            console.error('Error fetching system settings:', error.message);
        }
        res.status(500).json({ success: false, message: 'Failed to fetch system settings' });
    }
};

// Get maintenance mode status (public endpoint)
export const getMaintenanceMode = async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            // Return default (no maintenance) if DB is not connected
            return res.json({ success: true, maintenanceMode: false });
        }

        // Check if maintenance mode should be auto-disabled
        const { checkMaintenanceModeExpiry } = await import('../utils/maintenanceScheduler.js');
        await checkMaintenanceModeExpiry();
        
        const settings = await SystemSettings.getSettings();
        res.json({ 
            success: true, 
            maintenanceMode: settings.maintenanceMode.enabled,
            message: settings.maintenanceMode.message,
            estimatedEndTime: settings.maintenanceMode.estimatedEndTime,
            allowedRoles: settings.maintenanceMode.allowedRoles || ['System Administrator', 'CRD Staff']
        });
    } catch (error) {
        // Only log if it's not a connection error
        if (error.name !== 'MongooseError' || !error.message.includes('buffering')) {
            console.error('Error fetching maintenance mode:', error.message);
        }
        // Return default (no maintenance) on error
        res.json({ success: true, maintenanceMode: false });
    }
};

// Get in-kind donation settings (public endpoint - users need this for donation form)
export const getInKindDonationSettings = async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            // Return default settings if DB is not connected
            return res.json({ 
                success: true, 
                inKindDonationSettings: {
                    enabled: true,
                    allowedTypes: ["food", "clothing", "school_supplies", "medical_supplies", "equipment", "services", "other"],
                    instructions: "Please provide detailed information about your in-kind donation including item description, quantity, and estimated value. Our team will review your donation and contact you regarding delivery or pickup arrangements."
                }
            });
        }

        const settings = await SystemSettings.getSettings();
        res.json({ 
            success: true, 
            inKindDonationSettings: settings.inKindDonationSettings || {
                enabled: true,
                allowedTypes: ["food", "clothing", "school_supplies", "medical_supplies", "equipment", "services", "other"],
                instructions: "Please provide detailed information about your in-kind donation including item description, quantity, and estimated value. Our team will review your donation and contact you regarding delivery or pickup arrangements."
            }
        });
    } catch (error) {
        // Only log if it's not a connection error
        if (error.name !== 'MongooseError' || !error.message.includes('buffering')) {
            console.error('Error fetching in-kind donation settings:', error.message);
        }
        // Return default settings on error
        res.json({ 
            success: true, 
            inKindDonationSettings: {
                enabled: true,
                allowedTypes: ["food", "clothing", "school_supplies", "medical_supplies", "equipment", "services", "other"],
                instructions: "Please provide detailed information about your in-kind donation including item description, quantity, and estimated value. Our team will review your donation and contact you regarding delivery or pickup arrangements."
            }
        });
    }
};

// Update system settings (System Admin only)
export const updateSystemSettings = async (req, res) => {
    try {
        // Check if user is System Administrator
        if (req.user?.role !== 'System Administrator') {
            return res.status(403).json({ success: false, message: 'Only System Administrators can update system settings' });
        }

        const { maintenanceMode, systemName, emailNotifications, passwordPolicy, twoFactorAuth, inKindDonationSettings } = req.body;
        
        const settings = await SystemSettings.getSettings();
        
        if (maintenanceMode !== undefined) {
            // If disabling maintenance mode, clear the estimated end time
            if (maintenanceMode.enabled === false) {
                settings.maintenanceMode = {
                    enabled: false,
                    message: maintenanceMode.message || settings.maintenanceMode.message,
                    estimatedEndTime: null,
                    allowedRoles: maintenanceMode.allowedRoles || settings.maintenanceMode.allowedRoles || ['System Administrator', 'CRD Staff']
                };
            } else {
                // Validate allowedRoles
                const allowedRoles = maintenanceMode.allowedRoles && Array.isArray(maintenanceMode.allowedRoles) 
                    ? maintenanceMode.allowedRoles 
                    : (settings.maintenanceMode.allowedRoles || ['System Administrator', 'CRD Staff']);
                
                // Ensure at least one role is selected when enabling maintenance mode
                if (maintenanceMode.enabled && allowedRoles.length === 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'At least one role must be selected to allow access during maintenance mode' 
                    });
                }
                
                // If enabling or updating, set the values
                settings.maintenanceMode = {
                    enabled: maintenanceMode.enabled !== undefined ? maintenanceMode.enabled : settings.maintenanceMode.enabled,
                    message: maintenanceMode.message || settings.maintenanceMode.message,
                    estimatedEndTime: maintenanceMode.estimatedEndTime 
                        ? new Date(maintenanceMode.estimatedEndTime) 
                        : (maintenanceMode.enabled ? settings.maintenanceMode.estimatedEndTime : null),
                    allowedRoles: allowedRoles
                };
                
                // If estimatedEndTime is set and is in the past, don't enable maintenance mode
                if (settings.maintenanceMode.estimatedEndTime && new Date() >= settings.maintenanceMode.estimatedEndTime) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Estimated end time must be in the future' 
                    });
                }
            }
        }
        
        if (systemName !== undefined) settings.systemName = systemName;
        if (emailNotifications !== undefined) settings.emailNotifications = emailNotifications;
        if (passwordPolicy !== undefined) settings.passwordPolicy = passwordPolicy;
        if (twoFactorAuth !== undefined) settings.twoFactorAuth = twoFactorAuth;
        
        // Update in-kind donation settings
        if (req.body.inKindDonationSettings !== undefined) {
            const inKindSettings = req.body.inKindDonationSettings;
            if (!settings.inKindDonationSettings) {
                settings.inKindDonationSettings = {};
            }
            if (inKindSettings.allowedTypes !== undefined) {
                settings.inKindDonationSettings.allowedTypes = inKindSettings.allowedTypes;
            }
            if (inKindSettings.instructions !== undefined) {
                settings.inKindDonationSettings.instructions = inKindSettings.instructions;
            }
            if (inKindSettings.enabled !== undefined) {
                settings.inKindDonationSettings.enabled = inKindSettings.enabled;
            }
        }
        
        await settings.save();
        
        res.json({ success: true, message: 'System settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating system settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update system settings' });
    }
};

