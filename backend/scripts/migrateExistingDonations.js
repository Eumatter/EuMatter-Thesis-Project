/**
 * Migration script to mark all existing donations with walletUserId: null (CRD wallet)
 * 
 * This script should be run once after implementing multi-wallet support.
 * It marks all historical donations as processed by the CRD wallet.
 * 
 * Usage:
 *   node backend/scripts/migrateExistingDonations.js
 */

import mongoose from "mongoose";
import "dotenv/config";
import donationModel from "../models/donationModel.js";

const migrateDonations = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error("❌ MONGO_URI environment variable is not set");
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Find all donations that don't have walletUserId set
        const donationsToUpdate = await donationModel.find({
            walletUserId: { $exists: false }
        });

        console.log(`📊 Found ${donationsToUpdate.length} donations to migrate`);

        if (donationsToUpdate.length === 0) {
            console.log("✅ No donations need migration. All donations already have walletUserId set.");
            await mongoose.disconnect();
            return;
        }

        // Update all donations to set walletUserId: null (indicating CRD wallet)
        const result = await donationModel.updateMany(
            { walletUserId: { $exists: false } },
            { $set: { walletUserId: null } }
        );

        console.log(`✅ Successfully migrated ${result.modifiedCount} donations`);
        console.log(`📝 All historical donations are now marked with walletUserId: null (CRD wallet)`);
        console.log(`💡 Note: null walletUserId indicates donations processed by CRD wallet`);

        await mongoose.disconnect();
        console.log("✅ Migration completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration error:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run migration
migrateDonations();

