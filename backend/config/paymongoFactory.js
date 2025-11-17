import axios from "axios";
import departmentWalletModel from "../models/departmentWalletModel.js";
import eventModel from "../models/eventModel.js";

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

/**
 * Create a PayMongo client with specific credentials
 * @param {string} secretKey - PayMongo secret key
 * @returns {axios.AxiosInstance} - Configured axios client
 */
const createPayMongoClient = (secretKey) => {
    const client = axios.create({
        baseURL: PAYMONGO_API_BASE,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        timeout: 15000
    });

    // Add authentication interceptor
    client.interceptors.request.use((config) => {
        if (!secretKey) {
            const error = new Error("Missing PayMongo secret key");
            console.error("❌ PayMongo Configuration Error:", error.message);
            throw error;
        }
        
        const basicAuth = Buffer.from(`${secretKey}:`).toString("base64");
        config.headers.Authorization = `Basic ${basicAuth}`;
        
        // Debug logging for development (mask key)
        if (process.env.NODE_ENV === 'development') {
            console.log('PayMongo Request:', {
                url: config.baseURL + config.url,
                method: config.method,
                headers: {
                    ...config.headers,
                    Authorization: `Basic ${secretKey.substring(0, 10)}...` // Mask the key
                }
            });
        }
        
        return config;
    }, (error) => {
        console.error("❌ PayMongo Request Interceptor Error:", error.message);
        return Promise.reject(error);
    });

    return client;
};

/**
 * Get PayMongo client for CRD wallet (uses environment variables)
 * @returns {axios.AxiosInstance} - CRD PayMongo client
 */
export const getCRDPaymongoClient = () => {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
        throw new Error("PAYMONGO_SECRET_KEY environment variable is not set");
    }
    return createPayMongoClient(secretKey);
};

/**
 * Get PayMongo public key for CRD wallet
 * @returns {string} - CRD PayMongo public key
 */
export const getCRDPaymongoPublicKey = () => {
    const key = process.env.PAYMONGO_PUBLIC_KEY;
    if (!key) {
        throw new Error("PAYMONGO_PUBLIC_KEY environment variable is not set");
    }
    return key;
};

/**
 * Get PayMongo client for a specific department wallet
 * @param {string|ObjectId} userId - Department/Organization user ID
 * @returns {Promise<axios.AxiosInstance>} - Department PayMongo client
 */
export const getPaymongoClient = async (userId) => {
    if (!userId) {
        throw new Error("userId is required to get department wallet client");
    }

    // Find wallet
    const wallet = await departmentWalletModel.findOne({ userId });
    if (!wallet) {
        throw new Error(`Wallet not found for user ${userId}`);
    }

    if (!wallet.isActive) {
        throw new Error(`Wallet is inactive for user ${userId}`);
    }

    // Get decrypted keys
    let decryptedKeys;
    try {
        decryptedKeys = wallet.getDecryptedKeys();
    } catch (error) {
        throw new Error(`Failed to decrypt wallet keys for user ${userId}: ${error.message}`);
    }

    // Create client with department's secret key
    return createPayMongoClient(decryptedKeys.secretKey);
};

/**
 * Get PayMongo public key for a department wallet
 * @param {string|ObjectId} userId - Department/Organization user ID
 * @returns {Promise<string>} - Department PayMongo public key
 */
export const getPaymongoPublicKey = async (userId) => {
    if (!userId) {
        throw new Error("userId is required to get department wallet public key");
    }

    const wallet = await departmentWalletModel.findOne({ userId });
    if (!wallet) {
        throw new Error(`Wallet not found for user ${userId}`);
    }

    if (!wallet.isActive) {
        throw new Error(`Wallet is inactive for user ${userId}`);
    }

    try {
        const decryptedKeys = wallet.getDecryptedKeys();
        return decryptedKeys.publicKey;
    } catch (error) {
        throw new Error(`Failed to decrypt wallet public key for user ${userId}: ${error.message}`);
    }
};

/**
 * Determine which wallet to use for a donation and get the appropriate client
 * @param {Object} donationData - Donation data with recipientType, eventId, departmentId
 * @returns {Promise<{client: axios.AxiosInstance, publicKey: string, walletUserId: ObjectId|null}>}
 */
export const getPaymongoClientForDonation = async (donationData) => {
    const { recipientType, eventId, departmentId } = donationData;

    // If recipientType is "crd" or no specific recipient, use CRD wallet
    if (!recipientType || recipientType === "crd") {
        return {
            client: getCRDPaymongoClient(),
            publicKey: getCRDPaymongoPublicKey(),
            walletUserId: null // null indicates CRD wallet
        };
    }

    // If recipientType is "event", find the event and use its creator's wallet
    if (recipientType === "event" && eventId) {
        const event = await eventModel.findById(eventId).populate('createdBy', 'role');
        if (!event) {
            throw new Error(`Event not found: ${eventId}`);
        }

        if (!event.createdBy) {
            throw new Error(`Event ${eventId} has no creator`);
        }

        // Check if creator is a Department/Organization
        if (event.createdBy.role !== "Department/Organization") {
            // If event creator is not a department, fall back to CRD wallet
            return {
                client: getCRDPaymongoClient(),
                publicKey: getCRDPaymongoPublicKey(),
                walletUserId: null
            };
        }

        // Use department's wallet
        const departmentUserId = event.createdBy._id;
        const client = await getPaymongoClient(departmentUserId);
        const publicKey = await getPaymongoPublicKey(departmentUserId);

        return {
            client,
            publicKey,
            walletUserId: departmentUserId
        };
    }

    // If recipientType is "department", use department's wallet
    if (recipientType === "department" && departmentId) {
        const client = await getPaymongoClient(departmentId);
        const publicKey = await getPaymongoPublicKey(departmentId);

        return {
            client,
            publicKey,
            walletUserId: departmentId
        };
    }

    // Default to CRD wallet if unable to determine
    return {
        client: getCRDPaymongoClient(),
        publicKey: getCRDPaymongoPublicKey(),
        walletUserId: null
    };
};

/**
 * Get webhook secret for a specific wallet
 * @param {ObjectId|null} walletUserId - User ID of wallet owner (null for CRD)
 * @returns {Promise<string|null>} - Webhook secret or null
 */
export const getWebhookSecret = async (walletUserId) => {
    // CRD wallet uses environment variable
    if (!walletUserId) {
        return process.env.PAYMONGO_WEBHOOK_SECRET || null;
    }

    // Department wallet
    const wallet = await departmentWalletModel.findOne({ userId: walletUserId });
    if (!wallet || !wallet.isActive) {
        return null;
    }

    if (!wallet.webhookSecret) {
        return null;
    }

    try {
        const decryptedKeys = wallet.getDecryptedKeys();
        return decryptedKeys.webhookSecret;
    } catch (error) {
        console.error(`Failed to decrypt webhook secret for user ${walletUserId}:`, error.message);
        return null;
    }
};

