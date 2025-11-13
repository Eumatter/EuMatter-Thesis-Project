import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
    maintenanceMode: {
        enabled: { type: Boolean, default: false },
        message: { type: String, default: 'We are currently performing scheduled maintenance. Please check back soon.' },
        estimatedEndTime: { type: Date, default: null },
        allowedRoles: { 
            type: [String], 
            default: ['System Administrator', 'CRD Staff'],
            enum: ['User', 'Department/Organization', 'CRD Staff', 'System Administrator']
        }
    },
    systemName: { type: String, default: 'EuMatter' },
    emailNotifications: { type: Boolean, default: true },
    passwordPolicy: { type: String, enum: ['6', '8', '12'], default: '6' },
    twoFactorAuth: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

export default mongoose.models.systemSettings || mongoose.model('systemSettings', systemSettingsSchema);

