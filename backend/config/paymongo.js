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
    if (!secretKey) {
        const error = new Error("Missing PAYMONGO_SECRET_KEY environment variable. Please set it in your .env file or Render environment variables.");
        console.error("❌ PayMongo Configuration Error:", error.message);
        console.error("💡 To fix this:");
        console.error("   1. Get your PayMongo API keys from https://dashboard.paymongo.com/developers/api-keys");
        console.error("   2. Add PAYMONGO_SECRET_KEY=sk_test_xxx to your .env file (or Render environment variables)");
        console.error("   3. Add PAYMONGO_PUBLIC_KEY=pk_test_xxx to your .env file");
        throw error;
    }
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
}, (error) => {
    console.error("❌ PayMongo Request Interceptor Error:", error.message);
    return Promise.reject(error);
});

export const getPaymongoPublicKey = () => {
    const key = process.env.PAYMONGO_PUBLIC_KEY;
    if (!key) throw new Error("Missing PAYMONGO_PUBLIC_KEY env");
    return key;
};

export default paymongoClient;


