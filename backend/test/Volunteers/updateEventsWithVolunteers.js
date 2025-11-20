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

// Load volunteer data from volunteer_data.txt
function loadVolunteerData() {
    try {
        const dataPath = path.join(__dirname, 'volunteer_data.txt');
        
        if (!fs.existsSync(dataPath)) {
            throw new Error(`volunteer_data.txt file not found at: ${dataPath}`);
        }
        
        console.log(`📂 Reading data from: ${dataPath}`);
        const fileContent = fs.readFileSync(dataPath, 'utf8');
        const volunteerData = JSON.parse(fileContent);
        
        if (!Array.isArray(volunteerData)) {
            throw new Error('Data file must contain a JSON array');
        }
        
        console.log(`✅ Loaded ${volunteerData.length} events with volunteer data`);
        return volunteerData;
    } catch (error) {
        console.error('❌ Error loading volunteer data:', error.message);
        throw error;
    }
}

// Calculate feedback summary
function calculateFeedbackSummary(feedbackArray) {
    if (!feedbackArray || feedbackArray.length === 0) {
        return {
            averageRating: 0,
            totalResponses: 0,
            lastCalculatedAt: null
        };
    }
    
    const totalRating = feedbackArray.reduce((sum, f) => sum + (f.rating || 0), 0);
    const averageRating = Math.round((totalRating / feedbackArray.length) * 100) / 100;
    
    return {
        averageRating: averageRating,
        totalResponses: feedbackArray.length,
        lastCalculatedAt: new Date()
    };
}

// Update events with volunteer data
async function updateEventsWithVolunteers() {
    try {
        // Connect to database
        await connectDB();
        
        // Load volunteer data
        const volunteerData = loadVolunteerData();
        
        console.log(`\n📊 Volunteer data breakdown:`);
        let totalRegistrations = 0;
        let totalFeedback = 0;
        let totalAttendanceRecords = 0;
        
        volunteerData.forEach(eventData => {
            totalRegistrations += eventData.volunteerRegistrations?.length || 0;
            totalFeedback += eventData.feedback?.length || 0;
            eventData.volunteerRegistrations?.forEach(reg => {
                totalAttendanceRecords += reg.attendanceRecords?.length || 0;
            });
        });
        
        console.log(`   Total volunteer registrations: ${totalRegistrations}`);
        console.log(`   Total feedback entries: ${totalFeedback}`);
        console.log(`   Total attendance records: ${totalAttendanceRecords}`);
        
        console.log(`\n🔄 Updating ${volunteerData.length} events...`);
        
        let updatedCount = 0;
        let notFoundCount = 0;
        const errors = [];
        
        for (let i = 0; i < volunteerData.length; i++) {
            const eventData = volunteerData[i];
            const { eventId, eventTitle, volunteerRegistrations, feedback } = eventData;
            
            try {
                // Find the event by ID
                const event = await eventModel.findById(eventId);
                
                if (!event) {
                    console.log(`⚠️  Event "${eventTitle}" (${eventId}) not found in database, skipping...`);
                    notFoundCount++;
                    continue;
                }
                
                // Convert date strings to Date objects for volunteerRegistrations
                const processedRegistrations = volunteerRegistrations.map(reg => {
                    const processedReg = { ...reg };
                    
                    // Convert joinedAt
                    if (processedReg.joinedAt) {
                        processedReg.joinedAt = new Date(processedReg.joinedAt);
                    }
                    
                    // Convert acceptedAt
                    if (processedReg.acceptedAt) {
                        processedReg.acceptedAt = new Date(processedReg.acceptedAt);
                    }
                    
                    // Convert invitedAt
                    if (processedReg.invitedAt) {
                        processedReg.invitedAt = new Date(processedReg.invitedAt);
                    }
                    
                    // Convert attendanceRecords dates
                    if (processedReg.attendanceRecords && Array.isArray(processedReg.attendanceRecords)) {
                        processedReg.attendanceRecords = processedReg.attendanceRecords.map(record => ({
                            ...record,
                            date: new Date(record.date),
                            timeIn: new Date(record.timeIn),
                            timeOut: new Date(record.timeOut),
                            createdAt: new Date(record.createdAt)
                        }));
                    }
                    
                    return processedReg;
                });
                
                // Convert date strings to Date objects for feedback
                const processedFeedback = feedback.map(fb => ({
                    ...fb,
                    submittedAt: new Date(fb.submittedAt)
                }));
                
                // Calculate feedback summary
                const feedbackSummary = calculateFeedbackSummary(processedFeedback);
                
                // Update the event
                event.volunteerRegistrations = processedRegistrations;
                event.feedback = processedFeedback;
                event.feedbackSummary = feedbackSummary;
                
                await event.save();
                
                updatedCount++;
                console.log(`✅ Updated event "${eventTitle}" (${processedRegistrations.length} registrations, ${processedFeedback.length} feedback)`);
                
            } catch (error) {
                console.error(`❌ Error updating event "${eventTitle}":`, error.message);
                errors.push({ eventTitle, error: error.message });
            }
        }
        
        console.log(`\n📊 Update Summary:`);
        console.log(`   Successfully updated: ${updatedCount} events`);
        console.log(`   Not found: ${notFoundCount} events`);
        console.log(`   Errors: ${errors.length} events`);
        
        if (errors.length > 0) {
            console.log(`\n⚠️  Errors encountered:`);
            errors.forEach(({ eventTitle, error }) => {
                console.log(`   - ${eventTitle}: ${error}`);
            });
        }
        
        // Verify updates
        console.log(`\n🔍 Verifying updates...`);
        let verifiedCount = 0;
        for (const eventData of volunteerData) {
            const event = await eventModel.findById(eventData.eventId).select('volunteerRegistrations feedback').lean();
            if (event) {
                const regCount = event.volunteerRegistrations?.length || 0;
                const feedbackCount = event.feedback?.length || 0;
                if (regCount > 0 || feedbackCount > 0) {
                    verifiedCount++;
                }
            }
        }
        console.log(`✅ Verified: ${verifiedCount} events have volunteer data`);
        
    } catch (error) {
        console.error('\n❌ Error during bulk update:', error);
        throw error;
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
updateEventsWithVolunteers()
    .then(() => {
        console.log('\n✨ Bulk update completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Bulk update failed:', error);
        process.exit(1);
    });

