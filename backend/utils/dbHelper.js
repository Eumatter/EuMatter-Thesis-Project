import mongoose from 'mongoose';
import { waitForDBConnection } from '../config/mongoDB.js';

/**
 * Ensures database connection before executing a query
 * Prevents buffering timeout errors
 * 
 * @param {Function} queryFn - The database query function to execute
 * @param {Object} options - Options for error handling
 * @param {number} options.maxWaitTime - Maximum time to wait for connection (default: 10000ms)
 * @param {boolean} options.throwOnError - Whether to throw error or return null (default: false)
 * @returns {Promise} - The result of the query function
 */
export const ensureDBAndExecute = async (queryFn, options = {}) => {
    const { maxWaitTime = 10000, throwOnError = false } = options;
    
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            // Wait for connection
            await waitForDBConnection(maxWaitTime);
        }
        
        // Execute the query
        return await queryFn();
    } catch (error) {
        // Handle database connection errors
        if (error.message && (
            error.message.includes('connection') || 
            error.message.includes('timeout') ||
            error.message.includes('buffering') ||
            error.name === 'MongoError' ||
            error.name === 'MongooseError'
        )) {
            const dbError = new Error('Database connection unavailable');
            dbError.name = 'DatabaseConnectionError';
            dbError.statusCode = 503;
            
            if (throwOnError) {
                throw dbError;
            }
            return null;
        }
        
        // Re-throw other errors
        if (throwOnError) {
            throw error;
        }
        return null;
    }
};

/**
 * Safe database query wrapper that handles errors securely
 * Does not expose sensitive error information
 * 
 * @param {Function} queryFn - The database query function
 * @param {Object} errorResponse - Custom error response
 * @returns {Promise} - Query result or error response
 */
export const safeDBQuery = async (queryFn, errorResponse = { 
    success: false, 
    message: 'Database operation failed' 
}) => {
    try {
        const result = await ensureDBAndExecute(queryFn, { maxWaitTime: 10000 });
        
        if (result === null) {
            return { ...errorResponse, statusCode: 503 };
        }
        
        return result;
    } catch (error) {
        // Log error for debugging (server-side only)
        console.error('Database query error:', {
            name: error.name,
            message: error.message,
            statusCode: error.statusCode || 500
        });
        
        // Return secure error response (don't expose internal details)
        return {
            ...errorResponse,
            statusCode: error.statusCode || 500
        };
    }
};

/**
 * Check if database is ready for queries
 * @returns {boolean}
 */
export const isDBReady = () => {
    return mongoose.connection.readyState === 1;
};

