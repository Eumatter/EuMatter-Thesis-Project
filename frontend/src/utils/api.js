import axios from 'axios';
import { getBackendUrl, getBackendOrigin } from './backendUrl.js';

const api = axios.create({
    baseURL: getBackendOrigin(),
    withCredentials: true,
});

// Add request interceptor to ensure credentials are sent
api.interceptors.request.use(
    (config) => {
        // Ensure credentials are always sent
        config.withCredentials = true;
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - could redirect to login if needed
            console.error('Unauthorized request - authentication may have expired');
        }
        return Promise.reject(error);
    }
);

export default api;


