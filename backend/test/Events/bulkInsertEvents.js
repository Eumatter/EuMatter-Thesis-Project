import mongoose from "mongoose";
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import eventModel from "../../models/eventModel.js";

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

// Read event data from event_data.txt
function loadEventData() {
    try {
        const dataPath = path.join(__dirname, 'event_data.txt');
        
        if (!fs.existsSync(dataPath)) {
            throw new Error(`event_data.txt file not found at: ${dataPath}`);
        }
        
        console.log(`📂 Reading data from: ${dataPath}`);
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const events = JSON.parse(fileContent);
        
        if (!Array.isArray(events)) {
            throw new Error('Data file must contain a JSON array');
        }
        
        console.log(`✅ Loaded ${events.length} events from event_data.txt`);
        return events;
    } catch (error) {
        console.error('❌ Error loading event data:', error.message);
        throw error;
    }
}

// Bulk insert events
async function bulkInsertEvents() {
    try {
        // Connect to database
        await connectDB();
        
        // Load event data
        const events = loadEventData();
        
        console.log(`\n📊 Event breakdown:`);
        const breakdown = {};
        events.forEach(event => {
            const dept = event.createdBy === "68c77fc7d8714ef0c8fcb192" ? "CCMS" : "CAS";
            breakdown[dept] = (breakdown[dept] || 0) + 1;
        });
        console.log(breakdown);
        
        // Check for existing events by title and createdBy
        console.log('\n🔍 Checking for existing events...');
        const existingEvents = [];
        for (const event of events) {
            const existing = await eventModel.findOne({ 
                title: event.title,
                createdBy: event.createdBy,
                eventCategory: "community_extension"
            }).select('_id title').lean();
            
            if (existing) {
                existingEvents.push(existing);
            }
        }
        
        if (existingEvents.length > 0) {
            console.log(`⚠️  Found ${existingEvents.length} existing events with matching titles:`);
            existingEvents.forEach(event => console.log(`   - ${event.title.substring(0, 50)}...`));
        }
        
        // Filter out events that already exist
        const existingTitles = new Set(existingEvents.map(e => e.title));
        const newEvents = events.filter(event => !existingTitles.has(event.title));
        
        if (newEvents.length === 0) {
            console.log('\n✅ All events already exist in database. No new events to insert.');
            await mongoose.connection.close();
            return;
        }
        
        console.log(`\n📝 Inserting ${newEvents.length} new events (skipping ${events.length - newEvents.length} duplicates)...`);
        
        // Convert dates from strings to Date objects
        const eventsToInsert = newEvents.map(event => ({
            ...event,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            donations: event.donations.map(donation => ({
                ...donation,
                donatedAt: new Date(donation.donatedAt)
            })),
            createdAt: event.createdAt ? new Date(event.createdAt) : new Date(),
            updatedAt: event.updatedAt ? new Date(event.updatedAt) : new Date()
        }));
        
        // Insert events
        const result = await eventModel.insertMany(eventsToInsert, {
            ordered: false, // Continue inserting even if some fail
            rawResult: false
        });
        
        console.log(`\n✅ Successfully inserted ${result.length} events!`);
        
        // Calculate statistics
        const totalVolunteers = result.reduce((sum, e) => sum + (e.volunteers?.length || 0), 0);
        const totalDonations = result.reduce((sum, e) => sum + (e.donations?.length || 0), 0);
        const totalDonationAmount = result.reduce((sum, e) => sum + (e.totalDonations || 0), 0);
        
        console.log(`📊 Statistics:`);
        console.log(`   Total volunteers: ${totalVolunteers}`);
        console.log(`   Total donations: ${totalDonations}`);
        console.log(`   Total donation amount: ₱${totalDonationAmount.toLocaleString()}`);
        
        // Verify insertion
        const insertedCount = await eventModel.countDocuments({
            _id: { $in: result.map(e => e._id) },
            status: "Proposed",
            eventCategory: "community_extension"
        });
        console.log(`✅ Verified: ${insertedCount} events found in database`);
        
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
            console.log(`\n✅ Successfully inserted ${error.insertedCount || 0} events before errors occurred`);
        }
        
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
bulkInsertEvents()
    .then(() => {
        console.log('\n✨ Bulk insert completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Bulk insert failed:', error);
        process.exit(1);
    });

