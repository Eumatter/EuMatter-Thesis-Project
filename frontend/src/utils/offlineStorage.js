/**
 * Offline Storage Utility using IndexedDB
 * Stores attendance records locally when offline and syncs when online
 */

const DB_NAME = 'eumatter_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_attendance';

let db = null;

/**
 * Initialize IndexedDB
 */
export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create object store if it doesn't exist
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
                
                // Create indexes for efficient queries
                objectStore.createIndex('eventId', 'eventId', { unique: false });
                objectStore.createIndex('userId', 'userId', { unique: false });
                objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                objectStore.createIndex('synced', 'synced', { unique: false });
            }
        };
    });
}

/**
 * Get database instance
 */
async function getDB() {
    if (db) return db;
    return await initDB();
}

/**
 * Check if device is online
 */
export function isOnline() {
    return navigator.onLine;
}

/**
 * Store attendance record locally (for offline mode)
 */
export async function storeAttendanceOffline(data) {
    try {
        const database = await getDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const record = {
            qrCode: data.qrCode,
            action: data.action,
            eventId: data.eventId,
            userId: data.userId,
            timestamp: new Date().toISOString(),
            synced: false,
            retryCount: 0,
            lastError: null
        };
        
        const request = store.add(record);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('Attendance stored offline:', record);
                resolve(request.result);
            };
            request.onerror = () => {
                console.error('Error storing offline:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error in storeAttendanceOffline:', error);
        throw error;
    }
}

/**
 * Get all pending (unsynced) attendance records
 */
export async function getPendingRecords() {
    try {
        const database = await getDB();
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        // Use cursor without IDBKeyRange to avoid boolean key issues
        // Filter manually for synced === false
        const request = store.openCursor();
        
        return new Promise((resolve, reject) => {
            const records = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    // Filter for unsynced records
                    if (cursor.value.synced === false) {
                        records.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    // No more records, return what we found
                    resolve(records);
                }
            };
            
            request.onerror = () => {
                console.error('Error opening cursor:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error getting pending records:', error);
        // Return empty array instead of throwing to prevent app crashes
        return [];
    }
}

/**
 * Mark record as synced
 */
export async function markAsSynced(recordId) {
    try {
        const database = await getDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getRequest = store.get(recordId);
        
        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.synced = true;
                    record.syncedAt = new Date().toISOString();
                    const updateRequest = store.put(record);
                    updateRequest.onsuccess = () => resolve(record);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve(null);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    } catch (error) {
        console.error('Error marking as synced:', error);
        throw error;
    }
}

/**
 * Update record with error
 */
export async function updateRecordError(recordId, error) {
    try {
        const database = await getDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const getRequest = store.get(recordId);
        
        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.retryCount = (record.retryCount || 0) + 1;
                    record.lastError = error;
                    record.lastRetryAt = new Date().toISOString();
                    const updateRequest = store.put(record);
                    updateRequest.onsuccess = () => resolve(record);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve(null);
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    } catch (error) {
        console.error('Error updating record error:', error);
        throw error;
    }
}

/**
 * Delete synced records (cleanup)
 */
export async function deleteSyncedRecords() {
    try {
        const database = await getDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Use cursor without IDBKeyRange to avoid boolean key issues
        // Filter manually for synced === true
        const request = store.openCursor();
        
        return new Promise((resolve, reject) => {
            let deletedCount = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    // Only process synced records
                    if (cursor.value.synced === true) {
                        // Only delete records synced more than 7 days ago
                        const syncedAt = new Date(cursor.value.syncedAt);
                        const daysAgo = (Date.now() - syncedAt.getTime()) / (1000 * 60 * 60 * 24);
                        
                        if (daysAgo > 7) {
                            cursor.delete();
                            deletedCount++;
                        }
                    }
                    cursor.continue();
                } else {
                    resolve(deletedCount);
                }
            };
            
            request.onerror = () => {
                console.error('Error opening cursor:', request.error);
                reject(request.error);
            };
        });
    } catch (error) {
        console.error('Error deleting synced records:', error);
        return 0;
    }
}

/**
 * Get count of pending records
 */
export async function getPendingCount() {
    try {
        const records = await getPendingRecords();
        return records.length;
    } catch (error) {
        console.error('Error getting pending count:', error);
        return 0;
    }
}

/**
 * Clear all records (for testing or reset)
 */
export async function clearAllRecords() {
    try {
        const database = await getDB();
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error clearing records:', error);
        throw error;
    }
}

