import mongoose from "mongoose";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import donationModel from "../../models/donationModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => console.log("Database Connected"));
        mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err.message));
        mongoose.connection.once('open', () => console.log('MongoDB connection opened'));
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Read donation data from donation_data.txt
function loadDonationData() {
    try {
        const dataPath = path.join(__dirname, 'donation_data.txt');
        
        if (!fs.existsSync(dataPath)) {
            throw new Error(`donation_data.txt file not found at: ${dataPath}`);
        }
        
        console.log(`📂 Reading data from: ${dataPath}`);
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const donations = JSON.parse(fileContent);
        
        if (!Array.isArray(donations)) {
            throw new Error('Data file must contain a JSON array');
        }
        
        console.log(`✅ Loaded ${donations.length} donations from donation_data.txt`);
        return donations;
    } catch (error) {
        console.error('❌ Error loading donation data:', error.message);
        throw error;
    }
}

// Bulk insert donations
async function bulkInsertDonations() {
    try {
        // Connect to database
        await connectDB();
        
        // Load donation data
        const donations = loadDonationData();
        
        console.log(`\n📊 Donation breakdown:`);
        const paymentMethodBreakdown = {};
        const statusBreakdown = {};
        const recipientTypeBreakdown = {};
        let totalAmount = 0;
        
        donations.forEach(donation => {
            paymentMethodBreakdown[donation.paymentMethod] = (paymentMethodBreakdown[donation.paymentMethod] || 0) + 1;
            statusBreakdown[donation.status] = (statusBreakdown[donation.status] || 0) + 1;
            recipientTypeBreakdown[donation.recipientType] = (recipientTypeBreakdown[donation.recipientType] || 0) + 1;
            totalAmount += donation.amount;
        });
        
        console.log(`   Payment methods:`, paymentMethodBreakdown);
        console.log(`   Status:`, statusBreakdown);
        console.log(`   Recipient types:`, recipientTypeBreakdown);
        console.log(`   Total amount: ₱${totalAmount.toLocaleString()}`);
        
        // Check for existing donations
        console.log('\n🔍 Checking for existing donations...');
        const existingDonations = [];
        
        // Check by user, event, amount, and donatedAt (createdAt) to find duplicates
        for (const donation of donations) {
            const existing = await donationModel.findOne({
                user: donation.user,
                event: donation.event,
                amount: donation.amount,
                createdAt: new Date(donation.createdAt)
            }).select('_id user event amount').lean();
            
            if (existing) {
                existingDonations.push(existing);
            }
        }
        
        if (existingDonations.length > 0) {
            console.log(`⚠️  Found ${existingDonations.length} existing donations with matching criteria`);
        }
        
        // Filter out donations that already exist
        const existingKeys = new Set(
            existingDonations.map(d => `${d.user}_${d.event}_${d.amount}_${d.createdAt}`)
        );
        
        const newDonations = donations.filter(donation => {
            const key = `${donation.user}_${donation.event}_${donation.amount}_${donation.createdAt}`;
            return !existingKeys.has(key);
        });
        
        if (newDonations.length === 0) {
            console.log('\n✅ All donations already exist in database. No new donations to insert.');
            await mongoose.connection.close();
            return;
        }
        
        console.log(`\n📝 Inserting ${newDonations.length} new donations (skipping ${donations.length - newDonations.length} duplicates)...`);
        
        // Convert dates from strings to Date objects
        const donationsToInsert = newDonations.map(donation => ({
            ...donation,
            createdAt: donation.createdAt ? new Date(donation.createdAt) : new Date(),
            updatedAt: donation.updatedAt ? new Date(donation.updatedAt) : new Date()
        }));
        
        // Insert donations
        const result = await donationModel.insertMany(donationsToInsert, {
            ordered: false, // Continue inserting even if some fail
            rawResult: false
        });
        
        console.log(`\n✅ Successfully inserted ${result.length} donations!`);
        
        // Calculate statistics
        const insertedTotalAmount = result.reduce((sum, d) => sum + d.amount, 0);
        console.log(`💰 Total amount inserted: ₱${insertedTotalAmount.toLocaleString()}`);
        
        // Verify insertion
        const insertedCount = await donationModel.countDocuments({
            _id: { $in: result.map(d => d._id) },
            status: "succeeded"
        });
        console.log(`✅ Verified: ${insertedCount} donations found in database with status: succeeded`);
        
    } catch (error) {
        console.error('\n❌ Error during bulk insert:', error);
        
        // Handle bulk write errors
        if (error.name === 'BulkWriteError') {
            console.error('Bulk write errors:');
            if (error.writeErrors) {
                error.writeErrors.forEach((err, index) => {
                    console.error(`  Error ${index + 1}:`, err.errmsg);
                });
            }
            console.log(`\n✅ Successfully inserted ${error.insertedCount || 0} donations before errors occurred`);
        }
        
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
bulkInsertDonations()
    .then(() => {
        console.log('\n✨ Bulk insert completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Bulk insert failed:', error);
        process.exit(1);
    });

