/**
 * Offline Sync Service
 * Automatically syncs pending attendance records when device comes back online
 */

import axios from 'axios';
import { 
    getPendingRecords, 
    markAsSynced, 
    updateRecordError,
    isOnline,
    getPendingCount
} from './offlineStorage.js';
import { toast } from 'react-toastify';

let syncInProgress = false;
let syncListeners = [];

/**
 * Sync a single attendance record
 */
async function syncRecord(record, backendUrl) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token');
        }

        // Ensure backendUrl ends with / if it doesn't
        const baseUrl = backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`;
        
        const response = await axios.post(
            `${baseUrl}api/volunteers/attendance/record`,
            {
                qrCode: record.qrCode,
                action: record.action
            },
            {
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            }
        );

        // Mark as synced
        await markAsSynced(record.id);
        
        return {
            success: true,
            record,
            response: response.data
        };
    } catch (error) {
        // Update record with error (for retry logic)
        await updateRecordError(record.id, {
            message: error.response?.data?.message || error.message,
            status: error.response?.status,
            timestamp: new Date().toISOString()
        });

        // Don't throw - we want to continue syncing other records
        return {
            success: false,
            record,
            error: error.response?.data?.message || error.message
        };
    }
}

/**
 * Sync all pending records
 */
export async function syncPendingRecords(backendUrl, showNotifications = true) {
    if (syncInProgress) {
        console.log('Sync already in progress');
        return;
    }

    if (!isOnline()) {
        console.log('Device is offline, cannot sync');
        return;
    }

    try {
        syncInProgress = true;
        const pendingRecords = await getPendingRecords();

        if (pendingRecords.length === 0) {
            notifyListeners({ pendingCount: 0, syncing: false });
            return { synced: 0, failed: 0, total: 0 };
        }

        notifyListeners({ pendingCount: pendingRecords.length, syncing: true });

        if (showNotifications && pendingRecords.length > 0) {
            toast.info(`Syncing ${pendingRecords.length} attendance record(s)...`, {
                autoClose: 2000
            });
        }

        let synced = 0;
        let failed = 0;

        // Sync records sequentially to avoid overwhelming the server
        for (const record of pendingRecords) {
            // Skip records that have failed too many times (more than 5 retries)
            if (record.retryCount > 5) {
                console.warn('Skipping record with too many retries:', record.id);
                failed++;
                continue;
            }

            const result = await syncRecord(record, backendUrl);
            
            if (result.success) {
                synced++;
            } else {
                failed++;
            }

            // Small delay between syncs to avoid rate limiting
            if (pendingRecords.length > 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // Cleanup old synced records
        await deleteSyncedRecords();

        const pendingCount = await getPendingCount();
        notifyListeners({ pendingCount, syncing: false });

        if (showNotifications) {
            if (synced > 0) {
                toast.success(`Successfully synced ${synced} attendance record(s)!`, {
                    autoClose: 3000
                });
            }
            if (failed > 0) {
                toast.warning(`${failed} record(s) failed to sync. They will be retried later.`, {
                    autoClose: 4000
                });
            }
        }

        return { synced, failed, total: pendingRecords.length };
    } catch (error) {
        console.error('Error syncing pending records:', error);
        notifyListeners({ pendingCount: await getPendingCount(), syncing: false });
        
        if (showNotifications) {
            toast.error('Error syncing attendance records. Please try again later.');
        }
        
        return { synced: 0, failed: 0, total: 0, error: error.message };
    } finally {
        syncInProgress = false;
    }
}

/**
 * Start automatic sync when device comes online
 */
export function startAutoSync(backendUrl) {
    // Sync immediately if online
    if (isOnline()) {
        syncPendingRecords(backendUrl, false);
    }

    // Listen for online event
    const handleOnline = () => {
        console.log('Device came online, syncing pending records...');
        syncPendingRecords(backendUrl, true);
    };

    window.addEventListener('online', handleOnline);

    // Periodic sync check (every 30 seconds when online)
    const syncInterval = setInterval(() => {
        if (isOnline() && !syncInProgress) {
            syncPendingRecords(backendUrl, false);
        }
    }, 30000);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        clearInterval(syncInterval);
    };
}

/**
 * Subscribe to sync status updates
 */
export function onSyncStatusUpdate(callback) {
    syncListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
        syncListeners = syncListeners.filter(listener => listener !== callback);
    };
}

/**
 * Notify all listeners of sync status
 */
function notifyListeners(status) {
    syncListeners.forEach(listener => {
        try {
            listener(status);
        } catch (error) {
            console.error('Error in sync listener:', error);
        }
    });
}

/**
 * Get current sync status
 */
export async function getSyncStatus() {
    const pendingCount = await getPendingCount();
    return {
        pendingCount,
        syncing: syncInProgress,
        online: isOnline()
    };
}

