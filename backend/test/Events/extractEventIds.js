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
        
        console.log(`📂 Reading event data from: ${dataPath}`);
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

// Extract event IDs from MongoDB
async function extractEventIds() {
    try {
        // Connect to database
        await connectDB();
        
        // Load event data
        const events = loadEventData();
        
        console.log(`\n🔍 Querying MongoDB for ${events.length} events...`);
        
        const eventIdMappings = [];
        const notFound = [];
        
        // Query each event by title and createdBy
        for (let i = 0; i < events.length; i++) {
            const eventData = events[i];
            const title = eventData.title;
            const createdBy = eventData.createdBy;
            
            try {
                // Find event by title and createdBy (most reliable match)
                const dbEvent = await eventModel.findOne({ 
                    title: title,
                    createdBy: createdBy,
                    eventCategory: "community_extension",
                    status: "Proposed"
                }).select('_id title createdBy startDate endDate').lean();
                
                if (dbEvent) {
                    eventIdMappings.push({
                        title: dbEvent.title,
                        eventId: dbEvent._id.toString(),
                        createdBy: dbEvent.createdBy.toString(),
                        startDate: dbEvent.startDate,
                        endDate: dbEvent.endDate
                    });
                    console.log(`✅ [${i + 1}/${events.length}] Found: ${title.substring(0, 40)}... -> ${dbEvent._id}`);
                } else {
                    notFound.push({
                        title: title,
                        createdBy: createdBy
                    });
                    console.log(`⚠️  [${i + 1}/${events.length}] Not found: ${title.substring(0, 40)}...`);
                }
            } catch (error) {
                console.error(`❌ Error querying event "${title}":`, error.message);
                notFound.push({
                    title: title,
                    createdBy: createdBy,
                    error: error.message
                });
            }
        }
        
        // Prepare output data
        const output = {
            totalEvents: events.length,
            found: eventIdMappings.length,
            notFound: notFound.length,
            mappings: eventIdMappings,
            notFoundEvents: notFound,
            generatedAt: new Date().toISOString()
        };
        
        // Save to eventid.txt
        const outputPath = path.join(__dirname, 'eventid.txt');
        const outputContent = JSON.stringify(output, null, 2);
        fs.writeFileSync(outputPath, outputContent);
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total events in file: ${events.length}`);
        console.log(`   Found in database: ${eventIdMappings.length}`);
        console.log(`   Not found: ${notFound.length}`);
        console.log(`\n✅ Results saved to: ${outputPath}`);
        
        if (notFound.length > 0) {
            console.log(`\n⚠️  Events not found in database:`);
            notFound.forEach(event => {
                console.log(`   - ${event.title.substring(0, 50)}...`);
            });
        }
        
    } catch (error) {
        console.error('\n❌ Error during extraction:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
extractEventIds()
    .then(() => {
        console.log('\n✨ Event ID extraction completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Event ID extraction failed:', error);
        process.exit(1);
    });

