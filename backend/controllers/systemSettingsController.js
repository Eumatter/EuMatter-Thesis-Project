import SystemSettings from '../models/systemSettingsModel.js';

// Get system settings
export const getSystemSettings = async (req, res) => {
    try {
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
        console.error('Error fetching system settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch system settings' });
    }
};

// Get maintenance mode status (public endpoint)
export const getMaintenanceMode = async (req, res) => {
    try {
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
        console.error('Error fetching maintenance mode:', error);
        res.json({ success: true, maintenanceMode: false });
    }
};

// Update system settings (System Admin only)
export const updateSystemSettings = async (req, res) => {
    try {
        // Check if user is System Administrator
        if (req.user?.role !== 'System Administrator') {
            return res.status(403).json({ success: false, message: 'Only System Administrators can update system settings' });
        }

        const { maintenanceMode, systemName, emailNotifications, passwordPolicy, twoFactorAuth } = req.body;
        
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
        
        await settings.save();
        
        res.json({ success: true, message: 'System settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating system settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update system settings' });
    }
};

