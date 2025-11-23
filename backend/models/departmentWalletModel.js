import mongoose from "mongoose";
import { encryptWalletKey, decryptWalletKey,maskKey  } from "../utils/walletEncryption.js";

const departmentWalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        unique: true,
        index: true
    },
    
    // Encrypted PayMongo credentials
    publicKey: {
        type: String,
        required: true
    },
    
    secretKey: {
        type: String,
        required: true
    },
    
    webhookSecret: {
        type: String,
        default: null
    },
    
    // Wallet status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Verification tracking
    lastVerifiedAt: {
        type: Date,
        default: null
    },
    
    verificationStatus: {
        type: String,
        enum: ["verified", "failed", "pending", "never"],
        default: "never"
    },
    
    lastVerificationError: {
        type: String,
        default: null
    }
}, { timestamps: true });

// Virtual for decrypted public key (not stored, only in memory)
departmentWalletSchema.virtual('decryptedPublicKey').get(function() {
    try {
        return decryptWalletKey(this.publicKey);
    } catch (error) {
        return null;
    }
});

// Virtual for decrypted secret key (not stored, only in memory)
departmentWalletSchema.virtual('decryptedSecretKey').get(function() {
    try {
        return decryptWalletKey(this.secretKey);
    } catch (error) {
        return null;
    }
});

// Virtual for decrypted webhook secret (not stored, only in memory)
departmentWalletSchema.virtual('decryptedWebhookSecret').get(function() {
    if (!this.webhookSecret) return null;
    try {
        return decryptWalletKey(this.webhookSecret);
    } catch (error) {
        return null;
    }
});

// Pre-save hook: encrypt keys before saving
departmentWalletSchema.pre('save', async function(next) {
    // Only encrypt if keys are not already encrypted (check if they contain colons, which indicates encryption)
    if (this.isNew || this.isModified('publicKey')) {
        // Check if already encrypted (encrypted format: iv:salt:tag:data)
        if (!this.publicKey.includes(':')) {
            try {
                this.publicKey = encryptWalletKey(this.publicKey);
            } catch (error) {
                return next(new Error(`Failed to encrypt public key: ${error.message}`));
            }
        }
    }
    
    if (this.isNew || this.isModified('secretKey')) {
        if (!this.secretKey.includes(':')) {
            try {
                this.secretKey = encryptWalletKey(this.secretKey);
            } catch (error) {
                return next(new Error(`Failed to encrypt secret key: ${error.message}`));
            }
        }
    }
    
    if (this.webhookSecret && (this.isNew || this.isModified('webhookSecret'))) {
        if (!this.webhookSecret.includes(':')) {
            try {
                this.webhookSecret = encryptWalletKey(this.webhookSecret);
            } catch (error) {
                return next(new Error(`Failed to encrypt webhook secret: ${error.message}`));
            }
        }
    }
    
    next();
});

// Method to get decrypted keys (for API use only)
departmentWalletSchema.methods.getDecryptedKeys = function() {
    try {
        return {
            publicKey: decryptWalletKey(this.publicKey),
            secretKey: decryptWalletKey(this.secretKey),
            webhookSecret: this.webhookSecret ? decryptWalletKey(this.webhookSecret) : null
        };
    } catch (error) {
        throw new Error(`Failed to decrypt wallet keys: ${error.message}`);
    }
};

// Method to get masked keys for display
departmentWalletSchema.methods.getMaskedKeys = function() {
    try {
        const decryptedPublic = decryptWalletKey(this.publicKey);
        return {
            publicKey: maskKey(decryptedPublic),
            secretKey: '****' + maskKey(decryptedPublic).slice(-4), // Always mask secret
            webhookSecret: this.webhookSecret ? maskKey(decryptWalletKey(this.webhookSecret)) : null
        };
    } catch (error) {
        return {
            publicKey: '****',
            secretKey: '****',
            webhookSecret: null
        };
    }
};

// Index for efficient queries
departmentWalletSchema.index({ userId: 1 });
departmentWalletSchema.index({ isActive: 1 });

const departmentWalletModel = mongoose.models.departmentWallet || mongoose.model("departmentWallet", departmentWalletSchema);

export default departmentWalletModel;

