/**
 * Cache Utility for EuMatter
 * Provides in-memory and localStorage caching with expiration and invalidation
 */

const CACHE_PREFIX = 'eumatter_cache_';
const CACHE_VERSION = '1.0.0';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes default

// In-memory cache (faster, session-only)
const memoryCache = new Map();

// Cache configuration for different data types
const CACHE_CONFIG = {
    // User data - cache for 10 minutes
    user: { ttl: 10 * 60 * 1000, persistent: true },
    
    // Events - cache for 2 minutes (frequently updated, non-persistent due to size)
    events: { ttl: 2 * 60 * 1000, persistent: false },
    event: { ttl: 2 * 60 * 1000, persistent: false },
    
    // Donations - cache for 3 minutes
    donations: { ttl: 3 * 60 * 1000, persistent: true },
    donation: { ttl: 3 * 60 * 1000, persistent: true },
    
    // In-kind donations - cache for 3 minutes
    inKindDonations: { ttl: 3 * 60 * 1000, persistent: true },
    
    // Volunteers - cache for 2 minutes
    volunteers: { ttl: 2 * 60 * 1000, persistent: true },
    
    // Dashboard stats - cache for 1 minute (frequently updated)
    dashboardStats: { ttl: 1 * 60 * 1000, persistent: false },
    
    // Reports - cache for 5 minutes
    reports: { ttl: 5 * 60 * 1000, persistent: true },
    
    // System settings - cache for 15 minutes (rarely changes)
    systemSettings: { ttl: 15 * 60 * 1000, persistent: true },
    
    // Users list - cache for 5 minutes
    users: { ttl: 5 * 60 * 1000, persistent: true },
    
    // Notifications - cache for 1 minute
    notifications: { ttl: 1 * 60 * 1000, persistent: false },
    
    // Default - 5 minutes
    default: { ttl: DEFAULT_TTL, persistent: true }
};

/**
 * Generate cache key
 */
export function getCacheKey(type, identifier = '', role = '') {
    const parts = [CACHE_PREFIX, CACHE_VERSION, type];
    if (identifier) parts.push(identifier);
    if (role) parts.push(role);
    return parts.join('_');
}

/**
 * Get cache configuration for a type
 */
function getCacheConfig(type) {
    return CACHE_CONFIG[type] || CACHE_CONFIG.default;
}

/**
 * Check if cache entry is expired
 */
function isExpired(entry) {
    if (!entry || !entry.expiresAt) return true;
    return Date.now() > entry.expiresAt;
}

/**
 * Get from memory cache
 */
function getFromMemory(key) {
    const entry = memoryCache.get(key);
    if (!entry || isExpired(entry)) {
        memoryCache.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Set in memory cache
 */
function setInMemory(key, data, ttl) {
    const entry = {
        data,
        expiresAt: Date.now() + ttl,
        cachedAt: Date.now()
    };
    memoryCache.set(key, entry);
}

/**
 * Get from localStorage
 */
function getFromStorage(key) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const entry = JSON.parse(item);
        if (isExpired(entry)) {
            localStorage.removeItem(key);
            return null;
        }
        return entry.data;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        localStorage.removeItem(key);
        return null;
    }
}

/**
 * Estimate size of data in bytes
 */
function estimateSize(data) {
    try {
        return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch (error) {
        return 0;
    }
}

/**
 * Set in localStorage
 */
function setInStorage(key, data, ttl) {
    try {
        // Check size before storing (localStorage limit is typically 5-10MB)
        const estimatedSize = estimateSize(data);
        const MAX_SIZE = 2 * 1024 * 1024; // 2MB max per entry
        
        if (estimatedSize > MAX_SIZE) {
            console.warn(`Cache entry too large (${(estimatedSize / 1024 / 1024).toFixed(2)}MB), skipping localStorage storage for key: ${key}`);
            return; // Don't store in localStorage if too large
        }
        
        const entry = {
            data,
            expiresAt: Date.now() + ttl,
            cachedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
        // Handle quota exceeded or other storage errors
        if (error.name === 'QuotaExceededError') {
            console.warn('localStorage quota exceeded, clearing old cache entries');
            clearOldCacheEntries();
            // Try again only if data is small enough
            const estimatedSize = estimateSize(data);
            const MAX_SIZE = 1 * 1024 * 1024; // 1MB max after cleanup
            if (estimatedSize <= MAX_SIZE) {
                try {
                    localStorage.setItem(key, JSON.stringify({
                        data,
                        expiresAt: Date.now() + ttl,
                        cachedAt: Date.now()
                    }));
                } catch (retryError) {
                    console.warn('Failed to cache after cleanup, using memory cache only:', retryError.message);
                    // Silently fail - data will still be in memory cache
                }
            } else {
                console.warn(`Data too large (${(estimatedSize / 1024 / 1024).toFixed(2)}MB) to cache in localStorage, using memory cache only`);
            }
        } else {
            console.error('Error writing to localStorage:', error);
        }
    }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries() {
    try {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        let cleared = 0;
        
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const entry = JSON.parse(item);
                        if (isExpired(entry) || (now - entry.cachedAt) > 24 * 60 * 60 * 1000) {
                            localStorage.removeItem(key);
                            cleared++;
                        }
                    }
                } catch (e) {
                    // Invalid entry, remove it
                    localStorage.removeItem(key);
                    cleared++;
                }
            }
        });
        
        if (cleared > 0) {
            console.log(`Cleared ${cleared} old cache entries`);
        }
    } catch (error) {
        console.error('Error clearing old cache entries:', error);
    }
}

/**
 * Get cached data
 */
export function getCache(type, identifier = '', role = '') {
    const key = getCacheKey(type, identifier, role);
    const config = getCacheConfig(type);
    
    // Always check memory first (fastest)
    const memoryData = getFromMemory(key);
    if (memoryData !== null) {
        return memoryData;
    }
    
    // Check localStorage if persistent
    if (config.persistent) {
        const storageData = getFromStorage(key);
        if (storageData !== null) {
            // Also update memory cache for faster access
            setInMemory(key, storageData, config.ttl);
            return storageData;
        }
    }
    
    return null;
}

/**
 * Set cached data
 */
export function setCache(type, identifier = '', data, role = '', customTTL = null) {
    const key = getCacheKey(type, identifier, role);
    const config = getCacheConfig(type);
    const ttl = customTTL || config.ttl;
    
    // Always set in memory
    setInMemory(key, data, ttl);
    
    // Set in localStorage if persistent
    if (config.persistent) {
        setInStorage(key, data, ttl);
    }
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(type, identifier = '', role = '') {
    const key = getCacheKey(type, identifier, role);
    
    // Remove from memory
    memoryCache.delete(key);
    
    // Remove from localStorage
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing from localStorage:', error);
    }
}

/**
 * Invalidate all cache entries of a type
 */
export function invalidateCacheType(type, role = '') {
    // Clear from memory
    const keysToDelete = [];
    memoryCache.forEach((value, key) => {
        if (key.includes(type) && (!role || key.includes(role))) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach(key => memoryCache.delete(key));
    
    // Clear from localStorage
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX) && key.includes(type) && (!role || key.includes(role))) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing cache type from localStorage:', error);
    }
}

/**
 * Clear all cache
 */
export function clearAllCache() {
    // Clear memory cache
    memoryCache.clear();
    
    // Clear localStorage cache
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing all cache:', error);
    }
}

/**
 * Clear cache for a specific role
 */
export function clearRoleCache(role) {
    // Clear from memory
    const keysToDelete = [];
    memoryCache.forEach((value, key) => {
        if (key.includes(role)) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach(key => memoryCache.delete(key));
    
    // Clear from localStorage
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX) && key.includes(role)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing role cache:', error);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
    const memorySize = memoryCache.size;
    let storageSize = 0;
    let storageKeys = 0;
    
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                storageKeys++;
                const item = localStorage.getItem(key);
                if (item) {
                    storageSize += item.length;
                }
            }
        });
    } catch (error) {
        console.error('Error calculating cache stats:', error);
    }
    
    return {
        memoryEntries: memorySize,
        storageEntries: storageKeys,
        storageSize: storageSize,
        storageSizeKB: (storageSize / 1024).toFixed(2)
    };
}

/**
 * Prefetch data and cache it
 */
export async function prefetchCache(type, fetchFn, identifier = '', role = '') {
    try {
        const data = await fetchFn();
        setCache(type, identifier, data, role);
        return data;
    } catch (error) {
        console.error(`Error prefetching ${type}:`, error);
        throw error;
    }
}

