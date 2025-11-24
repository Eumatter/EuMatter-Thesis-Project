import SystemSettings from '../models/systemSettingsModel.js';
import mongoose from 'mongoose';

/**
 * Check if database is connected before performing operations
 */
function isDBReady() {
    return mongoose.connection.readyState === 1;
}

/**
 * Check and automatically disable maintenance mode if the estimated end time has passed
 */
export async function checkMaintenanceModeExpiry() {
    // Check if database is connected
    if (!isDBReady()) {
        console.warn('⚠️  Database not connected, skipping maintenance mode check');
        return false;
    }

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
        // Only log if it's not a connection error
        if (error.name !== 'MongooseError' || !error.message.includes('buffering')) {
            console.error('Error checking maintenance mode expiry:', error.message);
        }
        return false;
    }
}

/**
 * Start the maintenance mode scheduler
 * Checks every 60 seconds if maintenance mode should be automatically disabled
 */
export function startMaintenanceScheduler() {
    // Wait for DB connection before starting
    const checkAndStart = () => {
        if (isDBReady()) {
            // Run immediately on startup
            checkMaintenanceModeExpiry().catch(err => {
                if (err.name !== 'MongooseError' || !err.message.includes('buffering')) {
                    console.error('Error in initial maintenance mode check:', err.message);
                }
            });
            
            // Then run every 60 seconds
            setInterval(() => {
                checkMaintenanceModeExpiry().catch(err => {
                    if (err.name !== 'MongooseError' || !err.message.includes('buffering')) {
                        console.error('Error in maintenance mode scheduler:', err.message);
                    }
                });
            }, 60000); // Check every minute
            
            console.log('✅ Maintenance mode scheduler started');
        } else {
            // Retry after 2 seconds if DB not ready
            setTimeout(checkAndStart, 2000);
        }
    };
    
    checkAndStart();
}

