import axios from "axios";

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

const paymongoClient = axios.create({
    baseURL: PAYMONGO_API_BASE,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
    },
    timeout: 15000
});

paymongoClient.interceptors.request.use((config) => {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) throw new Error("Missing PAYMONGO_SECRET_KEY env");
    const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");
    config.headers.Authorization = `Basic ${basicAuth}`;
    
    // Debug logging for development
    if (process.env.NODE_ENV === 'development') {
        console.log('PayMongo Request:', {
            url: config.baseURL + config.url,
            method: config.method,
            headers: {
                ...config.headers,
                Authorization: `Basic ${secretKey.substring(0, 10)}...` // Mask the key for security
            },
            data: config.data
        });
    }
    
    return config;
});

export const getPaymongoPublicKey = () => {
    const key = process.env.PAYMONGO_PUBLIC_KEY;
    if (!key) throw new Error("Missing PAYMONGO_PUBLIC_KEY env");
    return key;
};

export default paymongoClient;


