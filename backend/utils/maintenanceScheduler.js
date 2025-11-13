import SystemSettings from '../models/systemSettingsModel.js';

/**
 * Check and automatically disable maintenance mode if the estimated end time has passed
 */
export async function checkMaintenanceModeExpiry() {
    try {
        const settings = await SystemSettings.getSettings();
        
        // Only check if maintenance mode is enabled and has an estimated end time
        if (settings.maintenanceMode.enabled && settings.maintenanceMode.estimatedEndTime) {
            const now = new Date();
            const endTime = new Date(settings.maintenanceMode.estimatedEndTime);
            
            // If the current time is past the estimated end time, disable maintenance mode
            if (now >= endTime) {
                settings.maintenanceMode.enabled = false;
                settings.maintenanceMode.estimatedEndTime = null;
                await settings.save();
                
                console.log(`[Maintenance Mode] Automatically disabled at ${now.toISOString()}`);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error checking maintenance mode expiry:', error);
        return false;
    }
}

/**
 * Start the maintenance mode scheduler
 * Checks every 60 seconds if maintenance mode should be automatically disabled
 */
export function startMaintenanceScheduler() {
    // Run immediately on startup
    checkMaintenanceModeExpiry().catch(err => {
        console.error('Error in initial maintenance mode check:', err);
    });
    
    // Then run every 60 seconds
    setInterval(() => {
        checkMaintenanceModeExpiry().catch(err => {
            console.error('Error in maintenance mode scheduler:', err);
        });
    }, 60000); // Check every minute
    
    console.log('✅ Maintenance mode scheduler started');
}

