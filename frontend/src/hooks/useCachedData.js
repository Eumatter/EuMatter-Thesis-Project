/**
 * Custom hooks for cached data fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { useCache } from '../context/CacheContext';

/**
 * Hook for fetching and caching data
 */
export function useCachedData(type, endpoint, options = {}) {
    const { cachedGet } = useCache();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const {
        identifier = '',
        forceRefresh = false,
        customTTL = null,
        params = {},
        dependencies = []
    } = options;

    const fetchData = useCallback(async (refresh = false) => {
        try {
            setLoading(true);
            setError(null);
            const result = await cachedGet(type, endpoint, {
                identifier,
                forceRefresh: refresh || forceRefresh,
                customTTL,
                params
            });
            setData(result);
        } catch (err) {
            setError(err);
            console.error(`Error fetching ${type}:`, err);
        } finally {
            setLoading(false);
        }
    }, [cachedGet, type, endpoint, identifier, forceRefresh, customTTL, params, ...dependencies]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refresh = useCallback(() => {
        fetchData(true);
    }, [fetchData]);

    return { data, loading, error, refresh };
}

/**
 * Hook for multiple cached data fetches
 */
export function useCachedDataMultiple(queries) {
    const { cachedGet } = useCache();
    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const promises = queries.map(query => 
                    cachedGet(query.type, query.endpoint, {
                        identifier: query.identifier || '',
                        forceRefresh: query.forceRefresh || false,
                        customTTL: query.customTTL || null,
                        params: query.params || {}
                    }).then(data => ({ key: query.key, data }))
                );

                const resultsArray = await Promise.all(promises);
                const resultsObj = {};
                resultsArray.forEach(({ key, data }) => {
                    resultsObj[key] = data;
                });
                
                setResults(resultsObj);
            } catch (err) {
                setError(err);
                console.error('Error fetching multiple cached data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [cachedGet, queries]);

    return { results, loading, error };
}

