import crypto from 'crypto';

// Get encryption key from environment variable
const getEncryptionKey = () => {
    const key = process.env.WALLET_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('WALLET_ENCRYPTION_KEY environment variable is required for wallet encryption');
    }
    
    // Key should be 32 bytes (256 bits) for AES-256
    // If provided as hex string, convert to buffer
    if (key.length === 64) {
        // Hex string (64 chars = 32 bytes)
        return Buffer.from(key, 'hex');
    } else if (key.length === 32) {
        // Already a 32-byte string
        return Buffer.from(key, 'utf8');
    } else {
        throw new Error('WALLET_ENCRYPTION_KEY must be 32 bytes (64 hex characters or 32 UTF-8 characters)');
    }
};

// Algorithm for encryption
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for authentication tag

/**
 * Encrypt a wallet key (API key or secret) before storing in database
 * @param {string} plaintext - The plaintext key to encrypt
 * @returns {string} - Encrypted string in format: iv:salt:tag:encryptedData (all base64)
 */
export const encryptWalletKey = (plaintext) => {
    if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
    }

    try {
        const key = getEncryptionKey();
        
        // Generate random IV and salt
        const iv = crypto.randomBytes(IV_LENGTH);
        const salt = crypto.randomBytes(SALT_LENGTH);
        
        // Derive encryption key from master key and salt
        const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
        
        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);
        
        // Encrypt
        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        // Get authentication tag
        const tag = cipher.getAuthTag();
        
        // Combine: iv:salt:tag:encryptedData
        const result = [
            iv.toString('base64'),
            salt.toString('base64'),
            tag.toString('base64'),
            encrypted
        ].join(':');
        
        return result;
    } catch (error) {
        console.error('Error encrypting wallet key:', error.message);
        throw new Error('Failed to encrypt wallet key');
    }
};

/**
 * Decrypt a wallet key from database
 * @param {string} ciphertext - Encrypted string in format: iv:salt:tag:encryptedData
 * @returns {string} - Decrypted plaintext key
 */
export const decryptWalletKey = (ciphertext) => {
    if (!ciphertext || typeof ciphertext !== 'string') {
        throw new Error('Ciphertext must be a non-empty string');
    }

    try {
        const key = getEncryptionKey();
        
        // Split the ciphertext
        const parts = ciphertext.split(':');
        if (parts.length !== 4) {
            throw new Error('Invalid ciphertext format');
        }
        
        const [ivBase64, saltBase64, tagBase64, encrypted] = parts;
        
        // Convert from base64
        const iv = Buffer.from(ivBase64, 'base64');
        const salt = Buffer.from(saltBase64, 'base64');
        const tag = Buffer.from(tagBase64, 'base64');
        
        // Derive decryption key
        const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
        decipher.setAuthTag(tag);
        
        // Decrypt
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Error decrypting wallet key:', error.message);
        throw new Error('Failed to decrypt wallet key - key may be corrupted or encryption key mismatch');
    }
};

/**
 * Mask a key for display (show only last 4 characters)
 * @param {string} key - The key to mask
 * @returns {string} - Masked key (e.g., "****1234")
 */
export const maskKey = (key) => {
    if (!key || typeof key !== 'string') {
        return '****';
    }
    
    if (key.length <= 4) {
        return '****';
    }
    
    return '****' + key.slice(-4);
};

/**
 * Verify PayMongo credentials by making a test API call
 * @param {string} publicKey - PayMongo public key
 * @param {string} secretKey - PayMongo secret key
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const verifyPayMongoCredentials = async (publicKey, secretKey) => {
    try {
        if (!publicKey || !secretKey) {
            return { valid: false, error: 'Public key and secret key are required' };
        }

        // Create a test axios client
        const axios = (await import('axios')).default;
        const testClient = axios.create({
            baseURL: 'https://api.paymongo.com/v1',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        // Add authentication
        const basicAuth = Buffer.from(`${secretKey}:`).toString('base64');
        testClient.defaults.headers.common['Authorization'] = `Basic ${basicAuth}`;

        // Make a simple API call to verify credentials
        // Try to get payment methods (lightweight endpoint)
        const response = await testClient.get('/payment_methods?limit=1');
        
        if (response.status === 200) {
            return { valid: true };
        } else {
            return { valid: false, error: 'Invalid credentials' };
        }
    } catch (error) {
        // Check if it's an authentication error
        if (error.response?.status === 401 || error.response?.status === 403) {
            return { valid: false, error: 'Invalid credentials - authentication failed' };
        }
        
        // Network or other errors
        return { 
            valid: false, 
            error: error.response?.data?.errors?.[0]?.detail || error.message || 'Failed to verify credentials' 
        };
    }
};

