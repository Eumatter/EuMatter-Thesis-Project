/**
 * Cache Context Provider
 * Provides global cache management and cached API functions
 */

import { createContext, useContext, useCallback } from 'react';
import { 
    getCache, 
    setCache, 
    invalidateCache, 
    invalidateCacheType,
    clearAllCache,
    clearRoleCache,
    getCacheStats,
    prefetchCache
} from '../utils/cache';
import axios from 'axios';
import { AppContent } from './AppContext';
import { getBackendUrl } from '../utils/backendUrl';

export const CacheContext = createContext();

export const useCache = () => {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within CacheProvider');
    }
    return context;
};

export const CacheProvider = ({ children }) => {
    const appContext = useContext(AppContent);
    const backendUrl = appContext?.backendUrl || getBackendUrl();
    const userData = appContext?.userData || null;
    const role = userData?.role || '';

    /**
     * Cached API GET request
     */
    const cachedGet = useCallback(async (type, endpoint, options = {}) => {
        const { 
            identifier = '', 
            forceRefresh = false,
            customTTL = null,
            params = {}
        } = options;

        // Check cache first if not forcing refresh
        if (!forceRefresh) {
            const cached = getCache(type, identifier, role);
            if (cached !== null) {
                return cached;
            }
        }

        // Fetch from API
        try {
            axios.defaults.withCredentials = true;
            const response = await axios.get(`${backendUrl}${endpoint}`, { params });
            const data = response.data;

            // Cache the response
            setCache(type, identifier, data, role, customTTL);

            return data;
        } catch (error) {
            // If error and we have cached data, return cached data
            const cached = getCache(type, identifier, role);
            if (cached !== null) {
                console.warn(`API error for ${endpoint}, returning cached data:`, error);
                return cached;
            }
            throw error;
        }
    }, [backendUrl, role]);

    /**
     * Cached API POST/PUT/DELETE request with cache invalidation
     */
    const cachedMutate = useCallback(async (method, endpoint, data = {}, invalidateTypes = []) => {
        try {
            axios.defaults.withCredentials = true;
            const response = await axios[method](`${backendUrl}${endpoint}`, data);

            // Invalidate related cache entries
            invalidateTypes.forEach(type => {
                invalidateCacheType(type, role);
            });

            return response.data;
        } catch (error) {
            throw error;
        }
    }, [backendUrl, role]);

    /**
     * Invalidate cache
     */
    const invalidate = useCallback((type, identifier = '') => {
        invalidateCache(type, identifier, role);
    }, [role]);

    /**
     * Invalidate cache type
     */
    const invalidateType = useCallback((type) => {
        invalidateCacheType(type, role);
    }, [role]);

    /**
     * Clear all cache
     */
    const clearCache = useCallback(() => {
        clearAllCache();
    }, []);

    /**
     * Clear role cache
     */
    const clearRole = useCallback(() => {
        clearRoleCache(role);
    }, [role]);

    /**
     * Get cache statistics
     */
    const stats = useCallback(() => {
        return getCacheStats();
    }, []);

    /**
     * Prefetch data
     */
    const prefetch = useCallback(async (type, fetchFn, identifier = '') => {
        return prefetchCache(type, fetchFn, identifier, role);
    }, [role]);

    const value = {
        cachedGet,
        cachedMutate,
        invalidate,
        invalidateType,
        clearCache,
        clearRole,
        stats,
        prefetch,
        getCache: (type, identifier = '') => getCache(type, identifier, role),
        setCache: (type, identifier = '', data, customTTL = null) => setCache(type, identifier, data, role, customTTL)
    };

    return (
        <CacheContext.Provider value={value}>
            {children}
        </CacheContext.Provider>
    );
};

