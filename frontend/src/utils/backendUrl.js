const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const getBackendUrl = () => {
    return RAW_BACKEND_URL.endsWith('/') ? RAW_BACKEND_URL : `${RAW_BACKEND_URL}/`;
};

export const getBackendOrigin = () => {
    const url = getBackendUrl();
    return url.endsWith('/') ? url.slice(0, -1) : url;
};

